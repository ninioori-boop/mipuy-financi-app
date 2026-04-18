// Vercel serverless function — secure proxy to Claude API
// API key stored in Vercel Environment Variables, never exposed to client.

import { createVerify } from 'crypto';

const rateLimitMap = new Map();
const RATE_LIMIT = 5;      // max requests per window per IP
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

// Cache Firebase public keys for 1 hour
let _fbKeysCache = null, _fbKeysCacheAt = 0;
async function verifyFirebaseToken(idToken) {
  const now = Date.now();
  if (!_fbKeysCache || now - _fbKeysCacheAt > 3600000) {
    const r = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    _fbKeysCache = await r.json();
    _fbKeysCacheAt = now;
  }
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [h64, p64, s64] = parts;
  const header  = JSON.parse(Buffer.from(h64,  'base64url').toString());
  const payload = JSON.parse(Buffer.from(p64,  'base64url').toString());
  const pubKey  = _fbKeysCache[header.kid];
  if (!pubKey) throw new Error('Unknown key id');

  const sig   = Buffer.from(s64, 'base64url');
  const valid = createVerify('RSA-SHA256').update(h64 + '.' + p64).verify(pubKey, sig);
  if (!valid) throw new Error('Bad signature');

  const t = Math.floor(now / 1000);
  if (payload.exp < t)  throw new Error('Token expired');
  if (payload.aud !== 'finance-machine-a36e9') throw new Error('Wrong audience');
  if (payload.iss !== 'https://securetoken.google.com/finance-machine-a36e9') throw new Error('Wrong issuer');
  return payload;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'נדרשת התחברות' });
  }
  try {
    await verifyFirebaseToken(authHeader.slice(7));
  } catch(e) {
    return res.status(401).json({ error: 'פג תוקף הסשן, התחבר מחדש' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'יותר מדי בקשות, נסה שוב עוד דקה' });
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
