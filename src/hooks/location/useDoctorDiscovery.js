import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * useDoctorDiscovery Hook
 * Discovers and searches for doctors with location-based filtering
 * Works with existing schema: doctors, doctor_clinics, clinics tables
 */
export const useDoctorDiscovery = () => {
  const { user } = useAuth();
  
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMetadata, setSearchMetadata] = useState(null);

  // Calculate Haversine distance in JavaScript
  const calculateDistance = useCallback((userLat, userLng, targetLat, targetLng) => {
    if (!userLat || !userLng || !targetLat || !targetLng) return 0;
    
    const R = 6371; // Earth radius in km
    const dLat = (targetLat - userLat) * Math.PI / 180;
    const dLon = (targetLng - userLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Extract coordinates from PostGIS geography
  const extractCoordinates = useCallback((locationData) => {
    if (!locationData) return { latitude: null, longitude: null };

    try {
      // Handle WKT format: "POINT(lng lat)"
      if (typeof locationData === 'string') {
        const match = locationData.match(/POINT\(([^)]+)\)/);
        if (match) {
          const [lng, lat] = match[1].split(' ').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { latitude: lat, longitude: lng };
          }
        }
      }

      // Handle GeoJSON
      if (locationData.coordinates && Array.isArray(locationData.coordinates)) {
        const [lng, lat] = locationData.coordinates;
        return { latitude: lat, longitude: lng };
      }

      // Handle direct object
      if (locationData.latitude && locationData.longitude) {
        return { latitude: locationData.latitude, longitude: locationData.longitude };
      }

      return { latitude: null, longitude: null };
    } catch (err) {
      console.error('Error extracting coordinates:', err);
      return { latitude: null, longitude: null };
    }
  }, []);

  /**
   * Main discovery function - finds doctors with location-based filtering
   */
  const discoverDoctors = useCallback(async (searchLocation = null, options = {}) => {
    console.log('🔍 discoverDoctors called with:', { searchLocation, options });
    
    setLoading(true);
    setError(null);

    try {
      const {
        maxDistance = 50,
        specializations = [],
        minRating = null,
        minExperience = null,
        isAvailable = null,
        sortBy = 'distance', // 'distance', 'rating', 'experience'
        limit = 20
      } = options;

      // Build query for doctor-clinic relationships with full doctor and clinic data
      let query = supabase
        .from('doctor_clinics')
        .select(`
          id,
          is_active,
          schedule,
          doctors!inner (
            id,
            first_name,
            last_name,
            specialization,
            experience_years,
            bio,
            consultation_fee,
            image_url,
            languages_spoken,
            certifications,
            awards,
            is_available,
            rating,
            total_reviews,
            license_number,
            education
          ),
          clinics!inner (
            id,
            name,
            address,
            city,
            province,
            phone,
            email,
            location,
            rating,
            operating_hours
          )
        `)
        .eq('is_active', true);

      // Apply filters
      if (specializations.length > 0) {
        query = query.in('doctors.specialization', specializations);
      }

      if (minRating !== null) {
        query = query.gte('doctors.rating', minRating);
      }

      if (minExperience !== null) {
        query = query.gte('doctors.experience_years', minExperience);
      }

      if (isAvailable !== null) {
        query = query.eq('doctors.is_available', isAvailable);
      }

      const { data: doctorClinics, error: queryError } = await query;

      if (queryError) {
        console.error('🔴 Query Error:', queryError);
        throw queryError;
      }

      console.log('📥 Raw doctor-clinic data:', doctorClinics);

      // Process and transform data
      const processedDoctors = doctorClinics
        .map((dc) => {
          const doctor = dc.doctors;
          const clinic = dc.clinics;
          
          if (!doctor || !clinic) return null;

          // Extract clinic coordinates
          const clinicCoords = extractCoordinates(clinic.location);
          
          // Calculate distance if user location provided
          let distance = 0;
          if (searchLocation && clinicCoords.latitude && clinicCoords.longitude) {
            distance = calculateDistance(
              searchLocation.latitude,
              searchLocation.longitude,
              clinicCoords.latitude,
              clinicCoords.longitude
            );
          }

          // Filter by distance
          if (searchLocation && distance > maxDistance) {
            return null;
          }

          return {
            // Doctor info
            id: doctor.id,
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            full_name: `${doctor.first_name} ${doctor.last_name}`.trim(),
            name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
            specialization: doctor.specialization,
            specialty: doctor.specialization,
            experience_years: doctor.experience_years,
            experience: doctor.experience_years ? `${doctor.experience_years} years` : 'Experience varies',
            bio: doctor.bio,
            consultation_fee: doctor.consultation_fee,
            fee_display: doctor.consultation_fee ? `₱${doctor.consultation_fee.toFixed(2)}` : 'Call for pricing',
            image_url: doctor.image_url,
            image: doctor.image_url,
            profile_image_url: doctor.image_url,
            languages_spoken: doctor.languages_spoken || [],
            certifications: doctor.certifications || {},
            awards: doctor.awards || [],
            is_available: doctor.is_available,
            availability: doctor.is_available ? 'Available' : 'Not Available',
            rating: parseFloat(doctor.rating || 0),
            average_rating: parseFloat(doctor.rating || 0),
            total_reviews: doctor.total_reviews || 0,
            reviews: doctor.total_reviews || 0,
            license_number: doctor.license_number,
            education: doctor.education,

            // Clinic info
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            clinic_address: clinic.address,
            clinic_city: clinic.city,
            clinic_phone: clinic.phone,
            clinic_email: clinic.email,
            clinic_rating: parseFloat(clinic.rating || 0),
            
            // Location info
            clinic_location: clinicCoords,
            position: {
              lat: clinicCoords.latitude,
              lng: clinicCoords.longitude
            },
            coordinates: clinicCoords,
            
            // Distance
            distance_km: distance,
            distance_numeric: distance,
            distance: distance > 0 ? distance.toFixed(1) : '0',
            
            // Operating hours
            operating_hours: clinic.operating_hours || {},
            
            // Doctor-clinic relationship
            doctor_clinic_id: dc.id,
            schedule: dc.schedule || {}
          };
        })
        .filter(Boolean); // Remove null entries

      // Sort results
      let sortedDoctors = [...processedDoctors];
      
      switch (sortBy) {
        case 'distance':
          if (searchLocation) {
            sortedDoctors.sort((a, b) => a.distance_numeric - b.distance_numeric);
          }
          break;
        case 'rating':
          sortedDoctors.sort((a, b) => b.rating - a.rating);
          break;
        case 'experience':
          sortedDoctors.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
          break;
        case 'fee_low_to_high':
          sortedDoctors.sort((a, b) => (a.consultation_fee || 999999) - (b.consultation_fee || 999999));
          break;
        case 'fee_high_to_low':
          sortedDoctors.sort((a, b) => (b.consultation_fee || 0) - (a.consultation_fee || 0));
          break;
        default:
          // Default: sort by rating if no location, distance if location provided
          if (searchLocation) {
            sortedDoctors.sort((a, b) => a.distance_numeric - b.distance_numeric);
          } else {
            sortedDoctors.sort((a, b) => b.rating - a.rating);
          }
      }

      // Apply limit
      const limitedDoctors = sortedDoctors.slice(0, limit);

      // Set state
      setDoctors(limitedDoctors);
      setFilteredDoctors(limitedDoctors);
      
      const metadata = {
        total_found: limitedDoctors.length,
        total_before_limit: sortedDoctors.length,
        user_location_provided: searchLocation !== null,
        filters_applied: {
          maxDistance,
          specializations,
          minRating,
          minExperience,
          isAvailable,
          sortBy
        },
        search_center: searchLocation ? 
          `POINT(${searchLocation.longitude} ${searchLocation.latitude})` : 
          'No location specified'
      };
      
      setSearchMetadata(metadata);

      console.log('✅ Processed doctors:', limitedDoctors.length);

      return {
        success: true,
        doctors: limitedDoctors,
        metadata
      };

    } catch (err) {
      console.error('💥 Error in discoverDoctors:', err);
      setError(err.message);
      setDoctors([]);
      setFilteredDoctors([]);
      
      return {
        success: false,
        error: err.message,
        doctors: [],
        metadata: {}
      };
    } finally {
      setLoading(false);
    }
  }, [calculateDistance, extractCoordinates]);

  /**
   * Search doctors by name or specialization
   */
  const searchDoctors = useCallback(async (query, options = {}) => {
    console.log('🔍 searchDoctors called:', { query, options });
    
    if (!query || query.trim() === '') {
      return await discoverDoctors(null, options);
    }

    setLoading(true);
    setError(null);

    try {
      const searchTerm = query.toLowerCase().trim();

      // Get all active doctors
      const { data: doctorClinics, error: queryError } = await supabase
        .from('doctor_clinics')
        .select(`
          id,
          is_active,
          schedule,
          doctors!inner (
            id,
            first_name,
            last_name,
            specialization,
            experience_years,
            bio,
            consultation_fee,
            image_url,
            languages_spoken,
            certifications,
            awards,
            is_available,
            rating,
            total_reviews,
            license_number,
            education
          ),
          clinics!inner (
            id,
            name,
            address,
            city,
            province,
            phone,
            email,
            location,
            rating,
            operating_hours
          )
        `)
        .eq('is_active', true);

      if (queryError) throw queryError;

      // Filter by search term
      const filteredResults = doctorClinics.filter((dc) => {
        const doctor = dc.doctors;
        if (!doctor) return false;

        const fullName = `${doctor.first_name} ${doctor.last_name}`.toLowerCase();
        const specialization = (doctor.specialization || '').toLowerCase();
        const bio = (doctor.bio || '').toLowerCase();

        return (
          fullName.includes(searchTerm) ||
          specialization.includes(searchTerm) ||
          bio.includes(searchTerm)
        );
      });

      // Process results using the same logic as discoverDoctors
      const processedDoctors = filteredResults.map((dc) => {
        const doctor = dc.doctors;
        const clinic = dc.clinics;
        
        if (!doctor || !clinic) return null;

        const clinicCoords = extractCoordinates(clinic.location);

        return {
          id: doctor.id,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          full_name: `${doctor.first_name} ${doctor.last_name}`.trim(),
          name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
          specialization: doctor.specialization,
          specialty: doctor.specialization,
          experience_years: doctor.experience_years,
          experience: doctor.experience_years ? `${doctor.experience_years} years` : 'Experience varies',
          bio: doctor.bio,
          consultation_fee: doctor.consultation_fee,
          fee_display: doctor.consultation_fee ? `₱${doctor.consultation_fee.toFixed(2)}` : 'Call for pricing',
          image_url: doctor.image_url,
          image: doctor.image_url,
          rating: parseFloat(doctor.rating || 0),
          average_rating: parseFloat(doctor.rating || 0),
          total_reviews: doctor.total_reviews || 0,
          is_available: doctor.is_available,
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          clinic_address: clinic.address,
          clinic_city: clinic.city,
          position: {
            lat: clinicCoords.latitude,
            lng: clinicCoords.longitude
          }
        };
      }).filter(Boolean);

      setDoctors(processedDoctors);
      setFilteredDoctors(processedDoctors);

      const metadata = {
        total_found: processedDoctors.length,
        search_query: query,
        search_type: 'text_search'
      };
      
      setSearchMetadata(metadata);

      return {
        success: true,
        doctors: processedDoctors,
        metadata
      };

    } catch (err) {
      console.error('💥 Error in searchDoctors:', err);
      setError(err.message);
      
      return {
        success: false,
        error: err.message,
        doctors: []
      };
    } finally {
      setLoading(false);
    }
  }, [discoverDoctors, extractCoordinates]);

  /**
   * Get doctor details with all clinic associations
   */
  const getDoctorDetails = useCallback(async (doctorId) => {
    if (!doctorId) return null;

    try {
      setLoading(true);

      // Get doctor with all their clinic associations
      const { data: doctorClinics, error: queryError } = await supabase
        .from('doctor_clinics')
        .select(`
          id,
          is_active,
          schedule,
          doctors!inner (
            id,
            first_name,
            last_name,
            specialization,
            experience_years,
            bio,
            consultation_fee,
            image_url,
            languages_spoken,
            certifications,
            awards,
            is_available,
            rating,
            total_reviews,
            license_number,
            education
          ),
          clinics!inner (
            id,
            name,
            address,
            city,
            province,
            phone,
            email,
            location,
            rating,
            operating_hours,
            website_url
          )
        `)
        .eq('doctors.id', doctorId)
        .eq('is_active', true);

      if (queryError) throw queryError;
      if (!doctorClinics || doctorClinics.length === 0) {
        throw new Error('Doctor not found');
      }

      const doctor = doctorClinics[0].doctors;

      // Get all clinics where this doctor works
      const clinics = doctorClinics.map((dc) => {
        const clinic = dc.clinics;
        const coords = extractCoordinates(clinic.location);
        
        return {
          id: clinic.id,
          name: clinic.name,
          address: clinic.address,
          city: clinic.city,
          province: clinic.province,
          phone: clinic.phone,
          email: clinic.email,
          website_url: clinic.website_url,
          rating: clinic.rating,
          operating_hours: clinic.operating_hours,
          position: {
            lat: coords.latitude,
            lng: coords.longitude
          },
          schedule: dc.schedule,
          doctor_clinic_id: dc.id
        };
      });

      const doctorDetails = {
        id: doctor.id,
        first_name: doctor.first_name,
        last_name: doctor.last_name,
        full_name: `${doctor.first_name} ${doctor.last_name}`.trim(),
        name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
        specialization: doctor.specialization,
        experience_years: doctor.experience_years,
        bio: doctor.bio,
        consultation_fee: doctor.consultation_fee,
        image_url: doctor.image_url,
        languages_spoken: doctor.languages_spoken || [],
        certifications: doctor.certifications || {},
        awards: doctor.awards || [],
        is_available: doctor.is_available,
        rating: parseFloat(doctor.rating || 0),
        total_reviews: doctor.total_reviews || 0,
        license_number: doctor.license_number,
        education: doctor.education,
        clinics: clinics
      };

      return {
        success: true,
        doctor: doctorDetails
      };

    } catch (err) {
      console.error('Error fetching doctor details:', err);
      setError(err.message);
      
      return {
        success: false,
        error: err.message,
        doctor: null
      };
    } finally {
      setLoading(false);
    }
  }, [extractCoordinates]);

  /**
   * Get available specializations
   */
  const getAvailableSpecializations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('specialization')
        .eq('is_available', true)
        .not('specialization', 'is', null);

      if (error) throw error;

      // Get unique specializations
      const uniqueSpecs = [...new Set(data.map(d => d.specialization))].filter(Boolean);
      
      return {
        success: true,
        specializations: uniqueSpecs.sort()
      };

    } catch (err) {
      console.error('Error fetching specializations:', err);
      return {
        success: false,
        error: err.message,
        specializations: []
      };
    }
  }, []);

  return {
    // State
    doctors,
    filteredDoctors,
    loading,
    error,
    searchMetadata,

    // Actions
    discoverDoctors,
    searchDoctors,
    getDoctorDetails,
    getAvailableSpecializations,

    // Utilities
    setError,
    clearDoctors: () => {
      setDoctors([]);
      setFilteredDoctors([]);
      setSearchMetadata(null);
    }
  };
};