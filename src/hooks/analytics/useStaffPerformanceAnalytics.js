import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useStaffPerformanceAnalytics = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isStaff, isAdmin, user, profile } = useAuth();

  const fetchStaffPerformanceAnalytics = useCallback(async (options = {}) => {
    // ✅ Access control
    if (!user) {
      const error = 'Authentication required';
      setError(error);
      return { success: false, error };
    }

    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
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

      // ✅ Use current user ID for staff, require explicit ID for admin
      let targetStaffId = staffId;
      if (isStaff && !targetStaffId) {
        targetStaffId = user.id;
      }

      const { data, error: rpcError } = await supabase.rpc('get_staff_performance_analytics', {
        p_staff_id: targetStaffId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_include_comparisons: includeComparisons
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ Handle authentication response
      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      // ✅ Handle current stub implementation
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch staff performance analytics');
      }

      setPerformanceData(data);

      return {
        success: true,
        data: data,
        // ✅ WARNING: These may not exist until function is fully implemented
        staff_info: data.staff_info || null,
        performance_metrics: data.performance_metrics || null,
        comparisons: data.comparisons || null,
        recommendations: data.recommendations || null,
        message: data.message // Current stub response
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch staff performance analytics';
      setError(errorMessage);
      console.error('Staff performance analytics error:', err);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, user]);

  // ✅ Check if function is implemented
  const isImplemented = useCallback(() => {
    return !!(performanceData?.staff_info || performanceData?.performance_metrics);
  }, [performanceData]);

  return {
    // State
    performanceData,
    loading,
    error,
    
    // Derived data (may be null until function is implemented)
    staffInfo: performanceData?.staff_info || null,
    performanceMetrics: performanceData?.performance_metrics || null,
    comparisons: performanceData?.comparisons || null,
    
    // Status
    isImplemented: isImplemented(),
    
    // Actions
    fetchStaffPerformanceAnalytics,
    refresh: () => fetchStaffPerformanceAnalytics(),
    clearError: () => setError(null)
  };
};