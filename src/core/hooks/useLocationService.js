import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthProvider";
import { supabase } from "../../lib/supabaseClient";

export const useLocationService = () => {
  const { user, profile, isPatient } = useAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get current location with better error handling
  const getCurrentLocation = useCallback(async (options = {}) => {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
      ...options
    };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error("Geolocation is not supported by this browser.");
        setLocationError(error.message);
        reject(error);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
            source: 'gps'
          };
          
          setUserLocation(location);
          setLocationError(null);
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          let permissionState = 'error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              permissionState = 'denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              permissionState = 'unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              permissionState = 'timeout';
              break;
            default:
              errorMessage = 'An unknown location error occurred';
          }
          
          setLocationError(errorMessage);
          setLocationPermission(permissionState);
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }, []);

  // Update user location with proper error handling
  const updateUserLocation = useCallback(async (latitude, longitude) => {
    if (!isPatient()) {
      return { success: false, error: 'Only patients can update location preferences' };
    }

    if (!user || !profile) {
      return { success: false, error: 'User profile not found' };
    }

    try {
      setLoading(true);
      setLocationError(null);

      // Validate coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Invalid coordinates provided');
      }

      if (latitude < -90 || latitude > 90) {
        throw new Error('Invalid latitude value');
      }

      if (longitude < -180 || longitude > 180) {
        throw new Error('Invalid longitude value');
      }

      const { data, error } = await supabase.rpc('update_user_location', {
        latitude,
        longitude
      });

      if (error) throw new Error(error.message || 'Location update failed');
      if (data !== true) throw new Error('Failed to update location');


      // Update local state
      setUserLocation(prev => ({
        ...prev,
        latitude,
        longitude,
        timestamp: Date.now(),
        source: 'manual'
      }));

      return { success: true, message: 'Location updated successfully' };

    } catch (error) {
      const errorMsg = error.message || 'Location update failed';
      setLocationError(errorMsg);
      console.error('Location update error:', error);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient, user, profile]);

  // Request location access with comprehensive handling
  const requestLocationAccess = useCallback(async (saveToProfile = true) => {
    try {
      setLoading(true);
      setLocationError(null);

      const location = await getCurrentLocation();

      // If user is patient and saveToProfile is true, save to database
      if (isPatient() && saveToProfile && location) {
        const updateResult = await updateUserLocation(location.latitude, location.longitude);
        
        if (!updateResult.success) {
          console.warn('Failed to save location to profile:', updateResult.error);
          // Don't fail the entire request, just warn
        }
      }

      setLocationPermission('granted');
      return { 
        success: true, 
        location, 
        saved: isPatient() && saveToProfile 
      };

    } catch (error) {
      const errorMsg = error.message || 'Location access failed';
      setLocationError(errorMsg);
      
      if (error.message.includes('denied')) {
        setLocationPermission('denied');
      }
      
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getCurrentLocation, updateUserLocation, isPatient]);

  // Check if location is available and fresh
  const isLocationAvailable = useCallback(() => {
    if (!userLocation || !userLocation.timestamp) return false;
    
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isRecent = (Date.now() - userLocation.timestamp) < fiveMinutes;
    
    return isRecent && userLocation.latitude != null && userLocation.longitude != null;
  }, [userLocation]);

  // Get distance between two points (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance; // Distance in kilometers
  }, []);

  // Load saved location from user profile
// Fixed loadSavedLocation method
  const loadSavedLocation = useCallback(async () => {
    if (!isPatient() || !profile?.role_specific_data?.preferred_location) {
      return { success: false, error: 'No saved location found' };
    }

    try {
      const locationData = profile.role_specific_data.preferred_location;
      
      // ✅ FIXED: Handle all PostGIS return formats properly
      let latitude, longitude;
      
      if (typeof locationData === 'string') {
        // Handle WKT format: "POINT(longitude latitude)" 
        const pointMatch = locationData.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
        if (pointMatch) {
          longitude = parseFloat(pointMatch[1]);
          latitude = parseFloat(pointMatch[2]);
        } else {
          // Handle alternative text formats
          const coordMatch = locationData.match(/([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)/);
          if (coordMatch) {
            latitude = parseFloat(coordMatch[1]);
            longitude = parseFloat(coordMatch[2]);
          }
        }
      } else if (locationData && typeof locationData === 'object') {
        // Handle GeoJSON format
        if (locationData.coordinates && Array.isArray(locationData.coordinates)) {
          longitude = locationData.coordinates[0];
          latitude = locationData.coordinates[1];
        }
        // Handle PostGIS geography object  
        else if (locationData.x !== undefined && locationData.y !== undefined) {
          longitude = locationData.x;
          latitude = locationData.y;
        }
      }
      
      // Validate parsed coordinates
      if (isNaN(latitude) || isNaN(longitude) || 
          latitude < -90 || latitude > 90 || 
          longitude < -180 || longitude > 180) {
        return { success: false, error: 'Invalid saved location coordinates' };
      }
      
      const savedLocation = {
        latitude,
        longitude,
        accuracy: null,
        timestamp: Date.now(),
        source: 'saved'
      };
      
      setUserLocation(savedLocation);
      return { success: true, location: savedLocation };
    } catch (error) {
      console.error('Error loading saved location:', error);
      return { success: false, error: 'Failed to load saved location' };
    }
  }, [isPatient, profile]);

  // Initialize location service and check permissions
  useEffect(() => {
    const initializeLocationService = async () => {
      // Check permission state if supported
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermission(permission.state);

          // Listen for permission changes
          permission.addEventListener('change', () => {
            setLocationPermission(permission.state);
          });
        } catch (error) {
          console.warn('Error checking geolocation permission:', error);
        }
      }

      // Try to load saved location for patients
      if (isPatient() && profile?.role_specific_data?.preferred_location) {
        await loadSavedLocation();
      }
    };

    initializeLocationService();
  }, [isPatient, profile, loadSavedLocation]);

  return {
    // State
    userLocation,
    locationPermission,
    locationError,
    loading,

    // Actions
    getCurrentLocation,         // Returns: Promise<location>
    requestLocationAccess,      // Returns: { success, location, saved, error }
    updateUserLocation,         // Returns: { success, message, error }
    loadSavedLocation,         // Returns: { success, location, error }

    // Utilities
    isLocationAvailable,       // Returns: boolean
    calculateDistance,         // Returns: distance in km
    
    // Computed
    hasLocation: !!userLocation,
    isLocationFresh: isLocationAvailable(),
    canRequestLocation: navigator.geolocation && locationPermission !== 'denied',
    locationAccuracy: userLocation?.accuracy,
    lastUpdated: userLocation?.timestamp,
    locationSource: userLocation?.source,
    
    // Format helpers
    formatCoordinates: () => {
      if (!userLocation) return 'No location';
      return `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
    },
    
    formatLastUpdated: () => {
      if (!userLocation?.timestamp) return 'Never';
      const diff = Date.now() - userLocation.timestamp;
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }
  };
};