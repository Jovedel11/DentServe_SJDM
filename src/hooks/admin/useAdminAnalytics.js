import { useState, useCallback, useEffect } from 'react'; // Add useEffect
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useAdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isAdmin } = useAuth();

  // ✅ DEBUG: Log when analytics state changes
  useEffect(() => {
    console.log("📊 [useAdminAnalytics] analytics state updated:", analytics);
  }, [analytics]);

  const fetchSystemAnalytics = useCallback(async (options = {}) => {
    console.log("🔍 [Analytics Hook] isAdmin:", isAdmin);
    
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      console.error("❌ [Analytics Hook] Not admin!");
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);
      
      const {
        dateFrom = null,
        dateTo = null,
        includeTrends = true,
        includePerformance = true
      } = options;

      console.log("📡 [Analytics Hook] Calling RPC with params:", {
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      const { data, error: rpcError } = await supabase.rpc('get_admin_system_analytics', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_include_trends: includeTrends,
        p_include_performance: includePerformance
      });

      console.log("📊 [Analytics Hook] RPC Response:", { data, error: rpcError });

      if (rpcError) throw new Error(rpcError.message);

      console.log("📊 [Analytics Hook] Setting analytics state to:", data); // ✅ ADD THIS
      setAnalytics(data);

      return {
        success: true,
        data: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch analytics';
      console.error("❌ [Analytics Hook] Error:", err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  return {
    // State
    analytics,
    loading,
    error,
    
    // Methods
    fetchSystemAnalytics
  };
};