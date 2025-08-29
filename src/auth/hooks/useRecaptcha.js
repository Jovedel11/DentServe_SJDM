import { useState, useEffect } from 'react'
import { recaptchaService } from '@/services/recaptchaServices'

// Global state to prevent multiple script loads
let scriptLoaded = false
let scriptLoading = false

export const useRecaptcha = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    const loadRecaptcha = () => {
      // Check if reCAPTCHA is already available
      if (window.grecaptcha && window.grecaptcha.ready) {
        console.log('✅ reCAPTCHA already loaded');
        setIsLoaded(true)
        return
      }

      // Check if script is already loaded or loading
      if (scriptLoaded) {
        setIsLoaded(true)
        return
      }

      if (scriptLoading) {
        console.log('⏳ reCAPTCHA script loading...');
        // Wait for the script to load
        const checkLoaded = () => {
          if (window.grecaptcha && window.grecaptcha.ready) {
            setIsLoaded(true)
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
        return
      }

      // Load the script
      console.log('📥 Loading reCAPTCHA script...');
      scriptLoading = true
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        console.log('✅ reCAPTCHA script loaded successfully');
        scriptLoaded = true
        scriptLoading = false
        setIsLoaded(true)
      }
      
      script.onerror = () => {
        console.error('❌ Failed to load reCAPTCHA script');
        scriptLoading = false
      }
      
      document.head.appendChild(script)
    }

    loadRecaptcha()
  }, [])

  const executeRecaptcha = async (action) => {
    if (!isLoaded || !window.grecaptcha) {
      console.warn('⚠️ reCAPTCHA not loaded');
      throw new Error('reCAPTCHA not loaded. Please wait a moment and try again.')
    }

    try {
      setIsVerifying(true)
      console.log(`🔄 Generating reCAPTCHA token for action: ${action}`);
      console.log("SITE KEY:", import.meta.env.VITE_RECAPTCHA_SITE_KEY);

      // Generate token from Google
      const token = await new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(
            import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            { action }
          ).then(resolve).catch(reject)
        })
      })

      if (!token) {
        throw new Error('Failed to generate reCAPTCHA token')
      }

      console.log('✅ Token generated, sending to Express server...');

      // Verify token with server
      const verification = await recaptchaService.verifyToken(token, action)

      if (!verification.success) {
        throw new Error(verification.error || 'reCAPTCHA verification failed')
      }

      console.log('🎉 reCAPTCHA verification complete:', {
        action,
        score: verification.score
      })

      return {
        token,
        score: verification.score,
        verified: true
      }

    } catch (error) {
      console.error('❌ reCAPTCHA execution error:', error)
      throw error
    } finally {
      setIsVerifying(false)
    }
  }

  const executeRecaptchaWithFallback = async (action, maxRetries = 2) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 reCAPTCHA attempt ${attempt} for ${action}`);
        return await executeRecaptcha(action)
      } catch (error) {
        lastError = error
        console.warn(`⚠️ reCAPTCHA attempt ${attempt} failed:`, error.message)
        
        if (attempt < maxRetries) {
          console.log(`⏳ Waiting before retry ${attempt + 1}...`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    
    throw lastError
  }

  return { 
    executeRecaptcha, 
    executeRecaptchaWithFallback,
    isLoaded, 
    isVerifying 
  }
}