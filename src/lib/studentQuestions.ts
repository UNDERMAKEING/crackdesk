import { supabase } from "./supabase";

// ─────────────────────────────────────────────
// Department config
// ─────────────────────────────────────────────
export const DEPARTMENTS = [
  { key: "CSE",   label: "Computer Science",      icon: "💻" },
  { key: "AI",    label: "Artificial Intelligence",icon: "🤖" },
  { key: "ML",    label: "Machine Learning",       icon: "🧠" },
  { key: "AIDS",  label: "AI & Data Science",      icon: "📊" },
  { key: "IT",    label: "Information Technology", icon: "🖥️" },
  { key: "ECE",   label: "Electronics",            icon: "📡" },
  { key: "EEE",   label: "Electrical",             icon: "⚡" },
  { key: "MECH",  label: "Mechanical",             icon: "⚙️" },
  { key: "CIVIL", label: "Civil",                  icon: "🏗️" },
  { key: "CHEM",  label: "Chemical",               icon: "🧪" },
  { key: "BIO",   label: "Biotechnology",          icon: "🧬" },
  { key: "MBA",   label: "MBA Management",         icon: "📈" },
  { key: "BBA",   label: "Commerce BBA",           icon: "💼" },
  { key: "DS",    label: "Data Science",           icon: "📉" },
  { key: "CYBER", label: "Cyber Security",         icon: "🔒" },
  { key: "CLOUD", label: "Cloud Computing",        icon: "☁️" },
  { key: "ROBO",  label: "Robotics",               icon: "🦾" },
  { key: "IOT",   label: "IoT",                    icon: "📶" },
] as const;

export function getDepartmentMeta(key: string) {
  return DEPARTMENTS.find((d) => d.key === key) ?? { key, label: key, icon: "📚" };
}

// ─────────────────────────────────────────────
// JD templates for each department
// ─────────────────────────────────────────────
const JD_TEMPLATES: Record<string, string> = {
  CSE:   "Software Developer role requiring data structures, algorithms, OOP, databases, OS, networks, and web development.",
  AI:    "AI Engineer role requiring neural networks, NLP, computer vision, reinforcement learning, TensorFlow, PyTorch, and AI ethics.",
  ML:    "Machine Learning Engineer requiring supervised/unsupervised learning, feature engineering, model evaluation, scikit-learn, and deep learning.",
  AIDS:  "AI & Data Science role requiring statistics, data visualization, machine learning, big data tools, Python, R, and business analytics.",
  IT:    "IT Professional requiring networking, system administration, cloud services, databases, cybersecurity fundamentals, and ITIL.",
  ECE:   "Electronics Engineer requiring digital/analog circuits, VLSI, signal processing, embedded systems, and communication systems.",
  EEE:   "Electrical Engineer requiring power systems, control systems, electrical machines, power electronics, and renewable energy.",
  MECH:  "Mechanical Engineer requiring thermodynamics, fluid mechanics, manufacturing, CAD/CAM, and material science.",
  CIVIL: "Civil Engineer requiring structural analysis, geotechnical engineering, transportation, and construction management.",
  CHEM:  "Chemical Engineer requiring process engineering, thermodynamics, reaction kinetics, plant design, and environmental compliance.",
  BIO:   "Biotechnology role requiring molecular biology, genetic engineering, bioinformatics, bioprocess engineering, and pharmaceuticals.",
  MBA:   "Management role requiring strategic management, marketing, finance, HR, operations, and business analytics.",
  BBA:   "Business Administration role requiring accounting, economics, organizational behavior, marketing, and entrepreneurship.",
  DS:    "Data Scientist requiring statistics, Python/R, SQL, machine learning, data visualization, and big data technologies.",
  CYBER: "Cyber Security Analyst requiring network security, ethical hacking, cryptography, incident response, SIEM, and compliance.",
  CLOUD: "Cloud Engineer requiring AWS/Azure/GCP, containerization, DevOps, infrastructure as code, serverless, and cloud security.",
  ROBO:  "Robotics Engineer requiring kinematics, ROS, sensor integration, control systems, computer vision, and embedded programming.",
  IOT:   "IoT Developer requiring embedded systems, sensor networks, MQTT, edge computing, microcontrollers, and IoT security.",
};

// ─────────────────────────────────────────────
// READ: Get 50 questions from shared library
// Called from TestLibrary when user starts a test
// ─────────────────────────────────────────────
export async function getStudentQuestions(
  _userId: string,  // kept for API compatibility, no longer used for filtering
  sector: string,
  level: string
) {
  const { data, error } = await supabase
    .from("library_questions")
    .select("*")
    .eq("department", sector)
    .eq("level", level)
    .limit(50);

  if (error) {
    console.error("[getStudentQuestions] DB error:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;

  // Shuffle so users get variety
  const shuffled = [...data].sort(() => Math.random() - 0.5);

  return shuffled.map((row: any) => ({
    question: row.question,
    options: Array.isArray(row.options) ? row.options : JSON.parse(row.options),
    correct: row.correct,
    skill: row.skill ?? sector,
    explanation: row.explanation ?? "",
  }));
}

// ─────────────────────────────────────────────
// CHECK: See how many questions exist per dept/level
// Used by admin seeder to know what's missing
// ─────────────────────────────────────────────
export async function getLibraryStatus() {
  const levels = ["easy", "medium", "hard"];
  const status: Record<string, Record<string, number>> = {};

  for (const dept of DEPARTMENTS) {
    status[dept.key] = {};
    for (const level of levels) {
      const { count } = await supabase
        .from("library_questions")
        .select("*", { count: "exact", head: true })
        .eq("department", dept.key)
        .eq("level", level);
      status[dept.key][level] = count ?? 0;
    }
  }
  return status;
}

// ─────────────────────────────────────────────
// WRITE: Generate 50 questions for one dept+level
// Calls Gemini in 5 batches of 10 to avoid timeout
// Call this from the admin seeder page
// ─────────────────────────────────────────────
export async function seedDepartmentLevel(
  department: string,
  level: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; inserted: number; error?: string }> {
  const jd = JD_TEMPLATES[department] ?? `Professional role in ${department}.`;
  const BATCH_SIZE = 10;
  const TOTAL_BATCHES = 5; // 5 × 10 = 50 questions
  let inserted = 0;

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return { success: false, inserted: 0, error: "VITE_GEMINI_API_KEY not set" };

  for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
    onProgress?.(`Generating batch ${batch + 1}/${TOTAL_BATCHES} for ${department} ${level}...`);

    const prompt = `You are a placement exam question generator.

Generate exactly ${BATCH_SIZE} unique multiple-choice questions at ${level} difficulty level for this role:
"${jd}"

Rules:
- Questions must be unique (batch ${batch + 1} of ${TOTAL_BATCHES})
- Each question must have exactly 4 options labeled A, B, C, D
- The correct answer index must be 0, 1, 2, or 3 (0=A, 1=B, 2=C, 3=D)
- Include a short skill tag (e.g. "Arrays", "Thermodynamics", "Marketing")

Respond ONLY with a valid JSON array. No markdown, no explanation, just the array:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "skill": "Skill name"
  }
]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error(`Batch ${batch + 1} API error:`, err);
        continue; // skip this batch, continue with next
      }

      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json|```/g, "").trim();
      let questions: any[];

      try {
        questions = JSON.parse(cleaned);
      } catch {
        console.error(`Batch ${batch + 1} parse error. Raw:`, cleaned.slice(0, 200));
        continue;
      }

      if (!Array.isArray(questions) || questions.length === 0) continue;

      // Validate each question before inserting
      const valid = questions.filter(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correct === "number"
      );

      if (valid.length === 0) continue;

      const rows = valid.map((q) => ({
        department,
        level,
        question: q.question,
        options: q.options,
        correct: q.correct,
        skill: q.skill ?? department,
      }));

      const { error: insertError } = await supabase
        .from("library_questions")
        .insert(rows);

      if (insertError) {
        console.error(`Batch ${batch + 1} insert error:`, insertError.message);
      } else {
        inserted += valid.length;
        onProgress?.(`✅ Batch ${batch + 1} done — ${inserted} questions saved`);
      }

      // Small delay between batches to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));

    } catch (err: any) {
      console.error(`Batch ${batch + 1} failed:`, err.message);
      continue;
    }
  }

  return {
    success: inserted > 0,
    inserted,
    error: inserted === 0 ? "All batches failed" : undefined,
  };
}

// ─────────────────────────────────────────────
// Legacy — kept so old code doesn't break
// ─────────────────────────────────────────────
export async function initializeStudentQuestions(userId: string, sectors?: string[]) {
  console.warn("initializeStudentQuestions is deprecated. Use seedDepartmentLevel() instead.");
  return true;
}

