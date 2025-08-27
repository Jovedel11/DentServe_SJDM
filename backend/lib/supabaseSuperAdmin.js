import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseRoleKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseRoleKey) {
  throw new Error("Missing Supabase env vars. Check .env file.");
}

export const adminSupabase = createClient(supabaseUrl, supabaseRoleKey);
