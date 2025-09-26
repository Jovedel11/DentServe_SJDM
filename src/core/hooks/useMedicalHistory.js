import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useMedicalHistory = () => {
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isStaff, isAdmin, isPatient, profile } = useAuth();

  // Get clinic ID for staff users
  const getClinicId = useCallback(() => {
    if (isStaff) {
      return profile?.role_specific_data?.clinic_id;
    }
    return null;
  }, [isStaff, profile]);

  // Fetch medical history for patient
  const fetchMedicalHistory = useCallback(async (patientId = null) => {
    try {
      let targetPatientId = patientId;
      
      if (isPatient) {
        targetPatientId = profile?.user_id;
      }
  
      const { data, error } = await supabase
        .from('patient_medical_history')
        .select(`
          *,
          appointments!left (
            id,
            appointment_date,
            appointment_time,
            status,
            clinics (name, address),
            doctors (first_name, last_name, specialization)
          )
        `)
        .eq('patient_id', targetPatientId)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
  
      setMedicalHistory(data || []);
      return { success: true, history: data || [] };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [isPatient, profile]);

  // Create medical history record (staff/admin only)
  const createMedicalRecord = useCallback(async (recordData) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['patient_id'];
      const missingFields = requiredFields.filter(field => !recordData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ Validate arrays
      const validateArray = (arr, name) => {
        if (arr && !Array.isArray(arr)) {
          throw new Error(`${name} must be an array`);
        }
      };

      validateArray(recordData.conditions, 'Conditions');
      validateArray(recordData.allergies, 'Allergies');
      validateArray(recordData.medications, 'Medications');

      const { data, error } = await supabase
        .from('patient_medical_history')
        .insert({
          patient_id: recordData.patient_id,
          appointment_id: recordData.appointment_id || null,
          conditions: recordData.conditions || [],
          allergies: recordData.allergies || [],
          medications: recordData.medications || [],
          treatment_notes: recordData.treatment_notes || null,
          follow_up_required: recordData.follow_up_required || false,
          follow_up_date: recordData.follow_up_date || null,
          created_by: profile?.user_id
        })
        .select(`
          *,
          patient:patient_id(
            id,
            user_profiles(first_name, last_name, email)
          ),
          appointment:appointment_id(
            id,
            appointment_date,
            appointment_time
          ),
          created_by_user:created_by(
            id,
            user_profiles(first_name, last_name)
          )
        `)
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setMedicalHistory(prev => [data, ...prev]);

      return {
        success: true,
        record: data,
        message: 'Medical record created successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to create medical record';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin, profile]);

  // Update medical history record (staff/admin only)
  const updateMedicalRecord = useCallback(async (recordId, updates) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Validate arrays in updates
      const validateArray = (arr, name) => {
        if (arr && !Array.isArray(arr)) {
          throw new Error(`${name} must be an array`);
        }
      };

      if (updates.conditions) validateArray(updates.conditions, 'Conditions');
      if (updates.allergies) validateArray(updates.allergies, 'Allergies');
      if (updates.medications) validateArray(updates.medications, 'Medications');

      const { data, error } = await supabase
        .from('patient_medical_history')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select(`
          *,
          patient:patient_id(
            id,
            user_profiles(first_name, last_name, email)
          ),
          appointment:appointment_id(
            id,
            appointment_date,
            appointment_time
          ),
          created_by_user:created_by(
            id,
            user_profiles(first_name, last_name)
          )
        `)
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setMedicalHistory(prev => prev.map(record => 
        record.id === recordId ? data : record
      ));

      return {
        success: true,
        record: data,
        message: 'Medical record updated successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update medical record';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Get medical record details
  const getMedicalRecordDetails = useCallback(async (recordId) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('patient_medical_history')
        .select(`
          *,
          patient:patient_id(
            id,
            email,
            user_profiles(first_name, last_name, date_of_birth, gender)
          ),
          appointment:appointment_id(
            id,
            appointment_date,
            appointment_time,
            status,
            symptoms,
            notes,
            clinic:clinic_id(name, address),
            doctor:doctor_id(first_name, last_name, specialization)
          ),
          created_by_user:created_by(
            id,
            user_profiles(first_name, last_name)
          )
        `)
        .eq('id', recordId)
        .single();

      if (error) throw new Error(error.message);

      return {
        success: true,
        record: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch record details';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get patient summary (aggregated medical data)
  const getPatientSummary = useCallback(async (patientId) => {
    if (!isStaff && !isAdmin) {
      const error = 'Access denied: Staff or Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_patient_medical_summary', {
        p_patient_id: patientId
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch patient summary');
      }

      return {
        success: true,
        summary: data.data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch patient summary';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isStaff, isAdmin]);

  // Search medical records
  const searchMedicalRecords = useCallback((query) => {
    if (!query.trim()) return medicalHistory;

    const searchTerm = query.toLowerCase();
    
    return medicalHistory.filter(record => 
      record.conditions?.some(condition => 
        condition.toLowerCase().includes(searchTerm)
      ) ||
      record.allergies?.some(allergy => 
        allergy.toLowerCase().includes(searchTerm)
      ) ||
      record.medications?.some(medication => 
        medication.toLowerCase().includes(searchTerm)
      ) ||
      record.treatment_notes?.toLowerCase().includes(searchTerm)
    );
  }, [medicalHistory]);

  // Export medical history (for patients and authorized staff)
  const exportMedicalHistory = useCallback(async (patientId = null, format = 'json') => {
    try {
      const targetPatientId = patientId || (isPatient ? profile?.user_id : null);
      
      if (!targetPatientId) {
        throw new Error('Patient ID is required');
      }

      const { data, error: rpcError } = await supabase.rpc('export_medical_history', {
        p_patient_id: targetPatientId,
        p_format: format
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to export medical history');
      }

      return {
        success: true,
        exportData: data.data,
        downloadUrl: data.download_url
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to export medical history';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isPatient, profile]);

  return {
    // State
    medicalHistory,
    loading,
    error,

    // Actions
    fetchMedicalHistory,
    createMedicalRecord,
    updateMedicalRecord,
    getMedicalRecordDetails,
    getPatientSummary,
    exportMedicalHistory,

    // Computed
    totalRecords: medicalHistory.length,
    recentRecords: medicalHistory.slice(0, 5),
    followUpRequired: medicalHistory.filter(r => r.follow_up_required).length,
    
    // Utilities
    clearError: () => setError(null),
    canCreateRecords: isStaff || isAdmin,
    canViewRecords: isStaff || isAdmin || isPatient,
    searchMedicalRecords,
    
    // Helpers
    getRecordById: (id) => medicalHistory.find(r => r.id === id),
    getRecordsByCondition: (condition) => medicalHistory.filter(r => 
      r.conditions?.some(c => c.toLowerCase().includes(condition.toLowerCase()))
    ),
    getAllConditions: () => [
      ...new Set(medicalHistory.flatMap(r => r.conditions || []))
    ],
    getAllAllergies: () => [
      ...new Set(medicalHistory.flatMap(r => r.allergies || []))
    ],
    getAllMedications: () => [
      ...new Set(medicalHistory.flatMap(r => r.medications || []))
    ]
  };
};
