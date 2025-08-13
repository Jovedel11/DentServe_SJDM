import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export const useRateLimit = () => {
  const [rateLimited, setRateLimited] = useState(false)
  const [error, setError] = useState(null)

  const checkRateLimit = async (userIdentifier, actionType, maxAttempts, timeWindowMinutes) => {
    try {
      const { data, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          p_user_identifier: userIdentifier,
          p_action_type: actionType,
          p_max_attempts: maxAttempts,
          p_time_window_minutes: timeWindowMinutes
        })

      if (rateLimitError) throw rateLimitError

      if (!data) {
        setRateLimited(true)
        setError(`Rate limit exceeded for ${actionType}. Please try again later.`)
        return false
      }

      setRateLimited(false)
      setError(null)
      return true

    } catch (error) {
      console.error('Rate limit check error:', error)
      setError('Rate limit check failed')
      return false
    }
  }

  return { checkRateLimit, rateLimited, error }
}