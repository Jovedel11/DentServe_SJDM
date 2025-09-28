import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useStaffServices = (clinicId, options = {}) => {
  const { enabled = true } = options;
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    if (!clinicId || !enabled) {
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
        .order("priority", { ascending: false })
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
  }, [clinicId, enabled]);

  const addService = useCallback(async (serviceData) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .insert({
          clinic_id: clinicId,
          ...serviceData
        })
        .select()
        .single();

      if (error) throw error;
      
      setServices(prev => [data, ...prev]);
      return { success: true, data };
    } catch (error) {
      console.error("Error adding service:", error);
      return { success: false, error: error.message };
    }
  }, [clinicId]);

  const updateService = useCallback(async (serviceId, serviceData) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .update(serviceData)
        .eq("id", serviceId)
        .eq("clinic_id", clinicId)
        .select()
        .single();

      if (error) throw error;
      
      setServices(prev => prev.map(s => s.id === serviceId ? data : s));
      return { success: true, data };
    } catch (error) {
      console.error("Error updating service:", error);
      return { success: false, error: error.message };
    }
  }, [clinicId]);

  const deleteService = useCallback(async (serviceId) => {
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId)
        .eq("clinic_id", clinicId);

      if (error) throw error;
      
      setServices(prev => prev.filter(s => s.id !== serviceId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting service:", error);
      return { success: false, error: error.message };
    }
  }, [clinicId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { 
    services, 
    loading, 
    error, 
    refetch: fetchServices,
    addService,
    updateService,
    deleteService
  };
};