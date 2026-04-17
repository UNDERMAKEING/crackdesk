import { supabase } from "@/integrations/supabase/client";

const levels = ["beginner", "intermediate", "advanced"];

export async function initializeStudentQuestions(userId: string, selectedSectors: string[]) {
  const { data: existing } = await supabase
    .from("student_questions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) return false;

  for (const sector of selectedSectors) {
    for (const level of levels) {
      await supabase.from("student_questions").insert({
        user_id: userId,
        sector,
        level,
        questions: []
      });
    }
  }
  return true;
}

