import { useCallback, useState } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useLocationService } from "./useLocationService";
import { supabase } from "@/lib/supabaseClient";

export const useDoctorDiscovery = () => {
  const { userLocation } = useLocationService();
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMetadata, setSearchMetadata] = useState(null);

  const formatLocationForDatabase = useCallback((location) => {
    if (!location || !location.latitude || !location.longitude) {
      return null;
    }
    
    const point = `SRID=4326;POINT(${location.longitude} ${location.latitude})`;
    console.log("🌍 Formatted location for database:", point);
    return point;
  }, []);

  // coordinates from clinic location data
  const extractCoordinatesFromLocation = useCallback((locationData) => {
    if (!locationData) return { latitude: null, longitude: null };

    try {
      // Handle WKT format: "POINT(121.0447 14.8136)"
      if (typeof locationData === 'string') {
        const match = locationData.match(/POINT\(([^)]+)\)/);
        if (match) {
          const [lng, lat] = match[1].split(' ').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { latitude: lat, longitude: lng };
          }
        }
      }

      // Handle GeoJSON format
      if (locationData && locationData.coordinates && Array.isArray(locationData.coordinates)) {
        const [lng, lat] = locationData.coordinates;
        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }

      // Handle object format
      if (locationData && typeof locationData === 'object') {
        if (locationData.latitude && locationData.longitude) {
          return { 
            latitude: locationData.latitude, 
            longitude: locationData.longitude 
          };
        }
      }

      return { latitude: null, longitude: null };
    } catch (error) {
      console.error("Error extracting coordinates:", error);
      return { latitude: null, longitude: null };
    }
  }, []);

  // 🔥 MAIN: Discover doctors with location and filters
  const discoverDoctors = useCallback(async (searchLocation = null, options = {}) => {
    const {
      maxDistance = 50,
      limit = 20,
      specializations = [],
      minRating = 0,
      minExperience = 0,
      isAvailable = null,
      sortBy = 'rating'
    } = options;

    console.log("🚀 discoverDoctors called with:", { searchLocation, options });

    setLoading(true);
    setError(null);

    try {
      // 🔥 Build the query for doctors with clinic locations
      let query = supabase
        .from('doctors')
        .select(`
          id,
          first_name,
          last_name,
          specialization,
          education,
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
          created_at,
          doctor_clinics!inner (
            clinic_id,
            is_active,
            schedule,
            clinics!inner (
              id,
              name,
              address,
              city,
              phone,
              location,
              rating,
              total_reviews,
              operating_hours,
              is_active
            )
          )
        `)
        .eq('doctor_clinics.is_active', true)
        .eq('doctor_clinics.clinics.is_active', true);

      // Apply filters
      if (specializations.length > 0) {
        query = query.in('specialization', specializations);
      }

      if (minRating > 0) {
        query = query.gte('rating', minRating);
      }

      if (minExperience > 0) {
        query = query.gte('experience_years', minExperience);
      }

      if (isAvailable !== null) {
        query = query.eq('is_available', isAvailable);
      }

      // Apply sorting
      switch (sortBy) {
        case 'experience':
          query = query.order('experience_years', { ascending: false });
          break;
        case 'fee-low':
          query = query.order('consultation_fee', { ascending: true });
          break;
        case 'fee-high':
          query = query.order('consultation_fee', { ascending: false });
          break;
        case 'reviews':
          query = query.order('total_reviews', { ascending: false });
          break;
        case 'alphabetical':
          query = query.order('first_name', { ascending: true });
          break;
        case 'rating':
        default:
          query = query.order('rating', { ascending: false });
          break;
      }

      // Apply limit
      query = query.limit(limit);

      console.log("📡 Executing doctors query...");
      const { data: doctorsData, error: queryError } = await query;

      if (queryError) {
        console.error("💥 Query error:", queryError);
        throw queryError;
      }

      console.log("📥 Raw doctors data:", doctorsData);

      if (!doctorsData || doctorsData.length === 0) {
        console.log("❌ No doctors found");
        setDoctors([]);
        setFilteredDoctors([]);
        setSearchMetadata({
          total_found: 0,
          search_center: searchLocation ? formatLocationForDatabase(searchLocation) : null,
          max_distance_km: maxDistance,
          filters: { specializations, minRating, minExperience, isAvailable }
        });
        return { success: true, doctors: [], metadata: {} };
      }

      // 🔥 Transform doctors data with clinic information
      const transformedDoctors = doctorsData.map(doctor => {
        // Calculate distance if user location is available
        let distance = 0;
        let clinic_locations = [];

        if (doctor.doctor_clinics && doctor.doctor_clinics.length > 0) {
          clinic_locations = doctor.doctor_clinics.map(dc => {
            const clinic = dc.clinics;
            const { latitude, longitude } = extractCoordinatesFromLocation(clinic.location);
            
            // Calculate distance if user location is available
            let clinicDistance = 0;
            if (searchLocation && latitude && longitude) {
              const R = 6371; // Earth's radius in km
              const dLat = (latitude - searchLocation.latitude) * Math.PI / 180;
              const dLng = (longitude - searchLocation.longitude) * Math.PI / 180;
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(searchLocation.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              clinicDistance = R * c;
            }

            return {
              clinic_id: clinic.id,
              clinic_name: clinic.name,
              address: clinic.address,
              city: clinic.city,
              phone: clinic.phone,
              clinic_rating: clinic.rating,
              clinic_reviews: clinic.total_reviews,
              operating_hours: clinic.operating_hours,
              schedule: dc.schedule,
              distance_km: clinicDistance,
              coordinates: { latitude, longitude }
            };
          });

          // Use the closest clinic's distance as the doctor's distance
          distance = clinic_locations.reduce((min, clinic) => 
            clinic.distance_km < min ? clinic.distance_km : min, 
            clinic_locations[0]?.distance_km || 0
          );
        }

        return {
          id: doctor.id,
          name: `${doctor.first_name} ${doctor.last_name}`.trim(),
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          specialization: doctor.specialization,
          education: doctor.education,
          experience_years: doctor.experience_years || 0,
          bio: doctor.bio,
          consultation_fee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : null,
          image_url: doctor. image_url,
          languages_spoken: doctor.languages_spoken || [],
          certifications: doctor.certifications || {},
          awards: doctor.awards || [],
          is_available: doctor.is_available,
          rating: doctor.rating ? parseFloat(doctor.rating) : 0,
          total_reviews: doctor.total_reviews || 0,
          total_patients: Math.floor(doctor.total_reviews * 2.5), // Estimate
          patient_satisfaction: Math.min(95, Math.floor(doctor.rating * 19)), // Estimate %
          distance: distance.toFixed(1),
          distance_km: distance,
          clinic_locations,
          next_available: doctor.is_available ? "Today" : "Call for availability",
          phone: clinic_locations[0]?.phone || null,
          email: `${doctor.first_name.toLowerCase()}.${doctor.last_name.toLowerCase()}@dental.com`,
          created_at: doctor.created_at
        };
      });

      console.log("✅ Transformed doctors:", transformedDoctors);

      setDoctors(transformedDoctors);
      setFilteredDoctors(transformedDoctors);
      setSearchMetadata({
        total_found: transformedDoctors.length,
        search_center: searchLocation ? formatLocationForDatabase(searchLocation) : null,
        max_distance_km: maxDistance,
        filters: { specializations, minRating, minExperience, isAvailable }
      });

      return {
        success: true,
        doctors: transformedDoctors,
        metadata: {
          total_found: transformedDoctors.length,
          search_center: searchLocation,
          filters: { specializations, minRating, minExperience, isAvailable }
        }
      };

    } catch (error) {
      console.error("💥 Error in discoverDoctors:", error);
      setError(error.message);
      setDoctors([]);
      setFilteredDoctors([]);
      return {
        success: false,
        error: error.message,
        doctors: [],
        metadata: {}
      };
    } finally {
      setLoading(false);
    }
  }, [extractCoordinatesFromLocation, formatLocationForDatabase]);

  // 🔥 Search doctors by query
  const searchDoctors = useCallback(async (searchQuery, options = {}) => {
    console.log("🔍 searchDoctors called with:", searchQuery, options);
    
    if (!searchQuery.trim()) {
      return await discoverDoctors(null, options);
    }

    setLoading(true);
    setError(null);

    try {
      // Search in doctors table with text matching
      let query = supabase
        .from('doctors')
        .select(`
          id,
          first_name,
          last_name,
          specialization,
          education,
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
          created_at,
          doctor_clinics!inner (
            clinic_id,
            is_active,
            schedule,
            clinics!inner (
              id,
              name,
              address,
              city,
              phone,
              location,
              rating,
              total_reviews,
              operating_hours,
              is_active
            )
          )
        `)
        .eq('doctor_clinics.is_active', true)
        .eq('doctor_clinics.clinics.is_active', true);

      // Apply text search
      const searchTerm = searchQuery.toLowerCase();
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,specialization.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);

      const { data: doctorsData, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Transform the data using the same logic as discoverDoctors
      const transformedDoctors = doctorsData?.map(doctor => {
        let clinic_locations = [];
        let distance = 0;

        if (doctor.doctor_clinics && doctor.doctor_clinics.length > 0) {
          clinic_locations = doctor.doctor_clinics.map(dc => {
            const clinic = dc.clinics;
            const { latitude, longitude } = extractCoordinatesFromLocation(clinic.location);
            
            return {
              clinic_id: clinic.id,
              clinic_name: clinic.name,
              address: clinic.address,
              city: clinic.city,
              phone: clinic.phone,
              clinic_rating: clinic.rating,
              clinic_reviews: clinic.total_reviews,
              operating_hours: clinic.operating_hours,
              schedule: dc.schedule,
              distance_km: 0, // No location-based distance in search
              coordinates: { latitude, longitude }
            };
          });
        }

        return {
          id: doctor.id,
          name: `${doctor.first_name} ${doctor.last_name}`.trim(),
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          specialization: doctor.specialization,
          education: doctor.education,
          experience_years: doctor.experience_years || 0,
          bio: doctor.bio,
          consultation_fee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : null,
          image_url: doctor. image_url,
          languages_spoken: doctor.languages_spoken || [],
          certifications: doctor.certifications || {},
          awards: doctor.awards || [],
          is_available: doctor.is_available,
          rating: doctor.rating ? parseFloat(doctor.rating) : 0,
          total_reviews: doctor.total_reviews || 0,
          total_patients: Math.floor(doctor.total_reviews * 2.5),
          patient_satisfaction: Math.min(95, Math.floor(doctor.rating * 19)),
          distance: "0",
          distance_km: 0,
          clinic_locations,
          next_available: doctor.is_available ? "Today" : "Call for availability",
          phone: clinic_locations[0]?.phone || null,
          email: `${doctor.first_name.toLowerCase()}.${doctor.last_name.toLowerCase()}@dental.com`,
          created_at: doctor.created_at
        };
      }) || [];

      setDoctors(transformedDoctors);
      setFilteredDoctors(transformedDoctors);

      return {
        success: true,
        doctors: transformedDoctors,
        metadata: {
          total_found: transformedDoctors.length,
          search_query: searchQuery
        }
      };

    } catch (error) {
      console.error("💥 Error in searchDoctors:", error);
      setError(error.message);
      return {
        success: false,
        error: error.message,
        doctors: []
      };
    } finally {
      setLoading(false);
    }
  }, [discoverDoctors, extractCoordinatesFromLocation]);

  // 🔥 Get detailed doctor information
  const getDoctorDetails = useCallback(async (doctorId) => {
    console.log("📋 getDoctorDetails called for:", doctorId);

    try {
      const { data: doctorData, error } = await supabase
        .from('doctors')
        .select(`
          *,
          doctor_clinics (
            *,
            clinics (
              id,
              name,
              address,
              city,
              phone,
              email,
              website_url,
              location,
              rating,
              total_reviews,
              operating_hours,
              services_offered
            )
          )
        `)
        .eq('id', doctorId)
        .single();

      if (error) throw error;

      if (!doctorData) {
        return null;
      }

      // Transform clinic locations
      const clinic_locations = doctorData.doctor_clinics?.map(dc => {
        const clinic = dc.clinics;
        const { latitude, longitude } = extractCoordinatesFromLocation(clinic.location);
        
        return {
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          address: clinic.address,
          city: clinic.city,
          phone: clinic.phone,
          email: clinic.email,
          website_url: clinic.website_url,
          clinic_rating: clinic.rating,
          clinic_reviews: clinic.total_reviews,
          operating_hours: clinic.operating_hours,
          services_offered: clinic.services_offered,
          schedule: dc.schedule,
          coordinates: { latitude, longitude }
        };
      }) || [];

      return {
        ...doctorData,
        name: `${doctorData.first_name} ${doctorData.last_name}`.trim(),
        clinic_locations,
        consultation_fee: doctorData.consultation_fee ? parseFloat(doctorData.consultation_fee) : null,
        rating: doctorData.rating ? parseFloat(doctorData.rating) : 0,
        total_patients: Math.floor(doctorData.total_reviews * 2.5),
        patient_satisfaction: Math.min(95, Math.floor(doctorData.rating * 19))
      };

    } catch (error) {
      console.error("💥 Error getting doctor details:", error);
      setError(error.message);
      return null;
    }
  }, [extractCoordinatesFromLocation]);

  // Get available specializations
  const getAvailableSpecializations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('specialization')
        .eq('is_available', true);

      if (error) throw error;

      const specializations = [...new Set(data.map(d => d.specialization))].filter(Boolean);
      return specializations.sort();
    } catch (error) {
      console.error("Error getting specializations:", error);
      return [];
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
    setDoctors,
    setFilteredDoctors,
    setError
  };
};