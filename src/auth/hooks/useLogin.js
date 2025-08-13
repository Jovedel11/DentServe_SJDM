import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRecaptcha } from './useRecaptcha'

export const useLogin = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { executeRecaptcha } = useRecaptcha()

  // Method 1: Email + Password
  const loginWithEmailPassword = async (email, password) => {
    setLoading(true)
    setError(null)

    try {
      const recaptchaToken = await executeRecaptcha('login')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (loginError) throw loginError

      // Check if user profile is complete and both verifications are done
      const { data: profileData } = await supabase
        .rpc('is_user_profile_complete')

      if (!profileData?.complete) {
        throw new Error('Please complete your profile verification first')
      }

      return { success: true, user: data.user }

    } catch (error) {
      console.error('Email login error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Method 2: Phone + Password  
  const loginWithPhonePassword = async (phone, password) => {
    setLoading(true)
    setError(null)

    try {
      const recaptchaToken = await executeRecaptcha('login')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '')
      
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        phone: `+${cleanPhone}`,
        password
      })

      if (loginError) throw loginError

      return { success: true, user: data.user }

    } catch (error) {
      console.error('Phone login error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Method 3: Email + OTP
  const loginWithEmailOTP = async (email) => {
    setLoading(true)
    setError(null)

    try {
      const recaptchaToken = await executeRecaptcha('otp_request')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // Only allow existing users to login via OTP
        }
      })

      if (otpError) throw otpError

      return { 
        success: true, 
        message: 'OTP sent to your email. Please check and enter the code.' 
      }

    } catch (error) {
      console.error('Email OTP error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Method 4: Phone + OTP
  const loginWithPhoneOTP = async (phone) => {
    setLoading(true)
    setError(null)

    try {
      const recaptchaToken = await executeRecaptcha('otp_request')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      const cleanPhone = phone.replace(/\D/g, '')
      
      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+${cleanPhone}`,
        options: {
          shouldCreateUser: false
        }
      })

      if (otpError) throw otpError

      return { 
        success: true, 
        message: 'OTP sent to your phone. Please enter the code.' 
      }

    } catch (error) {
      console.error('Phone OTP error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP for login
  const verifyLoginOTP = async (identifier, token, type = 'email') => {
    setLoading(true)
    setError(null)

    try {
      const verifyData = type === 'email' 
        ? { email: identifier, token, type: 'email' }
        : { phone: identifier, token, type: 'sms' }

      const { data, error: verifyError } = await supabase.auth.verifyOtp(verifyData)

      if (verifyError) throw verifyError

      return { success: true, user: data.user }

    } catch (error) {
      console.error('OTP verification error:', error)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Logout error:', error)
  }

  return {
    loginWithEmailPassword,
    loginWithPhonePassword,
    loginWithEmailOTP,
    loginWithPhoneOTP,
    verifyLoginOTP,
    logout,
    loading,
    error
  }
}