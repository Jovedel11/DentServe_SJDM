import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentBooking } from "@/core/hooks/useAppointmentBooking";
import { supabase } from "@/lib/supabaseClient"

const BookAppointment = () => {
  const { profile, isPatient } = useAuth();

  // ✅ USING REAL VALIDATED HOOKS
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
    checkSlotAvailability,
    nextStep,
    previousStep,
    validateStep,
    canProceed,
    isComplete,
    currentStepIndex,
    totalSteps,
    stepProgress,
  } = useAppointmentBooking();

  const [clinics, setClinics] = useState([]);
  const [clinicsLoading, setCliicsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // ✅ REAL CLINIC DISCOVERY
  useEffect(() => {
    const fetchClinics = async () => {
      if (!isPatient()) return;

      setCliicsLoading(true);
      try {
        // Using find_nearest_clinics function through supabase
        const { data, error } = await supabase.rpc("find_nearest_clinics", {
          user_location: null, // Will get all clinics
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
  }, [isPatient]);

  // ✅ REAL DOCTORS FETCH
  useEffect(() => {
    const fetchDoctors = async () => {
      if (bookingData.clinic?.id) {
        const result = await getAvailableDoctors(bookingData.clinic.id);
        if (result.success) {
          setDoctors(result.doctors);
        }
      } else {
        setDoctors([]);
      }
    };

    fetchDoctors();
  }, [bookingData.clinic?.id, getAvailableDoctors]);

  // ✅ REAL SERVICES FETCH
  useEffect(() => {
    const fetchServices = async () => {
      if (bookingData.clinic?.id) {
        const result = await getServices(bookingData.clinic.id);
        if (result.success) {
          setServices(result.services);
        }
      } else {
        setServices([]);
      }
    };

    fetchServices();
  }, [bookingData.clinic?.id, getServices]);

  // ✅ REAL AVAILABILITY CHECK
  useEffect(() => {
    const checkAvailableTimes = async () => {
      if (
        !bookingData.doctor?.id ||
        !bookingData.date ||
        bookingData.services.length === 0
      ) {
        setAvailableTimes([]);
        return;
      }

      setCheckingAvailability(true);
      const allTimes = generateTimeSlots();
      const availableSlots = [];

      for (const time of allTimes) {
        const result = await checkSlotAvailability(
          bookingData.doctor.id,
          bookingData.date,
          time,
          bookingData.services
        );

        if (result.available) {
          availableSlots.push(time);
        }
      }

      setAvailableTimes(availableSlots);
      setCheckingAvailability(false);
    };

    checkAvailableTimes();
  }, [
    bookingData.doctor?.id,
    bookingData.date,
    bookingData.services,
    checkSlotAvailability,
  ]);

  const generateTimeSlots = useCallback(() => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minutes of [0, 30]) {
        const time = `${hour.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

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
      let newServices;

      if (currentServices.includes(serviceId)) {
        newServices = currentServices.filter((id) => id !== serviceId);
      } else {
        if (currentServices.length >= 3) return;
        newServices = [...currentServices, serviceId];
      }

      updateBookingData({ services: newServices });
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

  const getTotalDuration = () => {
    const selectedServices = services.filter((service) =>
      bookingData.services.includes(service.id)
    );
    return selectedServices.reduce(
      (total, service) => total + (service.duration_minutes || 0),
      0
    );
  };

  const getTotalCost = () => {
    const selectedServices = services.filter((service) =>
      bookingData.services.includes(service.id)
    );
    return selectedServices.reduce(
      (total, service) => total + (parseFloat(service.max_price) || 0),
      0
    );
  };

  // ✅ RENDER FUNCTIONS - NO STYLING
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
              <p>Total Duration: {getTotalDuration()} minutes</p>
              <p>Estimated Total Cost: ₱{getTotalCost()}</p>
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
              {doctor.certifications && (
                <p>Certifications: {JSON.stringify(doctor.certifications)}</p>
              )}
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

  const renderConfirmStep = () => {
    const selectedServices = services.filter((service) =>
      bookingData.services.includes(service.id)
    );

    return (
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
            payment for your appointment. The clinic has been notified of your
            booking.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "30px",
          }}
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
              <strong>Estimated Total: ₱{getTotalCost()}</strong>
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
              <strong>Duration:</strong> {getTotalDuration()} minutes
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

            <p style={{ fontSize: "14px", color: "#666", marginTop: "15px" }}>
              Your contact information is from your profile. Update it in
              settings if needed.
            </p>
          </div>
        </div>
      </div>
    );
  };

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

      {/* Navigation */}
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

        {isComplete ? (
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

      {/* Debug Info */}
      <details style={{ marginTop: "20px" }}>
        <summary>Debug Info</summary>
        <pre>{JSON.stringify(bookingData, null, 2)}</pre>
        <p>Current Step: {bookingStep}</p>
        <p>Can proceed: {canProceed ? "Yes" : "No"}</p>
        <p>Is complete: {isComplete ? "Yes" : "No"}</p>
        <p>Selected services: {bookingData.services?.length || 0}</p>
        <p>Total duration: {getTotalDuration()} minutes</p>
        <p>Total cost: ₱{getTotalCost()}</p>
      </details>
    </div>
  );
};

export default BookAppointment;
