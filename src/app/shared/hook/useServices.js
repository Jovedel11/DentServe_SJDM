import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useServices = (clinicId) => {
  const [services, setServices] = useState([]);
  useEffect(() => {
    if (!clinicId) return;
    supabase.from("services").select("*").eq("clinic_id", clinicId)
      .then(({ data }) => setServices(data || []));
  }, [clinicId]);
  return { services };
};
