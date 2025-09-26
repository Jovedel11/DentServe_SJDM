import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useClinicSystem = () => {
  const { user, profile } = useAuth();
  
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

  // ✅ FIXED: Use proper find_nearest_clinics function
  const discoverClinics = useCallback(async (location = null, options = {}) => {
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
      if (!data?.success) throw new Error(data?.error || 'Failed to discover clinics');

      const clinics = data.data?.clinics || [];
      setState(prev => ({ ...prev, clinics, loading: false }));

      return { success: true, clinics, count: clinics.length };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message, clinics: [] };
    }
  }, []);

  // ✅ FIXED: Get clinic details with proper data structure
  const getClinicDetails = useCallback(async (clinicId) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get clinic basic info
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select(`
          *,
          clinic_badge_awards!left (
            id,
            is_current,
            award_date,
            clinic_badges (
              id,
              badge_name,
              badge_description,
              badge_icon_url,
              badge_color
            )
          )
        `)
        .eq('id', clinicId)
        .eq('is_active', true)
        .single();

      if (clinicError) throw new Error(clinicError.message);

      // Get services for this clinic
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('name');

      if (servicesError) throw new Error(servicesError.message);
    
      // Get doctors for this clinic
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctor_clinics')
        .select(`
          is_active,
          schedule,
          doctors!inner (
            id,
            first_name,
            last_name,
            specialization,
            experience_years,
            consultation_fee,
            rating,
            total_reviews,
            is_available,
            profile_image_url,
            bio
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .eq('doctors.is_available', true);

      if (doctorError) throw new Error(doctorError.message);

      // Process doctors data
      const doctors = doctorData?.map(dc => ({
        ...dc.doctors,
        schedule: dc.schedule,
        clinic_active: dc.is_active,
        display_name: `Dr. ${dc.doctors.first_name} ${dc.doctors.last_name}`
      })) || [];

      // Process clinic with badges
      const processedClinic = {
        ...clinic,
        badges: clinic.clinic_badge_awards
          ?.filter(award => award.is_current && award.clinic_badges)
          ?.map(award => ({
            id: award.clinic_badges.id,
            name: award.clinic_badges.badge_name,
            description: award.clinic_badges.badge_description,
            icon_url: award.clinic_badges.badge_icon_url,
            color: award.clinic_badges.badge_color,
            award_date: award.award_date
          })) || []
      };

      setState(prev => ({
        ...prev,
        selectedClinic: processedClinic,
        doctors,
        services,
        loading: false
      }));

      return { success: true, clinic: processedClinic, doctors, services };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, []);

  // ✅ FIXED: Search clinics with proper filtering
  const searchClinics = useCallback(async (query, options = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Use find_nearest_clinics with search capabilities
      const { data, error } = await supabase.rpc('find_nearest_clinics', {
        user_location: null,
        max_distance_km: options.maxDistance || 100,
        limit_count: options.limit || 50,
        services_filter: query ? [query] : null,
        min_rating: options.minRating || null
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Search failed');

      const clinics = data.data?.clinics || [];
      
      // Additional client-side filtering for search query
      const filtered = query 
        ? clinics.filter(clinic =>
            clinic.name?.toLowerCase().includes(query.toLowerCase()) ||
            clinic.address?.toLowerCase().includes(query.toLowerCase()) ||
            clinic.city?.toLowerCase().includes(query.toLowerCase())
          )
        : clinics;

      setState(prev => ({ ...prev, clinics: filtered, loading: false }));
      return { success: true, clinics: filtered, count: filtered.length };
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message, clinics: [] };
    }
  }, []);

  // ✅ FIXED: Update search filters with validation
  const updateFilters = useCallback((newFilters) => {
    setState(prev => ({
      ...prev,
      searchFilters: { 
        ...prev.searchFilters, 
        ...newFilters,
        maxDistance: Math.min(Math.max(newFilters.maxDistance || prev.searchFilters.maxDistance, 1), 100),
        minRating: Math.min(Math.max(newFilters.minRating || prev.searchFilters.minRating, 0), 5)
      }
    }));
  }, []);

  // ✅ ADDED: Get current user's location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    discoverClinics,
    getClinicDetails,
    searchClinics,
    updateFilters,
    getCurrentLocation,
    
    // Computed
    hasLocation: !!(profile?.location || state.searchFilters.userLocation),
    nearestClinic: state.clinics[0] || null,
    totalClinics: state.clinics.length,
    
    // Utilities
    clearError: () => setState(prev => ({ ...prev, error: null })),
    resetFilters: () => setState(prev => ({
      ...prev,
      searchFilters: {
        maxDistance: 50,
        services: [],
        minRating: 0,
        sortBy: 'distance'
      }
    }))
  };
};