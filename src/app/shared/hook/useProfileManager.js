import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { useStaffClinic } from './useStaffClinic';
import { useStaffServices } from './useStaffService';
import { useStaffDoctors } from './useStaffDoctor';

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

  // Staff-specific data loading
  const staffProfileId = isStaff ? profile?.role_specific_data?.staff_profile_id : null;
  const clinicId = isStaff ? profile?.role_specific_data?.clinic_id : null;
  
  const { 
    clinic, 
    loading: clinicLoading, 
    error: clinicError,
    refetch: refetchClinic 
  } = useStaffClinic(staffProfileId, { enabled: enableClinicManagement });
  
  const { 
    services, 
    loading: servicesLoading, 
    error: servicesError,
    refetch: refetchServices,
    addService,
    updateService,
    deleteService 
  } = useStaffServices(clinicId, { enabled: enableServiceManagement });
  
  const { 
    doctors, 
    loading: doctorsLoading, 
    error: doctorsError,
    refetch: refetchDoctors,
    addDoctor,
    updateDoctor,
    deleteDoctor 
  } = useStaffDoctors(clinicId, { enabled: enableDoctorManagement });

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [editedData, setEditedData] = useState(null);

  // Consolidated profile data
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

    // Add staff-specific data
    if (isStaff) {
      baseData.clinic_data = clinic || {};
      baseData.services_data = services || [];
      baseData.doctors_data = doctors || [];
      
      baseData._loading = {
        clinic: clinicLoading,
        services: servicesLoading,
        doctors: doctorsLoading
      };
      
      baseData._errors = {
        clinic: clinicError,
        services: servicesError,
        doctors: doctorsError
      };
    }

    return baseData;
  }, [profile, isStaff, clinic, services, doctors, clinicLoading, servicesLoading, doctorsLoading, clinicError, servicesError, doctorsError]);

  // Profile completion calculation
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

  // Initialize edited data
  const initializeEditData = useCallback(() => {
    if (profileData) {
      setEditedData(JSON.parse(JSON.stringify(profileData)));
    }
  }, [profileData]);

  useEffect(() => {
    initializeEditData();
  }, [initializeEditData]);

  // Handle profile refresh
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      await handleRefreshProfile();
      
      if (isStaff) {
        await Promise.all([
          enableClinicManagement && refetchClinic(),
          enableServiceManagement && refetchServices(),
          enableDoctorManagement && refetchDoctors()
        ].filter(Boolean));
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setError('Failed to refresh profile data');
    } finally {
      setRefreshing(false);
    }
  }, [handleRefreshProfile, isStaff, enableClinicManagement, enableServiceManagement, enableDoctorManagement, refetchClinic, refetchServices, refetchDoctors]);

  // Generic input change handler
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

  // Array update handler
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

  // Data processing for backend
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
    }

    return processed;
  }, []);

  // 🔥 **IMPROVED: Main save function with better error handling**
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

      // Build profile data
      const profileUpdateData = {
        firstName: dataToSave.profile?.first_name?.trim() || '',
        lastName: dataToSave.profile?.last_name?.trim() || '',
        dateOfBirth: dataToSave.profile?.date_of_birth || null,
        gender: dataToSave.profile?.gender || null,
        phone: dataToSave.phone?.trim() || null,
        profileImageUrl: dataToSave.profile?.profile_image_url || null
      };

      let result;

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
          zipCode: dataToSave.clinic_data?.zip_code || null,
          phone: dataToSave.clinic_data?.phone || null,
          email: dataToSave.clinic_data?.email || null,
          websiteUrl: dataToSave.clinic_data?.website_url || null,
          imageUrl: dataToSave.clinic_data?.image_url || null,
          appointmentLimitPerPatient: dataToSave.clinic_data?.appointment_limit_per_patient || null,
          cancellationPolicyHours: dataToSave.clinic_data?.cancellation_policy_hours || null
        } : {};

        const servicesData = enableServiceManagement ? dataToSave.services_data || [] : [];
        const doctorsData = enableDoctorManagement ? dataToSave.doctors_data || [] : [];

        result = await updateStaffProfile(profileUpdateData, staffData, clinicData, servicesData, doctorsData);

      } else if (isAdmin) {
        result = await updateAdminProfile(profileUpdateData);
      }

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
      let errorMessage = error.message || 'Failed to update profile';
      
      // Handle specific permission errors
      if (errorMessage.includes('Insufficient permissions')) {
        errorMessage = 'You do not have permission to perform this action. Please contact your administrator.';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
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

  // 🔥 **NEW: Handle clinic image update**
  const handleClinicImageUpdate = useCallback(async (newImageUrl) => {
    if (!isStaff || !clinicId) {
      setError('Only staff can update clinic images');
      return { success: false, error: 'Access denied' };
    }

    try {
      // Update clinic image directly without edit mode
      const result = await updateStaffProfile(
        {}, // No profile data changes
        {}, // No staff data changes
        { imageUrl: newImageUrl }, // Only clinic image
        [], // No services changes
        [] // No doctors changes
      );

      if (result?.success) {
        await handleRefresh();
        setSuccess('Clinic image updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        return { success: true };
      } else {
        setError(result?.error || 'Failed to update clinic image');
        return { success: false, error: result?.error };
      }
    } catch (error) {
      console.error('Error updating clinic image:', error);
      setError('Failed to update clinic image');
      return { success: false, error: error.message };
    }
  }, [isStaff, clinicId, updateStaffProfile, handleRefresh]);

  // 🔥 **NEW: Handle doctor image update**
  const handleDoctorImageUpdate = useCallback(async (doctorId, newImageUrl) => {
    if (!isStaff || !clinicId) {
      setError('Only staff can update doctor images');
      return { success: false, error: 'Access denied' };
    }

    try {
      // Find the doctor in current doctors data
      const currentDoctors = doctors || [];
      const doctorIndex = currentDoctors.findIndex(d => d.id === doctorId);
      
      if (doctorIndex === -1) {
        setError('Doctor not found');
        return { success: false, error: 'Doctor not found' };
      }

      // Update only this doctor's image
      const updatedDoctors = [...currentDoctors];
      updatedDoctors[doctorIndex] = {
        ...updatedDoctors[doctorIndex],
        image_url: newImageUrl,
        _action: 'update'
      };

      const result = await updateStaffProfile(
        {}, // No profile data changes
        {}, // No staff data changes
        {}, // No clinic changes
        [], // No services changes
        updatedDoctors // Only doctor changes
      );

      if (result?.success) {
        await handleRefresh();
        setSuccess('Doctor image updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        return { success: true };
      } else {
        setError(result?.error || 'Failed to update doctor image');
        return { success: false, error: result?.error };
      }
    } catch (error) {
      console.error('Error updating doctor image:', error);
      setError('Failed to update doctor image');
      return { success: false, error: error.message };
    }
  }, [isStaff, clinicId, doctors, updateStaffProfile, handleRefresh]);

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
    loading: authLoading || (isStaff && (clinicLoading || servicesLoading || doctorsLoading)),
    error: error || authError,
    success,
    
    // Actions
    handleRefresh,
    handleInputChange,
    handleArrayUpdate,
    handleSave,
    handleEditToggle,
    handleImageUpdate,
    handleClinicImageUpdate, 
    handleDoctorImageUpdate, 
    initializeEditData,
    
    // Staff-specific management
    clinic,
    services,
    doctors,
    addService,
    updateService,
    deleteService,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    refetchClinic,
    refetchServices,
    refetchDoctors,
    
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

    clinicId
  };
};