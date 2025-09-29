import { useCallback, useMemo } from "react";
import { useDoctorDiscovery } from "./useDoctorDiscover";
import { useLocationService } from "./useLocationService";

export const useDoctorSystem = () => {
  const { userLocation, getFormattedLocation, isLocationAvailable } = useLocationService();
  const {
    doctors,
    filteredDoctors,
    loading,
    error,
    searchMetadata,
    discoverDoctors,
    searchDoctors,
    getDoctorDetails,
    getAvailableSpecializations,
    setError
  } = useDoctorDiscovery();

  // Find nearest doctors with smart location handling
  const findNearestDoctors = useCallback(async (searchLocation = null, options = {}) => {
    console.log("🎯 findNearestDoctors called with:", { searchLocation, options });

    try {
      // Use provided location or fall back to user location
      let targetLocation = searchLocation;
      
      if (!targetLocation && isLocationAvailable()) {
        targetLocation = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        };
        console.log("📍 Using user location:", targetLocation);
      }

      // Call the discovery function
      const result = await discoverDoctors(targetLocation, options);
      
      return {
        success: result.success,
        doctors: result.doctors || [],
        metadata: result.metadata || {},
        error: result.error
      };
    } catch (error) {
      console.error("💥 Error in findNearestDoctors:", error);
      return {
        success: false,
        error: error.message,
        doctors: [],
        metadata: {}
      };
    }
  }, [discoverDoctors, userLocation, isLocationAvailable]);

  // Search doctors with query
  const searchDoctorsWithQuery = useCallback(async (query, options = {}) => {
    console.log("🔍 searchDoctorsWithQuery called:", { query, options });

    try {
      const result = await searchDoctors(query, options);
      
      return {
        success: result.success,
        doctors: result.doctors || [],
        metadata: result.metadata || {},
        error: result.error
      };
    } catch (error) {
      console.error("💥 Error in searchDoctorsWithQuery:", error);
      return {
        success: false,
        error: error.message,
        doctors: [],
        metadata: {}
      };
    }
  }, [searchDoctors]);

  // Get detailed doctor information
  const getDoctorDetail = useCallback(async (doctorId) => {
    console.log("📋 getDoctorDetail called for:", doctorId);

    try {
      const result = await getDoctorDetails(doctorId);
      return result;
    } catch (error) {
      console.error("💥 Error in getDoctorDetail:", error);
      setError(error.message);
      return null;
    }
  }, [getDoctorDetails, setError]);

  // Advanced doctor search with multiple filters
  const advancedDoctorSearch = useCallback(async (filters = {}) => {
    const {
      query = '',
      specializations = [],
      experience = 0,
      rating = 0,
      consultationFee = 'all',
      availability = false,
      location = null,
      maxDistance = 50,
      sortBy = 'recommended'
    } = filters;

    console.log("🔬 advancedDoctorSearch called with:", filters);

    try {
      const searchOptions = {
        maxDistance,
        specializations,
        minRating: rating,
        minExperience: experience,
        isAvailable: availability || null,
        sortBy
      };

      let result;
      if (query.trim()) {
        result = await searchDoctors(query, searchOptions);
      } else {
        result = await discoverDoctors(location, searchOptions);
      }

      // Apply consultation fee filter on the client side
      let filteredDoctors = result.doctors || [];
      
      if (consultationFee !== 'all' && filteredDoctors.length > 0) {
        const feeFilters = {
          budget: (doctor) => doctor.consultation_fee && doctor.consultation_fee <= 2500,
          moderate: (doctor) => doctor.consultation_fee && doctor.consultation_fee > 2500 && doctor.consultation_fee <= 3500,
          premium: (doctor) => doctor.consultation_fee && doctor.consultation_fee > 3500,
        };
        
        if (feeFilters[consultationFee]) {
          filteredDoctors = filteredDoctors.filter(feeFilters[consultationFee]);
        }
      }

      return {
        success: true,
        doctors: filteredDoctors,
        metadata: {
          ...result.metadata,
          applied_filters: filters,
          total_found: filteredDoctors.length
        }
      };

    } catch (error) {
      console.error("💥 Error in advancedDoctorSearch:", error);
      return {
        success: false,
        error: error.message,
        doctors: [],
        metadata: {}
      };
    }
  }, [discoverDoctors, searchDoctors]);

  // State object for easy access
  const state = useMemo(() => ({
    doctors,
    filteredDoctors,
    loading,
    error,
    searchMetadata,
    userLocation,
    isLocationAvailable: isLocationAvailable()
  }), [doctors, filteredDoctors, loading, error, searchMetadata, userLocation, isLocationAvailable]);

  return {
    // State
    state,
    
    // Main functions
    findNearestDoctors,
    searchDoctors: searchDoctorsWithQuery,
    getDoctorDetail,
    advancedDoctorSearch,
    getAvailableSpecializations,
    
    // Utilities
    clearError: () => setError(null),
    
    // Direct access to individual state pieces
    doctors,
    filteredDoctors,
    loading,
    error,
    searchMetadata
  };
};