import supabase from "../../../supabaseClient";

export const fetchUserRole = async () => {
  try {
    const { data, error } = await supabase
      .rpc('get_current_user_role');

    if (!error && data) {
      return data;
    } else {
      console.warn('No role data found or error occurred:', error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}