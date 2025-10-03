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
  Hospital,
  Users,
  CalendarClock,
  CalendarCheck,
  XCircle,
  Activity,
  Badge,
  TrendingUp,
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
import { cn } from "@/lib/utils";
import { FaTeeth } from "react-icons/fa";

const BOOKING_STEPS = [
  { key: "clinic", label: "Clinic", icon: Hospital },
  { key: "services", label: "Services", icon: FaTeeth },
  { key: "doctor", label: "Doctor", icon: Users },
  { key: "datetime", label: "Date & Time", icon: CalendarClock },
  { key: "confirm", label: "Confirm", icon: CalendarCheck },
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

    // ✅ NEW: Enhanced validation state
    appointmentLimitCheck,
    bookingLimitsInfo,
    sameDayConflictDetails,
    sameDayConflict,
    crossClinicWarnings,
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

  // ✅ NEW: Get same-day conflict details
  const getSameDayConflictWarning = () => {
    if (!sameDayConflict) return null;

    const conflictDate = bookingData.date
      ? new Date(bookingData.date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : "this date";

    return {
      type: "destructive",
      title: "Cannot Book: Existing Appointment",
      message: `You already have an appointment scheduled for ${conflictDate} at ${sameDayConflict.time}. To book another appointment on the same day, you must first cancel your existing appointment.`,
      action: "go_to_appointments",
    };
  };

  // ✅ Simplified: Only show critical blocking issues
  const getCriticalBlocker = () => {
    // Same-day conflict is the highest priority blocker
    if (sameDayConflict) {
      return getSameDayConflictWarning();
    }

    if (!appointmentLimitCheck) return null;

    // Daily limit exceeded
    if (
      !appointmentLimitCheck.allowed &&
      appointmentLimitCheck.reason === "daily_limit_exceeded"
    ) {
      return {
        type: "destructive",
        title: "Daily Appointment Limit Reached",
        message: appointmentLimitCheck.message,
      };
    }

    // Future appointments limit
    if (
      !appointmentLimitCheck.allowed &&
      appointmentLimitCheck.reason === "future_appointments_limit_exceeded"
    ) {
      return {
        type: "warning",
        title: "Future Appointments Limit",
        message: appointmentLimitCheck.message,
      };
    }

    // Other blocking reasons
    if (!appointmentLimitCheck.allowed) {
      return {
        type: "destructive",
        title: "Booking Not Allowed",
        message: appointmentLimitCheck.message,
      };
    }

    return null;
  };

  const getBookingStatusInfo = () => {
    if (!bookingLimitsInfo) return null;

    const warnings = [];

    // Check if approaching total pending limit
    if (
      bookingLimitsInfo.totalPending >=
      bookingLimitsInfo.maxTotalPending - 1
    ) {
      warnings.push({
        type: "warning",
        title: "Approaching Pending Limit",
        message: `You have ${bookingLimitsInfo.totalPending} of ${
          bookingLimitsInfo.maxTotalPending
        } allowed pending appointments. ${
          bookingLimitsInfo.totalRemaining > 0
            ? `You have ${bookingLimitsInfo.totalRemaining} slot(s) remaining.`
            : "Please wait for confirmations before booking more."
        }`,
      });
    }

    // Check if approaching clinic-specific limit
    if (
      bookingLimitsInfo.clinicPending >=
      bookingLimitsInfo.maxClinicPending - 1
    ) {
      warnings.push({
        type: "warning",
        title: "Approaching Clinic Limit",
        message: `You have ${bookingLimitsInfo.clinicPending} of ${bookingLimitsInfo.maxClinicPending} allowed pending appointments at this clinic.`,
      });
    }

    return warnings;
  };

  const getBookingStatus = () => {
    if (!bookingLimitsInfo) return null;

    return {
      totalSlots: `${bookingLimitsInfo.totalPending}/${bookingLimitsInfo.maxTotalPending}`,
      clinicSlots: `${bookingLimitsInfo.clinicPending}/${bookingLimitsInfo.maxClinicPending}`,
      totalRemaining: bookingLimitsInfo.totalRemaining,
      clinicRemaining: bookingLimitsInfo.clinicRemaining,
    };
  };

  // ✅ Simplified: Only show essential attendance reminder on confirmation step
  const getAttendanceReminder = () => {
    if (
      bookingStep === "confirm" &&
      patientReliability?.risk_level === "high_risk"
    ) {
      return {
        type: "warning",
        message:
          "Please ensure you attend this appointment. Multiple no-shows may restrict future bookings.",
      };
    }
    return null;
  };

  const currentStep = BOOKING_STEPS[currentStepIndex] || BOOKING_STEPS[0];
  const criticalBlocker = getCriticalBlocker();
  const attendanceReminder = getAttendanceReminder();
  const bookingStatus = getBookingStatus();
  const bookingWarnings = getBookingStatusInfo();

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
                      {bookingData.doctor?.name}
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

              {/* ✅ Only show if symptoms were provided */}
              {bookingData.symptoms && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <div className="text-sm">
                    Your notes have been shared with the clinic staff.
                  </div>
                </Alert>
              )}

              {/* ✅ Only show attendance reminder if high risk */}
              {patientReliability?.risk_level === "high_risk" && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="text-sm">
                    <strong>Attendance Reminder:</strong>
                    <br />
                    Please attend this appointment or cancel with adequate
                    notice.
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

        {/* Alerts */}
        <div className="space-y-4 mb-8">
          {/* 1. CRITICAL: Same-Day Conflict */}
          {criticalBlocker?.action === "go_to_appointments" && (
            <Alert variant="destructive" className="border-2">
              <XCircle className="h-5 w-5" />
              <div className="flex-1">
                <strong className="text-lg">{criticalBlocker.title}</strong>
                <p className="text-sm mt-2">{criticalBlocker.message}</p>

                {/* ✅ Enhanced conflict details */}
                {sameDayConflictDetails && (
                  <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm font-semibold mb-2">
                      📋 Existing Appointment Details:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>
                        • <strong>Clinic:</strong>{" "}
                        {sameDayConflictDetails.clinicName}
                      </li>
                      <li>
                        • <strong>Doctor:</strong>{" "}
                        {sameDayConflictDetails.doctorName}
                      </li>
                      <li>
                        • <strong>Time:</strong> {sameDayConflictDetails.time}
                      </li>
                      <li>
                        • <strong>Status:</strong>{" "}
                        {sameDayConflictDetails.status}
                      </li>
                    </ul>
                    <p className="text-xs mt-2 italic">
                      {sameDayConflictDetails.status === "confirmed"
                        ? "⚠️ This appointment is confirmed. If it's part of ongoing treatment, consult your dentist before canceling."
                        : "✓ This appointment is pending and can be canceled if needed."}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (window.location.href = "/patient/appointments/upcoming")
                    }
                  >
                    View My Appointments
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateBookingData({ date: null, time: null })
                    }
                  >
                    Choose Different Date
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {/* Other Critical Blockers */}
          {criticalBlocker &&
            criticalBlocker.action !== "go_to_appointments" && (
              <Alert variant={criticalBlocker.type}>
                <AlertCircle className="h-4 w-4" />
                <div>
                  <strong>{criticalBlocker.title}</strong>
                  <p className="text-sm mt-1">{criticalBlocker.message}</p>
                </div>
              </Alert>
            )}

          {!criticalBlocker &&
            bookingWarnings &&
            bookingWarnings.length > 0 && (
              <>
                {bookingWarnings.map((warning, idx) => (
                  <Alert key={idx} variant={warning.type}>
                    <TrendingUp className="h-4 w-4" />
                    <div>
                      <strong>{warning.title}</strong>
                      <p className="text-sm mt-1">{warning.message}</p>
                    </div>
                  </Alert>
                ))}
              </>
            )}

          {/* General Error */}
          {error && !criticalBlocker && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <strong>Error</strong>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </Alert>
          )}
          {/* Attendance Reminder (only on confirmation step) */}
          {attendanceReminder && !criticalBlocker && (
            <Alert variant="warning">
              <Shield className="h-4 w-4" />
              <div>
                <strong>Attendance Reminder</strong>
                <p className="text-sm mt-1">{attendanceReminder.message}</p>
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
                  Validating appointment availability...
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
                sameDayConflict={sameDayConflict}
                sameDayConflictDetails={sameDayConflictDetails}
                bookingLimitsInfo={bookingLimitsInfo}
              />
            )}

            {bookingStep === "confirm" && (
              <ConfirmationStep
                bookingData={bookingData}
                services={services}
                profile={profile}
                appointmentLimitCheck={appointmentLimitCheck}
                crossClinicWarnings={crossClinicWarnings}
                patientReliability={patientReliability}
                cancellationInfo={getCancellationInfo()}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
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
                  !!sameDayConflict ||
                  !appointmentLimitCheck?.allowed ||
                  validationLoading ||
                  !!criticalBlocker
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
                disabled={!canProceed || validationLoading || !!sameDayConflict}
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
