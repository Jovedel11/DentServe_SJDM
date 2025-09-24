import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { useClinic } from './useClinic';
import { useDoctors } from './useDoctor';
import { useServices } from './useServices';

export const useProfileManager = (options = {}) => {
  const { 
    enableClinicManagement = false,
    enableServiceManagement = false, 
    enableDoctorManagement = false
  } = options;

  const { 
    profile, 
    handleRefreshProfile, 
    updateProfile, 
    user,
    loading: authLoading,
    error: authError,
    isStaff,
    isAdmin,
    isPatient
  } = useAuth();

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [editedData, setEditedData] = useState(null);


  const profileData = useMemo(() => {
    if (!profile) return null;

    return {
      // User basic info
      user_id: profile.user_id,
      email: profile.email || '',
      phone: profile.phone || '',
      email_verified: profile.email_verified || false,
      phone_verified: profile.phone_verified || false,

      // Profile info with safe fallbacks
      profile: {
        first_name: profile.profile?.first_name || '',
        last_name: profile.profile?.last_name || '',
        full_name: profile.profile?.full_name || '',
        date_of_birth: profile.profile?.date_of_birth || '',
        gender: profile.profile?.gender || '',
        profile_image_url: profile.profile?.profile_image_url || '',
      },

      // Role specific data with safe fallbacks
      role_specific_data: profile.role_specific_data || {},

      // Statistics
      statistics: profile.statistics || {},

      // Staff-specific data (only if staff)
      ...(isStaff && {
        clinic_data: profile.clinic_data || {},
        services_data: profile.services_data || [],
        doctors_data: profile.doctors_data || []
      })
    };
  }, [profile, isStaff]);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    if (!profileData) return 0;

    const baseFields = [
      profileData.profile.first_name,
      profileData.profile.last_name,
      profileData.profile.date_of_birth,
      profileData.profile.gender,
      profileData.phone,
    ];

    let roleSpecificFields = [];

    if (isPatient) {
      roleSpecificFields = [
        profileData.role_specific_data?.emergency_contact_name,
        profileData.role_specific_data?.emergency_contact_phone,
      ];
    } else if (isStaff) {
      roleSpecificFields = [
        profileData.role_specific_data?.position,
        profileData.role_specific_data?.department,
      ];
    } else if (isAdmin) {
      roleSpecificFields = [
        profileData.role_specific_data?.access_level,
      ];
    }

    const allFields = [...baseFields, ...roleSpecificFields];
    const completed = allFields.filter(field => 
      field && field.toString().trim() !== ''
    ).length;
    
    return Math.round((completed / allFields.length) * 100);
  }, [profileData, isPatient, isStaff, isAdmin]);

  // Initialize edited data when profile changes
  const initializeEditData = useCallback(() => {
    if (profileData) {
      setEditedData(JSON.parse(JSON.stringify(profileData)));
    }
  }, [profileData]);

  // Auto-initialize when profile loads
  useEffect(() => {
    initializeEditData();
  }, [initializeEditData]);

  // Handle profile refresh
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      await handleRefreshProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setError('Failed to refresh profile data');
    } finally {
      setRefreshing(false);
    }
  }, [handleRefreshProfile]);

  // Support nested object updates for clinic/services/doctors
  const handleInputChange = useCallback((section, field, value) => {
    setEditedData(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev };

      if (section === 'root') {
        updated[field] = value;
      } else if (field.includes('.')) {
        const [parentField, childField] = field.split('.');
        if (!updated[section]) updated[section] = {};
        if (!updated[section][parentField]) updated[section][parentField] = {};
        updated[section][parentField][childField] = value;
      } else {
        if (!updated[section]) updated[section] = {};
        updated[section][field] = value;
      }

      return updated;
    });
  }, []);

  // Process arrays and objects for backend compatibility
  const processDataForBackend = useCallback((data) => {
    if (!data) return data;
    
    const processed = JSON.parse(JSON.stringify(data));

    // Process role-specific data
    if (processed.role_specific_data) {
      const roleData = processed.role_specific_data;
      
      // Convert comma-separated strings to arrays
      const arrayFields = ['medical_conditions', 'allergies', 'preferred_doctors'];
      arrayFields.forEach(field => {
        if (roleData[field] && typeof roleData[field] === 'string') {
          roleData[field] = roleData[field]
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        }
      });

      // Convert string booleans to actual booleans
      const booleanFields = ['email_notifications', 'is_available'];
      booleanFields.forEach(field => {
        if (typeof roleData[field] === 'string') {
          roleData[field] = roleData[field] === 'true';
        }
      });

      // Validate WKT format for geographic data
      if (roleData.preferred_location && !roleData.preferred_location.startsWith('POINT')) {
        console.warn('Preferred location should be in WKT POINT format');
        delete roleData.preferred_location; // Prevent invalid data
      }
    }

    return processed;
  }, []);

  // Enhanced save function matching backend parameters exactly
  const handleSave = useCallback(async (customData = null) => {
    const rawData = customData || editedData;
    
    if (!rawData || !profile.user_id) {
      setError('Invalid data or user not found');
      return { success: false };
    }

    const dataToSave = processDataForBackend(rawData);

    try {
      setSaving(true);
      setError(null);

      // Build profile data correctly
      const profileUpdateData = {
        first_name: dataToSave.profile?.first_name?.trim() || '',
        last_name: dataToSave.profile?.last_name?.trim() || '',
        date_of_birth: dataToSave.profile?.date_of_birth || null,
        gender: dataToSave.profile?.gender || null,
        profile_image_url: dataToSave.profile?.profile_image_url || null
      };

      // Include phone if provided (will trigger verification reset if changed)
      if (dataToSave.phone !== undefined) {
        profileUpdateData.phone = dataToSave.phone?.trim() || null;
      }

      // Role-specific data
      const roleSpecificUpdateData = dataToSave.role_specific_data || {};

      // Staff-specific data
      const clinicUpdateData = (isStaff && enableClinicManagement) ? dataToSave.clinic_data || {} : {};
      const servicesUpdateData = (isStaff && enableServiceManagement) ? dataToSave.services_data || {} : {};
      const doctorsUpdateData = (isStaff && enableDoctorManagement) ? dataToSave.doctors_data || {}: {};

      // ✅ CALL WITH CORRECT PARAMETER ORDER
      const result = await updateProfile(
        profile.user_id,
        profileUpdateData,  
        roleSpecificUpdateData,  
        clinicUpdateData,  
        servicesUpdateData,  
        doctorsUpdateData  
      );

      if (result.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [editedData, user?.id, updateProfile, handleRefreshProfile, processDataForBackend, isStaff, enableClinicManagement, enableServiceManagement, enableDoctorManagement]);

  // Handle edit toggle
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      initializeEditData();
    }
    setIsEditing(!isEditing);
    setError(null);
    setSuccess('');
  }, [isEditing, initializeEditData]);

  // Handle image update
  const handleImageUpdate = useCallback(async (newImageUrl) => {
    try {
      const result = await updateProfile(
        { profile_image_url: newImageUrl },
        {},
        user?.id,
        {},
        {},
        {}
      );

      if (result.success) {
        await handleRefreshProfile();
        return { success: true };
      } else {
        setError(result.error || 'Failed to update profile image');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      setError('Failed to update profile image');
      return { success: false, error: error.message };
    }
  }, [updateProfile, user?.id, handleRefreshProfile]);

  // Staff-specific clinic management functions
  const handleClinicUpdate = useCallback(async (clinicData) => {
    if (!isStaff || !enableClinicManagement) {
      setError('Clinic management not enabled for this user');
      return { success: false };
    }

    try {
      setSaving(true);
      setError(null);

      const result = await updateProfile(
        profile.user_id,
        {},
        {},
        clinicData,
        {},
        {}
      );

      if (result.success) {
        setSuccess('Clinic information updated successfully!');
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result.error || 'Failed to update clinic');
      }
    } catch (error) {
      console.error('Error updating clinic:', error);
      setError(error.message || 'Failed to update clinic');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [isStaff, enableClinicManagement, updateProfile, user?.id, handleRefreshProfile]);
  // Staff-specific services management
  const handleServicesUpdate = useCallback(async (servicesData) => {
    if (!isStaff || !enableServiceManagement) {
      setError('Service management not enabled for this user');
      return { success: false };
    }

    try {
      setSaving(true);
      setError(null);

      const result = await updateProfile(
        {},
        {},
        user?.id,
        {},
        servicesData,
        {}
      );

      if (result.success) {
        setSuccess('Services updated successfully!');
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result.error || 'Failed to update services');
      }
    } catch (error) {
      console.error('Error updating services:', error);
      setError(error.message || 'Failed to update services');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [isStaff, enableServiceManagement, updateProfile, user?.id, handleRefreshProfile]);

  // Staff-specific doctors management
  const handleDoctorsUpdate = useCallback(async (doctorsData) => {
    if (!isStaff || !enableDoctorManagement) {
      setError('Doctor management not enabled for this user');
      return { success: false };
    }

    try {
      setSaving(true);
      setError(null);

      const result = await updateProfile(
        {},
        {},
        user?.id,
        {},
        {},
        doctorsData
      );

      if (result.success) {
        setSuccess('Doctors updated successfully!');
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result.error || 'Failed to update doctors');
      }
    } catch (error) {
      console.error('Error updating doctors:', error);
      setError(error.message || 'Failed to update doctors');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [isStaff, enableDoctorManagement, updateProfile, user?.id, handleRefreshProfile]);

  const clinicId = isStaff ? profile?.role_specific_data?.clinic_id : null;

  // External hooks (conditionally run if staff)
  const { clinic, loading: clinicLoading } = useClinic(clinicId);
  const { services } = useServices(clinicId);
  const { doctors } = useDoctors(clinicId);

  return {
    // Data
    profileData,
    editedData,
    currentData: isEditing ? editedData : profileData,
    profileCompletion,
    
    // State
    isEditing,
    saving,
    refreshing,
    loading: authLoading,
    error: error || authError,
    success,
    
    // Actions
    handleRefresh,
    handleInputChange,
    handleSave,
    handleEditToggle,
    handleImageUpdate,
    initializeEditData,
    
    //Staff-specific management functions
    handleClinicUpdate,
    handleServicesUpdate,
    handleDoctorsUpdate,
    
    // Setters for custom control
    setError,
    setSuccess,
    setIsEditing,
    
    // Role checks
    isPatient,
    isStaff,
    isAdmin,

    // Management capabilities
    enableClinicManagement,
    enableServiceManagement,
    enableDoctorManagement,

    clinic,
    services,
    doctors,
    clinicLoading
  };
};