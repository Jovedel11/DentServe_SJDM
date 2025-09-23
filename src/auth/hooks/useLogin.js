import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRecaptcha } from './useRecaptcha'
import { useRateLimit } from './useRateLimit'

export const useLogin = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { executeRecaptchaWithFallback } = useRecaptcha()
  const { checkRateLimit } = useRateLimit()

  // Email + Password Login (Enhanced)
  const loginWithEmailPassword = async (email, password, executeRecaptcha) => {
    setLoading(true)
    setError(null)

    try {
      // Rate limiting check
      const canProceed = await checkRateLimit(email, 'login', 5, 15)
      if (!canProceed) {
        throw new Error('Too many login attempts. Please try again in 15 minutes.')
      }

      // reCAPTCHA verification
      const recaptchaFunction = executeRecaptcha || executeRecaptchaWithFallback
      const recaptchaResult = await recaptchaFunction('login')

      if (!recaptchaResult.verified) {
        throw new Error('Security verification failed. Please try again.')
      }

      // Supabase authentication
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

      console.log('✅ Login successful:', data.user.email)
      await checkRateLimit(email, 'login', 5, 15, true) // Log successful attempt
      return { success: true, user: data.user }

    } catch (error) {
      console.error('❌ Email login error:', error)
      const errorMsg = error?.message || 'Login failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('❌ Logout error:', error)
      return { success: false, error: error.message }
    }
  }

  return {
    loginWithEmailPassword,
    logout,
    loading,
    error
  }
}