import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session?.user?.email)
  
  if (event === 'SIGNED_IN') {
    console.log('User signed in successfully')
  }
  
  if (event === 'PASSWORD_RECOVERY') {
    // handle password reset flow
    window.location.href = '/reset-password'
  }
})