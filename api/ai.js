const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  const modelFallback = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it';

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenRouter API key is not configured on the server.' });
  }

  try {
    const body = req.body || {};
    const prompt = String(body?.prompt || '').trim();
    const model = String(body?.model || modelFallback).trim() || modelFallback;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        'OpenRouter request failed.';
      return res.status(upstream.status || 502).json({ error: message });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'OpenRouter returned an empty response.' });
    }

    return res.status(200).json({ content });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unexpected AI proxy error.' });
  }
}
