import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useLocationService = () => {
  const { user, profile } = useAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Prevent concurrent operations
  const operationRef = useRef(false);
  
  // User type check
  const isPatient = profile?.user_type === 'patient';
  const isStaff = profile?.user_type === 'staff';
  const isAdmin = profile?.user_type === 'admin';

  // Browser geolocation with proper error handling
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setLocationPermission('unavailable');
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setLocationPermission('requesting');
      
      const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
            source: 'browser_gps'
          };
          
          setUserLocation(location);
          setLocationPermission('granted');
          setLocationError(null);
          resolve(location);
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              setLocationPermission('denied');
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              setLocationPermission('unavailable');
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              setLocationPermission('timeout');
              break;
            default:
              errorMessage = 'Unknown location error';
              setLocationPermission('error');
              break;
          }
          
          setLocationError(errorMessage);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }, []);

  // Update user location in database
  const updateUserLocation = useCallback(async (latitude, longitude) => {
    if (!user || !isPatient) {
      return { success: false, error: 'Only patients can update location' };
    }

    // Input validation
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { success: false, error: 'Invalid coordinates provided' };
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return { success: false, error: 'Coordinates out of valid range' };
    }

    try {
      const { data, error } = await supabase.rpc('update_user_location', {
        latitude: latitude,
        longitude: longitude
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw new Error(error.message || 'Failed to update location');
      }
      
      // Handle JSONB response
      if (data?.success) {
        const locationData = data.data?.location;
        if (locationData) {
          const updatedLocation = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: Date.now(),
            source: 'database_updated',
            updated_at: data.data?.updated_at
          };
          
          setUserLocation(updatedLocation);
        }
        
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data?.error || 'Failed to update location' };
      }

    } catch (error) {
      console.error('Error updating user location:', error);
      return { success: false, error: error.message };
    }
  }, [user, isPatient]);

  // Get user location from database
  const getUserLocationFromDatabase = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('get_user_location');

      if (error) {
        console.error('Database location fetch error:', error);
        throw new Error(error.message || 'Failed to get user location');
      }
      
      // Handle JSONB response structure
      if (data?.success) {
        const locationData = data.data;
        
        if (locationData?.has_location) {
          const location = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: Date.now(),
            source: locationData.location_type || 'database',
            accuracy_note: locationData.accuracy_note
          };
          
          // Validate coordinates before setting
          if (typeof location.latitude === 'number' && 
              typeof location.longitude === 'number' &&
              !isNaN(location.latitude) && 
              !isNaN(location.longitude)) {
            setUserLocation(location);
            return { success: true, location, data: locationData };
          } else {
            console.warn('Invalid coordinates from database:', location);
            return { success: false, error: 'Invalid coordinates from database' };
          }
        } else {
          return { 
            success: true, 
            location: null, 
            message: locationData?.message || 'No location set',
            suggestion: locationData?.suggestion 
          };
        }
      } else {
        return { success: false, error: data?.error || 'Failed to get location' };
      }

    } catch (error) {
      console.error('Error getting user location from database:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

  // Request location access with comprehensive handling
  const requestLocationAccess = useCallback(async (saveToProfile = true) => {
    if (operationRef.current) return { success: false, error: 'Operation in progress' };
    
    try {
      operationRef.current = true;
      setLoading(true);
      setLocationError(null);

      const location = await getCurrentLocation();

      // If user is patient and saveToProfile is true, save to database
      if (isPatient && saveToProfile && location) {
        const updateResult = await updateUserLocation(location.latitude, location.longitude);
        
        if (!updateResult.success) {
          console.warn('Failed to save location to profile:', updateResult.error);
          // Still return success since we got the location
        }
      }

      return { success: true, location };

    } catch (error) {
      console.error('Error requesting location access:', error);
      setLocationError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      operationRef.current = false;
    }
  }, [isPatient, getCurrentLocation, updateUserLocation]);

  // Load saved location from database
  const loadSavedLocation = useCallback(async () => {
    if (!user || operationRef.current) {
      return { success: false, error: 'Cannot load location' };
    }

    try {
      operationRef.current = true;
      const result = await getUserLocationFromDatabase();
      
      if (result.success && result.location) {
        return { success: true, location: result.location };
      } else {
        return { 
          success: false, 
          error: result.message || 'No saved location found',
          suggestion: result.suggestion 
        };
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
      return { success: false, error: 'Failed to load saved location' };
    } finally {
      operationRef.current = false;
    }
  }, [user, getUserLocationFromDatabase]);

  // Check if location is available and valid
  const isLocationAvailable = useCallback(() => {
    if (!userLocation) return false;
    
    // Validate coordinates
    const { latitude, longitude } = userLocation;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
    if (isNaN(latitude) || isNaN(longitude)) return false;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
    
    // Check if location is recent (within 30 minutes for GPS, always valid for database)
    if (userLocation.source === 'browser_gps' && userLocation.timestamp) {
      const thirtyMinutes = 30 * 60 * 1000;
      const isRecent = (Date.now() - userLocation.timestamp) < thirtyMinutes;
      return isRecent;
    }
    
    return true; // Database locations are always considered valid
  }, [userLocation]);

  // Get formatted location for Google Maps
  const getFormattedLocation = useCallback(() => {
    if (!isLocationAvailable()) return null;
    
    return {
      lat: userLocation.latitude,
      lng: userLocation.longitude
    };
  }, [userLocation, isLocationAvailable]);

  // Initialize location service
  const initializeLocationService = useCallback(async () => {
    if (isInitialized || operationRef.current) return;
    
    try {
      operationRef.current = true;
      setLoading(true);

      // Try to load saved location first
      const savedResult = await loadSavedLocation();
      
      if (savedResult.success) {
        console.log('Loaded saved location:', savedResult.location);
      } else {
        console.log('No saved location available:', savedResult.error);
      }

    } catch (error) {
      console.error('Error initializing location service:', error);
      setLocationError('Failed to initialize location service');
    } finally {
      setLoading(false);
      setIsInitialized(true);
      operationRef.current = false;
    }
  }, [isInitialized, loadSavedLocation]);

  // Initialize on mount
  useEffect(() => {
    if (user && !isInitialized) {
      initializeLocationService();
    }
  }, [user, isInitialized, initializeLocationService]);

  // Clear location data on user change
  useEffect(() => {
    if (!user) {
      setUserLocation(null);
      setLocationPermission('prompt');
      setLocationError(null);
      setIsInitialized(false);
    }
  }, [user]);

  return {
    // State
    userLocation,
    locationPermission,
    loading,
    locationError,
    isInitialized,

    // Actions
    getCurrentLocation,
    requestLocationAccess,
    updateUserLocation,
    loadSavedLocation,

    // Utilities
    isLocationAvailable,
    getFormattedLocation,
    
    // User type flags
    isPatient,
    isStaff,
    isAdmin
  };
};