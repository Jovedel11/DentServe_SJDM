import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not set");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// function to help handle supabase error 
export const handleSupabaseError = (error) => {
  console.log('Supabase Error:', error);

  if (error.message.include('Rate Limit exceeded')) {
    return 'Too many attempts. Please try again later.';
  }

  if (error.message.include('Invalid credentials')) {
    return 'Invalid email or password.'
  }

  if (error.message.include('User not found')) {
    return 'No account found with this email'
  }

  return error.message || 'An unexpected error occurred.';

}
