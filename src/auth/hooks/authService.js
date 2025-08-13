import { supabase } from "../../lib/supabaseClient";
import { validateStrongPassword } from "@/auth/validation/rules/typicalRules";
import { phoneUtils } from "@/utils/phoneUtils";
import { useRecaptcha } from "./useRecaptcha";

const generateTempPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export const authService = {
  // sign up new user
  async signUpUser(userData) {
    const { executeRecaptcha } = useRecaptcha();
    try {

      validateStrongPassword(userData.password);

      let normalizedPhone = null;
      if (userData.phone) {
        normalizedPhone = phoneUtils.normalizePhilippinePhone(userData.phone);
        if (!phoneUtils.isValidPhilippinePhone(normalizedPhone)) {
          throw new Error('Invalid Philippine phone number format');
        }
      }

      // execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha('patient_signup')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      // validate required fields
      if (!userData.email || !userData.password || !userData.first_name || !userData.last_name) {
        throw new Error('Please fill in all required fields')
      }

      // email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userData.email)) {
        throw new Error('Please enter a valid email address')
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            user_type: 'patient',
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: normalizedPhone,
            date_of_birth: userData.date_of_birth,
            gender: userData.gender,
            emergency_contact_name: userData.emergency_contact_name,
            emergency_contact_phone: userData.emergency_contact_phone,
            insurance_provider: userData.insurance_provider,
            medical_conditions: userData.medical_conditions || [],
            allergies: userData.allergies || [],
            recaptcha_token: recaptchaToken
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=patient`
        }
      })

      if (signupError) throw signupError

      return {
        success: true,
        user: data.user,
        message: 'Please check your email to verify your account. For patients with phone numbers, phone verification will be automatic after email confirmation.'
      }

    } catch (error) {
      console.error('Patient signup error:', error)
      return { success: false, error: error.message }
    }
  },

    // for staff invitation
  async staffInvitation(inviteData) {
        try {
      // only admins can invite staff - your RLS policies enforce this
      if (!inviteData.email || !inviteData.first_name || !inviteData.last_name || !inviteData.clinic_id) {
        throw new Error('Please fill in all required fields')
      }

      // Generate temporary password
      const tempPassword = generateTempPassword()

      const { data, error: signupError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: tempPassword,
        options: {
          data: {
            user_type: 'staff',
            first_name: inviteData.first_name,
            last_name: inviteData.last_name,
            clinic_id: inviteData.clinic_id,
            position: inviteData.position || 'Staff',
            department: inviteData.department,
            employee_id: inviteData.employee_id,
            hire_date: inviteData.hire_date || new Date().toISOString().split('T')[0],
            temp_password: tempPassword,
            invited_by: 'admin'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=staff&temp_password=${encodeURIComponent(tempPassword)}`
        }
      })

      if (signupError) throw signupError

      // Your trigger creates staff profile with is_active = false
      // They become active after phone verification

      return {
        success: true,
        tempPassword,
        message: `Staff invitation sent to ${inviteData.email}. Temporary password: ${tempPassword}`
      }

    } catch (error) {
      console.error('Staff invitation error:', error)
      return { success: false, error: error.message }
    }
  },

  // admin invitation
  async adminInvitation(inviteData) {
    try {
      const tempPassword = generateTempPassword()

      const { data, error: signupError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: tempPassword,
        options: {
          data: {
            user_type: 'admin',
            first_name: inviteData.first_name,
            last_name: inviteData.last_name,
            access_level: inviteData.access_level || 1,
            temp_password: tempPassword,
            phone: inviteData.phone, // required for admin
            invited_by: 'super_admin'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=admin&temp_password=${encodeURIComponent(tempPassword)}`
        }
      })

      if (signupError) throw signupError

      return {
        success: true,
        tempPassword,
        message: `Admin invitation sent. Temporary password: ${tempPassword}`
      }

    } catch (error) {
      console.error('Admin invitation error:', error)
      return { success: false, error: error.message }
    }
  },

  // reset pass
  async resetPassword(email) {
    try {
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`
        }
      )

      if (resetError) throw resetError

      return {
        success: true,
        message: 'Password reset link sent to your email'
      }

    } catch (error) {
      console.error('Password reset request error:', error)
      return { success: false, error: error.message }
    }
  },

  // update pass
  async updatePassword(newPassword) {
    try {
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      return { success: true, message: 'Password updated successfully' }

    } catch (error) {
      console.error('Password update error:', error)
      return { success: false, error: error.message }
    }
  },
}