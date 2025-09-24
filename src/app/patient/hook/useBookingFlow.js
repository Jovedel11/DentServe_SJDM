import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking } from "@/core/hooks/useAppointmentBooking";
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

  // Toast helpers
  const showToast = useCallback((message, type = "info") => {
    setToastMessage({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage("");
  }, []);

  // Fetch clinics
  const fetchClinics = useCallback(async () => {
    if (!isPatient) return;

    setClinicsLoading(true);
    try {
      const { data, error } = await supabase.rpc("find_nearest_clinics", {
        user_location: null,
        max_distance_km: 50,
        limit_count: 20,
      });

      if (error) throw error;
      if (data.success) {
        setClinics(data.data.clinics || []);
      }
    } catch (err) {
      console.error("Error fetching clinics:", err);
      showToast("Failed to load clinics", "error");
    } finally {
      setClinicsLoading(false);
    }
  }, [isPatient, showToast]);

  // Fetch doctors
  const fetchDoctors = useCallback(async (clinicId) => {
    if (clinicId) {
      const result = await appointmentHook.getAvailableDoctors(clinicId);
      if (result.success) {
        setDoctors(result.doctors);
      }
    } else {
      setDoctors([]);
    }
  }, []);

  // Fetch services
  const fetchServices = useCallback(async (clinicId) => {
    if (clinicId) {
      const result = await appointmentHook.getServices(clinicId);
      if (result.success) {
        setServices(result.services);
      }
    } else {
      setServices([]);
    }
  }, []);

  // Event handlers
  const handleClinicSelect = useCallback((clinic) => {
    appointmentHook.updateBookingData({
      clinic,
      doctor: null,
      services: [],
      date: null,
      time: null,
    });
  }, [appointmentHook]);

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
    }
  }, [appointmentHook]);

  const handleDoctorSelect = useCallback((doctor) => {
    appointmentHook.updateBookingData({
      doctor,
      date: null,
      time: null,
    });
  }, [appointmentHook]);

  const handleSubmit = useCallback(async () => {
    if (!isPatient) {
      showToast("Only patients can book appointments", "error");
      return;
    }

    const result = await appointmentHook.bookAppointment();

    if (result.success) {
      setBookingSuccess(true);
      showToast(
        `Appointment booked successfully! ${
          result.appointment.symptoms_sent
            ? "Your symptoms have been sent to the staff."
            : ""
        }`,
        "success"
      );

      setTimeout(() => {
        window.location.href = "/patient/appointments";
      }, 3000);
    } else {
      showToast(`Booking failed: ${result.error}`, "error");
    }
  }, [isPatient, appointmentHook, showToast]);

  // Effects
  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  useEffect(() => {
    fetchDoctors(appointmentHook.bookingData.clinic?.id);
  }, [appointmentHook.bookingData.clinic?.id, fetchDoctors]);

  useEffect(() => {
    fetchServices(appointmentHook.bookingData.clinic?.id);
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
    
    // Handlers
    showToast,
    closeToast,
    handleClinicSelect,
    handleServiceToggle,
    handleDoctorSelect,
    handleSubmit,
  };
};