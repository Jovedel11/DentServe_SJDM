import React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Shield,
  Clock,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Alert } from "@/core/components/ui/alert";
import { Progress } from "@/core/components/ui/progress";
import Toast from "@/core/components/ui/toast";
import ProgressIndicator from "@/core/components/ui/process-indicator";

// Step Components
import ClinicSelectionStep from "../components/booking/clinic-selection-step";
import ServicesSelectionStep from "../components/booking/service-selection-step";
import DoctorSelectionStep from "../components/booking/doctor-selection-step";
import DateTimeSelectionStep from "../components/booking/date-time-selection-step";
import ConfirmationStep from "../components/booking/confirmation-step";

// Logic Hook
import { useBookingFlow } from "../hook/useBookingFlow";
import { Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const BOOKING_STEPS = [
  { key: "clinic", label: "Clinic", icon: "🏥" },
  { key: "services", label: "Services", icon: "🦷" },
  { key: "doctor", label: "Doctor", icon: "👨‍⚕️" },
  { key: "datetime", label: "Date & Time", icon: "📅" },
  { key: "confirm", label: "Confirm", icon: "✅" },
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
    patientReliability,

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
    getCancellationInfo,
  } = useBookingFlow();

  // Enhanced validation message
  const getStepValidationMessage = () => {
    switch (bookingStep) {
      case "clinic":
        return !bookingData.clinic
          ? "Please select a clinic to continue"
          : null;
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

  // Get current step info
  const currentStep = BOOKING_STEPS[currentStepIndex] || BOOKING_STEPS[0];
  const stepValidationMessage = getStepValidationMessage();
  const cancellationInfo = getCancellationInfo();

  // Access control
  if (!isPatient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto border-destructive/20">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-6">
              Only patients can book appointments. Please log in with a patient
              account.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg mx-auto border-success/20 bg-success/5">
          <CardContent className="text-center p-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center animate-fadeIn">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Appointment Booked Successfully!
            </h1>
            <div className="space-y-4 text-left">
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Appointment Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clinic:</span>
                    <span className="font-medium">
                      {bookingData.clinic?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doctor:</span>
                    <span className="font-medium">
                      Dr. {bookingData.doctor?.first_name}{" "}
                      {bookingData.doctor?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {new Date(bookingData.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{bookingData.time}</span>
                  </div>
                </div>
              </div>

              {bookingData.symptoms && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <div className="text-sm">
                    Your symptoms have been shared with the clinic staff for
                    better preparation.
                  </div>
                </Alert>
              )}

              {crossClinicWarnings.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <div className="text-sm">
                    <strong>Care Coordination Notice:</strong>
                    <br />
                    You have appointments at other clinics. Please inform your
                    healthcare providers for better care coordination.
                  </div>
                </Alert>
              )}

              {patientReliability?.risk_level &&
                patientReliability.risk_level !== "low_risk" && (
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <div className="text-sm">
                      <strong>Attendance Reminder:</strong>
                      <br />
                      Please ensure you attend this appointment or cancel with
                      adequate notice to maintain your booking privileges.
                    </div>
                  </Alert>
                )}
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-primary" />
              <span>Redirecting to your appointments...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={closeToast}
        />
      )}

      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Book Your Appointment
                </h1>
                <p className="text-muted-foreground">
                  Step {currentStepIndex + 1} of {totalSteps}:{" "}
                  {currentStep.label}
                </p>
              </div>
            </div>

            {/* Quick Progress */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {Math.round(stepProgress)}% Complete
              </div>
              <Progress value={stepProgress} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Enhanced Progress */}
        <div className="mb-8">
          <ProgressIndicator
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            progress={stepProgress}
            steps={BOOKING_STEPS.map((step) => step.label)}
          />
        </div>

        {/* System Status Alerts */}
        <div className="space-y-4 mb-8">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <strong>Booking Error</strong>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </Alert>
          )}

          {/* Validation Message */}
          {stepValidationMessage && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <strong>Required Selection</strong>
                <p className="text-sm mt-1">{stepValidationMessage}</p>
              </div>
            </Alert>
          )}

          {/* Validation Loading */}
          {validationLoading && (
            <Alert>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-info border-t-transparent" />
              <div>
                <strong>Checking Availability</strong>
                <p className="text-sm mt-1">
                  Validating appointment limits and availability...
                </p>
              </div>
            </Alert>
          )}

          {/* Booking Warnings */}
          {bookingWarnings.map((warning, index) => (
            <Alert
              key={index}
              variant={
                warning.type === "error"
                  ? "destructive"
                  : warning.type === "warning"
                  ? "warning"
                  : "default"
              }
            >
              {warning.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : warning.type === "warning" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <div>
                <strong>
                  {warning.type === "error"
                    ? "Booking Restriction"
                    : warning.type === "warning"
                    ? "Important Notice"
                    : "Information"}
                </strong>
                <p className="text-sm mt-1">{warning.message}</p>
              </div>
            </Alert>
          ))}

          {/* Patient Reliability Warning */}
          {patientReliability &&
            patientReliability.risk_level !== "low_risk" && (
              <Alert variant="warning">
                <Shield className="h-4 w-4" />
                <div>
                  <strong>Attendance Notice</strong>
                  <p className="text-sm mt-1">
                    {patientReliability.risk_level === "high_risk"
                      ? "Your appointment history shows several missed appointments. Continued no-shows may affect your booking privileges."
                      : "Please remember to attend your appointment or cancel with adequate notice."}
                  </p>
                  {patientReliability.statistics && (
                    <div className="text-xs mt-2 text-muted-foreground">
                      Completion rate:{" "}
                      {patientReliability.statistics.completion_rate}%
                    </div>
                  )}
                </div>
              </Alert>
            )}

          {/* Cancellation Policy Info */}
          {cancellationInfo && bookingStep === "confirm" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <div>
                <strong>Cancellation Policy</strong>
                <p className="text-sm mt-1">
                  You can cancel this appointment until{" "}
                  {cancellationInfo.cancellationDeadline.toLocaleString()}. (
                  {cancellationInfo.policyHours} hours notice required)
                </p>
              </div>
            </Alert>
          )}
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
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
                patientReliability={patientReliability}
                cancellationInfo={cancellationInfo}
              />
            )}
          </CardContent>
        </Card>

        {/* Enhanced Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-4">
            {/* Step indicator for mobile */}
            <div className="md:hidden text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>

            {bookingStep === "confirm" ? (
              <Button
                onClick={handleSubmit}
                disabled={
                  !canProceed ||
                  loading ||
                  !appointmentLimitInfo?.allowed ||
                  validationLoading
                }
                className="flex items-center gap-2 bg-success hover:bg-success/90"
                size="lg"
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
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed || validationLoading}
                className="flex items-center gap-2"
                size="lg"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
