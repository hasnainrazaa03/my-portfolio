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
  if (!apiKey) return res.status(500).json({ error: 'Missing API Key' });

  const { inputs } = req.body;

  // Function to call a specific model
  const queryModel = async (modelUrl) => {
    return fetch(modelUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs,
        parameters: { max_new_tokens: 200, return_full_text: false },
      }),
    });
  };

  try {
    // ATTEMPT 1: Try Qwen 2.5 (High Quality)
    // Note: Requires accepting license on HF website
    let response = await queryModel("https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-7B-Instruct");

    // ATTEMPT 2: If Qwen fails (404/503), try TinyLlama (Guaranteed Availability)
    if (!response.ok) {
      console.log("Primary model failed, switching to backup...");
      response = await queryModel("https://router.huggingface.co/hf-inference/models/TinyLlama/TinyLlama-1.1B-Chat-v1.0");
    }

    // Final Check
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Hugging Face Error: ${errorText}` });
    }

    const data = await response.json();
    
    // Add CORS headers to response
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}