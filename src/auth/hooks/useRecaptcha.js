import { useState, useEffect } from 'react'

export const useRecaptcha = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // load reCAPTCHA script
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`
    script.onload = () => {
      setIsLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const executeRecaptcha = async (action) => {
    if (!isLoaded || !window.grecaptcha) {
      console.warn('reCAPTCHA not loaded')
      return null
    }

    try {
      await window.grecaptcha.ready()
      const token = await window.grecaptcha.execute(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY,
        { action }
      )
      return token
    } catch (error) {
      console.error('reCAPTCHA execution error:', error)
      return null
    }
  }

  return { executeRecaptcha, isLoaded }
}