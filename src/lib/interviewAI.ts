const GROQ_API_URL = "/api/ai";

interface InterviewAIParams {
  action: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}

export async function callInterviewAI({ systemPrompt, userMessage, maxTokens }: InterviewAIParams): Promise<string> {

  const enhancedSystem = systemPrompt + "\n\nCRITICAL: Output ONLY the raw JSON object. No markdown. No backticks. No explanation. Start your response with { and end with }";

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: enhancedSystem },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens || 1500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error: ${response.status} - ${err}`);
  }

  const text = await response.text();
  console.log("Raw response:", text);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse response: ${text.slice(0, 200)}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`No content in response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  console.log("AI content:", content);
  return content;
}

export function parseAIJson(raw: string): any {
  let cleaned = raw.trim();

  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    console.error("No JSON found in:", cleaned);
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  cleaned = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse failed on:", cleaned);
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}