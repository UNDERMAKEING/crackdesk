export const maxDuration = 60;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 4000 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(cleaned);

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

