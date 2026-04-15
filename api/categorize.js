// Vercel serverless function — proxy to Claude API
// The API key is stored in Vercel Environment Variables, never in client code.

const rateLimitMap = new Map();
const RATE_LIMIT = 10;     // max requests per window per IP
const WINDOW_MS  = 60000;  // 1 minute

function isRateLimited(ip) {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  rateLimitMap.set(ip, entry);
  return false;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'יותר מדי בקשות, נסה שוב עוד דקה' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { businesses } = req.body;
  if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
    return res.status(400).json({ error: 'Missing businesses array' });
  }

  // Limit to 50 businesses per call to avoid abuse
  const limited = businesses.slice(0, 50);

  const categories = [
    'מזון ומסעדות', 'סופרמרקט', 'תחבורה', 'דלק', 'בריאות ורפואה',
    'פארמה', 'ביגוד והנעלה', 'אלקטרוניקה', 'בידור ופנאי', 'ספורט',
    'חינוך', 'תקשורת', 'ביטוח', 'בנק ופיננסים', 'נסיעות ותיירות',
    'בית ועיצוב', 'חומרי בניין', 'ציוד עסקי/משרדי', 'מיסים',
    'חסכונות', 'השקעות', 'שונות'
  ];

  const prompt = `אתה מומחה לסיווג עסקאות פיננסיות בישראל.
קבל רשימת שמות עסקים/תיאורי עסקאות וסווג כל אחד לקטגוריה המתאימה ביותר.

קטגוריות אפשריות: ${categories.join(', ')}

עסקים לסיווג:
${limited.map(function(b, i) { return (i+1) + '. ' + b; }).join('\n')}

החזר תשובה בפורמט JSON בלבד, ללא טקסט נוסף:
{
  "results": [
    { "business": "שם העסק", "category": "קטגוריה", "confidence": "high/medium/low" },
    ...
  ]
}

אם אינך בטוח — השתמש ב-"שונות". העדף דיוק על פני ניחוש.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'Claude API error', detail: response.status });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    // Parse JSON from response
    let parsed;
    try {
      // Handle case where model wraps in ```json ... ```
      const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      parsed = JSON.parse(clean);
    } catch(e) {
      console.error('Failed to parse Claude response:', text);
      return res.status(502).json({ error: 'Invalid response from Claude' });
    }

    return res.status(200).json(parsed);

  } catch(err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
