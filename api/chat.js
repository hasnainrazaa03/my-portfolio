export default async function handler(req, res) {
  // Set CORS headers for all responses
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
    const { message, context } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    const hfToken = process.env.HUGGINGFACE_API_KEY;

    if (!hfToken) {
      console.error('Missing HUGGINGFACE_API_KEY environment variable');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('Making request to HF Router...');

    // Build system prompt with context
    let systemPrompt = `You are Jarvis, Hasnain's AI assistant on his portfolio website.

RESPONSE RULES:
- Keep responses under 100 words unless asked for details
- Be conversational and natural, not formal or robotic
- Don't use bold formatting or bullet points unless specifically asked
- Answer directly without lengthy preambles
- If asked "what can you tell me about X", give 2-3 key highlights, not everything
- Match the user's tone (casual questions get casual answers)
- Never say "Here are some key details" or "Hasnain is a highly skilled" - just answer naturally

Examples:
User: "Tell me about Hasnain"
Good: "Hasnain is a computer science grad student at USC with a background in aerospace engineering. He's built some cool AI projects like a voice-controlled flight simulator assistant and brain tumor segmentation models. He's also worked at Deloitte and DRDO doing ML and CFD work."
Bad: "Hasnain Raza is a highly skilled and accomplished individual..."

User: "What projects has he built?"
Good: "He's built Project Vimaan (a voice-controlled AI co-pilot for flight sims), a brain tumor segmentation pipeline, and a couple web apps including a recipe vault and expense tracker. Want details on any specific one?"
Bad: "Here are some of his notable projects: 1. Project Vimaan: A voice-controlled..."`;
    
    if (context) {
      systemPrompt += `\n\n=== HASNAIN'S INFO ===\n${context}`;
    }

    // Updated API call with better error handling
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
        max_tokens: 200, // Reduced for concise responses
        temperature: 0.7,
        stream: false
      })
    });

    const responseText = await response.text();
    console.log('HF Response status:', response.status);
    console.log('HF Response:', responseText.substring(0, 200));

    if (!response.ok) {
      console.error('HF Router error:', responseText);
      return res.status(response.status).json({ 
        error: 'Model API failed',
        details: responseText.substring(0, 100)
      });
    }

    const data = JSON.parse(responseText);
    let answer = data.choices?.[0]?.message?.content || 'Unable to generate response';

    // Trim to approximately 120 words max for readability
    const words = answer.trim().split(/\s+/);
    if (words.length > 120) {
      answer = words.slice(0, 120).join(' ') + '...';
    }

    return res.status(200).json({ 
      reply: answer.trim()
    });

  } catch (error) {
    console.error('Chat API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}