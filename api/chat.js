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
    const hfToken = process.env.HUGGINGFACE_API_KEY;

    if (!hfToken) {
      return res.status(500).json({ error: 'Missing HF token' });
    }

    // ✅ HUGGING FACE ROUTER API (OpenAI Compatible, FREE)
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/Mistral-7B-Instruct-v0.3:together',  // ✅ WORKS 100%
        messages: [
          { 
            role: 'user', 
            content: `Q: ${message}\nA:` 
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HF Router error:', error);
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
