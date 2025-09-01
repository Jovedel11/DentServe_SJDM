import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/context/AuthProvider";
import { useLocationService } from "./useLocationService";
import { supabase } from "../../lib/supabaseClient";

export const useClinicDiscovery = () => {
  const { userLocation } = useLocationService();
  const { user } = useAuth();

  const [clinics, setClinics] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState({
    maxDistance: 25,
    services: [],
    minRating: 0,
    badges: [],
    availableToday: false,
    sortBy: "distance",
    searchQuery: ""
  });

  // Rate limiting with proper user identification
  const rateLimitSearch = useCallback(async () => {
    if (!user?.email) return true;

    try {
      const { data: canSearch, error } = await supabase.rpc('check_rate_limit', {
        p_user_identifier: user.email,
        p_action_type: 'clinic_search',
        p_max_attempts: 10,
        p_time_window_minutes: 5
      });

      if (error) throw new Error(error.message);

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

  // Proper location handling and clinic discovery
const discoverClinics = useCallback(async (location = null, options = {}) => {
  try {
    setLoading(true);
    setError(null);

    // Rate limiting check
    const canProceed = await rateLimitSearch();
    if (!canProceed) return { success: false, clinics: [], error: 'Rate limited' };

    const searchLocation = location || userLocation;
    const searchOptions = { ...searchFilter, ...options };

    // ✅ FIXED: Let the database function handle PostGIS conversion
    let locationParam = null;
    if (searchLocation?.latitude && searchLocation?.longitude) {
      // ✅ CORRECTED: Pass as text string, let database convert to geography
      locationParam = `POINT(${searchLocation.longitude} ${searchLocation.latitude})`;
    }

    // Call the corrected function
    const { data: nearbyClinicData, error: clinicError } = await supabase.rpc('find_nearest_clinics', {
      user_location: locationParam,
      max_distance_km: searchOptions.maxDistance,
      limit_count: 50
    });

    if (clinicError) {
      throw new Error(clinicError.message || 'Failed to fetch nearby clinics');
    }

    if (!nearbyClinicData || nearbyClinicData.length === 0) {
      setClinics([]);
      setFilteredClinics([]);
      return { success: true, clinics: [], count: 0 };
    }

    const clinicIds = nearbyClinicData.map(clinic => clinic.id);
    
    const { data: clinicDoctors, error: doctorError } = await supabase
      .from('doctor_clinics')
      .select(`
        clinic_id,
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
          last_name
        )
      `)
      .in('clinic_id', clinicIds)
      .eq('is_active', true)
      .eq('doctors.is_available', true);

    if (doctorError) {
      console.warn('Doctor fetch error:', doctorError);
    }

    // ✅ FIXED: Better doctor name construction
    const doctorsByClinic = {};
    clinicDoctors?.forEach(dc => {
      if (!doctorsByClinic[dc.clinic_id]) {
        doctorsByClinic[dc.clinic_id] = [];
      }
      
      const doctor = dc.doctors;
      if (!doctor) return;

      // ✅ IMPROVED: Consistent doctor name logic
      const hasFullName = doctor.first_name && doctor.last_name;
      const doctorName = hasFullName 
        ? `Dr. ${doctor.first_name} ${doctor.last_name}`
        : `Dr. ${doctor.specialization}`;

      doctorsByClinic[dc.clinic_id].push({
        ...doctor,
        name: doctorName,
        display_name: hasFullName 
          ? `${doctor.first_name} ${doctor.last_name}` 
          : doctor.specialization,
        schedule: dc.schedule
      });
    });

      // Merge clinic data with doctor information
      const enrichedClinics = nearbyClinicData.map(nearbyClinic => {
        const doctors = doctorsByClinic[nearbyClinic.id] || [];
        const availableDoctors = doctors.filter(doc => doc.is_available);
        const specializations = [...new Set(doctors.map(doc => doc.specialization))];
        
        const fees = doctors.map(doc => doc.consultation_fee).filter(fee => fee != null);
        const feeRange = fees.length > 0 ? {
          min: Math.min(...fees),
          max: Math.max(...fees)
        } : { min: 0, max: 0 };

        return {
          ...nearbyClinic,
          doctors,
          availableDoctors: availableDoctors.length,
          specializations,
          consultationFeeRange: feeRange,
          badges: nearbyClinic.badges || []
        };
      });

      setClinics(enrichedClinics);
      return { 
        success: true, 
        clinics: enrichedClinics, 
        count: enrichedClinics.length 
      };

      } catch (error) {
        console.error('Clinic discovery error:', error);
        const errorMsg = error?.message || 'Clinic discovery failed';
        setError(errorMsg);
        return { success: false, clinics: [], error: errorMsg };
      } finally {
        setLoading(false);
      }
    }, [userLocation, searchFilter, rateLimitSearch]);

  // Clinic details with proper relationship handling
    const getClinicDetails = useCallback(async (clinicId) => {
      if (!clinicId) return { success: false, clinic: null, error: 'Clinic ID required' };

      try {
        setLoading(true);
        setError(null);

        // Get clinic basic info
        const { data: clinic, error: clinicError } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', clinicId)
          .eq('is_active', true)
          .single();

        if (clinicError) throw new Error(clinicError.message);

        //  No user_profiles join - use doctors' direct fields
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

        if (doctorError) {
          console.warn('Doctor fetch error:', doctorError);
        }

        //  Use direct doctor fields
        const doctors = clinicDoctors?.map(dc => {
          const doctor = dc.doctors;
          if (!doctor) return null;
          
          //Use doctors' own name fields
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

        return {
          success: true,
          clinic: {
            ...clinic,
            doctors: doctors.filter(doc => doc.is_available && doc.isActive),
            totalDoctors: doctors.length,
            availableDoctors: doctors.filter(doc => doc.is_available).length
          }
        };

      } catch (error) {
        console.error('Get clinic details error:', error);
        const errorMsg = error.message || 'Failed to load clinic details';
        setError(errorMsg);
        return { success: false, clinic: null, error: errorMsg };
      } finally {
        setLoading(false);
      }
    }, []);

  const applyFilters = useCallback((clinicsToFilter, filters) => {
    return clinicsToFilter.filter(clinic => {
      // Service filter - check services_offered array
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

  // search filters with validation
  const updateSearchFilter = useCallback((newFilters) => {
    setSearchFilter(prevFilter => {
      const updated = { ...prevFilter, ...newFilters };
      
      // Validate distance
      if (updated.maxDistance < 1) updated.maxDistance = 1;
      if (updated.maxDistance > 100) updated.maxDistance = 100;
      
      // Validate rating
      if (updated.minRating < 0) updated.minRating = 0;
      if (updated.minRating > 5) updated.minRating = 5;
      
      return updated;
    });
  }, []);

  const searchClinics = useCallback(async (searchQuery) => {
    updateSearchFilter({ searchQuery: searchQuery || '' });
    // Trigger re-discovery if needed
    if (userLocation) {
      return await discoverClinics();
    }
  }, [updateSearchFilter, discoverClinics, userLocation]);

  // Enhanced computed values
  const processedClinics = useMemo(() => {
    let processed = applyFilters(clinics, searchFilter);
    processed = sortClinics(processed, searchFilter.sortBy);
    return processed;
  }, [clinics, searchFilter, applyFilters, sortClinics]);

  useEffect(() => {
    setFilteredClinics(processedClinics);
  }, [processedClinics]);

  // Auto-discover when location changes
  useEffect(() => {
    if (userLocation?.latitude && userLocation?.longitude) {
      discoverClinics();
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  // available services and badges
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

  return {
    // Data
    clinics: filteredClinics,
    allClinics: clinics,
    loading,
    error,
    searchFilter,

    // Actions
    discoverClinics,     // Returns: { success, clinics, count, error }
    searchClinics,       // Returns: { success, clinics, count, error }
    updateSearchFilter,
    getClinicDetails,    // Returns: { success, clinic, error }

    // Computed
    availableServices,
    availableBadges,
    hasLocation: !!(userLocation?.latitude && userLocation?.longitude),
    totalResults: filteredClinics.length,
    isEmpty: filteredClinics.length === 0,
    
    //utilities
    formatDistance: (distance) => {
      if (!distance) return 'Unknown';
      return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    },
    
    getClinicsByService: (service) => 
      filteredClinics.filter(clinic => 
        clinic.services_offered?.some(offered => 
          offered.toLowerCase().includes(service.toLowerCase())
        )
      ),
    
    getClinicsByRating: (minRating) =>
      filteredClinics.filter(clinic => 
        (clinic.rating || 0) >= minRating
      ),

    getNearestClinics: (count = 5) =>
      filteredClinics
        .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999))
        .slice(0, count),

    getTopRatedClinics: (count = 5) =>
      filteredClinics
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, count)
  };
};