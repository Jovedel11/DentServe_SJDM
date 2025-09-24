import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useClinicAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isStaff, isAdmin, profile } = useAuth();

  const fetchClinicAnalytics = useCallback(async (options = {}) => {
    // ✅ Role validation
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

      // ✅ Use current clinic for staff, require explicit clinic for admin
      let targetClinicId = clinicId;
      if (isStaff && !targetClinicId) {
        targetClinicId = profile?.role_specific_data?.clinic_id;
      }

      if (!targetClinicId) {
        throw new Error('Clinic ID is required');
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

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch clinic analytics');
      }

      setAnalyticsData(data);

      return {
        success: true,
        data: data,
        clinic_info: data.clinic_info,
        period_analytics: data.period_analytics,
        market_analysis: data.market_analysis,
        patient_insights: data.patient_insights,
        recommendations: data.recommendations
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch clinic analytics';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, profile]);

  const fetchResourceAnalytics = useCallback(async (options = {}) => {
    // ✅ Role validation
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      const {
        clinicId = null,
        dateFrom = null,
        dateTo = null,
        includeForecasting = false
      } = options;

      // ✅ Use current clinic for staff
      let targetClinicId = clinicId;
      if (isStaff && !targetClinicId) {
        targetClinicId = profile?.role_specific_data?.clinic_id;
      }

      if (!targetClinicId) {
        throw new Error('Clinic ID is required');
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

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch resource analytics');
      }

      setResourceData(data);

      return {
        success: true,
        data: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch resource analytics';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [isStaff, isAdmin, profile]);

  return {
    // State
    analyticsData,
    resourceData,
    loading,
    error,
    
    // Derived data
    clinicInfo: analyticsData?.clinic_info,
    periodAnalytics: analyticsData?.period_analytics,
    marketAnalysis: analyticsData?.market_analysis,
    patientInsights: analyticsData?.patient_insights,
    resourceUtilization: resourceData?.resource_utilization,
    staffingAnalysis: resourceData?.staffing_analysis,
    
    // Actions
    fetchClinicAnalytics,
    fetchResourceAnalytics
  };
};