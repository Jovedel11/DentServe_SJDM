import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useStaffPerformanceAnalytics = () => {
  // State
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Auth context
  const { isStaff, isAdmin, user } = useAuth();

  const fetchStaffPerformanceAnalytics = useCallback(async (options = {}) => {
    // Validation
    if (!user) {
      const errorMsg = 'Authentication required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (!isStaff && !isAdmin) {
      const errorMsg = 'Access denied: Staff or Admin required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setLoading(true);
      setError(null);

      const {
        staffId = null,
        dateFrom = null,
        dateTo = null,
        includeComparisons = false
      } = options;

      let targetStaffId = staffId;
      if (isStaff && !targetStaffId) {
        targetStaffId = user.id;
      }

      if (!targetStaffId && isAdmin) {
        throw new Error('Staff ID is required for admin');
      }

      // Call database function
      const { data, error: rpcError } = await supabase.rpc('get_staff_performance_analytics', {
        p_staff_id: targetStaffId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_include_comparisons: includeComparisons
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch staff performance analytics');
      }

      setPerformanceData(data);

      return {
        success: true,
        data: data,
        staff_info: data.staff_info || null,
        performance_metrics: data.performance_metrics || null,
        comparisons: data.comparisons || null,
        recommendations: data.recommendations || []
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch staff performance analytics';
      setError(errorMessage);
      console.error('[useStaffPerformanceAnalytics] Error:', err);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, user]);


  const refresh = useCallback((options = {}) => {
    return fetchStaffPerformanceAnalytics(options);
  }, [fetchStaffPerformanceAnalytics]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setPerformanceData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Derived state
  const staffInfo = useMemo(() => performanceData?.staff_info || null, [performanceData]);
  const performanceMetrics = useMemo(() => performanceData?.performance_metrics || null, [performanceData]);
  const comparisons = useMemo(() => performanceData?.comparisons || null, [performanceData]);
  const recommendations = useMemo(() => performanceData?.recommendations || [], [performanceData]);
  
  // Check if data is available
  const hasData = useMemo(() => 
    !!(performanceData?.staff_info || performanceData?.performance_metrics), 
    [performanceData]
  );

  return {
    // Raw data
    performanceData,
    
    // State
    loading,
    error,
    hasData,
    
    // Derived data
    staffInfo,
    performanceMetrics,
    comparisons,
    recommendations,
    
    // Actions
    fetchStaffPerformanceAnalytics,
    refresh,
    clearError,
    reset
  };
};