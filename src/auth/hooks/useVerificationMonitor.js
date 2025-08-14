import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '../context/AuthProvider'

export const useVerificationMonitor = () => {
  const { user, checkUserProfile } = useAuth()

  useEffect(() => {
    if (!user) return

    // Monitor verification status changes in real-time
    const channel = supabase
      .channel('user-verification-monitor')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `auth_user_id=eq.${user.id}`
        },
        async (payload) => {
          // Re-check profile when verification status changes
          console.log('Verification status updated:', payload)
          await checkUserProfile(user)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id])
}