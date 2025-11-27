export default async function handler(req, res) {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    return res.status(200).end();
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server Config Error: API Key missing' });
  }

  try {
    const { inputs } = req.body;

    // --- FIX: Using Qwen 2.5 (Ungated, High Performance) ---
    // This model usually works without needing to accept a license agreement first
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-7B-Instruct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs,
          parameters: { 
            max_new_tokens: 200,
            return_full_text: false,
            temperature: 0.7
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF Error:", response.status, errorText);
      return res.status(response.status).json({ error: `Hugging Face Error: ${errorText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}