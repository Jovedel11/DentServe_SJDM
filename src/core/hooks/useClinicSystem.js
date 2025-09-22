import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useClinicSystem = () => {
  const { userLocation } = useAuth();
  
  const [state, setState] = useState({
    clinics: [],
    selectedClinic: null,
    doctors: [],
    services: [],
    loading: false,
    error: null,
    searchFilters: {
      maxDistance: 50,
      services: [],
      minRating: 0,
      sortBy: 'distance'
    }
  });

  // 🎯 DISCOVER CLINICS (Location-based)
  const discoverClinics = useCallback(async (location = userLocation, options = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.rpc('find_nearest_clinics', {
        user_location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        max_distance_km: options.maxDistance || 50,
        limit_count: options.limit || 20,
        services_filter: options.services || null,
        min_rating: options.minRating || null
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      const clinics = data.data.clinics || [];
      setState(prev => ({ ...prev, clinics, loading: false }));

      return { success: true, clinics };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [userLocation]);

  // 🎯 GET CLINIC DETAILS
  const getClinicDetails = useCallback(async (clinicId) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data: clinic, error } = await supabase
        .from('clinics')
        .select(`
          *,
          services(*),
          doctor_clinics(
            doctors(*)
          )
        `)
        .eq('id', clinicId)
        .single();

      if (error) throw error;

      const doctors = clinic.doctor_clinics?.map(dc => dc.doctors).filter(Boolean) || [];
      const services = clinic.services || [];

      setState(prev => ({
        ...prev,
        selectedClinic: clinic,
        doctors,
        services,
        loading: false
      }));

      return { success: true, clinic, doctors, services };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, []);

  // 🎯 SEARCH CLINICS
  const searchClinics = useCallback(async (query) => {
    const filtered = state.clinics.filter(clinic =>
      clinic.name.toLowerCase().includes(query.toLowerCase()) ||
      clinic.address.toLowerCase().includes(query.toLowerCase())
    );

    return { success: true, clinics: filtered };
  }, [state.clinics]);

  // 🎯 UPDATE SEARCH FILTERS
  const updateFilters = useCallback((newFilters) => {
    setState(prev => ({
      ...prev,
      searchFilters: { ...prev.searchFilters, ...newFilters }
    }));
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    discoverClinics,
    getClinicDetails,
    searchClinics,
    updateFilters,
    
    // Computed
    hasLocation: !!(userLocation?.latitude && userLocation?.longitude),
    nearestClinic: state.clinics[0] || null,
    totalClinics: state.clinics.length
  };
};