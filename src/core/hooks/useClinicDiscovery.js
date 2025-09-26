import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../../auth/context/AuthProvider";
import { useLocationService } from "./useLocationService";
import { supabase } from "../../lib/supabaseClient";
import { useRateLimit } from "@/auth/hooks/useRateLimit";

export const useClinicDiscovery = () => {
  const { userLocation } = useLocationService();
  const { user } = useAuth();
  const { checkRateLimit } = useRateLimit();

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
    sortBy: "name",
    searchQuery: ""
  });

  // Prevent concurrent calls and rate limit persistence
  const isDiscoveringRef = useRef(false);
  const abortControllerRef = useRef(null);
  const lastCallTimeRef = useRef(0);
  const hasLoadedInitialClinics = useRef(false);
  const sessionId = useRef(`session_${Date.now()}_${Math.random()}`);

  // Get all clinics with proper badge relationship
  const getAllClinics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
  
      // Use proper RPC function instead of direct queries
      const { data, error } = await supabase.rpc('find_nearest_clinics', {
        user_location: userLocation ? `POINT(${userLocation.longitude} ${userLocation.latitude})` : null,
        max_distance_km: 100, // Get all within 100km
        limit_count: 100,
        services_filter: null,
        min_rating: null
      });
  
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch clinics');
  
      const clinics = data.data?.clinics || [];
      
      //  Process clinics data properly
      const processedClinics = clinics.map(clinic => ({
        ...clinic,
        // Distance is already calculated by the RPC function
        distance_km: clinic.distance_km,
        // Badges are included in the RPC response
        badges: clinic.badges || [],
        // Doctors are included in the RPC response  
        doctors: clinic.doctors || [],
        availableDoctors: clinic.available_doctors || 0,
        total_doctors: clinic.total_doctors || 0
      }));
  
      setClinics(processedClinics);
      hasLoadedInitialClinics.current = true;
      
      return { 
        success: true, 
        clinics: processedClinics, 
        count: processedClinics.length 
      };
  
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, clinics: [], error: 'Search cancelled' };
      }
  
      console.error('Get all clinics error:', error);
      const errorMsg = error?.message || 'Failed to fetch clinics';
      setError(errorMsg);
      return { success: false, clinics: [], error: errorMsg };
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [userLocation]);

  // ✅ FIXED: Helper functions for PostGIS location extraction
  const extractLatFromLocation = useCallback((location) => {
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

  const extractLngFromLocation = useCallback((location) => {
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

  // ✅ Helper function for distance calculation
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // ✅ UPDATED: discoverClinics with better rate limiting
  const discoverClinics = useCallback(async (location = null, options = {}) => {
    // ✅ FIXED: More aggressive debouncing and concurrency prevention
    const now = Date.now();
    if (now - lastCallTimeRef.current < 3000) { // 3 second debounce
      return { success: true, clinics: clinics, count: clinics.length };
    }
    lastCallTimeRef.current = now;

    if (isDiscoveringRef.current) {
      return { success: true, clinics: clinics, count: clinics.length };
    }

    isDiscoveringRef.current = true;

    try {
      const result = await getAllClinics();
      return result;
    } finally {
      isDiscoveringRef.current = false;
    }
  }, [getAllClinics, clinics]);

  // ✅ UPDATED: When location changes, recalculate distances only
  useEffect(() => {
    if (hasLoadedInitialClinics.current && userLocation && clinics.length > 0) {
      const clinicsWithUpdatedDistance = clinics.map(clinic => ({
        ...clinic,
        distance_km: clinic.latitude && clinic.longitude ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          clinic.latitude,
          clinic.longitude
        ) : null
      }));
      
      setClinics(clinicsWithUpdatedDistance);
    }
  }, [userLocation, calculateDistance]);

  const getClinicDetails = useCallback(async (clinicId) => {
    if (!clinicId) return { success: false, clinic: null, error: 'Clinic ID required' };

    try {
      setLoading(true);
      setError(null);

      // ✅ FIXED: Get clinic with proper badge relationship
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select(`
          *,
          clinic_badge_awards!inner (
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
        .eq('clinic_badge_awards.is_current', true)
        .single();

      if (clinicError) {
        // Try without badges if not found
        const { data: clinicNoBadge, error: noBadgeError } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', clinicId)
          .eq('is_active', true)
          .single();
        
        if (noBadgeError) throw new Error(noBadgeError.message);
        
        clinic.clinic_badge_awards = [];
      }

      // Get doctors for this clinic
      const { data: clinicDoctors, error: doctorError } = await supabase
        .from('doctor_clinics')
        .select(`
          is_active,
          schedule,
          doctors (
            id,
            specialization,
            consultation_fee,
            experience_years,
            is_available,
            rating,
            first_name,
            last_name,
            profile_image_url,
            bio,
            education,
            certifications,
            awards
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .eq('doctors.is_available', true);

      const doctors = clinicDoctors?.map(dc => {
        const doctor = dc.doctors;
        if (!doctor) return null;
        
        const hasFullName = doctor.first_name && doctor.last_name;
        const doctorName = hasFullName 
          ? `Dr. ${doctor.first_name} ${doctor.last_name}`
          : `Dr. ${doctor.specialization}`;

        return {
          ...doctor,
          schedule: dc.schedule,
          name: doctorName,
          display_name: hasFullName 
            ? `${doctor.first_name} ${doctor.last_name}` 
            : doctor.specialization,
          isActive: dc.is_active
        };
      }).filter(Boolean) || [];

      // ✅ FIXED: Process badges and location
      const processedClinic = {
        ...clinic,
        latitude: clinic.location ? extractLatFromLocation(clinic.location) : null,
        longitude: clinic.location ? extractLngFromLocation(clinic.location) : null,
        badges: clinic.clinic_badge_awards?.map(award => ({
          id: award.clinic_badges?.id,
          badge_name: award.clinic_badges?.badge_name,
          description: award.clinic_badges?.badge_description,
          icon_url: award.clinic_badges?.badge_icon_url,
          color: award.clinic_badges?.badge_color,
          award_date: award.award_date
        })).filter(badge => badge.badge_name) || [],
        doctors: doctors.filter(doc => doc.is_available && doc.isActive),
        total_doctors: doctors.length,
        availableDoctors: doctors.filter(doc => doc.is_available).length
      };

      return {
        success: true,
        clinic: processedClinic
      };

    } catch (error) {
      console.error('Get clinic details error:', error);
      const errorMsg = error.message || 'Failed to load clinic details';
      setError(errorMsg);
      return { success: false, clinic: null, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [extractLatFromLocation, extractLngFromLocation]);

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
          ...(clinic.services_offered || [])
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [userLocation]);

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
        return sorted.sort((a, b) => (b.availableDoctors || 0) - (a.availableDoctors || 0));
      default:
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [userLocation]);

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

  const searchClinics = useCallback(async (searchQuery) => {
    updateSearchFilter({ searchQuery: searchQuery || '' });
    return { success: true, clinics: [], count: 0 };
  }, [updateSearchFilter]);

  const processedClinics = useMemo(() => {
    let processed = applyFilters(clinics, searchFilter);
    processed = sortClinics(processed, searchFilter.sortBy);
    return processed;
  }, [clinics, searchFilter, applyFilters, sortClinics]);

  useEffect(() => {
    setFilteredClinics(processedClinics);
  }, [processedClinics]);

  const availableServices = useMemo(() => {
    const servicesSet = new Set();
    clinics.forEach(clinic => {
      if (clinic.services_offered && Array.isArray(clinic.services_offered)) {
        clinic.services_offered.forEach(service => servicesSet.add(service));
      }
    });
    return Array.from(servicesSet).sort();
  }, [clinics]);

  const availableBadges = useMemo(() => {
    const badgesSet = new Set();
    clinics.forEach(clinic => {
      if (clinic.badges && Array.isArray(clinic.badges)) {
        clinic.badges.forEach(badge => badgesSet.add(badge.badge_name));
      }
    });
    return Array.from(badgesSet).sort();
  }, [clinics]);

  // ✅ Cleanup on unmount
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
    getAllClinics,

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
  };
};