export default async function handler(req: any, res: any) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://crackdesk.vercel.app",
      "X-Title": "CrackDesk",
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.status(response.status).json(data);
}