import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseRoleKey = import.meta.env.VITE_SERVICE_ROLE_KEY;

export const adminSupabase = createClient(supabaseUrl, supabaseRoleKey);
