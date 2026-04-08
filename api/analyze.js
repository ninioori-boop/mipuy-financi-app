// Vercel serverless function — secure proxy to Claude API
// API key stored in Vercel Environment Variables, never exposed to client.

export default async function handler(req, res) {
  // Only allow POST from same origin
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const { system, message, model, max_tokens } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Guard against oversized requests
  const msgLen = (system || '').length + message.length;
  if (msgLen > 40000) {
    return res.status(400).json({ error: 'Request too large' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 4096,
        system: system || undefined,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(function() { return {}; });
      const msg = (err.error && err.error.message) || ('Claude API error ' + response.status);
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';

    return res.status(200).json({ text: text });

  } catch(err) {
    console.error('analyze proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
