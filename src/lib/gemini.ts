export type GeneratedQuestion = {
  question: string;
  options: string[];
  correct: number;
  skill: string;
  explanation: string;
};

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

  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const msg = errData?.error?.message || `API error: ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}