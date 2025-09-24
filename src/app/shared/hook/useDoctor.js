import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useDoctors = (clinicId) => {
  const [doctors, setDoctors] = useState([]);
  useEffect(() => {
    if (!clinicId) return;
    supabase.from("doctor_clinics").select(`
      clinic_id,
      is_active,
      doctors(*)
      `).in('clinic_id', clinicId).eq("clinic_id", clinicId)
      .then(({ data }) => setDoctors(data || []));
  }, [clinicId]);
  return { doctors };
};
