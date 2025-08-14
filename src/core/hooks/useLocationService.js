import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthProvider"
import { supabase } from "../../lib/supabaseClient";

export const useLocationService = () => {
  const { user, isPatient } = useAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);

  //get user's current location
  const getCurrentLocation = useCallback(async (options = {}) => {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
      ...options
    };

    return new Promise((resolve, reject) => {
      if(!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          setUserLocation(location);
          setLocationError(null);
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              setLocationPermission('denied')
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              setLocationPermission('unavailable');
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              setLocationPermission('timeout');
              break;
          }
          setLocationError(errorMessage);
          reject(new Error(errorMessage));
        },
        defaultOptions
      )
    })
  }, [])

  // update user's preferred location in database
  const updatedUserLocation = useCallback(async (latitude, longitude) => {
    if (!isPatient() || !user) {
      throw new Error('Only patients can update location preferences');
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('update_user_location', {
        latitude,
        longitude,
      });

      if (error) throw new Error(error?.message || 'Location update failed');

      if (!data) throw new Error('Failed to update location');

      return { success: true };
    } catch (error) {
      console.error('Location update error', error)
    } finally {
      setLoading(false);
    }
  }, [isPatient, user])

  // request location permission and get current position
  const requestLocationAccess = useCallback(async () => {
    try {
      setLoading(true);
      setLocationError(null);

      const location = await getCurrentLocation()

      // if user is patient, save location to database
      if (isPatient() && location) {
        await updatedUserLocation(location.latitude, location.longitude);
      }

      setLocationPermission('granted');
      return location;
    } catch (error) {
      setLocationError(error.message);
      if (error.message.includes('denied')) {
        setLocationPermission('denied');
      }
      throw new Error(error?.message || 'Location access failed');
    } finally {
      setLoading(false);
    }
  }, [getCurrentLocation, updatedUserLocation, isPatient]);

  // check if location is available and new
  const isLocationAvailable = useCallback(() => {
    if (!userLocation || !userLocation.timestamp ) return false;
    
    const fiveMinutes = 5* 60 * 1000;
    return (Date.now() - userLocation.timestamp) < fiveMinutes
  }, [userLocation])

  // initialize location service
  useEffect(() => {
    // check permission state
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(permissions => {
          setLocationPermission(permissions.state);

          // listen for permission changes
          permissions.addEventListener('change', () => {
            setLocationPermission(permissions.state);
          });
        })
        .catch(error => console.error('Error checking geolocation permission:', error));
    }
  }, []);

  return {
    userLocation,
    locationPermission,
    locationError,
    loading,
    locationError,
    getCurrentLocation,
    requestLocationAccess,
    updatedUserLocation,
    isLocationAvailable
  }

}
