import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '../context/AuthProvider'

export const useMagicLink = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const { refreshAuthStatus } = useAuth()

  // Handle magic link callback verification
  const handleMagicLinkCallback = async (token, type = 'magiclink') => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      })

      if (verifyError) {
        if (verifyError.message.includes('Token has expired')) {
          throw new Error('This verification link has expired. Please request a new one.')
        }
        if (verifyError.message.includes('Invalid token')) {
          throw new Error('This verification link is invalid. Please try again.')
        }
        throw new Error(verifyError.message)
      }

      // ✅ SUCCESS: User is now logged in and email verified
      setSuccess(true)
      
      // Refresh auth status to get latest verification state
      if (data.user) {
        await refreshAuthStatus(data.user.id)
      }

      return { 
        success: true, 
        user: data.user,
        message: 'Email verified successfully! Welcome to DentalCare.'
      }

    } catch (error) {
      console.error('Magic link verification error:', error)
      const errorMsg = error?.message || 'Verification failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Send magic link for signup
  const sendSignupMagicLink = async (userData) => {
    setLoading(true)
    setError(null)

    try {
      const { authService } = await import('./authService')
      const result = await authService.signUpWithMagicLink(userData)
      
      if (result.success) {
        setSuccess(true)
        return result
      } else {
        throw new Error(result.error)
      }

    } catch (error) {
      console.error('Signup magic link error:', error)
      const errorMsg = error?.message || 'Failed to send verification link'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Send magic link for login
  const sendLoginMagicLink = async (email) => {
    setLoading(true)
    setError(null)

    try {
      const { authService } = await import('./authService')
      const result = await authService.loginWithMagicLink(email)
      
      if (result.success) {
        setSuccess(true)
        return result
      } else {
        throw new Error(result.error)
      }

    } catch (error) {
      console.error('Login magic link error:', error)
      const errorMsg = error?.message || 'Failed to send login link'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  // Reset states
  const resetState = () => {
    setError(null)
    setSuccess(false)
    setLoading(false)
  }

  return {
    handleMagicLinkCallback,
    sendSignupMagicLink,
    sendLoginMagicLink,
    resetState,
    loading,
    error,
    success
  }
}