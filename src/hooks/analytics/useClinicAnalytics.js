import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useClinicAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isStaff, isAdmin, profile, user } = useAuth();

  const fetchClinicAnalytics = useCallback(async (options = {}) => {
    // ✅ ENHANCED: Better validation
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
        clinicId = null,
        dateFrom = null,
        dateTo = null,
        includeComparisons = false,
        includePatientInsights = false
      } = options;

      // ✅ ENHANCED: Better clinic ID resolution
      let targetClinicId = clinicId;
      if (isStaff && !targetClinicId) {
        // Try multiple ways to get clinic ID for staff
        targetClinicId = profile?.role_specific_data?.clinic_id || 
                        profile?.clinic_id || 
                        profile?.staff_profile?.clinic_id;
      }

      if (!targetClinicId) {
        throw new Error('Clinic ID is required. Please ensure your profile has clinic access.');
      }

      const { data, error: rpcError } = await supabase.rpc('get_clinic_growth_analytics', {
        p_clinic_id: targetClinicId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_include_comparisons: includeComparisons,
        p_include_patient_insights: includePatientInsights
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ FIXED: Handle authentication response
      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      // ✅ CORRECTED: Handle stub implementation response
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch clinic analytics');
      }

      // ✅ FIXED: Handle the current stub response format
      // Since the function only returns a success message, we store what we get
      setAnalyticsData(data);

      return {
        success: true,
        data: data,
        // ✅ WARNING: These fields may not exist until functions are fully implemented
        clinic_info: data.clinic_info || null,
        period_analytics: data.period_analytics || null,
        market_analysis: data.market_analysis || null,
        patient_insights: data.patient_insights || null,
        recommendations: data.recommendations || null,
        message: data.message // Current stub returns only a message
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch clinic analytics';
      setError(errorMessage);
      console.error('Clinic analytics error:', err);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, profile, user]);

  const fetchResourceAnalytics = useCallback(async (options = {}) => {
    // ✅ ENHANCED: Better validation  
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
      
      const {
        clinicId = null,
        dateFrom = null,
        dateTo = null,
        includeForecasting = false
      } = options;

      // ✅ ENHANCED: Better clinic ID resolution
      let targetClinicId = clinicId;
      if (isStaff && !targetClinicId) {
        targetClinicId = profile?.role_specific_data?.clinic_id || 
                        profile?.clinic_id || 
                        profile?.staff_profile?.clinic_id;
      }

      if (!targetClinicId) {
        throw new Error('Clinic ID is required for resource analytics');
      }

      const { data, error: rpcError } = await supabase.rpc('get_clinic_resource_analytics', {
        p_clinic_id: targetClinicId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_include_forecasting: includeForecasting
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ FIXED: Handle authentication response
      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      // ✅ CORRECTED: Handle stub implementation
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch resource analytics');
      }

      setResourceData(data);

      return {
        success: true,
        data: data,
        message: data.message // Current stub response
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch resource analytics';
      setError(errorMessage);
      console.error('Resource analytics error:', err);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, profile, user]);

  // ✅ NEW: Check if functions are fully implemented
  const isFunctionalityComplete = useCallback(() => {
    return {
      growth_analytics: analyticsData?.clinic_info ? true : false,
      resource_analytics: resourceData?.resource_utilization ? true : false,
      is_stub_response: !!(analyticsData?.message && !analyticsData?.clinic_info)
    };
  }, [analyticsData, resourceData]);

  return {
    // State
    analyticsData,
    resourceData,
    loading,
    error,
    
    // Derived data (may be null until functions are implemented)
    clinicInfo: analyticsData?.clinic_info || null,
    periodAnalytics: analyticsData?.period_analytics || null,
    marketAnalysis: analyticsData?.market_analysis || null,
    patientInsights: analyticsData?.patient_insights || null,
    resourceUtilization: resourceData?.resource_utilization || null,
    staffingAnalysis: resourceData?.staffing_analysis || null,
    
    // Status
    functionalityStatus: isFunctionalityComplete(),
    
    // Actions
    fetchClinicAnalytics,
    fetchResourceAnalytics,
    refresh: () => Promise.all([fetchClinicAnalytics(), fetchResourceAnalytics()]),
    clearError: () => setError(null)
  };
};