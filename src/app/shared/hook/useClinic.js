import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useClinic = (staffProfileId) => {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!staffProfileId) {
      setLoading(false);
      setClinic(null);
      return;
    }

    const fetchClinic = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ FIXED: Correct query to get clinic data for staff
        const { data, error } = await supabase
          .from("staff_profiles")
          .select(`
            id,
            position,
            clinic_id,
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
              services_offered,
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

        // ✅ FIXED: Return the clinic data directly
        setClinic(data?.clinics || null);
      } catch (err) {
        console.error("❌ Error fetching clinic:", err);
        setError(err.message || "Failed to fetch clinic");
        setClinic(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClinic();

  }, [staffProfileId]);

  return { clinic, loading, error };
};