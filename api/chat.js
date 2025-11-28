export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    const fireworksKey = process.env.FIREWORKS_API_KEY;

    if (!fireworksKey) {
      return res.status(500).json({ error: 'Missing Fireworks API key' });
    }

    // ✅ FIREWORKS AI - FREE & FAST
    const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fireworksKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'accounts/fireworks/models/llama-v2-7b-chat',
        messages: [
          { 
            role: 'user', 
            content: `Q: ${message}\nProvide a concise answer.` 
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Fireworks error:', error);
      return res.status(response.status).json({ error: 'Model API failed' });
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'Unable to respond';

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ reply: answer.slice(0, 300) });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
