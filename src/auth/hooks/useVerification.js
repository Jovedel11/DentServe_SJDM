import { supabase } from '@/lib/supabaseClient'

export const useVerification = {
  // handle email verification callback
  async handleEmailVerification (token, type) {
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      })

      if (verifyError) throw new Error(verifyError?.message || 'Email verification failed')

      // trigger 'handle_email_verification' automatically:
      // 1. Updates email_verified = true in public.users
      // 2. For patients with phone: auto-verifies phone
      // 3. Updates metadata with verification status

      return { success: true, user: data.user }

    } catch (error) {
      console.error('Email verification error:', error)
      return { success: false, error: error.message || 'Email verification failed' }
    } finally {
      setLoading(false)
    }
  },

  // send phone OTP using your database function
  async sendPhoneOTP(userId = null) {
    try {
      const { data, error: otpError } = await supabase
        .rpc('send_phone_verification_otp', { p_user_id: userId })

      if (otpError) throw new Error(otpError?.message || 'Failed to send OTP')

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send OTP')
      }

      return {
        success: true,
        message: 'OTP sent to your phone',
        phone: data.phone,
        otp_for_testing: data.otp_for_testing
      }

    } catch (error) {
      console.error('Send phone OTP error:', error)
      const errorMsg = error?.message || String(error) || 'Failed to send phone OTP'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  },

  // verify phone OTP using your database function
  async verifyPhoneOTP(identifier, otpCode, purpose = 'phone_verification') {
    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase
        .rpc('verify_otp', {
          p_identifier: identifier,
          p_otp_code: otpCode,
          p_purpose: purpose
        })

      if (verifyError) throw new Error(verifyError?.message || 'OTP verification failed')

      if (!data) {
        throw new Error('Invalid or expired OTP code')
      }

      // trigger 'handle_phone_verification' automatically:
      // 1. Updates phone_verified = true in public.users
      // 2. For staff: activates staff profile (is_active = true)
      // 3. Updates metadata with verification status

      return { success: true, verified: true }

    } catch (error) {
      console.error('Phone OTP verification error:', error)
      const errorMsg = error?.message || String(error) || 'Phone verification failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  },

  // manual phone verification with metadata update
  async manualVerifyPhone(userAuthId, phone) {
    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase
        .rpc('verify_phone_with_metadata', {
          p_user_auth_id: userAuthId,
          p_phone: phone
        })

      if (verifyError) throw new Error(verifyError?.message || 'Phone verification update failed')

      return { success: data?.success, data }

    } catch (error) {
      console.error('Manual phone verification error:', error)
      const errorMsg = error?.message || String(error) || 'Manual phone verification failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  },

  // resend email verification
  async resendEmailVerification() {
    setLoading(true)
    setError(null)

    try {
      const { data, error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: (await supabase.auth.getUser()).data.user?.email
      })

      if (resendError) throw new Error(resendError?.message || 'Failed to resend verification email')

      return { success: true, message: 'Verification email sent' }

    } catch (error) {
      console.error('Resend email error:', error)
      const errorMsg = error?.message || String(error) || 'Failed to resend email'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }
}