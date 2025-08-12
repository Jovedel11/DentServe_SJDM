import { supabase, handleSupabaseError } from "../../../supabaseClient";
import { validateStrongPassword, validateStrongPasswordThrow } from "@/auth/validation/rules/typicalRules";
import { phoneUtils } from "@/utils/phoneUtils";

export const authService = {

  // check if user is verified
  async checkVerificationStatus(user) {
    const emailVerified = user?.email_confirmed_at !== null;

    let phoneVerificationRequired = false; // for staff
    let phoneVerified = true; // default for patient

    try {
      if (emailVerified) {
        const { data: userRole } = await supabase.rpc('get_current_user_role');

        if (userRole === 'staff' || userRole === 'admin') {
          phoneVerificationRequired = true;

          const { data: userData } = await supabase
            .from('users')
            .select('phone_verified')
            .eq('auth_user_id', user?.id)
            .single();

          phoneVerified = userData?.phone_verified || false;

        }
      }
    } catch (error) {
      console.warn('Error checking verification status:', error);
    }

    return {
      emailVerified,
      phoneVerified,
      needsEmailVerification: !emailVerified,
      needsPhoneVerification: phoneVerificationRequired && !phoneVerified,
      canLogin: emailVerified && (!phoneVerificationRequired || phoneVerified)
    }
  },

  // to check rate limit for OTP requests
  async checkRateLimit(identifier, action_type = 'login', max_attempts = 3, time_window = 15) {
    try {
          const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_identifier: identifier,
        p_action_type: action_type,
        p_max_attempts: max_attempts,
        p_time_window_minutes: time_window
      })

    if (rateLimitError) throw rateLimitError;
    if (!rateLimitCheck) {
      const blockTime = action_type === 'login' ? '15 minutes' : 
                      action_type === 'otp_request' ? '15 minutes' :
                      action_type === 'phone_verification' ? '10 minutes' : '1 hour';
    throw new Error(`Too many attempts. Please wait ${blockTime} before trying again.`);
    }
    return true;
    } catch (error) {
      console.error("Rate limit check failed:", error);
      throw error;
    }
  },
  // email/password login
  async signInWithPassword(identifier, password, rememberMe = false) {
    try {
      await this.checkRateLimit(identifier, 'login', 5, 15)

      // login email first then phone if email fails
      let loginResult;

      if (identifier.includes('@')) {
        loginResult = await supabase.auth.signInWithPassword({
          email: identifier,
          password
        });
      } else {
        // phone login depends on email logged in
        const normalizedPhone = phoneUtils.normalizePhilippinePhone(identifier);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('phone', normalizedPhone)
          .eq('is_active', true)
          .single();

          if (userError && !userData) throw new Error('User not found or inactive');

        // email login
        loginResult = await supabase.auth.signInWithPassword({
          email: userData.email,
          password
        });
      }

      if (loginResult.error) throw loginResult.error;

      const user = loginResult?.data?.user;
      // check verification
      const verificationStatus = await this.checkVerificationStatus(user);

      if (!verificationStatus.canLogin) {
        // sign out if not verified
        await supabase.auth.signOut();

        let message = "Account verification required. ";
        if (!verificationStatus.emailVerified) message += "Please verify your email. ";
        if (!verificationStatus.phoneVerified) message += "Please verify your phone. ";
        
        throw new Error(message);

      }

      // set remember me status
      if (rememberMe) {
        localStorage.setItem('supabase.auth.remember_me', true);
        console.log('User opted for remember me');
      } else {
        localStorage.removeItem('supabase.auth.remember_me');
        console.log('User opted out of remember me');
      }

      // get user role
      const { data: userRole, error: roleError } = await supabase.rpc('get_current_user_role');

      if (roleError) throw roleError;
      if (!userRole) throw new Error('User role not found or inactive');

      return {
        user,
        userRole,
        rememberMe,
        verificationStatus,
        error: null
      }
    } catch (error) {
      return { user: null, userRole: null, rememberMe: false, verificationStatus: null, error: handleSupabaseError(error) }
    }
  },

  // generate and send OTP
  async sendOTP(identifier, type = 'email') {
    try {
      // check the rate limit
      await this.checkRateLimit(identifier, 'otp_request', 3, 15)

      if (type === 'phone') {
        const normalizedPhone = phoneUtils.normalizePhilippinePhone(identifier);
        if (!phoneUtils.isValidPhilippinePhone(normalizedPhone)) {
          throw new Error('Invalid Philippine phone number format');
        }
        // send phone OTP via Twilio in supabase
        const { error } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: {
            shouldCreateUser: false
          }
        });
        if (error) throw error;
      } else {
        // send email OTP by custom function
        const { error } = await supabase.rpc('generate_otp', {
          p_identifier: identifier,
          p_identifier_type: type,
          p_purpose: 'login'
        });
        if (error) throw error;
      }

      // well continue this logic, if using generate_otp function it should be send the email
      // but for now rely on supabase magic link as fallback

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },
  
  // verify OTP and login
  async verifyOTPToken(identifier, otpCode, type = 'email', rememberMe = false) {
    try {
      let user;

      if (type === 'phone') {
        // verify phone otp in supabase
        const { data, error } = await supabase.auth.verifyOtp({
          phone: identifier,
          token: otpCode,
          type: 'sms'
        });
        if (error) throw error;
        user = data?.user;
      } else {
        // verify email otp in custom function
        const { data: isValid, error } = await supabase.rpc('verify_otp', {
          p_identifier: identifier,
          p_otp_code: otpCode,
          p_purpose: 'login'
        });
        if (error) throw error;
        if (!isValid) throw new Error('Invalid OTP');

        // get user and create session with magic link
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, auth_user_id')
          .eq('email', identifier)
          .eq('is_active', true)
          .single();

        if (userError && !userData) throw new Error('User not found or inactive');

        // create session
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: 'dummy' // wont work
        });

        if (signInError) throw signInError;

        // using admin api to create session
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.email
        });

        if (sessionError) throw sessionError;

        // for email, wait the user to click the magic link
        return {
          success: true,
          requireEmailVerification: true,
          message: "Please check your email for the magic link to complete the login process.",
          magicLink: sessionData?.properties?.action_link,
          error: null
        }
      }

      // check verification status for phone otp login
      if (user) {
        const verificationStatus = await this.checkVerificationStatus(user);

        if (!verificationStatus.canLogin) {
          await supabase.auth.signOut();

          let message = "Account verification required. ";
          if (!verificationStatus.emailVerified) message += "Please verify your email. ";
          if (!verificationStatus.phoneVerified) message += "Please verify your phone. ";
          
          throw new Error(message);
        }

        if (rememberMe) {
          localStorage.setItem('supabase.auth.remember_me', 'true');
        }

        return {
          success: true,
          user: user,
          rememberMe,
          verificationStatus,
          error: null
        }
      }

      return {
        success: false,
        error: 'Login failed'
      }
    } catch (error) {
      return {
        success: false,
        user: null,
        rememberMe: false,
        error: handleSupabaseError(error)
      };
    }

  },

  // sign up new user
  async signUpUser(userData) {
    try {

      validateStrongPassword(userData.password);

      let normalizedPhone = null;
      if (userData.phone) {
        normalizedPhone = phoneUtils.normalizePhilippinePhone(userData.phone);
        if (!phoneUtils.isValidPhilippinePhone(normalizedPhone)) {
          throw new Error('Invalid Philippine phone number format');
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: normalizedPhone,
            user_type: userData.userType || 'patient'
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('An account with this email already exists. Please try logging in instead.');
        }
        throw error;
      }

      if (data?.user) {
        let retries = 0;
        const maxRetries = 5;
        let profile = null;

        while (retries < maxRetries && !profile) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1))); // progressive delay
          
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('id, user_profiles(id, user_type)')
            .eq('auth_user_id', data.user.id)
            .single();

          if (!profileError && profileData?.user_profiles) {
            profile = profileData;
            break;
          }
          
          retries++;
        }

        if (!profile) {
          console.warn('Profile creation may have failed - user might need manual setup');
        }
      }

      return { 
        user: data?.user,
        session: data?.session,
        needsEmailConfirmation: !data?.session || !data?.user?.email_confirmed_at,
        needsPhoneVerification: false,
        error: null
      };
    } catch (error) {
      return { 
        user: null, 
        session: null,
        needsEmailConfirmation: false, 
        needsPhoneVerification: false,
        error: handleSupabaseError(error) 
      };
    }
  },

  // verification code in signup
  async sendPhoneVerification(phone) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to verify your phone number');
      }

      const normalizedPhone = phoneUtils.normalizePhilippinePhone(phone);
      if (!phoneUtils.isValidPhilippinePhone(normalizedPhone)) {
        throw new Error('Invalid Philippine phone number format');
      }

      await this.checkRateLimit(normalizedPhone, 'phone_verification', 3, 10);

      const { error } = await supabase.auth.updateUser({
        phone: normalizedPhone
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  // verify phone for signup
  async verifyPhoneSignup(phone, token) {
    try {
      const normalizedPhone = phoneUtils.normalizePhilippinePhone(phone);

      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: token,
        type: 'phone_change'
      });

      if (error) throw error;

      // if verification successful, update the users phone in their profile
      if (data?.user) {
        // update the phone in your users table
        const { error: updateError } = await supabase
          .from('users')
          .update({ phone: normalizedPhone, phone_verified: true })
          .eq('auth_user_id', data.user.id);

        if (updateError) {
          console.warn('Failed to update phone in users table:', updateError);
        }
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  // reset pass
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  // update pass
  async updatePassword(newPassword) {
    try {
      validateStrongPasswordThrow(newPassword);

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  // for staff and admin invite
  async inviteUser(email, userType, clinicId = null) {
    try {
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          user_type: userType,
          clinic_id: clinicId // for staff
        },
        redirectTo: `${window.location.origin}/complete-invitation`
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  // sign out user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      localStorage.removeItem('supabase.auth.remember_me');

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  async getRememberMeStatus() {
    return localStorage.getItem('supabase.auth.remember_me') === 'true';
  }
}