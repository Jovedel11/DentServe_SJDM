import { th } from "zod/v4/locales";
import { supabase, handleSupabaseError } from "../../../supabaseClient";

export const authService = {

  // to check rate limit for OTP requests
  async checkRateLimit(identifier, action_type = 'login', max_attempts = 3, time_window = 15) {
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_identifier: identifier,
        p_action_type: action_type,
        p_max_attempts: max_attempts,
        p_time_window_minutes: time_window
      })

    if (rateLimitError) throw rateLimitError;
    if (!rateLimitCheck) throw new Error('Rate limit exceeded. Please try again later.');
    const blockTime = action_type === 'login' ? '15 minutes' : 
                      action_type === 'otp_request' ? '15 minutes' : '1 hour';
    throw new Error(`Too many attempts. Please wait ${blockTime} before trying again.`);
  },
  // email/password login
  async signInWithPassword(email, password) {
    try {
      // check the rate limit
      await this.checkRateLimit(email, 'login', 5, 15)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error;

      // get user role
      const { data: userRole, error: roleError } = await supabase.rpc('get_current_user_role');

      if (roleError) throw roleError;
      if (!userRole) throw new Error('User role not found or inactive');

      return {
        user: data?.user,
        userRole,
        error: null
      }
    } catch (error) {
      return { user: null, userRole: null, error: handleSupabaseError(error) }
    }
  },

  // generate and send OTP
  async sendOTP(identifier, type = 'email') {
    try {
      // check the rate limit
      await this.checkRateLimit(identifier, 'otp_request', 3, 15)

      // generate OTP
      const { error } = await supabase.rpc('generate_otp', {
        p_identifier: identifier,
        p_identifier_type: type,
        p_purpose: 'login'
      })

      if (error) throw error;

      // OTP is automatically stored in otp table
      return { success: true, error: null }

    } catch (error) {
      return { success: false, error: handleSupabaseError(error) }
    }
  },
  
  // verify OTP and login
  async verifyOTPToken(identifier, otpCode,  type = 'email') {
    try {
      const { data: isValid, error } = await supabase.rpc('verify_otp', {
        p_identifier: identifier,
        p_otp_code: otpCode,
        p_purpose: 'login'
      })

      if (error) throw error;
      if (!isValid) throw new Error('Invalid OTP code');

      // get user for session creation
      const { data: user } = await supabase
        .from('users')
        .select('auth_user_id, email')
        .eq(type === 'email' ? 'email' : 'phone', identifier)
        .eq('is_active', true)
        .single();

        if (!user) throw new Error('User not found or inactive');

        // session via magic link
        const { error: linkError } = await supabase.auth.signInWithOtp({
          email: user.email,
          options: { shouldCreateUser: false }
        })

        if (linkError) throw linkError;

      return { success: true, user, error: null }
    } catch (error) {
      return { success: false, user: null, error: handleSupabaseError(error) }
    }
  },

  // sign up new user
  async signUpUser(userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            user_type: userData.userType || 'patient',
          }
        }
      })

      if (error) throw error;
      return { user: data?.user, error: null };

    } catch (error) {
      return { user: null, error: handleSupabaseError(error) };
    }
  },

  // sing out user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

}