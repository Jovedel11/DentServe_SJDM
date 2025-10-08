import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useRateLimitManagement = () => {
  const [rateLimits, setRateLimits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isAdmin } = useAuth();

  // Fetch all rate limit records
  const fetchRateLimits = useCallback(async (options = {}) => {
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);
      
      const {
        actionType = null,
        limit = 100,
        offset = 0
      } = options;

      let query = supabase
        .from('rate_limits')
        .select('*', { count: 'exact' })
        .order('last_attempt', { ascending: false });

      if (actionType) {
        query = query.eq('action_type', actionType);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) throw new Error(queryError.message);

      setRateLimits(data || []);

      return {
        success: true,
        data: data,
        count: count
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch rate limits';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  //Check rate limit for a user
  const checkRateLimit = useCallback(async (userIdentifier, actionType, maxAttempts = 5, timeWindowMinutes = 60) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('check_rate_limit', {
        p_user_identifier: userIdentifier,
        p_action_type: actionType,
        p_max_attempts: maxAttempts,
        p_time_window_minutes: timeWindowMinutes,
        p_success: false
      });

      if (rpcError) throw new Error(rpcError.message);

      return {
        success: true,
        data: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to check rate limit';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Clear rate limit for a user
  const clearRateLimit = useCallback(async (userIdentifier, actionType = null) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('rate_limits')
        .delete()
        .eq('user_identifier', userIdentifier);

      if (actionType) {
        query = query.eq('action_type', actionType);
      }

      const { error: deleteError } = await query;

      if (deleteError) throw new Error(deleteError.message);

      // Refresh rate limits list
      await fetchRateLimits();

      return {
        success: true,
        message: 'Rate limit cleared successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to clear rate limit';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchRateLimits]);

  return {
    // State
    rateLimits,
    loading,
    error,
    
    // Methods
    fetchRateLimits,
    checkRateLimit,
    clearRateLimit
  };
};