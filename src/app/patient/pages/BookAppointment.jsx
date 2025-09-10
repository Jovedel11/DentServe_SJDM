import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking } from "@/core/hooks/useAppointmentBooking";
import { supabase } from "@/lib/supabaseClient";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Star,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  User,
  Stethoscope,
  CreditCard,
  FileText,
} from "lucide-react";

// Enhanced Toast Component
const Toast = React.memo(({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const toastConfig = {
    error: {
      bg: "bg-destructive",
      text: "text-white",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    success: {
      bg: "bg-success",
      text: "text-white",
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    info: {
      bg: "bg-primary",
      text: "text-primary-foreground",
      icon: <AlertCircle className="w-5 h-5" />,
    },
  };

  const config = toastConfig[type] || toastConfig.info;

  return (
    <div
      className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-lg max-w-sm border animate-fadeIn ${config.bg} ${config.text}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
});

// Enhanced Progress Component
const ProgressIndicator = React.memo(
  ({ currentStep, totalSteps, progress }) => {
    const steps = ["Clinic", "Services", "Doctor", "Date & Time", "Confirm"];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-foreground">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Breadcrumbs */}
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-300 ${
                    index < currentStep
                      ? "bg-success text-white shadow-md"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground shadow-md scale-110"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    index <= currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-3 mt-[-20px] transition-all duration-500 ${
                    index < currentStep ? "bg-success" : "bg-muted"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
);

// Enhanced Loading Component
const LoadingSpinner = React.memo(({ message = "Loading..." }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto mb-4" />
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  </div>
));

// Enhanced Alert Component
const Alert = React.memo(({ type, title, message, icon }) => {
  const alertConfig = {
    error: "bg-destructive/10 border-destructive/20 text-destructive",
    warning: "bg-warning/10 border-warning/20 text-warning",
    info: "bg-primary/10 border-primary/20 text-primary",
    success: "bg-success/10 border-success/20 text-success",
  };

  return (
    <div
      className={`mb-6 p-4 rounded-lg border ${
        alertConfig[type] || alertConfig.info
      }`}
    >
      <div className="flex items-start gap-3">
        {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
        <div>
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
});

const BookAppointment = () => {
  const { profile, isPatient } = useAuth();

  // ✅ HOOK INTEGRATION
  const {
    loading,
    error,
    bookingStep,
    bookingData,
    updateBookingData,
    resetBooking,
    bookAppointment,
    getAvailableDoctors,
    getServices,
    nextStep,
    previousStep,
    canProceed,
    isComplete,
    currentStepIndex,
    totalSteps,
    stepProgress,
    checkingAvailability,
    availableTimes,
  } = useAppointmentBooking();

  // ✅ LOCAL STATE
  const [clinics, setClinics] = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // ✅ TOAST HELPER
  const showToast = useCallback((message, type = "info") => {
    setToastMessage({ message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToastMessage("");
  }, []);

  // ✅ CLINICS FETCH
  useEffect(() => {
    const fetchClinics = async () => {
      if (!isPatient()) return;

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
    };

    fetchClinics();
  }, [isPatient, showToast]);

  // ✅ DOCTORS FETCH
  const clinicId = bookingData.clinic?.id;
  useEffect(() => {
    const fetchDoctors = async () => {
      if (clinicId) {
        const result = await getAvailableDoctors(clinicId);
        if (result.success) {
          setDoctors(result.doctors);
        }
      } else {
        setDoctors([]);
      }
    };

    fetchDoctors();
  }, [clinicId, getAvailableDoctors]);

  // ✅ SERVICES FETCH
  useEffect(() => {
    const fetchServices = async () => {
      if (clinicId) {
        const result = await getServices(clinicId);
        if (result.success) {
          setServices(result.services);
        }
      } else {
        setServices([]);
      }
    };

    fetchServices();
  }, [clinicId, getServices]);

  // ✅ STEP VALIDATION MESSAGE
  const stepValidationMessage = useMemo(() => {
    switch (bookingStep) {
      case "clinic":
        return !bookingData.clinic ? "Please select a clinic" : null;
      case "services":
        return !bookingData.services?.length
          ? "Please select at least one service"
          : null;
      case "doctor":
        return !bookingData.doctor ? "Please select a doctor" : null;
      case "datetime":
        if (!bookingData.date) return "Please select a date";
        if (!bookingData.time) return "Please select a time";
        return null;
      default:
        return null;
    }
  }, [bookingStep, bookingData]);

  // ✅ COST AND DURATION CALCULATIONS
  const { totalDuration, totalCost, selectedServices } = useMemo(() => {
    const selected = services.filter((service) =>
      bookingData.services.includes(service.id)
    );

    return {
      totalDuration: selected.reduce(
        (total, service) => total + (service.duration_minutes || 0),
        0
      ),
      totalCost: selected.reduce(
        (total, service) => total + (parseFloat(service.max_price) || 0),
        0
      ),
      selectedServices: selected,
    };
  }, [services, bookingData.services]);

  // ✅ EVENT HANDLERS
  const handleClinicSelect = useCallback(
    (clinic) => {
      updateBookingData({
        clinic,
        doctor: null,
        services: [],
        date: null,
        time: null,
      });
    },
    [updateBookingData]
  );

  const handleServiceToggle = useCallback(
    (serviceId) => {
      const currentServices = bookingData.services || [];

      if (currentServices.includes(serviceId)) {
        updateBookingData({
          services: currentServices.filter((id) => id !== serviceId),
        });
      } else if (currentServices.length < 3) {
        updateBookingData({
          services: [...currentServices, serviceId],
        });
      }
    },
    [bookingData.services, updateBookingData]
  );

  const handleDoctorSelect = useCallback(
    (doctor) => {
      updateBookingData({
        doctor,
        date: null,
        time: null,
      });
    },
    [updateBookingData]
  );

  // ✅ ENHANCED: Submit with notification feedback
  const handleSubmit = useCallback(async () => {
    if (!isPatient()) {
      showToast("Only patients can book appointments", "error");
      return;
    }

    const result = await bookAppointment();

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
  }, [isPatient, bookAppointment, showToast]);

  // ✅ ACCESS CONTROL
  if (!isPatient()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 glass-effect rounded-xl border shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            Only patients can book appointments.
          </p>
        </div>
      </div>
    );
  }

  // ✅ SUCCESS STATE
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 glass-effect rounded-xl border shadow-lg">
          <div className="w-20 h-20 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center animate-fadeIn">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Appointment Booked Successfully!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your appointment has been scheduled and the clinic has been
            notified.
            {bookingData.symptoms && (
              <span className="block mt-2 text-sm">
                Your symptoms have been shared with the staff.
              </span>
            )}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-primary" />
            <span>Redirecting to your appointments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Toast Notification */}
        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={closeToast}
          />
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Book Your Appointment
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Complete the steps below to schedule your dental visit with our
            professional team
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          currentStep={currentStepIndex}
          totalSteps={totalSteps}
          progress={stepProgress}
        />

        {/* Error Display */}
        {error && (
          <Alert
            type="error"
            message={error}
            icon={<AlertCircle className="w-5 h-5" />}
          />
        )}

        {/* Validation Message */}
        {stepValidationMessage && (
          <Alert
            type="warning"
            message={stepValidationMessage}
            icon={<AlertCircle className="w-5 h-5" />}
          />
        )}

        {/* Step Content */}
        <div className="bg-card rounded-xl shadow-lg border p-8 mb-8 min-h-[600px]">
          {loading && !bookingData.clinic ? (
            <LoadingSpinner message="Initializing booking system..." />
          ) : (
            <>
              {/* CLINIC SELECTION STEP */}
              {bookingStep === "clinic" && (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-3 mb-8">
                    <MapPin className="w-6 h-6 text-primary" />
                    <h2 className="text-3xl font-bold text-foreground">
                      Select Your Clinic
                    </h2>
                  </div>

                  {clinicsLoading ? (
                    <LoadingSpinner message="Finding nearby clinics..." />
                  ) : clinics?.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {clinics.map((clinic) => (
                        <div
                          key={clinic.id}
                          onClick={() => handleClinicSelect(clinic)}
                          className={`group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            bookingData.clinic?.id === clinic.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                              {clinic.name}
                            </h3>
                            {bookingData.clinic?.id === clinic.id && (
                              <Check className="w-6 h-6 text-primary" />
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                              <span className="text-muted-foreground">
                                {clinic.address}, {clinic.city}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">
                                  {clinic.rating || "N/A"} (
                                  {clinic.total_reviews || 0} reviews)
                                </span>
                              </div>
                              {clinic.distance_km && (
                                <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                  {clinic.distance_km}km away
                                </span>
                              )}
                            </div>
                          </div>

                          {clinic.badges && clinic.badges.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {clinic.badges.map((badge) => (
                                <span
                                  key={badge.badge_name}
                                  className="px-3 py-1 bg-success/10 text-success text-xs font-medium rounded-full border border-success/20"
                                >
                                  {badge.badge_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No clinics available
                      </h3>
                      <p className="text-muted-foreground">
                        Please try again later or contact support.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SERVICES SELECTION STEP */}
              {bookingStep === "services" && (
                <div className="animate-fadeIn">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-primary" />
                      <h2 className="text-3xl font-bold text-foreground">
                        Select Services
                      </h2>
                    </div>
                    <div className="bg-primary/10 px-4 py-2 rounded-full">
                      <span className="text-primary font-medium">
                        {bookingData.services?.length || 0}/3 selected
                      </span>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-8 text-lg">
                    Choose up to 3 services for your appointment
                  </p>

                  {services.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {services.map((service) => {
                          const isSelected = bookingData.services?.includes(
                            service.id
                          );
                          const maxReached = bookingData.services?.length >= 3;

                          return (
                            <div
                              key={service.id}
                              onClick={() =>
                                (!maxReached || isSelected) &&
                                handleServiceToggle(service.id)
                              }
                              className={`group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : maxReached
                                  ? "border-muted bg-muted/30 cursor-not-allowed opacity-60"
                                  : "border-border hover:border-primary/50 hover:shadow-lg"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                  {service.name}
                                </h4>
                                {isSelected && (
                                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-primary-foreground" />
                                  </div>
                                )}
                              </div>

                              {service.description && (
                                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                                  {service.description}
                                </p>
                              )}

                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {service.duration_minutes} minutes
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-foreground">
                                    ₱{service.min_price} - ₱{service.max_price}
                                  </div>
                                </div>
                              </div>

                              <span className="inline-block px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                                {service.category}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Selected Services Summary */}
                      {bookingData.services?.length > 0 && (
                        <div className="p-6 bg-accent/10 rounded-xl border border-accent/20">
                          <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                            Selected Services Summary
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-primary" />
                              <span className="font-medium">
                                Total Duration: {totalDuration} minutes
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-primary" />
                              <span className="font-bold text-lg">
                                Estimated Total: ₱{totalCost}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No services available
                      </h3>
                      <p className="text-muted-foreground">
                        No services found for this clinic.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* DOCTOR SELECTION STEP */}
              {bookingStep === "doctor" && (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-3 mb-8">
                    <Stethoscope className="w-6 h-6 text-primary" />
                    <h2 className="text-3xl font-bold text-foreground">
                      Choose Your Doctor
                    </h2>
                  </div>

                  {doctors.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {doctors.map((doctor) => (
                        <div
                          key={doctor.id}
                          onClick={() => handleDoctorSelect(doctor)}
                          className={`group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            bookingData.doctor?.id === doctor.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-8 h-8 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                  {doctor.name}
                                </h3>
                                {bookingData.doctor?.id === doctor.id && (
                                  <Check className="w-6 h-6 text-primary" />
                                )}
                              </div>

                              <p className="text-primary font-semibold mb-3">
                                {doctor.specialization}
                              </p>

                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {doctor.experience_years} years experience
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-muted-foreground">
                                    Rating: {doctor.rating || "N/A"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium text-foreground">
                                    Consultation: ₱{doctor.consultation_fee}
                                  </span>
                                </div>
                              </div>

                              {doctor.education && (
                                <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                                  <p className="text-xs text-muted-foreground">
                                    🎓 {doctor.education}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No doctors available
                      </h3>
                      <p className="text-muted-foreground">
                        Please select a different clinic or try again later.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* DATE & TIME SELECTION STEP */}
              {bookingStep === "datetime" && (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-3 mb-8">
                    <Calendar className="w-6 h-6 text-primary" />
                    <h2 className="text-3xl font-bold text-foreground">
                      Select Date & Time
                    </h2>
                  </div>

                  <div className="space-y-8">
                    {/* Date Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Choose Date:
                      </label>
                      <input
                        type="date"
                        value={bookingData.date || ""}
                        onChange={(e) =>
                          updateBookingData({
                            date: e.target.value,
                            time: null,
                          })
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full max-w-xs px-4 py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                      />
                    </div>

                    {/* Time Selection */}
                    {bookingData.date && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-4">
                          Available Times:
                        </label>
                        {checkingAvailability ? (
                          <LoadingSpinner message="Checking availability..." />
                        ) : availableTimes.length > 0 ? (
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {availableTimes.map((time) => (
                              <button
                                key={time}
                                onClick={() => updateBookingData({ time })}
                                className={`p-4 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                                  bookingData.time === time
                                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                                    : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-muted">
                            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-2">
                              No available times for this date.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Please select a different date.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Symptoms/Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Symptoms/Notes (Optional):
                      </label>
                      <textarea
                        value={bookingData.symptoms || ""}
                        onChange={(e) =>
                          updateBookingData({ symptoms: e.target.value })
                        }
                        placeholder="Describe any symptoms, concerns, or special requests..."
                        rows={4}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        This information will be shared with the clinic staff to
                        help them prepare for your visit.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CONFIRMATION STEP */}
              {bookingStep === "confirm" && (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-3 mb-8">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                    <h2 className="text-3xl font-bold text-foreground">
                      Review & Confirm Your Appointment
                    </h2>
                  </div>

                  {/* Payment Notice */}
                  <Alert
                    type="warning"
                    title="Payment Information"
                    message="This booking does not include online payment. Please prepare cash payment for your appointment."
                    icon={<CreditCard className="w-5 h-5" />}
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Appointment Details */}
                    <div className="space-y-6">
                      <div className="bg-muted/30 rounded-lg p-6 border">
                        <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          Appointment Details
                        </h3>

                        <div className="space-y-4">
                          <div className="pb-4 border-b border-border">
                            <span className="text-sm font-medium text-muted-foreground">
                              Clinic:
                            </span>
                            <p className="font-semibold text-foreground text-lg">
                              {bookingData.clinic?.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {bookingData.clinic?.address}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {bookingData.clinic?.phone}
                              </span>
                            </div>
                          </div>

                          <div className="pb-4 border-b border-border">
                            <span className="text-sm font-medium text-muted-foreground">
                              Doctor:
                            </span>
                            <p className="font-semibold text-foreground text-lg">
                              {bookingData.doctor?.name}
                            </p>
                            <p className="text-sm text-primary font-medium">
                              {bookingData.doctor?.specialization}
                            </p>
                          </div>

                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Date & Time:
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-4 h-4 text-primary" />
                              <p className="font-semibold text-foreground">
                                {new Date(bookingData.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-4 h-4 text-primary" />
                              <p className="font-semibold text-foreground">
                                {bookingData.time} ({totalDuration} minutes)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="bg-accent/10 rounded-lg p-6 border border-accent/20">
                        <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          Selected Services
                        </h4>
                        <div className="space-y-3">
                          {selectedServices.map((service) => (
                            <div
                              key={service.id}
                              className="flex justify-between items-center p-3 bg-background rounded-lg border"
                            >
                              <span className="font-medium">
                                {service.name}
                              </span>
                              <span className="font-semibold text-primary">
                                ₱{service.min_price}-₱{service.max_price}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-3 border-t border-border">
                            <span className="font-bold text-lg">
                              Estimated Total:
                            </span>
                            <span className="font-bold text-2xl text-primary">
                              ₱{totalCost}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Symptoms */}
                      {bookingData.symptoms && (
                        <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                          <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Your Notes
                          </h4>
                          <p className="text-foreground bg-background p-3 rounded-lg border">
                            {bookingData.symptoms}
                          </p>
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            This will be sent to the clinic staff
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Patient Information */}
                    <div className="bg-muted/30 rounded-lg p-6 border">
                      <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Patient Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Name:
                          </span>
                          <p className="font-semibold text-foreground text-lg">
                            {profile?.first_name} {profile?.last_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Email:
                          </span>
                          <p className="font-medium text-foreground">
                            {profile?.email}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Phone:
                          </span>
                          <p className="font-medium text-foreground">
                            {profile?.phone || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={previousStep}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {bookingStep === "confirm" ? (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || loading}
              className="flex items-center gap-2 px-8 py-3 bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Appointment
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
