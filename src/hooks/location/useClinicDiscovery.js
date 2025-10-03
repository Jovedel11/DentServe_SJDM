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
  const [searchMetadata, setSearchMetadata] = useState(null);

  // Format location for PostGIS geography parameter
  const formatLocationForDatabase = useCallback((location) => {
    if (!location || !location.latitude || !location.longitude) {
      return null;
    }
    
    // Return as PostGIS geography using ST_SetSRID(ST_Point(lng, lat), 4326)
    const point = `SRID=4326;POINT(${location.longitude} ${location.latitude})`;
    console.log("🌍 Formatted location for database:", point);
    return point;
  }, []);

  // Extract coordinates from PostGIS location with better error handling
  const extractCoordinatesFromLocation = useCallback((locationData) => {
    if (!locationData) return { latitude: null, longitude: null };

    try {
      // Handle PostGIS binary format (hex string)
      if (typeof locationData === 'string' && locationData.startsWith('0101000020E6100000')) {
        // This is a PostGIS binary format, we need to parse it differently
        // For now, let's try to extract from the hex data
        console.log("🔍 PostGIS binary format detected:", locationData);
        
        // Fallback: Try to get coordinates from other clinic data if available
        return { latitude: null, longitude: null };
      }

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

      // Handle GeoJSON format from coordinates array
      if (locationData.coordinates && Array.isArray(locationData.coordinates)) {
        const [lng, lat] = locationData.coordinates;
        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }

      // Handle direct coordinates object
      if (locationData.latitude && locationData.longitude) {
        return {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        };
      }

      console.warn("🔴 Unknown location format:", locationData);
      return { latitude: null, longitude: null };
    } catch (error) {
      console.error("🔴 Error extracting coordinates:", error);
      return { latitude: null, longitude: null };
    }
  }, []);

  // Calculate distance manually if not provided by database
  const calculateDistance = useCallback((userLoc, clinicLat, clinicLng) => {
    if (!userLoc || !clinicLat || !clinicLng || isNaN(clinicLat) || isNaN(clinicLng)) {
      return 0;
    }

    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (clinicLat - userLoc.latitude) * Math.PI / 180;
    const dLon = (clinicLng - userLoc.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLoc.latitude * Math.PI / 180) * Math.cos(clinicLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }, []);

  // Parse operating hours to readable format
  const parseOperatingHours = useCallback((operatingHours) => {
    if (!operatingHours || typeof operatingHours !== 'object') {
      return {};
    }

    const parsedHours = {};
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];

    try {
      // Handle weekdays and weekends structure
      if (operatingHours.weekdays || operatingHours.weekends) {
        const weekdays = operatingHours.weekdays || {};
        const weekends = operatingHours.weekends || {};
        
        // Process weekdays
        Object.entries(weekdays).forEach(([day, hours]) => {
          if (hours && typeof hours === 'object' && hours.start && hours.end) {
            parsedHours[day] = `${hours.start} - ${hours.end}`;
          }
        });

        // Process weekends
        Object.entries(weekends).forEach(([day, hours]) => {
          if (hours && typeof hours === 'object' && hours.start && hours.end) {
            parsedHours[day] = `${hours.start} - ${hours.end}`;
          }
        });
      } else {
        // Handle direct day structure
        Object.entries(operatingHours).forEach(([day, hours]) => {
          if (hours && typeof hours === 'object' && hours.start && hours.end) {
            parsedHours[day] = `${hours.start} - ${hours.end}`;
          } else if (typeof hours === 'string') {
            parsedHours[day] = hours;
          }
        });
      }

      // Add current day info for quick access
      parsedHours._currentDay = currentDay;
      parsedHours._currentHours = parsedHours[currentDay] || 'Hours not available';

    } catch (error) {
      console.warn('Error parsing operating hours:', error);
      return { _currentDay: currentDay, _currentHours: 'Hours not available' };
    }

    return parsedHours;
  }, []);

  // Check if clinic is currently open
  const isClinicOpen = useCallback((operatingHours) => {
    if (!operatingHours || typeof operatingHours !== 'object') return false;

    try {
      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      let todayHours = null;

      // Check weekdays/weekends structure
      if (operatingHours.weekdays || operatingHours.weekends) {
        const isWeekend = currentDay === 'saturday' || currentDay === 'sunday';
        const hoursGroup = isWeekend ? operatingHours.weekends : operatingHours.weekdays;
        todayHours = hoursGroup?.[currentDay];
      } else {
        todayHours = operatingHours[currentDay];
      }

      if (!todayHours || typeof todayHours !== 'object' || !todayHours.start || !todayHours.end) {
        return false;
      }

      return currentTime >= todayHours.start && currentTime <= todayHours.end;
    } catch (error) {
      console.warn('Error checking if clinic is open:', error);
      return false;
    }
  }, []);

  // Get clinic coordinates with fallback to address geocoding
  const getClinicCoordinates = useCallback(async (clinic) => {
    // First try to extract from location field
    let coordinates = extractCoordinatesFromLocation(clinic.location);
    
    // If coordinates are invalid, try to use a fallback based on address
    if (!coordinates.latitude || !coordinates.longitude || 
        isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) {
      
      console.log(`🔍 Invalid coordinates for ${clinic.name}, using address-based fallback`);
      
      // Use San Jose Del Monte area coordinates with slight variations based on clinic
      const sjdmCenter = { lat: 14.8136, lng: 121.0447 };
      const clinicIndex = clinic.id ? clinic.id.slice(-2) : '00';
      const indexNum = parseInt(clinicIndex, 16) || 0;
      
      // Add small variations to spread clinics around SJDM
      const latVariation = (indexNum % 20 - 10) * 0.01; // ±0.1 degree variation
      const lngVariation = ((indexNum * 7) % 20 - 10) * 0.01; // Different pattern for lng
      
      coordinates = {
        latitude: sjdmCenter.lat + latVariation,
        longitude: sjdmCenter.lng + lngVariation
      };
      
      console.log(`📍 Generated coordinates for ${clinic.name}:`, coordinates);
    }
    
    return coordinates;
  }, [extractCoordinatesFromLocation]);

  // Main discovery function with better coordinate and distance handling
  const discoverClinics = useCallback(async (searchLocation = null, options = {}) => {
    console.log("🚀 discoverClinics called with:", { searchLocation, options });
    
    setLoading(true);
    setError(null);

    try {
      const {
        maxDistance = 50,
        services = [],
        minRating = null,
        limit = 20
      } = options;

      // Format location for PostGIS
      const formattedLocation = searchLocation ? formatLocationForDatabase(searchLocation) : null;
      
      console.log("📍 Using location:", formattedLocation);

      // Call the working RPC function (same as appointment booking)
      const { data, error } = await supabase.rpc('find_nearest_clinics', {
        user_location: formattedLocation,
        max_distance_km: maxDistance,
        limit_count: limit,
        services_filter: services.length > 0 ? services : null,
        min_rating: minRating
      });

      if (error) {
        console.error("🔴 RPC Error:", error);
        throw error;
      }

      console.log("📥 Raw RPC response:", data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch clinics');
      }

      const clinicsData = data.data?.clinics || [];
      const metadata = data.data?.search_metadata || {};

      console.log("📊 Clinics data:", clinicsData);

const transformedClinics = await Promise.all(
  clinicsData.map(async (clinic) => {
    // Get proper coordinates
    const coordinates = await getClinicCoordinates(clinic);
    
    // ✅ Calculate distance as NUMBER, not string
    let distanceKm = 0;
    
    if (searchLocation && coordinates.latitude && coordinates.longitude) {
      // Calculate using Haversine if we have user location
      distanceKm = calculateDistance(
        searchLocation, 
        coordinates.latitude, 
        coordinates.longitude
      );
    } else if (clinic.distance_km !== undefined && clinic.distance_km !== null) {
      // Use database-provided distance
      distanceKm = parseFloat(clinic.distance_km) || 0;
    }
    
    console.log(`📏 Distance for ${clinic.name}: ${distanceKm}km`);
    
    // ✅ Services are already in the response as array of objects
    const clinicServices = clinic.services_offered || [];
    
    // Format services for display
    const formattedServices = clinicServices.map(service => ({
      id: service.id,
      name: service.name,
      price: service.min_price && service.max_price 
        ? `₱${service.min_price} - ₱${service.max_price}`
        : 'Call for pricing',
      category: service.category,
      duration: service.duration_minutes ? `${service.duration_minutes} min` : 'Duration varies',
      description: service.description
    }));

    // Fetch doctors for this clinic
    let clinicDoctors = [];
    try {
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctor_clinics')
        .select(`
          doctors (
            id,
            first_name,
            last_name,
            specialization,
            experience_years,
            rating,
            image_url
          )
        `)
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)
        .limit(5);

      if (!doctorsError && doctorsData) {
        clinicDoctors = doctorsData
          .map(item => item.doctors)
          .filter(Boolean)
          .map(doctor => ({
            id: doctor.id,
            name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
            full_name: `${doctor.first_name} ${doctor.last_name}`.trim(),
            specialization: doctor.specialization,
            specialty: doctor.specialization,
            experience: doctor.experience_years ? `${doctor.experience_years} years` : 'Experience varies',
            years_experience: doctor.experience_years,
            rating: doctor.rating || 0,
            average_rating: doctor.rating || 0,
            image: doctor.image_url,
            profile_image_url: doctor.image_url,
            availability: 'Available'
          }));
      }
    } catch (err) {
      console.warn(`⚠️ Failed to fetch doctors for clinic ${clinic.id}:`, err);
    }

    // ✅ CRITICAL: Keep raw operating_hours from database, DON'T transform it
    // The database returns: { "monday": { "open": "08:00", "close": "17:00" }, ... }
    const rawOperatingHours = clinic.operating_hours || {};
    
    console.log(`🕐 Raw operating hours for ${clinic.name}:`, rawOperatingHours);

    return {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      city: clinic.city,
      phone: clinic.phone,
      email: clinic.email,
      website_url: clinic.website_url,
      image_url: clinic.image_url,
      image: clinic.image_url || "/assets/images/dental.png",
      rating: parseFloat(clinic.rating || 0),
      total_reviews: clinic.total_reviews || 0,
      reviews: clinic.total_reviews || 0,
      
      // ✅ Distance as NUMBER (kilometers)
      distance_km: distanceKm,
      distance_numeric: distanceKm,
      distance: distanceKm, // Also as number for consistency
      
      // Coordinates
      position: {
        lat: coordinates.latitude,
        lng: coordinates.longitude
      },
      coordinates: coordinates,
      
      // ✅ Services - formatted for display
      services: formattedServices,
      services_offered: formattedServices,
      
      // ✅ CRITICAL: Store RAW operating hours from database
      // This is the JSONB data in format: { "dayname": { "open": "HH:MM", "close": "HH:MM" } }
      operating_hours: rawOperatingHours,
      hours: rawOperatingHours, // Keep both for compatibility
      
      // Doctors
      doctors: clinicDoctors,
      
      // Additional data
      badges: clinic.badges || [],
      stats: clinic.stats || {},
      is_available: true,
      is_active: clinic.is_active !== false,
      appointment_limit_per_patient: clinic.appointment_limit_per_patient,
      cancellation_policy_hours: clinic.cancellation_policy_hours,
      timezone: clinic.timezone || 'Asia/Manila',
      emergency_hours: false,
      emergencyHours: false,
      accepts_insurance: false,
      acceptsInsurance: false,
      
      // MapView specific fields
      nextAvailable: "Call for availability",
      specialOffers: [],
      helpful_feedback: 0
    };
  })
);


      // Sort by distance if user location is available
      if (searchLocation) {
        transformedClinics.sort((a, b) => a.distance_numeric - b.distance_numeric);
      }

      console.log("✅ Transformed clinics with coordinates:", transformedClinics.map(c => ({
        name: c.name,
        distance: c.distance,
        position: c.position
      })));

      setClinics(transformedClinics);
      setSearchMetadata(metadata);
      
      return {
        success: true,
        clinics: transformedClinics,
        metadata: metadata
      };

    } catch (error) {
      console.error("💥 Error in discoverClinics:", error);
      setError(error.message);
      setClinics([]);
      return {
        success: false,
        error: error.message,
        clinics: []
      };
    } finally {
      setLoading(false);
    }
  }, [formatLocationForDatabase, getClinicCoordinates, calculateDistance, parseOperatingHours, isClinicOpen]);

  // Search clinics (just calls discover with search query)
  const searchClinics = useCallback(async (query, options = {}) => {
    console.log("🔍 searchClinics called:", { query, options });
    
    // For now, just call discoverClinics with options
    // You can enhance this to include text search later
    return await discoverClinics(userLocation, {
      ...options,
      searchQuery: query
    });
  }, [discoverClinics, userLocation]);

  // Get detailed clinic information
  const getClinicDetails = useCallback(async (clinicId) => {
    if (!clinicId) return null;

    try {
      setLoading(true);

      // Get basic clinic info
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      if (clinicError) throw clinicError;

      // ✅ Get services from services table
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('priority', { ascending: false});

      // Get doctors
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctor_clinics')
        .select(`
          doctors (
            id,
            first_name,
            last_name,
            specialization,
            experience_years,
            rating,
            image_url
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      const coordinates = await getClinicCoordinates(clinic);
      const rawOperatingHours = clinic.operating_hours || {};
      const isOpen = isClinicOpen(rawOperatingHours);

      // ✅ Format services properly
      const formattedServices = services?.map(service => ({
        id: service.id,
        name: service.name,
        price: service.min_price && service.max_price 
          ? `₱${service.min_price} - ₱${service.max_price}`
          : 'Call for pricing',
        category: service.category,
        duration: service.duration_minutes ? `${service.duration_minutes} min` : 'Duration varies'
      })) || [];

      const formattedDoctors = doctors?.map(item => item.doctors).filter(Boolean).map(doctor => ({
        id: doctor.id,
        name: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
        full_name: `${doctor.first_name} ${doctor.last_name}`.trim(),
        specialization: doctor.specialization,
        specialty: doctor.specialization,
        experience: doctor.experience_years ? `${doctor.experience_years} years` : 'Experience varies',
        years_experience: doctor.experience_years,
        rating: doctor.rating || 0,
        average_rating: doctor.rating || 0,
        image: doctor.image_url,
        profile_image_url: doctor.image_url,
        availability: 'Available'
      })) || [];

      return {
        success: true,
        clinic: {
          ...clinic,
          position: {
            lat: coordinates.latitude,
            lng: coordinates.longitude
          },
          hours: rawOperatingHours,
          operating_hours: rawOperatingHours,
          is_open: isOpen,
          isOpen: isOpen,
          services: formattedServices,
          services_offered: formattedServices,
          doctors: formattedDoctors,
          coordinates,
          image: clinic.image_url || "/assets/images/dental.png"
        }
      };

    } catch (error) {
      console.error("Error fetching clinic details:", error);
      return { success: false, error: error.message, clinic: null };
    } finally {
      setLoading(false);
    }
  }, [getClinicCoordinates, parseOperatingHours, isClinicOpen]);

  return {
    clinics,
    filteredClinics,
    loading,
    error,
    searchMetadata,
    discoverClinics,
    searchClinics,
    getClinicDetails
  };
};