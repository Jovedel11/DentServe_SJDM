import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking } from "@/hooks/appointment/useAppointmentBooking";
import { supabase } from "@/lib/supabaseClient";

export const useBookingFlow = () => {
  const { profile, isPatient } = useAuth();
  
  // Hook integration
  const appointmentHook = useAppointmentBooking();
  
  // Local state
  const [clinics, setClinics] = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Enhanced booking validation state
  const [appointmentLimitInfo, setAppointmentLimitInfo] = useState(null);
  const [crossClinicWarnings, setCrossClinicWarnings] = useState([]);
  const [bookingWarnings, setBookingWarnings] = useState([]);
  const [validationLoading, setValidationLoading] = useState(false);

  // ✅ FIX: Use refs to prevent infinite loops
  const lastValidationRef = useRef({ clinicId: null, date: null });
  const isInitializedRef = useRef(false);

  // Toast helpers
  const showToast = useCallback((message, type = "info") => {
    setToastMessage({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage("");
  }, []);

  // ✅ FIX: Stable fetch clinics function
  const fetchClinics = useCallback(async (userLocation = null) => {
    if (!isPatient) return;

    setClinicsLoading(true);
    try {
      const { data, error } = await supabase.rpc("find_nearest_clinics", {
        user_location: userLocation,
        max_distance_km: 50,
        limit_count: 20,
      });

      if (error) throw error;
      if (data.success) {
        setClinics(data.data.clinics || []);
      } else {
        showToast(data.error || "Failed to load clinics", "error");
      }
    } catch (err) {
      console.error("Error fetching clinics:", err);
      showToast("Failed to load clinics", "error");
    } finally {
      setClinicsLoading(false);
    }
  }, [isPatient, showToast]);

  // ✅ FIX: Stable fetch doctors function
  const fetchDoctors = useCallback(async (clinicId) => {
    if (clinicId) {
      const result = await appointmentHook.getAvailableDoctors(clinicId);
      if (result.success) {
        setDoctors(result.doctors);
      } else {
        showToast(result.error, "error");
      }
    } else {
      setDoctors([]);
    }
  }, [appointmentHook.getAvailableDoctors, showToast]);

  // ✅ FIX: Stable fetch services function  
  const fetchServices = useCallback(async (clinicId) => {
    if (clinicId) {
      const result = await appointmentHook.getServices(clinicId);
      if (result.success) {
        setServices(result.services);
      } else {
        showToast(result.error, "error");
      }
    } else {
      setServices([]);
    }
  }, [appointmentHook.getServices, showToast]);

  // ✅ FIX: Check appointment limits with deduplication
  const checkAppointmentLimits = useCallback(async (clinicId, appointmentDate = null) => {
    if (!clinicId || !isPatient || !profile?.user_id) return;

    // ✅ Prevent duplicate calls
    const validationKey = `${clinicId}-${appointmentDate || 'null'}`;
    if (lastValidationRef.current.key === validationKey && lastValidationRef.current.loading) {
      return; // Already checking this combination
    }

    lastValidationRef.current = { key: validationKey, loading: true };
    setValidationLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('check_appointment_limit', {
        p_patient_id: profile.user_id,
        p_clinic_id: clinicId,
        p_appointment_date: appointmentDate
      });

      if (error) throw error;

      setAppointmentLimitInfo(data);
      
      // Extract cross-clinic warnings
      const crossClinicAppts = data?.data?.cross_clinic_appointments || [];
      setCrossClinicWarnings(crossClinicAppts);
      
      // Set booking warnings based on limits
      const warnings = [];
      if (!data.allowed) {
        warnings.push({
          type: 'error',
          message: data.message,
          reason: data.reason
        });
      } else {
        // Add informational warnings
        if (crossClinicAppts.length > 0) {
          warnings.push({
            type: 'info',
            message: `You have ${crossClinicAppts.length} appointment(s) at other clinics. Please inform your healthcare providers.`
          });
        }
        
        const clinicCount = data.data?.clinic_appointments || 0;
        const clinicLimit = data.data?.clinic_limit || 0;
        if (clinicCount >= clinicLimit - 1) {
          warnings.push({
            type: 'warning',
            message: `This will be your last available appointment at this clinic (${clinicCount + 1}/${clinicLimit}).`
          });
        }
      }
      
      setBookingWarnings(warnings);
      
    } catch (err) {
      console.error("Error checking appointment limits:", err);
      showToast("Failed to check appointment availability", "error");
    } finally {
      setValidationLoading(false);
      lastValidationRef.current.loading = false;
    }
  }, [isPatient, profile?.user_id, showToast]);

  // ✅ FIX: Stable event handlers
  const handleClinicSelect = useCallback((clinic) => {
    appointmentHook.updateBookingData({
      clinic,
      doctor: null,
      services: [],
      date: null,
      time: null,
    });
    
    // Check appointment limits for selected clinic
    checkAppointmentLimits(clinic.id);
  }, [appointmentHook.updateBookingData, checkAppointmentLimits]);

  const handleServiceToggle = useCallback((serviceId) => {
    const currentServices = appointmentHook.bookingData.services || [];

    if (currentServices.includes(serviceId)) {
      appointmentHook.updateBookingData({
        services: currentServices.filter((id) => id !== serviceId),
      });
    } else if (currentServices.length < 3) {
      appointmentHook.updateBookingData({
        services: [...currentServices, serviceId],
      });
    } else {
      showToast("Maximum 3 services allowed per appointment", "warning");
    }
  }, [appointmentHook.bookingData.services, appointmentHook.updateBookingData, showToast]);

  const handleDoctorSelect = useCallback((doctor) => {
    appointmentHook.updateBookingData({
      doctor,
      date: null,
      time: null,
    });
  }, [appointmentHook.updateBookingData]);

  // ✅ FIX: Enhanced date selection with limit checking
  const handleDateSelect = useCallback((date) => {
    appointmentHook.updateBookingData({ date, time: null });
    
    // Re-check limits with specific date
    if (appointmentHook.bookingData.clinic?.id) {
      checkAppointmentLimits(appointmentHook.bookingData.clinic.id, date);
    }
  }, [appointmentHook.updateBookingData, appointmentHook.bookingData.clinic?.id, checkAppointmentLimits]);

  // ✅ FIX: Stable submit handler
  const handleSubmit = useCallback(async () => {
    if (!isPatient) {
      showToast("Only patients can book appointments", "error");
      return;
    }

    // Pre-booking validation
    if (!appointmentLimitInfo?.allowed) {
      showToast(`Cannot book appointment: ${appointmentLimitInfo?.message}`, "error");
      return;
    }

    const result = await appointmentHook.bookAppointment();

    if (result.success) {
      setBookingSuccess(true);
      
      // Enhanced success message with additional info
      let successMessage = "Appointment booked successfully!";
      if (result.appointment.symptoms_sent) {
        successMessage += " Your symptoms have been sent to the staff.";
      }
      if (crossClinicWarnings.length > 0) {
        successMessage += " Please inform your healthcare providers about your other appointments.";
      }
      
      showToast(successMessage, "success");

      setTimeout(() => {
        window.location.href = "/patient/appointments";
      }, 3000);
    } else {
      showToast(`Booking failed: ${result.error}`, "error");
    }
  }, [isPatient, appointmentHook.bookAppointment, appointmentLimitInfo, crossClinicWarnings, showToast]);

  // ✅ FIX: Effects with proper dependencies and initialization checks
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      fetchClinics();
    }
  }, [fetchClinics]);

  useEffect(() => {
    if (isInitializedRef.current) {
      fetchDoctors(appointmentHook.bookingData.clinic?.id);
    }
  }, [appointmentHook.bookingData.clinic?.id, fetchDoctors]);

  useEffect(() => {
    if (isInitializedRef.current) {
      fetchServices(appointmentHook.bookingData.clinic?.id);
    }
  }, [appointmentHook.bookingData.clinic?.id, fetchServices]);

  return {
    // Hook data
    ...appointmentHook,
    profile,
    isPatient,
    
    // Local state
    clinics,
    clinicsLoading,
    doctors,
    services,
    toastMessage,
    bookingSuccess,
    
    // Enhanced validation state
    appointmentLimitInfo,
    crossClinicWarnings,
    bookingWarnings,
    validationLoading,
    
    // Handlers
    showToast,
    closeToast,
    handleClinicSelect,
    handleServiceToggle,
    handleDoctorSelect,
    handleDateSelect,
    handleSubmit,
    
    // Enhanced methods
    checkAppointmentLimits,
  };
};