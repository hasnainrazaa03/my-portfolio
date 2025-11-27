export default async function handler(req, res) {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Debugging: Check if Key exists (Do not log the actual key!)
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.error("Error: HUGGINGFACE_API_KEY is missing in Vercel Environment Variables.");
    return res.status(500).json({ error: 'Server Configuration Error: API Key missing' });
  }

  try {
    const { inputs } = req.body;

    // 3. Call Hugging Face
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      }
    );

    // 4. Handle Hugging Face Errors specifically
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API Error:", response.status, errorText);
      return res.status(response.status).json({ error: `Hugging Face Error: ${errorText}` });
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);

  } catch (error) {
    console.error("Internal Server Error:", error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}