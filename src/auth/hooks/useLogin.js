import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRecaptcha } from './useRecaptcha'
import { useRateLimit } from './useRateLimit'
import { phoneUtils } from "@/utils/phoneUtils"

export const useLogin = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { executeRecaptcha } = useRecaptcha()
  const { checkRateLimit } = useRateLimit()

  // Method 1: Email + Password
  const loginWithEmailPassword = async (email, password, executeRecaptcha) => {
    setLoading(true)
    setError(null)

    try {
      const canProceed = await checkRateLimit(email, 'login', 5, 15)
      if (!canProceed) {
        throw new Error('Too many login attempts. Please try again in 15 minutes.')
      }

      const recaptchaToken = await executeRecaptcha('login')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password')
        }
        if (loginError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before logging in')
        }
        throw new Error(loginError.message)
      }

      // ✅ SIMPLIFIED: Just return success, let AuthProvider handle navigation
      return { success: true, user: data.user }

    } catch (error) {
      console.error('Email login error:', error)
      const errorMsg = error?.message || 'Email login failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Method 2: Phone + Password  
  const loginWithPhonePassword = async (phone, password) => {
    setLoading(true)
    setError(null)

    try {
      // ✅ FIX: Add rate limiting
      const canProceed = await checkRateLimit(phone, 'login', 5, 15)
      if (!canProceed) {
        throw new Error('Too many login attempts. Please try again in 15 minutes.')
      }

      const recaptchaToken = await executeRecaptcha('login')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      // ✅ FIX: Use proper phone normalization
      const normalizedPhone = phoneUtils.normalizePhilippinePhone(phone)
      if (!phoneUtils.isValidPhilippinePhone(normalizedPhone)) {
        throw new Error('Invalid Philippine phone number format')
      }
      
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone, // ✅ Already in +63XXXXXXXXX format
        password
      })

      if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid phone number or password')
        }
        if (loginError.message.includes('Phone not confirmed')) {
          throw new Error('Please verify your phone number before logging in')
        }
        throw new Error(loginError.message)
      }

      // Check if user profile is complete and all verifications are done
      const { data: profileData } = await supabase.rpc('is_user_profile_complete')

      if (!profileData?.can_use_app) {
        return { 
          success: true, 
          user: data.user, 
          needsVerification: true,
          profileData: profileData 
        }
      }

      return { success: true, user: data.user }

    } catch (error) {
      console.error('Phone login error:', error)
      const errorMsg = error?.message || 'Phone login failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Method 3: Email + OTP
  const loginWithEmailOTP = async (email) => {
    setLoading(true)
    setError(null)

    try {
      // ✅ FIX: Add rate limiting
      const canProceed = await checkRateLimit(email, 'otp_request', 3, 60)
      if (!canProceed) {
        throw new Error('Too many OTP requests. Please try again in 1 hour.')
      }

      const recaptchaToken = await executeRecaptcha('otp_request')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      })

      if (otpError) {
        if (otpError.message.includes('User not found')) {
          throw new Error('No account found with this email address')
        }
        throw new Error(otpError.message)
      }

      return { 
        success: true, 
        message: 'OTP sent to your email. Please check and enter the code.' 
      }

    } catch (error) {
      console.error('Email OTP error:', error)
      const errorMsg = error?.message || 'Email OTP failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Method 4: Phone + OTP
  const loginWithPhoneOTP = async (phone) => {
    setLoading(true)
    setError(null)

    try {
      // ✅ FIX: Add rate limiting
      const canProceed = await checkRateLimit(phone, 'otp_request', 3, 60)
      if (!canProceed) {
        throw new Error('Too many OTP requests. Please try again in 1 hour.')
      }

      const recaptchaToken = await executeRecaptcha('otp_request')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      // ✅ FIX: Use proper phone normalization
      const normalizedPhone = phoneUtils.normalizePhilippinePhone(phone)
      if (!phoneUtils.isValidPhilippinePhone(normalizedPhone)) {
        throw new Error('Invalid Philippine phone number format')
      }
      
      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: false
        }
      })

      if (otpError) {
        if (otpError.message.includes('User not found')) {
          throw new Error('No account found with this phone number')
        }
        throw new Error(otpError.message)
      }

      return { 
        success: true, 
        message: 'OTP sent to your phone. Please enter the code.' 
      }

    } catch (error) {
      console.error('Phone OTP error:', error)
      const errorMsg = error?.message || 'Phone OTP failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP for login
  const verifyLoginOTP = async (identifier, token, type = 'email') => {
    setLoading(true)
    setError(null)

    try {
      let verifyData
      
      if (type === 'email') {
        verifyData = { email: identifier, token, type: 'email' }
      } else {
        // ✅ FIX: Use proper phone normalization
        const normalizedPhone = phoneUtils.normalizePhilippinePhone(identifier)
        verifyData = { phone: normalizedPhone, token, type: 'sms' }
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp(verifyData)

      if (verifyError) {
        if (verifyError.message.includes('Token has expired')) {
          throw new Error('OTP has expired. Please request a new one.')
        }
        if (verifyError.message.includes('Invalid token')) {
          throw new Error('Invalid OTP. Please check and try again.')
        }
        throw new Error(verifyError.message)
      }

      // Check if user profile is complete and all verifications are done
      const { data: profileData } = await supabase.rpc('is_user_profile_complete')

      if (!profileData?.can_use_app) {
        return { 
          success: true, 
          user: data.user, 
          needsVerification: true,
          profileData: profileData 
        }
      }

      return { success: true, user: data.user }

    } catch (error) {
      console.error('OTP verification error:', error)
      const errorMsg = error?.message || 'OTP verification failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      return { success: false, error: error.message }
    }
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