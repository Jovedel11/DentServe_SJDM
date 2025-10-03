import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useStaffClinic = (staffProfileId, options = {}) => {
  const { enabled = true } = options;
  
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchClinic = useCallback(async () => {
    if (!staffProfileId || !enabled) {
      setLoading(false);
      setClinic(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ UPDATED: Remove services_offered from clinic select
      const { data, error } = await supabase
        .from("staff_profiles")
        .select(`
          id,
          position,
          clinic_id,
          permissions,
          clinics!inner (
            id,
            name,
            description,
            address,
            city,
            province,
            zip_code,
            phone,
            email,
            website_url,
            image_url,
            operating_hours,
            appointment_limit_per_patient,
            cancellation_policy_hours,
            is_active,
            rating,
            total_reviews,
            created_at,
            updated_at
          )
        `)
        .eq("id", staffProfileId)
        .single();

      if (error) throw error;

      // ✅ Fetch services from services table
      let clinicServices = [];
      if (data?.clinics?.id) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('clinic_id', data.clinics.id)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .order('name');

        if (!servicesError && servicesData) {
          clinicServices = servicesData;
        }
      }

      // ✅ Return clinic data with services and permissions
      setClinic({
        ...data?.clinics,
        services: clinicServices, // ✅ From services table
        staff_permissions: data?.permissions,
        can_manage_clinic: data?.permissions?.manage_clinic || false,
        can_manage_services: data?.permissions?.manage_services || false,
        can_manage_doctors: data?.permissions?.manage_doctors || false
      });
    } catch (err) {
      console.error("❌ Error fetching clinic:", err);
      setError(err.message || "Failed to fetch clinic");
      setClinic(null);
    } finally {
      setLoading(false);
    }
  }, [staffProfileId, enabled]);

  useEffect(() => {
    fetchClinic();
  }, [fetchClinic]);

  return { 
    clinic, 
    loading, 
    error, 
    refetch: fetchClinic,
    canManageClinic: clinic?.can_manage_clinic || false,
    canManageServices: clinic?.can_manage_services || false,
    canManageDoctors: clinic?.can_manage_doctors || false
  };
};