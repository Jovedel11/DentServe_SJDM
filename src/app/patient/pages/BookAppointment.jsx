import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking } from "@/core/hooks/useAppointmentBooking";
import { supabase } from "@/lib/supabaseClient";

const BookAppointment = () => {
  const { profile, isPatient } = useAuth();

  // ✅ OPTIMIZED: Using all functions from hook
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
    previousStep, // ✅ NOW AVAILABLE
    canProceed,
    isComplete,
    currentStepIndex,
    totalSteps,
    stepProgress,
    checkingAvailability,
    availableTimes, // ✅ FROM HOOK
  } = useAppointmentBooking();

  // ✅ OPTIMIZED: Local state only for what's not in hook
  const [clinics, setClinics] = useState([]);
  const [clinicsLoading, setCliicsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);

  // ✅ OPTIMIZED: Clinic fetch - runs once on mount
  useEffect(() => {
    const fetchClinics = async () => {
      if (!isPatient()) return;

      setCliicsLoading(true);
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
      } finally {
        setCliicsLoading(false);
      }
    };

    fetchClinics();
  }, []); // ✅ EMPTY DEPS - runs once

  // ✅ OPTIMIZED: Memoized clinic ID to prevent unnecessary calls
  const clinicId = bookingData.clinic?.id;

  // ✅ OPTIMIZED: Doctors fetch
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

  // ✅ OPTIMIZED: Services fetch
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

  // ✅ MEMOIZED: Step validation message
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

  // ✅ MEMOIZED: Cost and duration calculations
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

  // ✅ OPTIMIZED: Handler functions
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

  const handleSubmit = useCallback(async () => {
    if (!isPatient()) {
      alert("Only patients can book appointments");
      return;
    }

    const result = await bookAppointment();

    if (result.success) {
      alert(`Appointment booked successfully! ID: ${result.appointment.id}`);
    } else {
      alert(`Booking failed: ${result.error}`);
    }
  }, [isPatient, bookAppointment]);

  // ✅ RENDER FUNCTIONS
  const renderClinicStep = () => (
    <div>
      <h2>
        Select Your Clinic (Step {currentStepIndex + 1}/{totalSteps})
      </h2>
      <p>Progress: {Math.round(stepProgress)}%</p>

      {clinicsLoading && <p>Loading clinics...</p>}
      {error && <p>Error: {error}</p>}

      {clinics?.length > 0 ? (
        <div>
          {clinics.map((clinic) => (
            <div
              key={clinic.id}
              onClick={() => handleClinicSelect(clinic)}
              style={{
                border:
                  bookingData.clinic?.id === clinic.id
                    ? "2px solid blue"
                    : "1px solid gray",
                padding: "10px",
                margin: "5px",
                cursor: "pointer",
              }}
            >
              <h3>{clinic.name}</h3>
              <p>
                {clinic.address}, {clinic.city}
              </p>
              <p>
                Rating: {clinic.rating || "N/A"} ({clinic.total_reviews || 0}{" "}
                reviews)
              </p>
              <p>
                Distance:{" "}
                {clinic.distance_km ? `${clinic.distance_km}km` : "Unknown"}
              </p>
              {clinic.badges && clinic.badges.length > 0 && (
                <p>
                  Badges: {clinic.badges.map((b) => b.badge_name).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        !clinicsLoading && <p>No clinics available</p>
      )}
    </div>
  );

  const renderServicesStep = () => (
    <div>
      <h2>Select Services ({bookingData.services?.length || 0}/3)</h2>

      {services.length > 0 ? (
        <div>
          {services.map((service) => {
            const isSelected = bookingData.services?.includes(service.id);
            const maxReached = bookingData.services?.length >= 3;

            return (
              <div
                key={service.id}
                onClick={() =>
                  (!maxReached || isSelected) && handleServiceToggle(service.id)
                }
                style={{
                  border: isSelected ? "2px solid blue" : "1px solid gray",
                  padding: "10px",
                  margin: "5px",
                  cursor: !maxReached || isSelected ? "pointer" : "not-allowed",
                  opacity: maxReached && !isSelected ? 0.5 : 1,
                }}
              >
                <h4>
                  {service.name} {isSelected && "✓"}
                </h4>
                {service.description && <p>{service.description}</p>}
                <p>Duration: {service.duration_minutes} minutes</p>
                <p>
                  Price: ₱{service.min_price} - ₱{service.max_price}
                </p>
                <p>Category: {service.category}</p>
              </div>
            );
          })}

          {bookingData.services?.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                padding: "10px",
                background: "#f5f5f5",
              }}
            >
              <h4>Selected Services Summary:</h4>
              <p>Total Duration: {totalDuration} minutes</p>
              <p>Estimated Total Cost: ₱{totalCost}</p>
            </div>
          )}
        </div>
      ) : (
        <p>No services available for this clinic</p>
      )}
    </div>
  );

  const renderDoctorStep = () => (
    <div>
      <h2>Choose Your Doctor</h2>

      {doctors.length > 0 ? (
        <div>
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              onClick={() => handleDoctorSelect(doctor)}
              style={{
                border:
                  bookingData.doctor?.id === doctor.id
                    ? "2px solid blue"
                    : "1px solid gray",
                padding: "15px",
                margin: "10px",
                cursor: "pointer",
              }}
            >
              <h3>{doctor.name}</h3>
              <p>Specialization: {doctor.specialization}</p>
              <p>Experience: {doctor.experience_years} years</p>
              <p>Rating: {doctor.rating || "N/A"}</p>
              <p>Consultation Fee: ₱{doctor.consultation_fee}</p>
              {doctor.education && <p>Education: {doctor.education}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p>No doctors available for this clinic</p>
          <p>Please select a different clinic or try again later.</p>
        </div>
      )}
    </div>
  );

  const renderDateTimeStep = () => (
    <div>
      <h2>Select Date & Time</h2>

      <div>
        <label>Date:</label>
        <input
          type="date"
          value={bookingData.date || ""}
          onChange={(e) =>
            updateBookingData({ date: e.target.value, time: null })
          }
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {bookingData.date && (
        <div>
          <label>Available Times:</label>
          {checkingAvailability ? (
            <p>Checking availability...</p>
          ) : availableTimes.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
              }}
            >
              {availableTimes.map((time) => (
                <button
                  key={time}
                  onClick={() => updateBookingData({ time })}
                  style={{
                    padding: "10px",
                    backgroundColor:
                      bookingData.time === time ? "blue" : "white",
                    color: bookingData.time === time ? "white" : "black",
                    border: "1px solid gray",
                    cursor: "pointer",
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <p>
              No available times for this date. Please select a different date.
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <label>Symptoms/Notes (Optional):</label>
        <textarea
          value={bookingData.symptoms || ""}
          onChange={(e) => updateBookingData({ symptoms: e.target.value })}
          placeholder="Describe any symptoms or concerns..."
          rows={4}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div>
      <h2>Review & Confirm Your Appointment</h2>

      <div
        style={{
          padding: "15px",
          marginBottom: "20px",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffeaa7",
        }}
      >
        <h4>Payment Information</h4>
        <p>
          This booking does not include online payment. Please prepare cash
          payment for your appointment.
        </p>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}
      >
        <div>
          <h3>Appointment Details</h3>
          <p>
            <strong>Clinic:</strong> {bookingData.clinic?.name}
          </p>
          <p>
            <strong>Address:</strong> {bookingData.clinic?.address}
          </p>
          <p>
            <strong>Phone:</strong> {bookingData.clinic?.phone}
          </p>

          <h4>Services:</h4>
          {selectedServices.map((service) => (
            <div key={service.id}>
              <p>
                • {service.name} - ₱{service.min_price}-₱{service.max_price}
              </p>
            </div>
          ))}
          <p>
            <strong>Estimated Total: ₱{totalCost}</strong>
          </p>

          <p>
            <strong>Doctor:</strong> {bookingData.doctor?.name}
          </p>
          <p>
            <strong>Specialization:</strong>{" "}
            {bookingData.doctor?.specialization}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {new Date(bookingData.date).toLocaleDateString()}
          </p>
          <p>
            <strong>Time:</strong> {bookingData.time}
          </p>
          <p>
            <strong>Duration:</strong> {totalDuration} minutes
          </p>

          {bookingData.symptoms && (
            <div>
              <strong>Your Notes:</strong>
              <p>{bookingData.symptoms}</p>
            </div>
          )}
        </div>

        <div>
          <h3>Patient Information</h3>
          <p>
            <strong>Name:</strong> {profile?.first_name} {profile?.last_name}
          </p>
          <p>
            <strong>Email:</strong> {profile?.email}
          </p>
          <p>
            <strong>Phone:</strong> {profile?.phone || "Not provided"}
          </p>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
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
        return <p>Invalid step</p>;
    }
  };

  // ✅ ACCESS CONTROL
  if (!isPatient()) {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>Only patients can book appointments.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Book Your Appointment</h1>

      {/* Progress Indicator */}
      <div style={{ display: "flex", marginBottom: "20px" }}>
        <div>
          Step {currentStepIndex + 1} of {totalSteps}
        </div>
        <div>Progress: {Math.round(stepProgress)}%</div>
      </div>

      {/* Validation Message */}
      {stepValidationMessage && (
        <div style={{ marginTop: "10px", color: "orange" }}>
          {stepValidationMessage}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ color: "red", padding: "10px", margin: "10px 0" }}>
          Error: {error}
        </div>
      )}

      {/* Step Content */}
      <div
        style={{
          minHeight: "400px",
          padding: "20px",
          border: "1px solid #ccc",
        }}
      >
        {loading ? <p>Loading...</p> : renderCurrentStep()}
      </div>

      {/* ✅ FIXED: Navigation with proper step logic */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "20px",
        }}
      >
        <button
          onClick={previousStep}
          disabled={currentStepIndex === 0}
          style={{ padding: "10px 20px" }}
        >
          Previous
        </button>

        {bookingStep === "confirm" ? (
          <button
            onClick={handleSubmit}
            disabled={!canProceed || loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "green",
              color: "white",
            }}
          >
            {loading ? "Booking..." : "Confirm Appointment"}
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!canProceed}
            style={{
              padding: "10px 20px",
              backgroundColor: canProceed ? "blue" : "gray",
              color: "white",
            }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;
