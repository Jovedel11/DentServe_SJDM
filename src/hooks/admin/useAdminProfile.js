import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';

export const useAdminProfile = () => {
  const [error, setError] = useState(null);
  
  const { 
    isAdmin, 
    profile, 
    loading,
    updateAdminProfile: updateProfileFromContext,
    handleRefreshProfile
  } = useAuth();

  // Use AuthProvider's updateAdminProfile
  const updateProfile = useCallback(async (profileData) => {
    if (!isAdmin) {
      const errorMsg = 'Access denied: Admin required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setError(null);
      
      const result = await updateProfileFromContext({
        firstName: profileData.first_name || profileData.firstName,
        lastName: profileData.last_name || profileData.lastName,
        phone: profileData.phone,
        profileImageUrl: profileData.profile_image_url || profileData.profileImageUrl,
        dateOfBirth: profileData.date_of_birth || profileData.dateOfBirth,
        gender: profileData.gender
      });

      if (!result.success) {
        setError(result.error);
      }

      return result;

    } catch (err) {
      const errorMessage = err.message || 'Failed to update admin profile';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [isAdmin, updateProfileFromContext]);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!isAdmin) {
      const errorMsg = 'Access denied: Admin required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setError(null);
      await handleRefreshProfile();
      
      return {
        success: true,
        data: profile
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch profile';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [isAdmin, handleRefreshProfile, profile]);

  return {
    // State (from AuthProvider)
    profile,
    loading,
    error,
    
    // Methods
    fetchProfile,
    updateProfile
  };
};