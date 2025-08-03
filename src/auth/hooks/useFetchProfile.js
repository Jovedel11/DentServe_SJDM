import supabase from "../../../supabaseClient";

export const fetchUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        patient_profiles(*),
        staff_profiles(
          *,
          clinics(*)
        ),
        admin_profiles(*)
      `)
      .eq("user_id", userId)
      .single();

    if (error) console.error("Error fetching user profile:", error);
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};