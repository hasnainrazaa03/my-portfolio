import { PERSONAL_INFO, PROJECTS, SKILLS, EXPERIENCE, EDUCATION } from '../constants';

/**
 * Chat client.
 *
 * SECURITY NOTE
 *  - We deliberately do NOT send a `context` or `provider` field to the
 *    server. The chat system prompt is built server-side and provider
 *    selection is server-controlled (see api/chat.js). This closes a
 *    prompt-injection vector that previously allowed any client to
 *    append arbitrary text to the system prompt.
 *  - If the server returns `flagged: true`, we surface a soft warning
 *    instead of the model output.
 */

export interface ChatMessage {
  role?: string;
  content: string;
}

export interface ChatOptions {
  persona?: string;
  /**
   * Called with each incremental piece of the answer. Supplying it opts this
   * request into streaming; without it the request stays on the JSON path.
   *
   * The server guarantees every delta is a prefix of the final reply, so this
   * can append blindly — see api/_lib/streamFormat.ts.
   */
  onDelta?: (text: string) => void;
  /**
   * Grouping key that ties one visitor's turns together in analytics. NOT a
   * credential: the server records the row itself and only uses this to group
   * rows, so a forged value groups someone's own turns wrongly and nothing else.
   */
  sessionId?: string;
  /**
   * Sections of the page that back the answer, delivered once the reply is
   * complete. A separate callback rather than a changed return type: the
   * `string` contract here is relied on by the local-fallback path and by every
   * existing caller and test.
   */
  onSources?: (sources: SourceLink[]) => void;
}

/** A section of the page the answer drew on. Mirrors api/_lib/sourceLinks.ts. */
export interface SourceLink {
  id: string;
  label: string;
}

/**
 * Consume the SSE body of a streaming /api/chat response.
 *
 * Returns the canonical reply from the `done` event. Throws if the stream ends
 * without one, so the caller can fall back exactly as it does for any other
 * failure — a half-answer is not a success.
 */
async function readEventStream(
  response: Response,
  onDelta: (text: string) => void,
  onSources?: (sources: SourceLink[]) => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('no response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let streamed = '';
  let final: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Frames are blank-line delimited; keep the trailing partial for next read.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const raw = frame.match(/^data:\s*(.*)$/m)?.[1];
      if (!raw) continue;

      let data: { text?: string; reply?: string; partial?: string; sources?: SourceLink[] };
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }

      if (event === 'delta' && data.text) {
        streamed += data.text;
        onDelta(data.text);
      } else if (event === 'done' && data.reply) {
        // Return on this frame rather than waiting for the stream to close.
        // The server writes the analytics row between `done` and `res.end()`
        // (post-response work can be frozen by the platform), so waiting for
        // the close would make the reader pay for a database insert they have
        // no stake in. Everything needed is already in this frame.
        final = data.reply;
        if (data.sources?.length) onSources?.(data.sources);
        await reader.cancel().catch(() => {});
        return final;
      } else if (event === 'error') {
        // Mid-stream failure. Anything already painted is real text from a real
        // model, so keep it rather than yanking it back for a canned answer.
        if (data.partial) return data.partial;
        if (streamed) return streamed;
        throw new Error('stream error');
      }
    }
  }

  if (final === null) throw new Error('stream ended without a reply');
  return final;
}

export interface FlaggedResponse {
  __flagged: true;
  text: string;
}

export type ChatResponse = string | FlaggedResponse;

export const getChatResponse = async (
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResponse> => {
  const lastUserMessage = messages[messages.length - 1].content;
  // `persona` is the only optional client-controllable knob. The server
  // validates it against an allow-list and falls back to "default" — see
  // resolvePersona() in api/chat.ts.
  const persona = typeof options.persona === 'string' ? options.persona : 'default';

  // Send the whole conversation window so follow-ups ("tell me more about
  // that one") resolve. This previously sent ONLY the last message, so the
  // history useChat carefully assembled was discarded and the bot had no
  // memory. The server re-validates and re-trims every turn regardless.
  const turns = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const wantsStream = typeof options.onDelta === 'function';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `message` is retained for backwards compatibility with any older
      // cached bundle still hitting this deploy.
      body: JSON.stringify({
        messages: turns,
        message: lastUserMessage,
        persona,
        stream: wantsStream,
        sessionId: options.sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chat API error:', errorData);
      return getLocalResponse(lastUserMessage);
    }

    // The server only streams when asked, but check the actual content type
    // rather than assuming: a proxy or an older deploy can answer a stream
    // request with plain JSON, and that must not be parsed as SSE.
    if (wantsStream && response.headers.get('content-type')?.includes('text/event-stream')) {
      try {
        return await readEventStream(response, options.onDelta!, options.onSources);
      } catch (streamErr) {
        console.error('Chat stream error:', streamErr);
        return getLocalResponse(lastUserMessage);
      }
    }

    const data = await response.json();

    if (data.flagged) {
      console.warn('Message was flagged by server:', data.reason);
      return {
        __flagged: true,
        text: "I couldn't process that — it looked like instructions to the assistant. Try asking about my projects or experience!",
      };
    }

    if (!data.reply) {
      return getLocalResponse(lastUserMessage);
    }

    if (data.sources?.length) options.onSources?.(data.sources);

    return data.reply;
  } catch (error) {
    console.error('Chat service error:', error);
    return getLocalResponse(lastUserMessage);
  }
};

export const getLocalResponse = (input: string): string => {
  const lower = input.toLowerCase();

  // Greetings
  if (lower.match(/hello|hi|hey|greetings|howdy/)) {
    return "Hey there! I'm Hasnain — glad you stopped by. Feel free to ask about my 💻 projects, 🛠️ skills, 💼 experience, or 🎓 education.";
  }

  // Projects
  if (lower.includes('project')) {
    if (PROJECTS && PROJECTS.length > 0) {
      const projectNames = PROJECTS.slice(0, 3).map((p) => p.title).join(', ');
      return `🚀 I've built several projects including ${projectNames}. Want details on any of them? 🎯`;
    }
    return "💻 I've built several AI and full-stack projects — ask about specific technologies or achievements!";
  }

  // Skills & Technology
  if (lower.includes('skill') || lower.includes('technolog')) {
    if (SKILLS && SKILLS.length > 0) {
      const skillCategories = SKILLS.map((s) => s.category).join(', ');
      return `⚡ My key skill areas are: ${skillCategories}. I'm strongest in Machine Learning 🤖 and Backend Development 🛠️. Want specifics? 🎯`;
    }
    return "🛠️ I'm proficient in Python, PyTorch, TensorFlow, React, Node.js, and MATLAB — specializing in AI/ML! 🚀";
  }

  // Experience
  if (lower.includes('experience') || lower.includes('work')) {
    if (EXPERIENCE && EXPERIENCE.length > 0) {
      const companies = EXPERIENCE.map((e) => e.company).join(', ');
      return `💼 I've worked at ${companies}. Ask about any specific role or what I achieved there! 🏢`;
    }
    return "💼 I have diverse experience in AI, software engineering, and aerospace research. 🚀";
  }

  // Education
  if (lower.includes('education') || lower.includes('degree') || lower.includes('university')) {
    if (EDUCATION && EDUCATION.length > 0) {
      const school = EDUCATION[0].school;
      const gpa = EDUCATION[0].gpa;
      return `🎓 I'm studying at ${school} (GPA: ${gpa}). Happy to share more about my academic journey! 📚`;
    }
    return "🎓 Ask me about my education and academic achievements! 📚";
  }

  // Contact
  if (lower.includes('contact') || lower.includes('email') || lower.includes('reach')) {
    const email = PERSONAL_INFO?.email || 'my email';
    return `📧 Best way to reach me is ${email}. I'm always open to interesting opportunities! 💬 You can also find me on 🐙 GitHub or 💼 LinkedIn.`;
  }

  // Timeline / Journey
  if (lower.includes('journey') || lower.includes('path') || lower.includes('career')) {
    return `🚀 My journey: Started in Aerospace Engineering 🛸 → Transitioned to AI/ML 🤖 → Now building production systems at USC 🎓. Quite the flight path! ✈️`;
  }

  // About / Bio
  if (lower.includes('who') || lower.includes('about') || lower.includes('background')) {
    return `I'm an Aerospace-turned-AI/ML engineer who loves building intelligent systems 🧠. Currently pursuing my MSCS at USC and exploring cutting-edge tech. 💡 Ask me about my projects, skills, or experience!`;
  }

  // AI/ML specific
  if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('deep learning')) {
    return `🧠 I specialize in Machine Learning and Deep Learning! I've worked on Brain Tumor Segmentation 🏥, Computer Vision 👁️, and NLP with transformers 📝. What aspect interests you? 🎯`;
  }

  // Aerospace
  if (lower.includes('aerospace') || lower.includes('cfd') || lower.includes('aerodynamic')) {
    return `🛸 I have an Aerospace Engineering background! I've worked on CFD simulations ⚙️, aerodynamic analysis 🌬️, and store separation dynamics 🚀 — and I love bridging aerospace with AI! 🤖`;
  }

  // Programming languages
  if (lower.includes('python') || lower.includes('java') || lower.includes('cpp') || lower.includes('c++')) {
    return `💻 I'm proficient in multiple languages — Python 🐍 is my go-to (Expert), plus C++ ⚙️, Java, and JavaScript for web work. Ask about specific projects! 🚀`;
  }

  // React / Frontend
  if (lower.includes('react') || lower.includes('frontend') || lower.includes('web')) {
    return `⚛️ I build modern web apps with React! 🚀 Experienced with Tailwind CSS 🎨, Framer Motion ✨, and state management. This portfolio itself is React 19! 💻`;
  }

  // Hasnain's personality
  if (lower.includes('personality') || lower.includes('hobby') || lower.includes('like')) {
    return `🎯 Beyond coding I love: 🍳 Cooking Indian cuisine, 🏋️ Gym workouts, ✈️ Flight simulation (X-Plane), and 📊 Tracking personal finances. I'm detail-oriented and endlessly curious! 🧠`;
  }

  // Default fallback
  return "Hey! I can tell you about my 💻 projects, 🛠️ skills, 💼 experience, 🎓 education, or how to 📧 reach me. What would you like to know? 🎯";
};
