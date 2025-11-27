export default async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;

    if (!hfApiKey) {
      return res.status(500).json({ error: 'Missing HF API key' });
    }

    // Call Hugging Face from backend (no CORS issues!)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/hasnainraza03/portfolio-chatbot-model',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `Q: ${message}\nA:`,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.8,
            top_p: 0.9,
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('HF API error:', error);
      return res.status(response.status).json({ error: 'Model API failed' });
    }

    const data = await response.json();
    const generatedText = data[0]?.generated_text || '';
    const answer = generatedText.split('A:')[1]?.trim() || 'Unable to respond';

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ reply: answer.slice(0, 300) });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
