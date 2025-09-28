import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useLocationService } from "./useLocationService";
import { supabase } from "@/lib/supabaseClient";

export const useClinicDiscovery = () => {
  const { userLocation } = useLocationService();
  const { user } = useAuth();

  const [clinics, setClinics] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState({
    maxDistance: 50,
    services: [],
    minRating: 0,
    badges: [],
    availableToday: false,
    sortBy: "distance",
    searchQuery: ""
  });

  // Prevent concurrent calls and rate limit persistence
  const isDiscoveringRef = useRef(false);
  const abortControllerRef = useRef(null);
  const lastCallTimeRef = useRef(0);
  const hasLoadedInitialClinics = useRef(false);

  // 🔥 FIXED: Proper geography point formatting for PostGIS
  const formatLocationForPostGIS = useCallback((location) => {
    if (!location?.latitude || !location?.longitude) return null;
    
    // PostGIS expects: ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography
    // But for RPC calls, we need to pass it as a proper geography string
    return `POINT(${location.longitude} ${location.latitude})`;
  }, []);

  // 🔥 FIXED: Use proper find_nearest_clinics RPC function
  const discoverClinics = useCallback(async (location = null, options = {}) => {
    // Prevent spam calls
    const now = Date.now();
    if (now - lastCallTimeRef.current < 2000) {
      return { success: true, clinics: clinics, count: clinics.length };
    }
    lastCallTimeRef.current = now;

    if (isDiscoveringRef.current) {
      return { success: true, clinics: clinics, count: clinics.length };
    }

    isDiscoveringRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // 🔥 FIXED: Use proper location formatting and parameters
      const searchLocation = location || userLocation;
      const formattedLocation = searchLocation ? formatLocationForPostGIS(searchLocation) : null;

      const { data, error } = await supabase.rpc('find_nearest_clinics', {
        user_location: formattedLocation,
        max_distance_km: options.maxDistance || 50,
        limit_count: options.limit || 50,
        services_filter: options.services || null,
        min_rating: options.minRating || null
      });

      if (error) throw error;
      
      // 🔥 FIXED: Handle proper JSONB response format
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to discover clinics');
      }

      const clinicsData = data.data?.clinics || [];
      const searchMetadata = data.data?.search_metadata || {};
      
      // Process clinics data properly
      const processedClinics = clinicsData.map(clinic => ({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        city: clinic.city,
        phone: clinic.phone,
        email: clinic.email,
        website_url: clinic.website_url,
        image_url: clinic.image_url,
        rating: clinic.rating || 0,
        total_reviews: clinic.total_reviews || 0,
        distance_km: clinic.distance_km,
        services_offered: clinic.services_offered || [],
        operating_hours: clinic.operating_hours || {},
        badges: clinic.badges || [],
        location: clinic.location || {},
        stats: clinic.stats || {},
        is_available: clinic.is_available || true,
        created_at: clinic.created_at,
        // Extract coordinates from location object
        latitude: clinic.location?.coordinates?.[1] || null,
        longitude: clinic.location?.coordinates?.[0] || null
      }));

      setClinics(processedClinics);
      hasLoadedInitialClinics.current = true;
      
      return { 
        success: true, 
        clinics: processedClinics, 
        count: processedClinics.length,
        metadata: searchMetadata
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, clinics: [], error: 'Search cancelled' };
      }

      console.error('Discover clinics error:', error);
      const errorMsg = error?.message || 'Failed to discover clinics';
      setError(errorMsg);
      return { success: false, clinics: [], error: errorMsg };
    } finally {
      setLoading(false);
      isDiscoveringRef.current = false;
      abortControllerRef.current = null;
    }
  }, [userLocation, formatLocationForPostGIS, clinics]);

  // 🔥 FIXED: Get clinic details with proper database queries
  const getClinicDetails = useCallback(async (clinicId) => {
    if (!clinicId) return { success: false, clinic: null, error: 'Clinic ID required' };

    try {
      setLoading(true);
      setError(null);

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
            image_url,
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

      // 🔥 FIXED: Process clinic location data properly
      const processedClinic = {
        ...clinic,
        latitude: clinic.location ? this.extractLatFromPostGIS(clinic.location) : null,
        longitude: clinic.location ? this.extractLngFromPostGIS(clinic.location) : null,
        badges: clinic.clinic_badge_awards
          ?.filter(award => award.is_current && award.clinic_badges)
          ?.map(award => ({
            id: award.clinic_badges.id,
            name: award.clinic_badges.badge_name,
            description: award.clinic_badges.badge_description,
            icon_url: award.clinic_badges.badge_icon_url,
            color: award.clinic_badges.badge_color,
            award_date: award.award_date
          })) || [],
        doctors,
        services: services || [],
        total_doctors: doctors.length,
        available_doctors: doctors.filter(d => d.is_available).length
      };

      return { success: true, clinic: processedClinic, doctors, services };
    } catch (err) {
      console.error('Get clinic details error:', err);
      const errorMsg = err.message || 'Failed to load clinic details';
      setError(errorMsg);
      return { success: false, clinic: null, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 FIXED: Helper functions for PostGIS location extraction
  const extractLatFromPostGIS = useCallback((location) => {
    if (!location) return null;
    
    try {
      if (typeof location === 'string') {
        // Handle WKT format: "POINT(longitude latitude)"
        const match = location.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
        if (match) {
          return parseFloat(match[2]); // latitude is second
        }
      } else if (location && typeof location === 'object') {
        if (location.coordinates && Array.isArray(location.coordinates)) {
          return location.coordinates[1]; // GeoJSON format [lng, lat]
        }
        if (location.y !== undefined) {
          return location.y; // PostGIS object format
        }
      }
      return null;
    } catch (error) {
      console.warn('Error extracting latitude:', error);
      return null;
    }
  }, []);

  const extractLngFromPostGIS = useCallback((location) => {
    if (!location) return null;
    
    try {
      if (typeof location === 'string') {
        // Handle WKT format: "POINT(longitude latitude)"
        const match = location.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
        if (match) {
          return parseFloat(match[1]); // longitude is first
        }
      } else if (location && typeof location === 'object') {
        if (location.coordinates && Array.isArray(location.coordinates)) {
          return location.coordinates[0]; // GeoJSON format [lng, lat]
        }
        if (location.x !== undefined) {
          return location.x; // PostGIS object format
        }
      }
      return null;
    } catch (error) {
      console.warn('Error extracting longitude:', error);
      return null;
    }
  }, []);

  // Filter clinics based on search criteria
  const applyFilters = useCallback((clinicsToFilter, filters) => {
    return clinicsToFilter.filter(clinic => {
      // Distance filter - only apply if user has location
      if (userLocation && clinic.distance_km !== null && clinic.distance_km > filters.maxDistance) {
        return false;
      }

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
        const clinicBadgeNames = clinic.badges?.map(badge => badge.name) || [];
        const hasRequiredBadges = filters.badges.some(badge => 
          clinicBadgeNames.includes(badge)
        );
        if (!hasRequiredBadges) return false;
      }

      // Search query filter
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase().trim();
        const searchableText = [
          clinic.name,
          clinic.address,
          clinic.city,
          ...(clinic.services_offered || [])
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [userLocation]);

  // Sort clinics based on criteria
  const sortClinics = useCallback((clinicsToSort, sortBy) => {
    const sorted = [...clinicsToSort];

    switch (sortBy) {
      case 'distance':
        if (userLocation) {
          return sorted.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
        }
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'availability':
        return sorted.sort((a, b) => (b.available_doctors || 0) - (a.available_doctors || 0));
      default:
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [userLocation]);

  // Update search filters
  const updateSearchFilter = useCallback((newFilters) => {
    setSearchFilter(prevFilter => {
      const updated = { ...prevFilter, ...newFilters };
      
      if (updated.maxDistance < 1) updated.maxDistance = 1;
      if (updated.maxDistance > 100) updated.maxDistance = 100;
      if (updated.minRating < 0) updated.minRating = 0;
      if (updated.minRating > 5) updated.minRating = 5;
      
      return updated;
    });
  }, []);

  // Search clinics with query
  const searchClinics = useCallback(async (searchQuery) => {
    updateSearchFilter({ searchQuery: searchQuery || '' });
    
    // Re-run discovery with current search query
    const result = await discoverClinics(userLocation, {
      maxDistance: searchFilter.maxDistance,
      services: searchFilter.services,
      minRating: searchFilter.minRating
    });
    
    return result;
  }, [updateSearchFilter, discoverClinics, userLocation, searchFilter]);

  // Process and filter clinics
  const processedClinics = useMemo(() => {
    let processed = applyFilters(clinics, searchFilter);
    processed = sortClinics(processed, searchFilter.sortBy);
    return processed;
  }, [clinics, searchFilter, applyFilters, sortClinics]);

  useEffect(() => {
    setFilteredClinics(processedClinics);
  }, [processedClinics]);

  // Extract available services from all clinics
  const availableServices = useMemo(() => {
    const servicesSet = new Set();
    clinics.forEach(clinic => {
      if (clinic.services_offered && Array.isArray(clinic.services_offered)) {
        clinic.services_offered.forEach(service => servicesSet.add(service));
      }
    });
    return Array.from(servicesSet).sort();
  }, [clinics]);

  // Extract available badges from all clinics
  const availableBadges = useMemo(() => {
    const badgesSet = new Set();
    clinics.forEach(clinic => {
      if (clinic.badges && Array.isArray(clinic.badges)) {
        clinic.badges.forEach(badge => badgesSet.add(badge.name));
      }
    });
    return Array.from(badgesSet).sort();
  }, [clinics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
    hasLoadedClinics: hasLoadedInitialClinics.current,
    
    // Utilities
    formatDistance: (distance) => {
      if (!distance) return 'Unknown';
      return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    },

    // Helper functions
    extractLatFromPostGIS,
    extractLngFromPostGIS,
    formatLocationForPostGIS
  };
};