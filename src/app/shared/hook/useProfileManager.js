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
    loading: authLoading,
    error: authError,
    isStaff,
    isAdmin,
    isPatient,
    updatePatientProfile,
    updateStaffProfile,
    updateAdminProfile
  } = useAuth();

  const clinicId = isStaff ? profile?.role_specific_data?.clinic_id : null;
  const staffProfileId = isStaff ? profile?.role_specific_data?.staff_profile_id : null;
  
  // External hooks (conditionally run if staff)
  const { clinic, loading: clinicLoading } = useClinic(staffProfileId);
  const { services, loading: servicesLoading } = useServices(clinicId);
  const { doctors, loading: doctorsLoading } = useDoctors(clinicId);

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [editedData, setEditedData] = useState(null);

  const profileData = useMemo(() => {
    if (!profile) return null;

    const baseData = {
      user_id: profile.user_id,
      email: profile.email || '',
      phone: profile.phone || '',
      email_verified: profile.email_verified || false,
      phone_verified: profile.phone_verified || false,

      profile: {
        first_name: profile.profile?.first_name || '',
        last_name: profile.profile?.last_name || '',
        full_name: profile.profile?.full_name || '',
        date_of_birth: profile.profile?.date_of_birth || '',
        gender: profile.profile?.gender || '',
        profile_image_url: profile.profile?.profile_image_url || '',
      },

      role_specific_data: profile.role_specific_data || {},
      statistics: profile.statistics || {},
    };

    if (isStaff) {
      baseData.clinic_data = clinic || {};
      baseData.services_data = services || [];
      baseData.doctors_data = doctors || [];
      
      baseData._loading = {
        clinic: clinicLoading,
        services: servicesLoading,
        doctors: doctorsLoading
      };
    }

    return baseData;
  }, [profile, isStaff, clinic, services, doctors, clinicLoading, servicesLoading, doctorsLoading]);

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

  const handleArrayUpdate = useCallback((arrayName, index, field, value) => {
    setEditedData(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev };
      
      if (!updated[arrayName]) {
        updated[arrayName] = [];
      }
      
      if (!updated[arrayName][index]) {
        updated[arrayName][index] = {};
      }
      
      updated[arrayName][index][field] = value;
      
      return updated;
    });
  }, []);

  // Process arrays and objects for backend compatibility
  const processDataForBackend = useCallback((data) => {
    if (!data) return data;
    
    const processed = JSON.parse(JSON.stringify(data));

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
        delete roleData.preferred_location;
      }
    }

    return processed;
  }, []);

  // 🔥 **FIXED: Role-specific save functions using the separated backend functions**
  const handleSave = useCallback(async (customData = null) => {
    const rawData = customData || editedData;
    
    if (!rawData || !profile?.user_id) {
      setError('Invalid data or user not found');
      return { success: false };
    }

    const dataToSave = processDataForBackend(rawData);

    try {
      setSaving(true);
      setError(null);

      // Build profile data correctly
      const profileUpdateData = {
        firstName: dataToSave.profile?.first_name?.trim() || '',
        lastName: dataToSave.profile?.last_name?.trim() || '',
        dateOfBirth: dataToSave.profile?.date_of_birth || null,
        gender: dataToSave.profile?.gender || null,
        phone: dataToSave.phone?.trim() || null,
        profileImageUrl: dataToSave.profile?.profile_image_url || null
      };

      let result;

      // 🎯 **Call the appropriate role-specific function**
      if (isPatient) {
        const patientData = {
          emergencyContactName: dataToSave.role_specific_data?.emergency_contact_name || null,
          emergencyContactPhone: dataToSave.role_specific_data?.emergency_contact_phone || null,
          insuranceProvider: dataToSave.role_specific_data?.insurance_provider || null,
          medicalConditions: dataToSave.role_specific_data?.medical_conditions || [],
          allergies: dataToSave.role_specific_data?.allergies || [],
          preferredDoctors: dataToSave.role_specific_data?.preferred_doctors || []
        };

        result = await updatePatientProfile(profileUpdateData, patientData);

      } else if (isStaff) {
        const staffData = {
          position: dataToSave.role_specific_data?.position || null,
          department: dataToSave.role_specific_data?.department || null
        };

        const clinicData = enableClinicManagement ? {
          name: dataToSave.clinic_data?.name || null,
          description: dataToSave.clinic_data?.description || null,
          address: dataToSave.clinic_data?.address || null,
          city: dataToSave.clinic_data?.city || null,
          province: dataToSave.clinic_data?.province || null,
          phone: dataToSave.clinic_data?.phone || null,
          email: dataToSave.clinic_data?.email || null,
          websiteUrl: dataToSave.clinic_data?.website_url || null,
          imageUrl: dataToSave.clinic_data?.image_url || null
        } : {};

        const servicesData = enableServiceManagement ? dataToSave.services_data || [] : [];
        const doctorsData = enableDoctorManagement ? dataToSave.doctors_data || [] : [];

        console.log('🔧 Staff Update Data:', {
          profileUpdateData,
          staffData,
          clinicData,
          servicesData: servicesData.length,
          doctorsData: doctorsData.length
        });

        result = await updateStaffProfile(profileUpdateData, staffData, clinicData, servicesData, doctorsData);

      } else if (isAdmin) {
        result = await updateAdminProfile(profileUpdateData);
      }

      console.log('📤 Update Result:', result);

      if (result?.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result?.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [editedData, profile?.user_id, processDataForBackend, isPatient, isStaff, isAdmin, updatePatientProfile, updateStaffProfile, updateAdminProfile, enableClinicManagement, enableServiceManagement, enableDoctorManagement, handleRefreshProfile]);

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
      let result;
      
      if (isPatient) {
        result = await updatePatientProfile(
          { profileImageUrl: newImageUrl },
          {}
        );
      } else if (isStaff) {
        result = await updateStaffProfile(
          { profileImageUrl: newImageUrl },
          {},
          {},
          [],
          []
        );
      } else if (isAdmin) {
        result = await updateAdminProfile(
          { profileImageUrl: newImageUrl }
        );
      }

      if (result?.success) {
        await handleRefreshProfile();
        return { success: true };
      } else {
        setError(result?.error || 'Failed to update profile image');
        return { success: false, error: result?.error };
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      setError('Failed to update profile image');
      return { success: false, error: error.message };
    }
  }, [isPatient, isStaff, isAdmin, updatePatientProfile, updateStaffProfile, updateAdminProfile, handleRefreshProfile]);

  // 🔥 **SIMPLIFIED: Staff-specific management functions**
  const handleClinicUpdate = useCallback(async (clinicData) => {
    if (!isStaff || !enableClinicManagement) {
      setError('Clinic management not enabled for this user');
      return { success: false };
    }

    try {
      setSaving(true);
      setError(null);

      console.log('🏥 Updating clinic with data:', clinicData);

      const result = await updateStaffProfile(
        {}, // No profile data
        {}, // No staff data
        clinicData, // Clinic data
        [], // No services
        [] // No doctors
      );

      console.log('🏥 Clinic update result:', result);

      if (result?.success) {
        setSuccess('Clinic information updated successfully!');
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result?.error || 'Failed to update clinic');
      }
    } catch (error) {
      console.error('Error updating clinic:', error);
      setError(error.message || 'Failed to update clinic');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [isStaff, enableClinicManagement, updateStaffProfile, handleRefreshProfile]);

  // Staff-specific services management
  const handleServicesUpdate = useCallback(async (servicesData) => {
    if (!isStaff || !enableServiceManagement) {
      setError('Service management not enabled for this user');
      return { success: false };
    }

    try {
      setSaving(true);
      setError(null);

      const result = await updateStaffProfile(
        {},
        {},
        {},
        servicesData,
        []
      );

      if (result?.success) {
        setSuccess('Services updated successfully!');
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result?.error || 'Failed to update services');
      }
    } catch (error) {
      console.error('Error updating services:', error);
      setError(error.message || 'Failed to update services');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [isStaff, enableServiceManagement, updateStaffProfile, handleRefreshProfile]);

  // Staff-specific doctors management
  const handleDoctorsUpdate = useCallback(async (doctorsData) => {
    if (!isStaff || !enableDoctorManagement) {
      setError('Doctor management not enabled for this user');
      return { success: false };
    }

    try {
      setSaving(true);
      setError(null);

      const result = await updateStaffProfile(
        {},
        {},
        {},
        [],
        doctorsData
      );

      if (result?.success) {
        setSuccess('Doctors updated successfully!');
        setTimeout(() => setSuccess(''), 4000);
        await handleRefreshProfile();
        return { success: true, updates: result.data?.updates };
      } else {
        throw new Error(result?.error || 'Failed to update doctors');
      }
    } catch (error) {
      console.error('Error updating doctors:', error);
      setError(error.message || 'Failed to update doctors');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [isStaff, enableDoctorManagement, updateStaffProfile, handleRefreshProfile]);

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
    handleArrayUpdate,
    handleSave,
    handleEditToggle,
    handleImageUpdate,
    initializeEditData,
    
    // Staff-specific management functions
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
    clinicLoading,
    clinicId
  };
};