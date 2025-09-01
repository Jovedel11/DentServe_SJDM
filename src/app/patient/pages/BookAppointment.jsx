import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Building2,
  Star,
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  MapPin,
  MessageSquare,
  Clock,
  Search,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Minus,
  Info,
} from "lucide-react";
import WelcomeModal from "../components/welcome-modal";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking } from "@/core/hooks/useAppointmentBooking";
import { supabase } from "@/lib/supabaseClient";

const BookAppointment = () => {
  const { profile } = useAuth();
  const {
    // State from hook
    loading,
    error,
    bookingStep,
    bookingData,

    // Actions from hook
    updateBookingData,
    resetBooking,
    bookAppointment,

    // Step navigation from hook
    goToStep,
    nextStep,
    previousStep,
    validateStep,

    // Data fetching from hook
    getAvailableDoctors,
    getServices,
    checkSlotAvailability,
    getSelectedServicesDetails,

    // Computed values from hook
    canProceed,
    isComplete,
    totalServices,
    maxServicesReached,
    currentStepIndex,
    totalSteps,
    stepProgress,
  } = useAppointmentBooking();

  // Local state for UI
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServicesDetails, setSelectedServicesDetails] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step configuration aligned with hook
  const steps = [
    { id: "clinic", title: "Select Clinic", icon: Building2 },
    { id: "services", title: "Choose Services", icon: Stethoscope },
    { id: "doctor", title: "Pick Doctor", icon: User },
    { id: "datetime", title: "Date & Time", icon: Calendar },
    { id: "confirm", title: "Review", icon: CheckCircle2 },
  ];

  // Generate time slots for the day
  const generateTimeSlots = useCallback(() => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minutes of [0, 30]) {
        const time = `${hour.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  // Fetch clinics on component mount
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const { data, error } = await supabase
          .from("clinics")
          .select(
            `
          id,
          name,
          description,
          address,
          location,
          email,
          website_url,
          operating_hours,
          services_offered,
          rating,
          total_reviews,
          image_url,
          is_active
        `
          )
          .eq("is_active", true)
          .order("rating", { ascending: false });

        if (error) throw error;
        setClinics(data || []);
      } catch (err) {
        console.error("Error fetching clinics:", err);
      }
    };

    fetchClinics();
  }, []);

  // Fetch doctors when clinic is selected
  useEffect(() => {
    if (bookingData.clinic?.id) {
      const fetchDoctors = async () => {
        const result = await getAvailableDoctors(bookingData.clinic.id);
        if (result.success) {
          setDoctors(result.doctors);
        }
      };
      fetchDoctors();
    }
  }, [bookingData.clinic?.id, getAvailableDoctors]);

  // Fetch services when clinic is selected
  useEffect(() => {
    if (bookingData.clinic?.id) {
      const fetchServices = async () => {
        const result = await getServices(bookingData.clinic.id);
        if (result.success) {
          setServices(result.services);
        }
      };
      fetchServices();
    }
  }, [bookingData.clinic?.id, getServices]);

  // Get selected services details
  useEffect(() => {
    if (bookingData.services?.length > 0) {
      const fetchSelectedServices = async () => {
        const details = await getSelectedServicesDetails();
        setSelectedServicesDetails(details);
      };
      fetchSelectedServices();
    } else {
      setSelectedServicesDetails([]);
    }
  }, [bookingData.services, getSelectedServicesDetails]);

  // Check slot availability when date/time/services change
  useEffect(() => {
    if (
      bookingData.doctor?.id &&
      bookingData.date &&
      bookingData.time &&
      bookingData.services?.length > 0
    ) {
      const checkAvailability = async () => {
        setLoadingSlots(true);
        const result = await checkSlotAvailability(
          bookingData.doctor.id,
          bookingData.date,
          bookingData.time,
          bookingData.services
        );
        setLoadingSlots(false);

        if (!result.available) {
          // Clear the time if not available
          updateBookingData({ time: null });
        }
      };
      checkAvailability();
    }
  }, [
    bookingData.doctor?.id,
    bookingData.date,
    bookingData.time,
    bookingData.services,
    checkSlotAvailability,
    updateBookingData,
  ]);

  // Filtered clinics based on search
  const filteredClinics = clinics.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (clinic.specialties &&
        clinic.specialties.some((specialty) =>
          specialty.toLowerCase().includes(searchQuery.toLowerCase())
        ))
  );

  // Event Handlers
  const handleWelcomeModalClose = (action) => {
    setShowWelcomeModal(false);
    if (action === "browse") {
      console.log("Navigate to clinics/map page");
    }
  };

  const handleSelectClinic = () => handleWelcomeModalClose("browse");
  const handleContinueBooking = () => handleWelcomeModalClose("continue");

  const handleClinicSelect = (clinic) => {
    updateBookingData({
      clinic,
      doctor: null, // Reset dependent selections
      services: [],
      date: null,
      time: null,
    });
  };

  const handleServiceToggle = (serviceId) => {
    const currentServices = bookingData.services || [];
    let newServices;

    if (currentServices.includes(serviceId)) {
      newServices = currentServices.filter((id) => id !== serviceId);
    } else {
      if (currentServices.length >= 3) {
        return; // Max services reached
      }
      newServices = [...currentServices, serviceId];
    }

    updateBookingData({ services: newServices });
  };

  const handleDoctorSelect = (doctor) => {
    updateBookingData({
      doctor,
      date: null, // Reset time-dependent selections
      time: null,
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await bookAppointment();

      if (result.success) {
        // Success feedback - you might want to navigate or show success modal
        alert(
          `Appointment booked successfully! Appointment ID: ${result.appointment.id}`
        );
        resetBooking();
      }
    } catch (err) {
      console.error("Booking submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Step Content Renderers
  const renderClinicStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Select Your Clinic
        </h2>
        <p className="text-muted-foreground">
          Choose from our network of trusted dental clinics
        </p>
      </div>

      {/* Search Input */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clinics by name, location, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Clinics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredClinics.map((clinic) => (
          <motion.div
            key={clinic.id}
            className={`group cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-xl ${
              bookingData.clinic?.id === clinic.id
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card hover:border-primary/50"
            }`}
            onClick={() => handleClinicSelect(clinic)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Clinic Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {clinic.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-foreground">
                      {clinic.rating || "N/A"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({clinic.total_reviews || 0} reviews)
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{clinic.address}</span>
                </div>
              </div>
              {clinic.image_url && (
                <div className="aspect-square w-20 h-20 overflow-hidden rounded-xl border border-border flex-shrink-0">
                  <img
                    src={clinic.image_url}
                    alt={clinic.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}
            </div>

            {/* Clinic Info */}
            <div className="space-y-3">
              {clinic.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {clinic.description}
                </p>
              )}

              {/* Specialties */}
              {clinic.specialties && clinic.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {clinic.specialties.slice(0, 3).map((specialty, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                  {clinic.specialties.length > 3 && (
                    <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                      +{clinic.specialties.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Features */}
              {clinic.features && clinic.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {clinic.features.slice(0, 2).map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredClinics.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No clinics found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria
          </p>
        </div>
      )}
    </div>
  );

  const renderServicesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Select Services
        </h2>
        <p className="text-muted-foreground">
          Choose up to 3 services for your appointment ({totalServices}/3
          selected)
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
        {services.map((service) => {
          const isSelected = bookingData.services?.includes(service.id);

          return (
            <motion.div
              key={service.id}
              className={`cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card hover:border-primary/50"
              } ${
                maxServicesReached && !isSelected
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={() =>
                !maxServicesReached || isSelected
                  ? handleServiceToggle(service.id)
                  : null
              }
              whileHover={
                !maxServicesReached || isSelected ? { scale: 1.01 } : {}
              }
              whileTap={
                !maxServicesReached || isSelected ? { scale: 0.99 } : {}
              }
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0 relative">
                    <Stethoscope className="w-6 h-6 text-primary" />
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground text-lg">
                        {service.name}
                      </h3>
                      {service.popular && (
                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{service.duration_minutes} min</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="font-bold text-primary text-xl">
                    ₱{service.price}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    per session
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Services Summary */}
      {selectedServicesDetails.length > 0 && (
        <div className="bg-muted/20 rounded-xl p-6 max-w-2xl mx-auto">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Selected Services ({selectedServicesDetails.length})
          </h4>
          <div className="space-y-2">
            {selectedServicesDetails.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {service.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {service.duration_minutes} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">
                    ₱{service.price}
                  </span>
                  <button
                    onClick={() => handleServiceToggle(service.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between font-bold">
                <span>Total Duration:</span>
                <span>
                  {selectedServicesDetails.reduce(
                    (sum, s) => sum + s.duration_minutes,
                    0
                  )}{" "}
                  min
                </span>
              </div>
              <div className="flex items-center justify-between font-bold text-primary">
                <span>Total Cost:</span>
                <span>
                  {selectedServicesDetails
                    .reduce(
                      (sum, s) =>
                        sum +
                        (parseFloat(s.min_price) + parseFloat(s.max_price)) / 2,
                      0
                    )
                    .toLocaleString("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {services.length === 0 && (
        <div className="text-center py-12">
          <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No services available
          </h3>
          <p className="text-muted-foreground">
            Please select a clinic first to see available services
          </p>
        </div>
      )}
    </div>
  );

  const renderDoctorStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Choose Your Doctor
        </h2>
        <p className="text-muted-foreground">
          Select your preferred dentist for your services
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {doctors.map((doctor) => (
          <motion.div
            key={doctor.id}
            className={`cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
              bookingData.doctor?.id === doctor.id
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card hover:border-primary/50"
            }`}
            onClick={() => handleDoctorSelect(doctor)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 overflow-hidden rounded-xl border-2 border-primary/20 flex-shrink-0 bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {doctor.display_name}
                </h3>
                <p className="text-primary font-medium mb-2">
                  {doctor.specialization}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{doctor.rating || "N/A"}</span>
                  </div>
                  <span>{doctor.experience_years} years exp.</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Consultation Fee: ₱{doctor.consultation_fee}
                </div>
                {doctor.certifications && doctor.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <p className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                      Certifications:{" "}
                      {doctor.certifications
                        ? JSON.stringify(doctor.certifications)
                        : "None"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {doctors.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No doctors available
          </h3>
          <p className="text-muted-foreground">
            Please select a clinic first to see available doctors
          </p>
        </div>
      )}
    </div>
  );

  const renderDateTimeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Select Date & Time
        </h2>
        <p className="text-muted-foreground">
          Choose your preferred appointment date and time
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Select Date
          </label>
          <input
            type="date"
            value={bookingData.date || ""}
            onChange={(e) =>
              updateBookingData({ date: e.target.value, time: null })
            }
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Available Time Slots
          </label>
          {bookingData.date ? (
            <div className="grid grid-cols-3 gap-3">
              {generateTimeSlots().map((time) => (
                <button
                  key={time}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    bookingData.time === time
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={() => updateBookingData({ time })}
                  disabled={loadingSlots}
                >
                  {loadingSlots ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    time
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Please select a date first
            </div>
          )}
        </div>
      </div>

      {/* Optional Notes */}
      <div className="max-w-2xl mx-auto">
        <label className="block text-sm font-medium text-foreground mb-2">
          Symptoms or Additional Notes (Optional)
        </label>
        <textarea
          placeholder="Any specific symptoms, concerns, or notes for your appointment..."
          value={bookingData.symptoms || ""}
          onChange={(e) => updateBookingData({ symptoms: e.target.value })}
          rows="4"
          className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none resize-none"
        />
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Review & Confirm
        </h2>
        <p className="text-muted-foreground">
          Please review your appointment details before confirming
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Appointment Details */}
          <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Appointment Details
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Clinic</div>
                  <div className="text-muted-foreground">
                    {bookingData.clinic?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {bookingData.clinic?.address}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Services</div>
                  {selectedServicesDetails.map((service) => (
                    <div key={service.id} className="text-muted-foreground">
                      {service.name} - {service.duration_minutes}min - ₱
                      {service.price}
                    </div>
                  ))}
                  <div className="text-sm text-primary font-semibold mt-1">
                    Total: 
                    {selectedServicesDetails
                      .reduce(
                        (sum, s) =>
                          sum +
                          (parseFloat(s.min_price) + parseFloat(s.max_price)) /
                            2,
                        0
                      )
                      .toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Doctor</div>
                  <div className="text-muted-foreground">
                    {bookingData.doctor?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {bookingData.doctor?.specialization}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Date & Time</div>
                  <div className="text-muted-foreground">
                    {bookingData.date &&
                      new Date(bookingData.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {bookingData.time}
                  </div>
                </div>
              </div>

              {bookingData.symptoms && (
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Notes</div>
                    <div className="text-muted-foreground text-sm leading-relaxed">
                      {bookingData.symptoms}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Patient Information */}
          <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Your Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    Patient Name
                  </div>
                  <div className="text-muted-foreground">
                    {profile?.first_name} {profile?.last_name}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Phone</div>
                  <div className="text-muted-foreground">
                    {profile?.phone || "Not provided"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Email</div>
                  <div className="text-muted-foreground">{profile?.email}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Your contact information is taken from
                your profile. You can update it in your account settings if
                needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (bookingStep) {
      case "clinic":
        return renderClinicStep();
      case "services":
        return renderServicesStep();
      case "doctor":
        return renderDoctorStep();
      case "datetime":
        return renderDateTimeStep();
      case "confirm":
        return renderConfirmStep();
      default:
        return null;
    }
  };

  const getCurrentStepConfig = () => {
    return steps.find((step) => step.id === bookingStep) || steps[0];
  };

  return (
    <>
      <WelcomeModal
        isOpen={showWelcomeModal}
        onSelectClinic={handleSelectClinic}
        onContinue={handleContinueBooking}
      />

      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Book Your Appointment
            </h1>
            <p className="text-muted-foreground">
              Schedule your dental care appointment in a few simple steps
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === bookingStep;
                const isCompleted = currentStepIndex > index;
                const isAccessible = currentStepIndex >= index;

                return (
                  <div
                    key={step.id}
                    className="flex items-center flex-shrink-0"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200 cursor-pointer ${
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : isActive
                            ? "border-primary bg-primary/10 text-primary"
                            : isAccessible
                            ? "border-muted-foreground bg-background text-muted-foreground hover:border-primary hover:text-primary"
                            : "border-muted bg-muted text-muted-foreground/50 cursor-not-allowed"
                        }`}
                        onClick={() => isAccessible && goToStep(step.id)}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-sm font-medium ${
                            isActive || isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.title}
                        </div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`mx-4 h-0.5 w-16 transition-colors duration-200 ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-4 bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stepProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="mb-6 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={bookingStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-12"
            >
              <div className="rounded-2xl border bg-card p-8 shadow-lg">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">
                      Loading...
                    </span>
                  </div>
                ) : (
                  renderStepContent()
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <motion.div
            className="flex items-center justify-between border-t pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              {currentStepIndex > 0 && (
                <button
                  onClick={previousStep}
                  disabled={loading || submitting}
                  className="flex items-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>
              )}
            </div>

            <div>
              {bookingStep !== "confirm" ? (
                <button
                  onClick={nextStep}
                  disabled={!canProceed || loading}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all duration-200 ${
                    canProceed && !loading
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  }`}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!isComplete || submitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Confirm Appointment
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BookAppointment;
