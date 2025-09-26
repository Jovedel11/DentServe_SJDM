import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useServices = (clinicId) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    if (!clinicId) {
      setServices([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError(err.message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { 
    services, 
    loading, 
    error, 
    refetch: fetchServices 
  };
};