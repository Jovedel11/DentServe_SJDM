import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../context/AuthProvider';

export const useVerificationMonitor = () => {
  const { user, refreshAuthStatus } = useAuth();

  useEffect(() => {
    if (!user) return;

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
          console.log('Verification status updated:', payload);
          // Use the enhanced refresh with force update
          setTimeout(() => {
            refreshAuthStatus(user.id, true);
          }, 500);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, refreshAuthStatus]);
};