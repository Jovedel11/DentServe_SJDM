import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export const useVerification = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // handle email verification callback
  const handleEmailVerification = async (token, type) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      })

      if (verifyError) throw verifyError

      // trigger 'handle_email_verification' automatically:
      // 1. Updates email_verified = true in public.users
      // 2. For patients with phone: auto-verifies phone
      // 3. Updates metadata with verification status

      return { success: true, user: data.user }

    } catch (error) {
      console.error('Email verification error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // send phone OTP using your database function
  const sendPhoneOTP = async (userId = null) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: otpError } = await supabase
        .rpc('send_phone_verification_otp', { p_user_id: userId })

      if (otpError) throw otpError

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send OTP')
      }

      return {
        success: true,
        message: 'OTP sent to your phone',
        phone: data.phone,
        // remove in production:
        otp_for_testing: data.otp_for_testing
      }

    } catch (error) {
      console.error('Send phone OTP error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // verify phone OTP using your database function
  const verifyPhoneOTP = async (identifier, otpCode, purpose = 'phone_verification') => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase
        .rpc('verify_otp', {
          p_identifier: identifier,
          p_otp_code: otpCode,
          p_purpose: purpose
        })

      if (verifyError) throw verifyError

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
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // manual phone verification with metadata update
  const manualVerifyPhone = async (userAuthId, phone) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase
        .rpc('verify_phone_with_metadata', {
          p_user_auth_id: userAuthId,
          p_phone: phone
        })

      if (verifyError) throw verifyError

      return { success: data?.success, data }

    } catch (error) {
      console.error('Manual phone verification error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // resend email verification
  const resendEmailVerification = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: (await supabase.auth.getUser()).data.user?.email
      })

      if (resendError) throw resendError

      return { success: true, message: 'Verification email sent' }

    } catch (error) {
      console.error('Resend email error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    handleEmailVerification,
    sendPhoneOTP,
    verifyPhoneOTP,
    manualVerifyPhone,
    resendEmailVerification,
    loading,
    error
  }
}