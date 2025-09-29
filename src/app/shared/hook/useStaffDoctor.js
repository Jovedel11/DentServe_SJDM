import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useStaffDoctors = (clinicId, options = {}) => {
  const { enabled = true } = options;
  
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDoctors = useCallback(async () => {
    if (!clinicId || !enabled) {
      setDoctors([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("doctor_clinics")
        .select(`
          id,
          clinic_id,
          is_active,
          schedule,
          doctors (
            id,
            license_number,
            specialization,
            first_name,
            last_name,
            education,
            experience_years,
            bio,
            consultation_fee,
            image_url,
            languages_spoken,
            certifications,
            awards,
            is_available,
            rating,
            total_reviews,
            created_at,
            updated_at
          )
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Flatten the structure
      const flattenedDoctors = (data || []).map(item => ({
        ...item.doctors,
        clinic_schedule: item.schedule,
        doctor_clinic_id: item.id,
        clinic_is_active: item.is_active
      }));
      
      setDoctors(flattenedDoctors);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError(err.message);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId, enabled]);

  const addDoctor = useCallback(async (doctorData) => {
    try {
      // First create the doctor
      const { data: doctor, error: doctorError } = await supabase
        .from("doctors")
        .insert({
          user_id: doctorData.user_id || null,
          license_number: doctorData.license_number,
          specialization: doctorData.specialization,
          first_name: doctorData.first_name,
          last_name: doctorData.last_name,
          education: doctorData.education,
          experience_years: doctorData.experience_years,
          bio: doctorData.bio,
          consultation_fee: doctorData.consultation_fee,
          image_url: doctorData.image_url,
          languages_spoken: doctorData.languages_spoken,
          certifications: doctorData.certifications,
          awards: doctorData.awards,
          is_available: doctorData.is_available
        })
        .select()
        .single();

      if (doctorError) throw doctorError;

      // Then create the clinic relationship
      const { data: relationship, error: relationshipError } = await supabase
        .from("doctor_clinics")
        .insert({
          doctor_id: doctor.id,
          clinic_id: clinicId,
          schedule: doctorData.schedule,
          is_active: true
        })
        .select()
        .single();

      if (relationshipError) throw relationshipError;
      
      const newDoctor = {
        ...doctor,
        clinic_schedule: relationship.schedule,
        doctor_clinic_id: relationship.id,
        clinic_is_active: relationship.is_active
      };
      
      setDoctors(prev => [newDoctor, ...prev]);
      return { success: true, data: newDoctor };
    } catch (error) {
      console.error("Error adding doctor:", error);
      return { success: false, error: error.message };
    }
  }, [clinicId]);

  const updateDoctor = useCallback(async (doctorId, doctorData) => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .update({
          first_name: doctorData.first_name,
          last_name: doctorData.last_name,
          specialization: doctorData.specialization,
          education: doctorData.education,
          experience_years: doctorData.experience_years,
          bio: doctorData.bio,
          consultation_fee: doctorData.consultation_fee,
          image_url: doctorData.image_url,
          languages_spoken: doctorData.languages_spoken,
          certifications: doctorData.certifications,
          awards: doctorData.awards,
          is_available: doctorData.is_available
        })
        .eq("id", doctorId)
        .select()
        .single();

      if (error) throw error;

      // Update clinic relationship if schedule provided
      if (doctorData.schedule) {
        await supabase
          .from("doctor_clinics")
          .update({ schedule: doctorData.schedule })
          .eq("doctor_id", doctorId)
          .eq("clinic_id", clinicId);
      }
      
      setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, ...data } : d));
      return { success: true, data };
    } catch (error) {
      console.error("Error updating doctor:", error);
      return { success: false, error: error.message };
    }
  }, [clinicId]);

  const deleteDoctor = useCallback(async (doctorId) => {
    try {
      // First remove clinic relationship
      const { error: relationshipError } = await supabase
        .from("doctor_clinics")
        .delete()
        .eq("doctor_id", doctorId)
        .eq("clinic_id", clinicId);

      if (relationshipError) throw relationshipError;

      // Check if doctor has other clinic relationships
      const { data: otherRelationships } = await supabase
        .from("doctor_clinics")
        .select("id")
        .eq("doctor_id", doctorId);

      // If no other relationships, delete the doctor
      if (!otherRelationships || otherRelationships.length === 0) {
        const { error: doctorError } = await supabase
          .from("doctors")
          .delete()
          .eq("id", doctorId);

        if (doctorError) throw doctorError;
      }
      
      setDoctors(prev => prev.filter(d => d.id !== doctorId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting doctor:", error);
      return { success: false, error: error.message };
    }
  }, [clinicId]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return { 
    doctors, 
    loading, 
    error, 
    refetch: fetchDoctors,
    addDoctor,
    updateDoctor,
    deleteDoctor
  };
};