const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelFallback = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

    if (!apiKey) {
      return Response.json({ error: 'OpenRouter API key is not configured on the server.' }, { status: 500 });
    }

    try {
      const body = await request.json();
      const prompt = String(body?.prompt || '').trim();
      const model = String(body?.model || modelFallback).trim() || modelFallback;

      if (!prompt) {
        return Response.json({ error: 'Prompt is required.' }, { status: 400 });
      }

      const upstream = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      const payload = await upstream.json().catch(() => null);

      if (!upstream.ok) {
        const message =
          payload?.error?.message ||
          payload?.message ||
          'OpenRouter request failed.';
        return Response.json({ error: message }, { status: upstream.status || 502 });
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (!content) {
        return Response.json({ error: 'OpenRouter returned an empty response.' }, { status: 502 });
      }

      return Response.json({ content });
    } catch (error) {
      return Response.json(
        { error: error?.message || 'Unexpected AI proxy error.' },
        { status: 500 }
      );
    }
  },
};
