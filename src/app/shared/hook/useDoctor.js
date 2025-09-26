import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useDoctors = (clinicId) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDoctors = useCallback(async () => {
    if (!clinicId) {
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
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Flatten the structure to make it easier to work with
      const flattenedDoctors = (data || []).map(item => ({
        ...item.doctors,
        clinic_schedule: item.schedule,
        doctor_clinic_id: item.id
      }));
      
      setDoctors(flattenedDoctors);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError(err.message);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return { 
    doctors, 
    loading, 
    error, 
    refetch: fetchDoctors 
  };
};