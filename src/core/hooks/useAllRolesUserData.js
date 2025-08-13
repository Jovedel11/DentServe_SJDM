import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export const useAllRolesUserData = () => {
  const { user, userProfile, userRole } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split('T')[0]

  const fetchPatientData = async () => {
    try {
      // get patient analytics function
      const { data: analytics } = await supabase.rpc('get_patient_analytics', {
        p_patient_id: null  // current user
      })

      // get recent appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors(license_number, specialization, user_id),
          clinics(name, address, phone)
          `)
        .eq('patient_id', userProfile?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // get upcoming appointments
      const { data: upcomingAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors(license_number, specialization),
          clinics(name, address, phone)
          `)
        .eq('patient_id', userProfile?.id)
        .gte('appointment_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('appointment_date', { ascending: true })
        .limit(3);

        return {
          analytics,
          appointments,
          upcomingAppointments,
          profile_data: userProfile?.user_profiles?.patient_profiles
        }

    } catch (error) {
      throw error
    }
  }

  const fetchStaffData = async () => {
    try {
      // get clinic growth analytics function
      const { data: analytics } = await supabase.rpc('get_clinic_growth_analytics');

      // get today's appointments for clinic
      const staffClinic = userProfile?.user_profiles?.staff_profiles?.clinics;
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          users!patient_id(email),
          user_profiles!inner(first_name, last_name),
          doctors(license_number, specialization),
          `)
        .eq('clinic_id', staffClinic?.id)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      // get pending appointments
      const { data: pendingAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          users!patient_id(email),
          user_profiles!inner(first_name, last_name),
          `)
        .eq('clinic_id', staffClinic?.id)
        .eq('status', 'pending')
        .order('appointment_date', { ascending: true })
        .limit(5);

      // recent feedback
      const { data: recentFeedback } = await supabase
        .from('feedback')
        .select('*')
        .eq('clinic_id', staffClinic?.id)
        .limit(3)

      return {
        analytics,
        todayAppointments,
        pendingAppointments,
        recentFeedback
      }

    } catch (error) {
      throw error;
    }
  }

  const fetchAdminData = async () => {
    try {
      // get system analytics function
      const { data: analytics } = await supabase.rpc('get_clinic_growth_analytics', {
        days_period: 30 
      });

      // get recent partnership requests
      const { data: partnershipRequests } = await supabase
        .from('partnership_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      // get clinic performance ranking function
      const { data: topClinics } = await supabase.rpc('get_clinic_performance_ranking', {
        days_period: 30,
        result_limit: 5
      })

      return {
        analytics,
        partnershipRequests,
        topClinics
      }

    } catch (error) {
      throw error;
    }
  }

    const fetchData = async () => {
    if (!user || !userProfile || !userRole) return;

    try {
      setLoading(true)
      setError(null)

      let data = null
      switch (userRole) {
        case 'patient':
          data = await fetchPatientData();
          break
        case 'staff':
          data = await fetchStaffData();
          break
        case 'admin':
          data = await fetchAdminData();
          break
        default:
          throw new Error('Invalid user Role')
      }
      setDashboardData(data)
    } catch (error) {
      console.error('Dashboard data fetch error', error)
      setError(error?.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user, userProfile, userRole])

  return {
    dashboardData,
    loading,
    error,
    refetch: () => fetchData()
  };
}