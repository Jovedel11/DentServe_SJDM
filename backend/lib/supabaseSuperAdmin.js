import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseRoleKey = process.env.SERVICE_ROLE_KEY;

export const adminSupabase = createClient(supabaseUrl, supabaseRoleKey);
