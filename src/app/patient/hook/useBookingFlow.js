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
  const [patientReliability, setPatientReliability] = useState(null);

  // Use refs to prevent infinite loops
  const lastValidationRef = useRef({ clinicId: null, date: null });
  const isInitializedRef = useRef(false);

  // Toast helpers
  const showToast = useCallback((message, type = "info") => {
    setToastMessage({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage("");
  }, []);

  // Fetch clinics with enhanced location support
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

  // Fetch doctors with availability info
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

  // Fetch services with pricing info
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

  // Enhanced appointment limit checking
  const checkAppointmentLimits = useCallback(async (clinicId, appointmentDate = null) => {
    if (!clinicId || !isPatient || !profile?.user_id) return;

    const validationKey = `${clinicId}-${appointmentDate || 'null'}`;
    if (lastValidationRef.current.key === validationKey && lastValidationRef.current.loading) {
      return;
    }

    lastValidationRef.current = { key: validationKey, loading: true };
    setValidationLoading(true);
    
    try {
      // Check appointment limits
      const { data: limitData, error: limitError } = await supabase.rpc('check_appointment_limit', {
        p_patient_id: profile.user_id,
        p_clinic_id: clinicId,
        p_appointment_date: appointmentDate
      });

      if (limitError) throw limitError;
      setAppointmentLimitInfo(limitData);
      
      // Check patient reliability
      const { data: reliabilityData, error: reliabilityError } = await supabase.rpc('check_patient_reliability', {
        p_patient_id: profile.user_id,
        p_clinic_id: clinicId
      });

      if (!reliabilityError && reliabilityData) {
        setPatientReliability(reliabilityData);
      }
      
      // Extract cross-clinic warnings
      const crossClinicAppts = limitData?.data?.cross_clinic_appointments || [];
      setCrossClinicWarnings(crossClinicAppts);
      
      // Set booking warnings based on limits and reliability
      const warnings = [];
      if (!limitData.allowed) {
        warnings.push({
          type: 'error',
          message: limitData.message,
          reason: limitData.reason
        });
      } else {
        // Cross-clinic coordination warnings
        if (crossClinicAppts.length > 0) {
          warnings.push({
            type: 'info',
            message: `You have ${crossClinicAppts.length} appointment(s) at other clinics. Please inform your healthcare providers for better care coordination.`
          });
        }

        // Reliability warnings
        if (reliabilityData?.risk_level === 'high_risk') {
          warnings.push({
            type: 'warning',
            message: 'Your appointment history shows some missed appointments. Please ensure you can attend this appointment.'
          });
        } else if (reliabilityData?.risk_level === 'moderate_risk') {
          warnings.push({
            type: 'info',
            message: 'Please remember to attend your appointment or cancel with adequate notice.'
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

  // Enhanced event handlers
  const handleClinicSelect = useCallback((clinic) => {
    appointmentHook.updateBookingData({
      clinic,
      doctor: null,
      services: [],
      date: null,
      time: null,
    });
    
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

  const handleDateSelect = useCallback((date) => {
    appointmentHook.updateBookingData({ date, time: null });
    
    if (appointmentHook.bookingData.clinic?.id) {
      checkAppointmentLimits(appointmentHook.bookingData.clinic.id, date);
    }
  }, [appointmentHook.updateBookingData, appointmentHook.bookingData.clinic?.id, checkAppointmentLimits]);

  // Enhanced submit handler with comprehensive validation
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

    // Reliability check
    if (patientReliability?.risk_level === 'high_risk') {
      const confirmed = window.confirm(
        "Your appointment history shows some missed appointments. Are you sure you can attend this appointment? Continued no-shows may affect your booking privileges."
      );
      if (!confirmed) return;
    }

    const result = await appointmentHook.bookAppointment();

    if (result.success) {
      setBookingSuccess(true);
      
      // Enhanced success message
      let successMessage = "Appointment booked successfully! ";
      
      if (result.appointment.details?.requires_approval) {
        successMessage += "Your appointment is pending clinic approval. ";
      }
      
      if (result.appointment.symptoms_sent) {
        successMessage += "Your symptoms have been sent to the staff. ";
      }
      
      if (crossClinicWarnings.length > 0) {
        successMessage += "Please inform your healthcare providers about your other appointments for better care coordination.";
      }
      
      showToast(successMessage, "success");

      // Redirect after success
      setTimeout(() => {
        window.location.href = "/patient/appointments";
      }, 3000);
    } else {
      showToast(`Booking failed: ${result.error}`, "error");
    }
  }, [isPatient, appointmentHook.bookAppointment, appointmentLimitInfo, patientReliability, crossClinicWarnings, showToast]);

  // Enhanced cancellation policy info
  const getCancellationInfo = useCallback(() => {
    if (!appointmentHook.bookingData.clinic) return null;
    
    const policyHours = appointmentHook.bookingData.clinic.cancellation_policy_hours || 24;
    const appointmentDateTime = appointmentHook.bookingData.date && appointmentHook.bookingData.time 
      ? new Date(`${appointmentHook.bookingData.date}T${appointmentHook.bookingData.time}`)
      : null;
    
    if (!appointmentDateTime) return null;
    
    const cancellationDeadline = new Date(appointmentDateTime.getTime() - (policyHours * 60 * 60 * 1000));
    
    return {
      policyHours,
      cancellationDeadline,
      canStillCancel: new Date() < cancellationDeadline
    };
  }, [appointmentHook.bookingData.clinic, appointmentHook.bookingData.date, appointmentHook.bookingData.time]);

  // Effects
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
    patientReliability,
    
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
    getCancellationInfo,
  };
};