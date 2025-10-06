import { useCallback, useState } from "react";
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
    
    const point = `SRID=4326;POINT(${location.longitude} ${location.latitude})`;
    console.log("🌍 Formatted location for database:", point);
    return point;
  }, []);

  // Main discovery function
  const discoverClinics = useCallback(async (searchLocation = null, options = {}) => {
    console.log("═══════════════════════════════════════");
    console.log("🚀 discoverClinics CALLED");
    console.log("═══════════════════════════════════════");
    console.log("Search Location:", searchLocation);
    console.log("Options:", options);
    
    setLoading(true);
    setError(null);

    try {
      const {
        maxDistance = 50,
        services = [],
        minRating = null,
        limit = 20
      } = options;

      // ✅ Extract latitude and longitude as separate parameters
      const latitude = searchLocation?.latitude || null;
      const longitude = searchLocation?.longitude || null;
      
      console.log("📍 User Location Parameters:", {
        p_latitude: latitude,
        p_longitude: longitude
      });

      // Call the RPC function with lat/lng as separate parameters
      console.log("📞 Calling find_nearest_clinics RPC...");
      const { data, error } = await supabase.rpc('find_nearest_clinics', {
        p_latitude: latitude,
        p_longitude: longitude,
        max_distance_km: maxDistance,
        limit_count: limit,
        services_filter: services.length > 0 ? services : null,
        min_rating: minRating
      });

      if (error) {
        console.error("🔴 RPC Error:", error);
        throw error;
      }

      console.log("═══════════════════════════════════════");
      console.log("📥 RAW RPC RESPONSE:");
      console.log("═══════════════════════════════════════");
      console.log(JSON.stringify(data, null, 2));

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch clinics');
      }

      const clinicsData = data.data?.clinics || [];
      const metadata = data.data?.search_metadata || {};

      console.log("═══════════════════════════════════════");
      console.log(`📊 CLINICS DATA: ${clinicsData.length} clinics received`);
      console.log("═══════════════════════════════════════");
      
      if (clinicsData.length > 0) {
        console.log("📊 FIRST CLINIC RAW DATA:");
        console.log(JSON.stringify(clinicsData[0], null, 2));
        console.log("📊 Position from first clinic:", clinicsData[0].position);
        console.log("📊 Distance from first clinic:", clinicsData[0].distance_km);
        console.log("📊 Is Open from first clinic:", clinicsData[0].is_open);
      }

      const transformedClinics = await Promise.all(
        clinicsData.map(async (clinic, index) => {
          console.log(`\n🏥 [${index + 1}/${clinicsData.length}] Processing: ${clinic.name}`);
          console.log("   Raw clinic data:", {
            id: clinic.id,
            name: clinic.name,
            position: clinic.position,
            distance_km: clinic.distance_km,
            is_open: clinic.is_open
          });
          
          // ✅ CRITICAL: Extract and validate position
          let position = null;
          
          if (clinic.position) {
            console.log(`   📍 Position data type:`, typeof clinic.position);
            console.log(`   📍 Position keys:`, Object.keys(clinic.position));
            console.log(`   📍 Position.lat:`, clinic.position.lat, typeof clinic.position.lat);
            console.log(`   📍 Position.lng:`, clinic.position.lng, typeof clinic.position.lng);
            
            const lat = parseFloat(clinic.position.lat);
            const lng = parseFloat(clinic.position.lng);
            
            console.log(`   📍 Parsed lat:`, lat);
            console.log(`   📍 Parsed lng:`, lng);
            console.log(`   📍 isNaN(lat):`, isNaN(lat));
            console.log(`   📍 isNaN(lng):`, isNaN(lng));
            
            if (!isNaN(lat) && !isNaN(lng)) {
              position = { lat, lng };
              console.log(`   ✅ Valid position created:`, position);
            } else {
              console.error(`   ❌ Position parsing failed - lat:${lat}, lng:${lng}`);
            }
          } else {
            console.error(`   ❌ No position data in clinic object`);
          }
          
          if (!position) {
            console.error(`   ❌ SKIPPING ${clinic.name} - no valid position`);
            return null;
          }
          
          // ✅ Distance from database
          const distanceKm = clinic.distance_km !== undefined && clinic.distance_km !== null
            ? parseFloat(clinic.distance_km)
            : 0;
          
          console.log(`   ✅ Distance: ${distanceKm}km`);
          console.log(`   ✅ Is Open: ${clinic.is_open}`);
          
          // Services
          const clinicServices = clinic.services_offered || clinic.services || [];
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

          // Fetch doctors
          let clinicDoctors = [];
          try {
            const { data: doctorsData } = await supabase
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

            if (doctorsData) {
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
            console.warn(`   ⚠️ Failed to fetch doctors:`, err);
          }

          const rawOperatingHours = clinic.operating_hours || {};
          const isOpen = clinic.is_open === true;
          
          const transformedClinic = {
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
            
            // Distance
            distance_km: distanceKm,
            distance_numeric: distanceKm,
            distance: distanceKm,
            
            // Position
            position: position,
            coordinates: {
              latitude: position.lat,
              longitude: position.lng
            },
            
            // Services
            services: formattedServices,
            services_offered: formattedServices,
            
            // Operating hours
            operating_hours: rawOperatingHours,
            hours: rawOperatingHours,
            is_open: isOpen,
            isOpen: isOpen,
            
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
          };
          
          console.log(`   ✅ Transformed clinic complete:`, {
            name: transformedClinic.name,
            position: transformedClinic.position,
            distance_km: transformedClinic.distance_km
          });
          
          return transformedClinic;
        })
      );

      // Remove null entries
      const validClinics = transformedClinics.filter(Boolean);

      console.log("═══════════════════════════════════════");
      console.log(`✅ TRANSFORMATION COMPLETE`);
      console.log(`   Total received: ${clinicsData.length}`);
      console.log(`   Valid clinics: ${validClinics.length}`);
      console.log(`   Skipped: ${clinicsData.length - validClinics.length}`);
      console.log("═══════════════════════════════════════");
      
      if (validClinics.length > 0) {
        console.log("✅ FINAL CLINICS DATA:");
        validClinics.forEach((c, i) => {
          console.log(`   [${i + 1}] ${c.name}:`, {
            position: c.position,
            distance_km: c.distance_km,
            is_open: c.is_open
          });
        });
      }

      // Sort by distance if user location available
      if (searchLocation && validClinics.length > 0) {
        validClinics.sort((a, b) => a.distance_numeric - b.distance_numeric);
        console.log("✅ Sorted by distance");
      }

      console.log("═══════════════════════════════════════");
      console.log("✅ Setting clinics state with", validClinics.length, "clinics");
      console.log("═══════════════════════════════════════\n");

      setClinics(validClinics);
      setSearchMetadata(metadata);
      
      return {
        success: true,
        clinics: validClinics,
        metadata: metadata
      };

    } catch (error) {
      console.error("═══════════════════════════════════════");
      console.error("💥 ERROR in discoverClinics:");
      console.error("═══════════════════════════════════════");
      console.error(error);
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
  }, [])

  // Search clinics
  const searchClinics = useCallback(async (query, options = {}) => {
    console.log("🔍 searchClinics called:", { query, options });
    return await discoverClinics(userLocation, {
      ...options,
      searchQuery: query
    });
  }, [discoverClinics, userLocation]);

  // Get clinic details
  const getClinicDetails = useCallback(async (clinicId) => {
    if (!clinicId) return null;

    try {
      setLoading(true);

      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      if (clinicError) throw clinicError;

      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('priority', { ascending: false});

      const { data: doctors } = await supabase
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

      const rawOperatingHours = clinic.operating_hours || {};

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

      // Get position from database
      const { data: posData } = await supabase.rpc('find_nearest_clinics', {
        user_location: null,
        max_distance_km: 200,
        limit_count: 50,
        services_filter: null,
        min_rating: null
      });

      const clinicData = posData?.data?.clinics?.find(c => c.id === clinicId);
      let position = null;
      
      if (clinicData?.position) {
        const lat = parseFloat(clinicData.position.lat);
        const lng = parseFloat(clinicData.position.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          position = { lat, lng };
        }
      }

      return {
        success: true,
        clinic: {
          ...clinic,
          position: position,
          hours: rawOperatingHours,
          operating_hours: rawOperatingHours,
          is_open: clinicData?.is_open || false,
          isOpen: clinicData?.is_open || false,
          services: formattedServices,
          services_offered: formattedServices,
          doctors: formattedDoctors,
          image: clinic.image_url || "/assets/images/dental.png"
        }
      };

    } catch (error) {
      console.error("Error fetching clinic details:", error);
      return { success: false, error: error.message, clinic: null };
    } finally {
      setLoading(false);
    }
  }, []);

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