import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useClinic = (clinicId) => {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    const fetchClinic = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", clinicId)
        .single();
      if (!error) setClinic(data);
      setLoading(false);
    };
    fetchClinic();
  }, [clinicId]);

  return { clinic, loading };
};
