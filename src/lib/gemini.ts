const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export type GeneratedQuestion = {
  question: string;
  options: string[];
  correct: number;
  skill: string;
  explanation: string;
};

async function callWithRetry(fn: () => Promise<Response>, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fn();
    if (res.status === 429 && i < retries - 1) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    return res;
  }
  throw new Error("Max retries reached");
}

export async function generateQuestionsFromJD(jobDescription: string): Promise<GeneratedQuestion[]> {
  const prompt = `You are an expert technical interviewer. Based on the following job description, generate exactly 20 multiple choice questions to test a candidate's suitability for this role.

Job Description:
${jobDescription}

Return ONLY a valid JSON array with exactly 20 questions in this exact format:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "skill": "Skill category name",
    "explanation": "Brief explanation of correct answer"
  }
]
correct is the index (0-3) of the correct option. skill is a short category like "React", "SQL", "System Design", etc. Return only the JSON array, no other text.`;

  const response = await callWithRetry(() =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    console.error("Groq error:", JSON.stringify(errData, null, 2));
    throw new Error(errData?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");

  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}