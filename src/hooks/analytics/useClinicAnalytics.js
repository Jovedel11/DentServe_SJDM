import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';


export const useClinicAnalytics = () => {
  // State management
  const [analyticsData, setAnalyticsData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [topDoctors, setTopDoctors] = useState([]);
  const [mostLoyalPatient, setMostLoyalPatient] = useState(null);
  const [clinicBadges, setClinicBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Auth context
  const { isStaff, isAdmin, profile, user } = useAuth();
  
  // Prevent duplicate requests
  const requestInProgressRef = useRef(false);
  const lastRequestTimeRef = useRef(0);
  
  const getClinicId = useCallback(() => {
    if (!isStaff) return null;
    
    return profile?.role_specific_data?.clinic_id || 
          profile?.clinic_id || 
          profile?.staff_profile?.clinic_id ||
          null;
  }, [isStaff, profile]);

  const fetchClinicAnalytics = useCallback(async (options = {}) => {
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

    // Prevent duplicate requests within 2 seconds
    const now = Date.now();
    if (requestInProgressRef.current || (now - lastRequestTimeRef.current < 2000)) {
      return { success: false, error: 'Request in progress or too soon' };
    }

    try {
      requestInProgressRef.current = true;
      setLoading(true);
      setError(null);

      const {
        clinicId = null,
        dateFrom = null,
        dateTo = null,
        includeComparisons = false,
        includePatientInsights = true
      } = options;

      // Resolve clinic ID
      let targetClinicId = clinicId;
      if (isStaff && !targetClinicId) {
        targetClinicId = getClinicId();
      }

      if (!targetClinicId) {
        throw new Error('Clinic ID is required. Please ensure your profile has clinic access.');
      }

      // Call database function
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

      // Handle authentication errors
      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      // Handle function errors
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch clinic analytics');
      }

      // Update state with successful data
      setAnalyticsData(data);
      lastRequestTimeRef.current = Date.now();

      // Fetch additional data in parallel
      await Promise.all([
        fetchTopDoctors(targetClinicId, dateFrom, dateTo),
        fetchMostLoyalPatient(targetClinicId, dateFrom, dateTo),
        fetchClinicBadges(targetClinicId)
      ]);

      return {
        success: true,
        data: data,
        clinic_info: data.clinic_info || null,
        period_analytics: data.period_analytics || null,
        market_analysis: data.market_analysis || null,
        patient_insights: data.patient_insights || null,
        recommendations: data.recommendations || null
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch clinic analytics';
      setError(errorMessage);
      console.error('[useClinicAnalytics] Error:', {
        error: err,
        message: errorMessage,
        stack: err.stack
      });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
      requestInProgressRef.current = false;
    }
  }, [isStaff, isAdmin, user, getClinicId]);

  /**
   * Fetch top doctors by appointment count
   */
  const fetchTopDoctors = useCallback(async (clinicId, dateFrom, dateTo) => {
    try {
      // First get appointment counts per doctor
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('doctor_id')
        .eq('clinic_id', clinicId)
        .gte('created_at', dateFrom ? new Date(dateFrom).toISOString() : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .lte('created_at', dateTo ? new Date(dateTo).toISOString() : new Date().toISOString())
        .eq('status', 'completed');

      if (apptError) throw apptError;

      // Count appointments per doctor
      const doctorCounts = (appointments || []).reduce((acc, appt) => {
        if (appt.doctor_id) {
          acc[appt.doctor_id] = (acc[appt.doctor_id] || 0) + 1;
        }
        return acc;
      }, {});

      // Get top 5 doctor IDs
      const topDoctorIds = Object.entries(doctorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      if (topDoctorIds.length === 0) {
        setTopDoctors([]);
        return;
      }

      // Fetch doctor details
      const { data: doctors, error: doctorError } = await supabase
        .from('doctors')
        .select('id, first_name, last_name, specialization, image_url')
        .in('id', topDoctorIds);

      if (doctorError) throw doctorError;

      // Combine with counts
      const topDoctorsData = (doctors || []).map(doctor => ({
        doctor_id: doctor.id,
        doctor_name: `${doctor.first_name} ${doctor.last_name}`.trim() || 'Unknown Doctor',
        specialization: doctor.specialization || 'General',
        image_url: doctor.image_url,
        appointment_count: doctorCounts[doctor.id] || 0
      })).sort((a, b) => b.appointment_count - a.appointment_count);

      setTopDoctors(topDoctorsData);
    } catch (error) {
      console.error('[useClinicAnalytics] Error loading top doctors:', error);
      setTopDoctors([]);
    }
  }, []);

  /**
   * Fetch most loyal patient (most appointments)
   */
  const fetchMostLoyalPatient = useCallback(async (clinicId, dateFrom, dateTo) => {
    try {
      // First get appointment counts per patient
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('clinic_id', clinicId)
        .gte('created_at', dateFrom ? new Date(dateFrom).toISOString() : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .lte('created_at', dateTo ? new Date(dateTo).toISOString() : new Date().toISOString())
        .in('status', ['completed', 'confirmed', 'pending']);

      if (apptError) throw apptError;

      // Count appointments per patient
      const patientCounts = (appointments || []).reduce((acc, appt) => {
        if (appt.patient_id) {
          acc[appt.patient_id] = (acc[appt.patient_id] || 0) + 1;
        }
        return acc;
      }, {});

      // Get most loyal patient ID
      const sortedPatients = Object.entries(patientCounts)
        .sort(([, a], [, b]) => b - a);

      if (sortedPatients.length === 0) {
        setMostLoyalPatient(null);
        return;
      }

      const [mostLoyalPatientId, appointmentCount] = sortedPatients[0];

      // Fetch patient details through users and user_profiles
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          user_profiles!inner (
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .eq('id', mostLoyalPatientId)
        .single();

      if (userError) throw userError;

      if (userData && userData.user_profiles) {
        const profile = userData.user_profiles;
        setMostLoyalPatient({
          patient_id: mostLoyalPatientId,
          patient_name: `${profile.first_name} ${profile.last_name}`.trim() || 'Unknown Patient',
          profile_image_url: profile.profile_image_url,
          appointment_count: appointmentCount
        });
      } else {
        setMostLoyalPatient(null);
      }
    } catch (error) {
      console.error('[useClinicAnalytics] Error loading most loyal patient:', error);
      setMostLoyalPatient(null);
    }
  }, []);

  /**
   * Fetch clinic badges
   */
  const fetchClinicBadges = useCallback(async (clinicId) => {
    try {
      const { data, error } = await supabase
        .from('clinic_badge_awards')
        .select(`
          id,
          award_date,
          clinic_badges (
            id,
            badge_name,
            badge_description,
            badge_color,
            badge_icon_url
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_current', true)
        .order('award_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setClinicBadges(data || []);
    } catch (error) {
      console.error('[useClinicAnalytics] Error loading badges:', error);
      setClinicBadges([]);
    }
  }, []);

  /**
   * Fetch clinic resource analytics
   */
  const fetchResourceAnalytics = useCallback(async (options = {}) => {
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
        clinicId = null,
        dateFrom = null,
        dateTo = null,
        includeForecasting = false
      } = options;

      // Resolve clinic ID
      let targetClinicId = clinicId;
      if (isStaff && !targetClinicId) {
        targetClinicId = getClinicId();
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

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch resource analytics');
      }

      setResourceData(data);

      return {
        success: true,
        data: data,
        resource_summary: data.resource_summary || null,
        staffing_analysis: data.staffing_analysis || null
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch resource analytics';
      setError(errorMessage);
      console.error('[useClinicAnalytics] Resource error:', err);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, user, getClinicId]);

  const refresh = useCallback(async (options = {}) => {
    const results = await Promise.allSettled([
      fetchClinicAnalytics(options),
      fetchResourceAnalytics(options)
    ]);

    return {
      analytics: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
      resources: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason }
    };
  }, [fetchClinicAnalytics, fetchResourceAnalytics]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setAnalyticsData(null);
    setResourceData(null);
    setTopDoctors([]);
    setMostLoyalPatient(null);
    setClinicBadges([]);
    setError(null);
    setLoading(false);
  }, []);

  // Derived state with memoization
  const clinicInfo = useMemo(() => analyticsData?.clinic_info || null, [analyticsData]);
  const periodAnalytics = useMemo(() => analyticsData?.period_analytics || null, [analyticsData]);
  const marketAnalysis = useMemo(() => analyticsData?.market_analysis || null, [analyticsData]);
  const patientInsights = useMemo(() => analyticsData?.patient_insights || null, [analyticsData]);
  const recommendations = useMemo(() => analyticsData?.recommendations || [], [analyticsData]);
  const resourceUtilization = useMemo(() => resourceData?.resource_summary || null, [resourceData]);

  // Check if data is available
  const hasData = useMemo(() => !!analyticsData?.clinic_info, [analyticsData]);
  const hasResourceData = useMemo(() => !!resourceData?.resource_summary, [resourceData]);

  return {
    // Raw data
    analyticsData,
    resourceData,
    
    // State
    loading,
    error,
    hasData,
    hasResourceData,
    
    // Derived data
    clinicInfo,
    periodAnalytics,
    marketAnalysis,
    patientInsights,
    recommendations,
    resourceUtilization,
    
    // Additional data
    topDoctors,
    mostLoyalPatient,
    clinicBadges,
    
    // Actions
    fetchClinicAnalytics,
    fetchResourceAnalytics,
    refresh,
    clearError,
    reset
  };
};