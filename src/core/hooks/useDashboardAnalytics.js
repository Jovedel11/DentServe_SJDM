import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useDashboardAnalytics = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);
  
  const { user, userRole, isPatient, isStaff, isAdmin, profile } = useAuth();

  // ✅ Enhanced dashboard data fetching with role-specific analytics
  const fetchDashboardData = useCallback(async (userId = null, forceRefresh = false) => {
    try {
      // ✅ Prevent spam requests
      const now = Date.now();
      if (!forceRefresh && (now - lastFetch) < 30000) { // 30 seconds throttle
        return dashboardData ? { success: true, data: dashboardData, fromCache: true } : null;
      }

      setLoading(true);
      setError(null);

      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        throw new Error('User not authenticated');
      }

      // ✅ Get user's internal ID
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', targetUserId)
        .maybeSingle();

      if (userError) throw userError;
      if (!userRow) throw new Error('User profile not found');

      const { data, error: rpcError } = await supabase.rpc('get_dashboard_data', {
        p_user_id: userRow.id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ Handle different response structures based on role
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

      setDashboardData(processedData);
      setLastFetch(now);

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
  }, [user, userRole, isPatient, isStaff, isAdmin, lastFetch, dashboardData]);

  // ✅ Role-specific dashboard refresh
  const refreshDashboard = useCallback(() => {
    setLastFetch(0); // Reset throttle
    return fetchDashboardData(null, true);
  }, [fetchDashboardData]);

  // ✅ Auto-fetch on mount and role change
  useEffect(() => {
    if (user && userRole) {
      fetchDashboardData();
    }
  }, [user, userRole]);

  return {
    // State
    dashboardData,
    loading,
    error,
    
    // Derived state
    hasData: !!dashboardData,
    dashboardType: dashboardData?.type,
    
    // Actions
    fetchDashboardData,
    refreshDashboard
  };
};