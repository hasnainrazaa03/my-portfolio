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
    let systemPrompt = 'You are Jarvis, an AI assistant for Hasnain\'s portfolio website. Be concise, professional, and helpful.';
    
    if (context) {
      systemPrompt += `\n\nHere is information about Hasnain:\n${context}`;
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
        max_tokens: 300, // Increased for complete responses
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
    const answer = data.choices?.[0]?.message?.content || 'Unable to generate response';

    return res.status(200).json({ 
      reply: answer.trim() // Removed the .slice() limit
    });

  } catch (error) {
    console.error('Chat API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}