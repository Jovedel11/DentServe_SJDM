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


// ✅ COMPLETELY FIXED: handleSupabaseError function
export const handleSupabaseError = (error) => {
  console.error('Supabase Error:', error);
  
  // Handle null/undefined errors
  if (!error) return 'An unknown error occurred';
  
  // Handle ZodError
  if (error.name === 'ZodError') {
    const messages = error.errors.map(e => e.message).join(', ');
    return `Validation error: ${messages}`;
  }
  
  // ✅ FIXED: Check if error has message property first
  let errorMessage = 'An unexpected error occurred';
  
  if (error.message && typeof error.message === 'string') {
    errorMessage = error.message;
    
    // ✅ FIXED: Use .includes() instead of .include()
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    
    if (errorMessage.includes('Email rate limit exceeded')) {
      return 'Too many attempts. Please wait before trying again.';
    }
    
    if (errorMessage.includes('User already registered')) {
      return 'An account with this email already exists.';
    }
    
    if (errorMessage.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    
    if (errorMessage.includes('confirmation email')) {
      return 'Unable to send confirmation email. Please check your email address or try again later.';
    }
    
    if (errorMessage.includes('Invalid email')) {
      return 'Please enter a valid email address.';
    }
    
    return errorMessage;
  }
  
  // Handle status-based errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 422:
        return 'Email already exists or invalid data provided.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `Server error (${error.status}). Please try again.`;
    }
  }
  
  // Handle error objects with different structures
  if (error.error_description) {
    return error.error_description;
  }
  
  if (error.msg) {
    return error.msg;
  }
  
  // Return the error as string if it's a string
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
};