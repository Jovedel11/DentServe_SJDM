import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useDashboardAnalytics = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(0);
  const cacheRef = useRef(new Map());
  
  const { user, userRole, isPatient, isStaff, isAdmin } = useAuth();

  // ✅ OPTIMIZED: Debounced fetch with caching
  const fetchDashboardData = useCallback(async (userId = null, forceRefresh = false) => {
    try {
      const now = Date.now();
      const cacheKey = `${user?.id}-${userRole}`;
      
      // ✅ AGGRESSIVE CACHING - 5 minutes for dashboard data
      if (!forceRefresh && (now - lastFetchRef.current) < 300000) {
        const cachedData = cacheRef.current.get(cacheKey);
        if (cachedData) {
          return { success: true, data: cachedData, fromCache: true };
        }
      }

      setLoading(true);
      setError(null);

      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        throw new Error('User not authenticated');
      }

      // ✅ SINGLE REQUEST - Get user's internal ID first
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', targetUserId)
        .single();

      if (userError) throw userError;

      const { data, error: rpcError } = await supabase.rpc('get_dashboard_data', {
        p_user_id: userRow.id
      });

      if (rpcError) throw new Error(rpcError.message);

      // ✅ LIGHTWEIGHT PROCESSING - Minimal data transformation
      let processedData = null;

      if (isPatient()) {
        processedData = {
          type: 'patient',
          profile_completion: data.profile_completion,
          upcoming_appointments: data.upcoming_appointments || [],
          recent_appointments: data.recent_appointments || [],
          quick_stats: data.quick_stats || {},
          notifications: data.notifications || []
        };
      } else if (isStaff()) {
        processedData = {
          type: 'staff',
          clinic_info: data.clinic_info,
          todays_appointments: data.todays_appointments || [],
          pending_feedback: data.pending_feedback || 0,
          growth_analytics: data.growth_analytics
        };
      } else if (isAdmin()) {
        processedData = {
          type: 'admin',
          system_overview: data.system_overview,
          growth_analytics: data.growth_analytics,
          performance_metrics: data.performance_metrics
        };
      }

      // ✅ CACHE RESULTS
      cacheRef.current.set(cacheKey, processedData);
      lastFetchRef.current = now;
      setDashboardData(processedData);

      return {
        success: true,
        data: processedData,
        fromCache: false
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, userRole, isPatient, isStaff, isAdmin]);

  // ✅ SMART REFRESH - Clear cache and refetch
  const refreshDashboard = useCallback(() => {
    cacheRef.current.clear();
    lastFetchRef.current = 0;
    return fetchDashboardData(null, true);
  }, [fetchDashboardData]);

  // ✅ CONDITIONAL AUTO-FETCH - Only when needed
  useEffect(() => {
    if (user && userRole && !dashboardData) {
      fetchDashboardData();
    }
  }, [user, userRole, dashboardData, fetchDashboardData]);

  return {
    dashboardData,
    loading,
    error,
    hasData: !!dashboardData,
    dashboardType: dashboardData?.type,
    fetchDashboardData,
    refreshDashboard
  };
};