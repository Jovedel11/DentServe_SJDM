import { useState, useEffect } from 'react'

// Global state to prevent multiple script loads
let scriptLoaded = false
let scriptLoading = false

export const useRecaptcha = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadRecaptcha = () => {
      // Check if reCAPTCHA is already available
      if (window.grecaptcha && window.grecaptcha.ready) {
        setIsLoaded(true)
        return
      }

      // Check if script is already loaded or loading
      if (scriptLoaded) {
        setIsLoaded(true)
        return
      }

      if (scriptLoading) {
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
      scriptLoading = true
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        scriptLoaded = true
        scriptLoading = false
        setIsLoaded(true)
      }
      
      script.onerror = () => {
        scriptLoading = false
        console.error('Failed to load reCAPTCHA script')
      }
      
      document.head.appendChild(script)
    }

    loadRecaptcha()
  }, [])

  const executeRecaptcha = async (action) => {
    if (!isLoaded || !window.grecaptcha) {
      console.warn('reCAPTCHA not loaded')
      return null
    }

    try {
      return new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(
            import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            { action }
          ).then(resolve).catch(reject)
        })
      })
    } catch (error) {
      console.error('reCAPTCHA execution error:', error)
      return null
    }
  }

  return { executeRecaptcha, isLoaded }
}