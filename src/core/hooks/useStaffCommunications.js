// useStaffCommunications.js
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useStaffCommunications = () => {
  const { isStaff, isAdmin } = useAuth();
  
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    starred: 0
  });

  // Fetch communications from email_communications table
  const fetchCommunications = useCallback(async (options = {}) => {
    if (!isStaff && !isAdmin) {
      return { success: false, error: 'Access denied: Staff only' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('email_communications')
        .select(`
          *,
          from_user:from_user_id(id, email, user_profiles(first_name, last_name)),
          to_user:to_user_id(id, email, user_profiles(first_name, last_name)),
          appointment:appointment_id(id, appointment_date, appointment_time)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match component expectations
      const transformedCommunications = data.map(comm => ({
        ...comm,
        from_user: {
          name: `${comm.from_user?.user_profiles?.first_name} ${comm.from_user?.user_profiles?.last_name}`.trim() || 'Unknown',
          email: comm.from_user?.email
        },
        priority: comm.email_type === 'urgent' ? 'high' : 'medium',
        is_starred: false // Add starred functionality as needed
      }));

      setCommunications(transformedCommunications);
      
      // Calculate stats
      setStats({
        total: transformedCommunications.length,
        unread: transformedCommunications.filter(c => !c.is_read).length,
        starred: transformedCommunications.filter(c => c.is_starred).length
      });

      return { success: true, communications: transformedCommunications };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  const markAsRead = useCallback(async (communicationId) => {
    try {
      const { error } = await supabase
        .from('email_communications')
        .update({ is_read: true })
        .eq('id', communicationId);

      if (error) throw error;

      setCommunications(prev => prev.map(comm => 
        comm.id === communicationId ? { ...comm, is_read: true } : comm
      ));

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const toggleStar = useCallback(async (communicationId) => {
    // For now, just update local state - you can add DB field later
    setCommunications(prev => prev.map(comm => 
      comm.id === communicationId ? { ...comm, is_starred: !comm.is_starred } : comm
    ));
    return { success: true };
  }, []);

  const deleteCommunication = useCallback(async (communicationId) => {
    try {
      const { error } = await supabase
        .from('email_communications')
        .delete()
        .eq('id', communicationId);

      if (error) throw error;

      setCommunications(prev => prev.filter(comm => comm.id !== communicationId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const sendReply = useCallback(async (originalId, replyText) => {
    // Implementation here - would create new email_communications record
    console.log('Reply functionality not implemented yet');
    return { success: true };
  }, []);

  const refresh = useCallback(() => {
    return fetchCommunications({ refresh: true });
  }, [fetchCommunications]);

  const searchCommunications = useCallback((query) => {
    return communications.filter(comm => 
      comm.subject?.toLowerCase().includes(query.toLowerCase()) ||
      comm.message_body?.toLowerCase().includes(query.toLowerCase()) ||
      comm.from_user?.name?.toLowerCase().includes(query.toLowerCase())
    );
  }, [communications]);

  useEffect(() => {
    if (isStaff || isAdmin) {
      fetchCommunications();
    }
  }, [isStaff, isAdmin, fetchCommunications]);

  return {
    communications,
    loading,
    error,
    stats,
    fetchCommunications,
    markAsRead,
    toggleStar,
    deleteCommunication,
    sendReply,
    refresh,
    loadMore: () => {}, // Implement pagination if needed
    searchCommunications
  };
};