import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { useLocationService } from './useLocationService';
import { useClinicDiscovery } from './useClinicDiscovery';
import { supabase } from '@/lib/supabaseClient';

export const useClinicSystem = () => {
  const { user, profile } = useAuth();
  const { userLocation, getCurrentLocation } = useLocationService();
  const { 
    discoverClinics, 
    searchClinics: searchClinicsDiscovery, 
    getClinicDetails,
    loading: discoveryLoading,
    error: discoveryError
  } = useClinicDiscovery();
  
  const [state, setState] = useState({
    selectedClinic: null,
    searchFilters: {
      maxDistance: 50,
      services: [],
      minRating: 0,
      sortBy: 'distance'
    }
  });

  // Use discovery hook for clinic discovery
  const findNearestClinics = useCallback(async (location = null, options = {}) => {
    const searchLocation = location || userLocation;
    
    if (!searchLocation) {
      // Try to get current location if not available
      try {
        const currentLoc = await getCurrentLocation();
        return await discoverClinics(currentLoc, options);
      } catch (error) {
        // Fall back to discovery without location
        return await discoverClinics(null, options);
      }
    }
    
    return await discoverClinics(searchLocation, options);
  }, [userLocation, getCurrentLocation, discoverClinics]);

  // Use discovery hook for clinic search
  const searchClinics = useCallback(async (query, options = {}) => {
    return await searchClinicsDiscovery(query);
  }, [searchClinicsDiscovery]);

  // Get clinic details (pass through to discovery hook)
  const getClinicDetail = useCallback(async (clinicId) => {
    const result = await getClinicDetails(clinicId);
    
    if (result.success) {
      setState(prev => ({ ...prev, selectedClinic: result.clinic }));
    }
    
    return result;
  }, [getClinicDetails]);

  // Update search filters
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

  // Use proper RPC function for advanced search
  const advancedClinicSearch = useCallback(async (searchParams) => {
    const {
      latitude,
      longitude,
      maxDistance = 25,
      requiredServices = [],
      minRating = null,
      sortBy = 'distance',
      limit = 15
    } = searchParams;

    try {
      const { data, error } = await supabase.rpc('search_clinics_by_location_and_services', {
        search_lat: latitude,
        search_lng: longitude,
        max_distance_km: maxDistance,
        required_services: requiredServices.length > 0 ? requiredServices : null,
        min_rating: minRating,
        sort_by: sortBy,
        limit_count: limit
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Advanced search failed');
      }

      return {
        success: true,
        clinics: data.data?.clinics || [],
        metadata: data.data?.search_metadata || {}
      };
    } catch (error) {
      console.error('Advanced clinic search error:', error);
      return { 
        success: false, 
        error: error.message || 'Advanced search failed',
        clinics: [] 
      };
    }
  }, []);

  return {
    // State
    ...state,
    loading: discoveryLoading,
    error: discoveryError,
    
    // Actions
    findNearestClinics,
    searchClinics,
    getClinicDetail,
    updateFilters,
    advancedClinicSearch,
    
    // Computed
    hasLocation: !!(userLocation?.latitude && userLocation?.longitude),
    
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