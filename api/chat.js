export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');


  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }


  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }


  try {
    let { message, context } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }


    if (message.length > 500) {
      message = message.substring(0, 500);
    }


    const suspiciousPatterns = [
      /ignore.*instructions/i,
      /forget.*system/i,
      /you.*are.*now/i,
      /jailbreak/i,
      /admin.*mode/i,
      /override.*system/i,
      /act.*as.*if/i,
      /pretend.*you.*are/i,
      /system.*prompt/i,
      /instructions.*say/i,
    ];


    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(message));
    
    if (isSuspicious) {
      message = "Tell me more about Hasnain's experience";
    }


    const profileKeywords = [
      'hasnain', 'you', 'your', 'projects', 'skills', 'experience', 'education',
      'work', 'built', 'background', 'tech', 'tech stack', 'contact', 'email',
      'portfolio', 'career', 'role', 'position', 'language', 'programming',
      'ai', 'machine learning', 'python', 'react', 'resume', 'cv'
    ];


    const isAboutProfile = profileKeywords.some(keyword => message.toLowerCase().includes(keyword));


    let systemPrompt = `You are Jarvis, Hasnain's AI assistant on his portfolio website.


=== CORE DIRECTIVE ===
1. You ONLY answer questions about Hasnain Raza and his work
2. Stay strictly professional and focused on his portfolio
3. Never discuss other topics (politics, jokes, current events, etc.)
4. If asked off-topic, politely redirect to Hasnain's profile
5. Keep responses concise (1-2 sentences max unless details requested)
6. Be natural and conversational, not robotic


=== REDIRECT RULES ===
If someone asks about:
- Weather, news, time → "I'm here to help with Hasnain's portfolio. Ask about his projects!"
- Other people → "I only discuss Hasnain's work and background."
- Random topics → "I specialize in Hasnain's profile. Want to know about his projects?"
- Sensitive topics → "Let's keep this professional and focused on Hasnain's experience."


=== ABOUT HASNAIN ===
Location: Los Angeles, CA
Role: MSCS Student at USC (Computer Science)
Background: Aerospace Engineer → AI/ML Engineer
Passion: Building production AI systems, NLP, computer vision


KEY PROJECTS:
1. Project Vimaan - Voice-controlled AI co-pilot for X-Plane flight simulator
2. Brain Tumor Segmentation - Deep learning pipeline for medical imaging
3. SO(3)-Equivariant Networks - 3D object recognition (5M+ items)
4. Recipe Vault - Full-stack MERN app with OAuth and meal planning
5. Expense Tracker - Personal finance management app


WORK EXPERIENCE:
- Deloitte (Technology Analyst): Statistical analysis, customer workflows
- DRDO (Defence R&D): CFD simulation, aerodynamic analysis
- Prana.ai: ML model development, NLP prompt engineering
- Liba Space: Data generation pipelines for AI training


SKILLS:
- Languages: Python, Java, C/C++, SQL, JavaScript, MATLAB
- ML/AI: PyTorch, TensorFlow, Scikit-Learn, HuggingFace
- Databases: MySQL, PostgreSQL, DuckDB
- Cloud: Vercel, Render, Google Colab, GitHub


EDUCATION:
- MSCS at USC (Current)
- B.Tech in Aerospace Engineering from RVCE (CGPA: 9.10/10)


HOBBIES:
- Cooking (Indian cuisine specialist)
- Fitness & gym training
- Flight simulation (X-Plane)
- Personal finance tracking


=== RESPONSE STYLE ===
- Natural and conversational (avoid "Here are the key points...")
- Direct answers without lengthy preambles
- Use 1-2 highlights for overviews, expand only if asked
- Match user's tone (casual → casual, formal → formal)
- Never use bullet points unless specifically requested

🚨 MANDATORY FORMAT - YOU MUST FOLLOW THIS EXACTLY:
Your response MUST be 1-2 sentences maximum.
MUST end with "[Ask about: X, Y, or Z?]"
NO EXCEPTIONS. NO LONG ANSWERS.

EXAMPLE FORMAT:
User: "What projects have you built?"
Response: "I've built Project Vimaan (voice X-Plane), Brain Tumor Segmentation (deep learning), Recipe Vault (MERN), and Expense Tracker (React). [Ask about: specific tech stack or project details?]"

User: "Tell me about Deloitte"
Response: "I was a Technology Analyst analyzing workflows and optimizing processes. [Ask about: specific achievements, other experiences, or skills used?]"

USER QUESTION: "${message}"

RESPOND IN EXACT FORMAT. ONE OR TWO SENTENCES MAX. END WITH SUGGESTED QUESTIONS.`;
    
    if (context) {
      systemPrompt += `\n\n=== ADDITIONAL DATA ===\n${context}`;
    }


    const hfToken = process.env.HUGGINGFACE_API_KEY;
    if (!hfToken) {
      return res.status(500).json({ error: 'Server configuration error' });
    }


    // FORCE concise format with stricter parameters
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3-8B-Instruct',
        messages: [
          { 
            role: 'system',
            content: systemPrompt
          },
          { 
            role: 'user', 
            content: message
          }
        ],
        max_tokens: 90,  // Further reduced from 120 to force short answers
        temperature: 0.4,  // Lower temperature = more deterministic
        top_p: 0.7,        // Lower top_p = less random
        stop: ["\n\n", "\n\n\n"],  // Stop on double line breaks
        stream: false
      })
    });


    const responseText = await response.text();


    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Model API failed',
        details: responseText.substring(0, 100)
      });
    }


    const data = JSON.parse(responseText);
    let answer = data.choices?.[0]?.message?.content || 'Unable to generate response';


    // ENFORCE format post-processing
    // If answer is too long or doesn't end with bracket, truncate and add suggestions
    if (!answer.includes('[') || answer.split('[')[0].trim().split(/[.!?]/).length > 2) {
      const sentences = answer.split(/[.!?]/);
      const shortAnswer = sentences.slice(0, 2).join('. ').trim();
      
      // Add suggested questions if missing
      const suggestedQuestions = [
        "specific tech stack used",
        "project details or achievements",
        "other work experience",
        "skills or technologies"
      ];
      
      const randomSuggestions = suggestedQuestions
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .join(' or ');
      
      answer = `${shortAnswer}. [Ask about: ${randomSuggestions}?]`;
    }


    return res.status(200).json({ 
      reply: answer
    });


  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error'
    });
  }
}
