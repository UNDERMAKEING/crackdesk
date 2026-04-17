export { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  college_name: string;
  plan_type: string;
  created_at: string;
};

