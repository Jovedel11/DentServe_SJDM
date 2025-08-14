import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/context/AuthProvider";
import { useLocationService } from "./useLocationService";
import { supabase } from "../../lib/supabaseClient";

export const useClinicDiscovery = () => {
  const { userLocation } = useLocationService();
  const { user } = useAuth()

  const [clinics, setClinics] = useState([])
  const [filteredClinics, setFilteredClinics] = useState([])
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState({
    maxDistance: 25, // kilometers
    service: [],
    minRating: 0,
    badge: [],
    availableToday: false,
    sortBy: "distance", // distance, rating, name
  });

  // rate limiting for search request
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
        throw new Error('Too many search requests. Please wait a minutes.');
      }

      return true;
    } catch (error) {
      const errorMsg = error?.message || String(error) || 'Search rate limit error'
      setError(errorMsg);
      return false;
    }
  }, [user?.email]);

  // discovery nearby clinics using PostGis
  const discoveryClinics = useCallback(async (location = null, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      // rate limiting check
      const canProceed = await rateLimitSearch();
      if (!canProceed) return;

      const searchLocation = location || userLocation;
      const searchOptions = { ...searchFilter, ...options };

      let locationPoint = null;
      if(searchLocation) {
        // PostGis requires longitude first
        locationPoint = `POINT(${searchLocation.longitude} ${searchLocation.latitude})`;
      }

      // user find nearest clinic function
      const { data: nearbyClinicData, error: clinicError } = await supabase.rpc('find_nearest_clinics', {
        user_location: locationPoint,
        max_distance_km: searchOptions.maxDistance,
        limit_count: 50
      });

      if (clinicError) throw new Error(clinicError?.message || 'Failed to fetch nearby clinics');

      // additional clinics data to filter 
      const clinicIds = nearbyClinicData?.map(clinic => clinic.id) || [];

      if (clinicIds.length === 0) {
        setClinics([]);
        setFilteredClinics([]);
        return;
      }

      // get all detailed clinics info with doctors
      const { data: detailedClinics, error: detailError } = await supabase
        .from('clinics')
        .select(`
          *,
          doctor_clinics!inner (
          is_active,
          doctors (
              id, specialization, is_available, consultation_fee, experience_years
            )
          )
      `)
      .in('id', clinicIds)
      .eq('is_active', true)
      .eq('doctor_clinics.is_active', true)

      if (detailError) throw new Error(detailError?.message || 'Failed to fetch clinic details');

      // merge with distance and badge data
      const enrichedClinics = nearbyClinicData?.map(nearbyClinic => {
        const detailedClinic = detailedClinics?.find(dc => dc.id === nearbyClinic.id);

        return {
          ...nearbyClinic,
          ...detailedClinic,
          // parse badge from function result
          badges: nearbyClinic?.badges || [],
          // extract unique specializations
          specializations: [...new Set(
            detailedClinic?.doctor_clinics?.map(dc => dc.doctors.specialization) || []
          )],
          // count available doctor
          availableDoctors: detailedClinic?.doctor_clinics?.filter(
            dc => dc.doctors.is_available
          )?.length || 0,
          // get consultation fee
          consultationFeeRange: {
            min: Math.min(...(detailedClinic?.doctor_clinics?.map(dc => dc.doctors.consultation_fee) || [])),
            max: Math.max(...(detailedClinic?.doctor_clinics?.map(dc => dc.doctors.consultation_fee) || []))
          }
        };
      });
      setClinics(enrichedClinics);
      return enrichedClinics;
    } catch (error) {
      console.error('Clinics discovery error:', error);
      const errorMsg = error?.message || String(error) || 'Clinic discovery failed'
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userLocation, searchFilter, rateLimitSearch]);

  // all filters 
  const applyFilters = useCallback((clinicsFilter, filters) => {
    return clinicsFilter.filter(clinic => {
      //service filter
      if (filters.service.length > 0) {
        const hasRequiredServices = filters.service.every(service => 
          clinic.services_offered?.includes(service)
        );
        if (!hasRequiredServices) return false;
      }
      //rating filter
      if (filters.minRating > 0 && clinic.rating < filters.minRating) {
        return false;
      }
      // badge filter
      if (filters.badge.length > 0) {
        const clinicBadgeNames = clinic.badges?.map(badge => badge.badge_name) || [];
        const hasRequiredBadges = filters.badge?.some(badge => 
          clinicBadgeNames.includes(badge)
        );
        if (!hasRequiredBadges) return false;
      }
      // available today filter
      if (filters.availableToday && clinic.availableDoctors === 0) {
        return false;
      }

      return true;
    })
  }, [])

  // sort clinics based on criteria
  const sortClinics = useCallback((clinicsToSort, sortBy) => {
    const sorted = [...clinicsToSort];

    switch (sortBy) {
      case 'distance':
        return sorted.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'availability':
        return sorted.sort((a, b) => (b.availableDoctors || 0) - (a.availableDoctors || 0));
      default:
        return sorted;
    }
  }, [])

  // update search filter
  const updateSearchFilter = useCallback((newFilters) => {
    setSearchFilter(prevFilter => ({
      ...prevFilter,
      ...newFilters
    }));
  }, []);

  // search clinics by name or location
  const searchClinics = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setFilteredClinics(clinics);
      return;
    }

    try {
      setLoading(true);

      const query = searchQuery.trim().toLowerCase();

      // search in current clinic list first
      const localResults = clinics.filter(clinic => 
        clinic.name.toLowerCase().includes(query) ||
        clinic.address.toLowerCase().includes(query) ||
        clinic.city.toLowerCase().includes(query) ||
        clinic.specialization?.some(spec => spec.toLowerCase().includes(query))
      );

      // if local result, use it
      if (localResults.length > 0) {
        setFilteredClinics(localResults);
        return;
      }

      // otherwise search database
      const { data: searchResults, error } = await supabase
        .from('clinics')
        .select(`
          *,
          doctor_clinics!inner (
              doctors (specialization)
            )
        `)
        .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(20);

        if (error) throw new Error(error?.message || 'Clinic search failed');

        setFilteredClinics(searchResults || []);
    } catch (error) {
      console.error('Clinic search error:', error);
      const errorMsg = error?.message || String(error) || 'Clinic search failed'
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [clinics]);

  // filters and sorting clinics  or filter change
  const processedClinics = useMemo(() => {
    let processed = applyFilters(clinics, searchFilter);
    processed = sortClinics(processed, searchFilter.sortBy);
    return processed
  }, [clinics, searchFilter, applyFilters, sortClinics]);

  // update filtered clinics when process clinics change
  useEffect(() => {
    setFilteredClinics(processedClinics);
  }, [processedClinics]);

  // auto discover clinics when user location change
  useEffect(() => {
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      discoveryClinics();
    }
  }, [userLocation, discoveryClinics]);

  return {
    // data
    clinics: filteredClinics,
    allClinics: clinics,
    loading,
    error,
    searchFilter,

    //actions
    discoveryClinics,
    searchClinics,
    updateSearchFilter,

    // utilities
    hasLocation: !!(userLocation?.latitude && userLocation.longitude),
    totalResults: filteredClinics.length
  }

}
