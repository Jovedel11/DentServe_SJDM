import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export const usePatientProfile = ({ userId }) => {
  const { userRole } = useAuth();
  const [profile, setProfile] = useState({});

  useEffect(() => {
    if (!userId || userRole !== 'patient') return;

    const fetchPatient = async () => {
      const { data, error } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq("user_profile_id", userId)
        .single();

        if (!error) setProfile(data);
    }

    fetchPatient();
  }, [userId, userRole]);

  return { profile };
}