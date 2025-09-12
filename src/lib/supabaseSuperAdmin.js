import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseRoleKey = import.meta.env.VITE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseRoleKey) {
  throw new Error("Missing Supabase env vars. Check .env file.");
}

export const adminSupabase = createClient(supabaseUrl, supabaseRoleKey);
