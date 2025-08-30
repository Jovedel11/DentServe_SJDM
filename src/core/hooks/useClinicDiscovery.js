import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/context/AuthProvider";
import { useLocationService } from "./useLocationService";
import { supabase } from "../../lib/supabaseClient";

export const useClinicDiscovery = () => {
  const { userLocation } = useLocationService();
  const { user, profile, isPatient } = useAuth();

  const [clinics, setClinics] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState({
    maxDistance: 25, // kilometers
    services: [],
    minRating: 0,
    badges: [],
    availableToday: false,
    sortBy: "distance", // distance, rating, name, availability
    searchQuery: ""
  });

  // Rate limiting for search requests
  const rateLimitSearch = useCallback(async () => {
    if (!user?.email) return true;

    try {
      const { data: canSearch } = await supabase.rpc('check_rate_limit', {
        p_user_identifier: user.email,
        p_action_type: 'clinic_search',
        p_max_attempts: 10,
        p_time_window_minutes: 5
      });

      if (!canSearch) {
        throw new Error('Too many search requests. Please wait a moment.');
      }

      return true;
    } catch (error) {
      const errorMsg = error?.message || 'Search rate limit error';
      setError(errorMsg);
      return false;
    }
  }, [user?.email]);

  // Discover nearby clinics using PostGIS
  const discoverClinics = useCallback(async (location = null, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Rate limiting check
      const canProceed = await rateLimitSearch();
      if (!canProceed) return [];

      const searchLocation = location || userLocation;
      const searchOptions = { ...searchFilter, ...options };

      let locationPoint = null;
      if (searchLocation && searchLocation.latitude && searchLocation.longitude) {
        // PostGIS requires longitude first, then latitude
        locationPoint = `POINT(${searchLocation.longitude} ${searchLocation.latitude})`;
      }

      // Use the find_nearest_clinics function
      const { data: nearbyClinicData, error: clinicError } = await supabase.rpc('find_nearest_clinics', {
        user_location: locationPoint,
        max_distance_km: searchOptions.maxDistance,
        limit_count: 50
      });

      if (clinicError) {
        throw new Error(clinicError.message || 'Failed to fetch nearby clinics');
      }

      if (!nearbyClinicData || nearbyClinicData.length === 0) {
        setClinics([]);
        setFilteredClinics([]);
        return [];
      }

      // Get detailed clinic information with doctors
      const clinicIds = nearbyClinicData.map(clinic => clinic.id);
      
      const { data: detailedClinics, error: detailError } = await supabase
        .from('clinics')
        .select(`
          *,
          doctor_clinics!inner (
            is_active,
            doctors (
              id, 
              specialization, 
              is_available, 
              consultation_fee, 
              experience_years,
              user_profiles (
                first_name,
                last_name
              )
            )
          )
        `)
        .in('id', clinicIds)
        .eq('is_active', true)
        .eq('doctor_clinics.is_active', true);

      if (detailError) {
        throw new Error(detailError.message || 'Failed to fetch clinic details');
      }

      // Merge distance/badge data with detailed clinic data
      const enrichedClinics = nearbyClinicData.map(nearbyClinic => {
        const detailedClinic = detailedClinics?.find(dc => dc.id === nearbyClinic.id);

        if (!detailedClinic) return null;

        // Extract doctor information
        const doctors = detailedClinic.doctor_clinics?.map(dc => ({
          ...dc.doctors,
          name: dc.doctors.user_profiles?.first_name 
            ? `Dr. ${dc.doctors.user_profiles.first_name} ${dc.doctors.user_profiles.last_name}`
            : `Dr. ${dc.doctors.specialization}`
        })) || [];

        // Calculate availability
        const availableDoctors = doctors.filter(doc => doc.is_available);
        const specializations = [...new Set(doctors.map(doc => doc.specialization))];
        
        // Calculate fee range
        const fees = doctors.map(doc => doc.consultation_fee).filter(fee => fee != null);
        const feeRange = fees.length > 0 ? {
          min: Math.min(...fees),
          max: Math.max(...fees)
        } : { min: 0, max: 0 };

        return {
          ...nearbyClinic, // This includes distance_km and badges from the function
          ...detailedClinic,
          doctors,
          availableDoctors: availableDoctors.length,
          specializations,
          consultationFeeRange: feeRange,
          // Ensure badges is always an array
          badges: nearbyClinic.badges || []
        };
      }).filter(Boolean); // Remove any null entries

      setClinics(enrichedClinics);
      return enrichedClinics;

    } catch (error) {
      console.error('Clinic discovery error:', error);
      const errorMsg = error?.message || 'Clinic discovery failed';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userLocation, searchFilter, rateLimitSearch]);

  // Apply filters to clinics
  const applyFilters = useCallback((clinicsToFilter, filters) => {
    return clinicsToFilter.filter(clinic => {
      // Service filter
      if (filters.services.length > 0) {
        const clinicServices = clinic.services_offered || [];
        const hasRequiredServices = filters.services.every(service => 
          clinicServices.some(offered => 
            offered.toLowerCase().includes(service.toLowerCase())
          )
        );
        if (!hasRequiredServices) return false;
      }

      // Rating filter
      if (filters.minRating > 0 && (clinic.rating || 0) < filters.minRating) {
        return false;
      }

      // Badge filter
      if (filters.badges.length > 0) {
        const clinicBadgeNames = clinic.badges?.map(badge => badge.badge_name) || [];
        const hasRequiredBadges = filters.badges.some(badge => 
          clinicBadgeNames.includes(badge)
        );
        if (!hasRequiredBadges) return false;
      }

      // Available today filter
      if (filters.availableToday && clinic.availableDoctors === 0) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase().trim();
        const searchableText = [
          clinic.name,
          clinic.address,
          clinic.city,
          ...(clinic.specializations || []),
          ...(clinic.services_offered || [])
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, []);

  // Sort clinics based on criteria
  const sortClinics = useCallback((clinicsToSort, sortBy) => {
    const sorted = [...clinicsToSort];

    switch (sortBy) {
      case 'distance':
        return sorted.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
      
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      case 'availability':
        return sorted.sort((a, b) => (b.availableDoctors || 0) - (a.availableDoctors || 0));
      
      default:
        return sorted;
    }
  }, []);

  // Update search filters
  const updateSearchFilter = useCallback((newFilters) => {
    setSearchFilter(prevFilter => ({
      ...prevFilter,
      ...newFilters
    }));
  }, []);

  // Search clinics by query
  const searchClinics = useCallback(async (searchQuery) => {
    updateSearchFilter({ searchQuery: searchQuery || '' });
  }, [updateSearchFilter]);

  // Get clinic details with available doctors
  const getClinicDetails = useCallback(async (clinicId) => {
    try {
      setLoading(true);
      setError(null);

      const { data: clinic, error } = await supabase
        .from('clinics')
        .select(`
          *,
          doctor_clinics!inner (
            is_active,
            schedule,
            doctors (
              id,
              specialization,
              consultation_fee,
              experience_years,
              is_available,
              user_profiles (
                first_name,
                last_name
              )
            )
          )
        `)
        .eq('id', clinicId)
        .eq('is_active', true)
        .single();

      if (error) throw new Error(error.message);

      // Transform doctor data
      const doctors = clinic.doctor_clinics?.map(dc => ({
        ...dc.doctors,
        schedule: dc.schedule,
        name: dc.doctors.user_profiles?.first_name 
          ? `Dr. ${dc.doctors.user_profiles.first_name} ${dc.doctors.user_profiles.last_name}`
          : `Dr. ${dc.doctors.specialization}`,
        isActive: dc.is_active
      })) || [];

      return {
        ...clinic,
        doctors: doctors.filter(doc => doc.is_available && doc.isActive)
      };

    } catch (error) {
      console.error('Get clinic details error:', error);
      setError(error.message || 'Failed to load clinic details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Process and filter clinics when filters change
  const processedClinics = useMemo(() => {
    let processed = applyFilters(clinics, searchFilter);
    processed = sortClinics(processed, searchFilter.sortBy);
    return processed;
  }, [clinics, searchFilter, applyFilters, sortClinics]);

  // Update filtered clinics when processed clinics change
  useEffect(() => {
    setFilteredClinics(processedClinics);
  }, [processedClinics]);

  // Auto-discover clinics when user location changes
  useEffect(() => {
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      discoverClinics();
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Get available services from all clinics
  const availableServices = useMemo(() => {
    const servicesSet = new Set();
    clinics.forEach(clinic => {
      if (clinic.services_offered && Array.isArray(clinic.services_offered)) {
        clinic.services_offered.forEach(service => servicesSet.add(service));
      }
    });
    return Array.from(servicesSet).sort();
  }, [clinics]);

  // Get available badges from all clinics
  const availableBadges = useMemo(() => {
    const badgesSet = new Set();
    clinics.forEach(clinic => {
      if (clinic.badges && Array.isArray(clinic.badges)) {
        clinic.badges.forEach(badge => badgesSet.add(badge.badge_name));
      }
    });
    return Array.from(badgesSet).sort();
  }, [clinics]);

  return {
    // Data
    clinics: filteredClinics,
    allClinics: clinics,
    loading,
    error,
    searchFilter,

    // Actions
    discoverClinics,
    searchClinics,
    updateSearchFilter,
    getClinicDetails,

    // Computed
    availableServices,
    availableBadges,
    hasLocation: !!(userLocation?.latitude && userLocation?.longitude),
    totalResults: filteredClinics.length,
    isEmpty: filteredClinics.length === 0,
    
    // Utilities
    formatDistance: (distance) => {
      if (!distance) return 'Unknown';
      return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    },
    
    getClinicsByService: (service) => 
      filteredClinics.filter(clinic => 
        clinic.services_offered?.includes(service)
      ),
    
    getClinicsByRating: (minRating) =>
      filteredClinics.filter(clinic => 
        (clinic.rating || 0) >= minRating
      ),

    getNearestClinics: (count = 5) =>
      filteredClinics
        .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999))
        .slice(0, count)
  };
};