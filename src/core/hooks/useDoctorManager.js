import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useDoctorManager = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isStaff, isAdmin, profile } = useAuth();

  // Get clinic ID for staff users
  const getClinicId = useCallback(() => {
    if (isStaff()) {
      return profile?.role_specific_data?.clinic_id;
    }
    return null;
  }, [isStaff, profile]);

  // Fetch doctors for clinic
  const fetchDoctors = useCallback(async (clinicId = null) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // Use current clinic for staff, require explicit clinic for admin
      const targetClinicId = clinicId || getClinicId();
      if (!targetClinicId) {
        throw new Error('Clinic ID is required');
      }

      const { data, error: rpcError } = await supabase.rpc('get_clinic_doctors', {
        p_clinic_id: targetClinicId,
        p_include_inactive: isAdmin
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch doctors');
      }

      const fetchedDoctors = data.data.doctors || [];
      setDoctors(fetchedDoctors);

      return {
        success: true,
        doctors: fetchedDoctors,
        count: fetchedDoctors.length
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch doctors';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, getClinicId]);

  // Add doctor to clinic
  const addDoctor = useCallback(async (doctorData, clinicId = null) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['first_name', 'last_name', 'license_number', 'specialization'];
      const missingFields = requiredFields.filter(field => !doctorData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ License number validation
      if (doctorData.license_number.length < 5) {
        throw new Error('License number must be at least 5 characters long');
      }

      const targetClinicId = clinicId || getClinicId();
      if (!targetClinicId) {
        throw new Error('Clinic ID is required');
      }

      const { data, error: rpcError } = await supabase.rpc('add_doctor_to_clinic', {
        p_clinic_id: targetClinicId,
        p_doctor_data: {
          first_name: doctorData.first_name,
          last_name: doctorData.last_name,
          license_number: doctorData.license_number,
          specialization: doctorData.specialization,
          education: doctorData.education || null,
          experience_years: doctorData.experience_years || null,
          bio: doctorData.bio || null,
          consultation_fee: doctorData.consultation_fee || null,
          languages_spoken: doctorData.languages_spoken || null,
          certifications: doctorData.certifications || null,
          awards: doctorData.awards || null
        },
        p_schedule: doctorData.schedule || null
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to add doctor');
      }

      // ✅ Update local state
      const newDoctor = data.data;
      setDoctors(prev => [...prev, newDoctor]);

      return {
        success: true,
        doctor: newDoctor,
        message: data.message || 'Doctor added successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to add doctor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, getClinicId]);

  // Update doctor information
  const updateDoctor = useCallback(async (doctorId, updates) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('update_doctor_info', {
        p_doctor_id: doctorId,
        p_updates: updates
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update doctor');
      }

      // ✅ Update local state
      setDoctors(prev => prev.map(doctor => 
        doctor.id === doctorId ? { ...doctor, ...data.data } : doctor
      ));

      return {
        success: true,
        doctor: data.data,
        message: data.message || 'Doctor updated successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update doctor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Update doctor schedule
  const updateDoctorSchedule = useCallback(async (doctorId, schedule, clinicId = null) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const targetClinicId = clinicId || getClinicId();
      if (!targetClinicId) {
        throw new Error('Clinic ID is required');
      }

      const { data, error: rpcError } = await supabase.rpc('update_doctor_schedule', {
        p_doctor_id: doctorId,
        p_clinic_id: targetClinicId,
        p_schedule: schedule
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update schedule');
      }

      return {
        success: true,
        message: data.message || 'Schedule updated successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update schedule';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, getClinicId]);

  // Toggle doctor availability
  const toggleDoctorAvailability = useCallback(async (doctorId, isAvailable) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('doctors')
        .update({ 
          is_available: isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', doctorId);

      if (updateError) throw new Error(updateError.message);

      // ✅ Update local state
      setDoctors(prev => prev.map(doctor => 
        doctor.id === doctorId 
          ? { ...doctor, is_available: isAvailable }
          : doctor
      ));

      return {
        success: true,
        message: `Doctor ${isAvailable ? 'activated' : 'deactivated'} successfully`
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update availability';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Remove doctor from clinic
  const removeDoctorFromClinic = useCallback(async (doctorId, clinicId = null) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const targetClinicId = clinicId || getClinicId();
      if (!targetClinicId) {
        throw new Error('Clinic ID is required');
      }

      const { data, error: rpcError } = await supabase.rpc('remove_doctor_from_clinic', {
        p_doctor_id: doctorId,
        p_clinic_id: targetClinicId
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to remove doctor');
      }

      // ✅ Update local state
      setDoctors(prev => prev.filter(doctor => doctor.id !== doctorId));

      return {
        success: true,
        message: data.message || 'Doctor removed successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to remove doctor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, getClinicId]);

  return {
    // State
    doctors,
    loading,
    error,

    // Actions
    fetchDoctors,
    addDoctor,
    updateDoctor,
    updateDoctorSchedule,
    toggleDoctorAvailability,
    removeDoctorFromClinic,

    // Computed
    activeDoctors: doctors.filter(d => d.is_available),
    inactiveDoctors: doctors.filter(d => !d.is_available),
    doctorCount: doctors.length,

    // Utilities
    clearError: () => setError(null),
    canManageDoctors: isStaff || isAdmin,
    clinicId: getClinicId()
  };
};
