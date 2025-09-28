import React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
} from "lucide-react";

// UI Components
import Toast from "@/core/components/ui/toast";
import ProgressIndicator from "@/core/components/ui/process-indicator";
import Alert from "@/core/components/Alert";
import StepCard from "@/core/components/ui/step-card";

// Step Components
import ClinicSelectionStep from "../components/booking/clinic-selection-step";
import ServicesSelectionStep from "../components/booking/service-selection-step";
import DoctorSelectionStep from "../components/booking/doctor-selection-step";
import DateTimeSelectionStep from "../components/booking/date-time-selection-step";
import ConfirmationStep from "../components/booking/confirmation-step";

// Logic Hook
import { useBookingFlow } from "../hook/useBookingFlow";
import { Navigate } from "react-router-dom";

const BOOKING_STEPS = [
  "Clinic",
  "Services",
  "Doctor",
  "Date & Time",
  "Confirm",
];

const BookAppointment = () => {
  const {
    // Booking flow state
    bookingStep,
    bookingData,
    currentStepIndex,
    totalSteps,
    stepProgress,
    canProceed,
    loading,
    error,

    // Data
    clinics,
    clinicsLoading,
    doctors,
    services,

    // UI state
    toastMessage,
    bookingSuccess,

    // Enhanced validation state
    appointmentLimitInfo,
    crossClinicWarnings,
    bookingWarnings,
    validationLoading,

    // Auth
    isPatient,
    profile,

    // Handlers
    closeToast,
    handleClinicSelect,
    handleServiceToggle,
    handleDoctorSelect,
    handleDateSelect,
    handleSubmit,
    nextStep,
    previousStep,
    updateBookingData,

    // Other
    availableTimes,
    checkingAvailability,
  } = useBookingFlow();

  // Enhanced validation message
  const getStepValidationMessage = () => {
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
  };

  // Access control
  if (!isPatient) {
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

  // Success state
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
            {crossClinicWarnings.length > 0 && (
              <span className="block mt-2 text-sm text-info">
                Remember to inform your healthcare providers about your other
                appointments.
              </span>
            )}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-primary" />
            <Navigate to="patient/appointments/upcoming">
              Redirecting to your upcoming appointments...
            </Navigate>
          </div>
        </div>
      </div>
    );
  }

  const stepValidationMessage = getStepValidationMessage();

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Toast */}
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

        {/* Progress */}
        <ProgressIndicator
          currentStep={currentStepIndex}
          totalSteps={totalSteps}
          progress={stepProgress}
          steps={BOOKING_STEPS}
        />

        {/* Enhanced Alerts Section */}
        <div className="space-y-4 mb-8">
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

          {/* Booking Warnings */}
          {bookingWarnings.map((warning, index) => (
            <Alert
              key={index}
              type={warning.type}
              message={warning.message}
              icon={
                warning.type === "error" ? (
                  <AlertCircle className="w-5 h-5" />
                ) : warning.type === "warning" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )
              }
            />
          ))}

          {/* Validation Loading */}
          {validationLoading && (
            <Alert
              type="info"
              message="Checking appointment availability..."
              icon={
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-info border-t-transparent" />
              }
            />
          )}
        </div>

        {/* Step Content */}
        <StepCard>
          {bookingStep === "clinic" && (
            <ClinicSelectionStep
              clinics={clinics}
              clinicsLoading={clinicsLoading}
              selectedClinic={bookingData.clinic}
              onClinicSelect={handleClinicSelect}
            />
          )}

          {bookingStep === "services" && (
            <ServicesSelectionStep
              services={services}
              selectedServices={bookingData.services}
              onServiceToggle={handleServiceToggle}
            />
          )}

          {bookingStep === "doctor" && (
            <DoctorSelectionStep
              doctors={doctors}
              selectedDoctor={bookingData.doctor}
              onDoctorSelect={handleDoctorSelect}
            />
          )}

          {bookingStep === "datetime" && (
            <DateTimeSelectionStep
              bookingData={bookingData}
              availableTimes={availableTimes}
              checkingAvailability={checkingAvailability}
              onUpdateBookingData={updateBookingData}
              onDateSelect={handleDateSelect}
            />
          )}

          {bookingStep === "confirm" && (
            <ConfirmationStep
              bookingData={bookingData}
              services={services}
              profile={profile}
              appointmentLimitInfo={appointmentLimitInfo}
              crossClinicWarnings={crossClinicWarnings}
            />
          )}
        </StepCard>

        {/* Enhanced Navigation */}
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
              disabled={
                !canProceed || loading || !appointmentLimitInfo?.allowed
              }
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
