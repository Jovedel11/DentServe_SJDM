import React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Shield,
  Hospital,
  Users,
  CalendarClock,
  CalendarCheck,
  Info,
} from "lucide-react";

import { Card, CardContent } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Alert } from "@/core/components/ui/alert";
import { Progress } from "@/core/components/ui/progress";
import Toast from "@/core/components/ui/toast";
import ProgressIndicator from "@/core/components/ui/process-indicator";

import ClinicSelectionStep from "../components/booking/clinic-selection-step";
import ServicesSelectionStep from "../components/booking/service-selection-step";
import DoctorSelectionStep from "../components/booking/doctor-selection-step";
import DateTimeSelectionStep from "../components/booking/date-time-selection-step";
import ConfirmationStep from "../components/booking/confirmation-step";
import TreatmentLinkPrompt from "@/app/shared/components/treatment-link-prompt";

import { useBookingFlow } from "../hook/useBookingFlow";
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
    // Step & Progress
    bookingStep,
    bookingData,
    currentStepIndex,
    totalSteps,
    stepProgress,
    canProceed,

    // Loading States
    loading,
    error,
    checkingAvailability,
    validationLoading,

    // Data
    clinics,
    clinicsLoading,
    doctors,
    services,
    availableTimes,

    // UI States
    toastMessage,
    bookingSuccess,

    // Validation States
    appointmentLimitCheck,
    bookingLimitsInfo,
    sameDayConflict,
    sameDayConflictDetails,
    patientReliability,

    // Treatment Plan States
    ongoingTreatments,
    showTreatmentLinkPrompt,
    hasOngoingTreatments,
    isLinkedToTreatment,
    selectedTreatment,
    isConsultationOnly,
    bookingType,

    consultationCheckResult,
    skipConsultation,
    setSkipConsultation,

    // Auth
    isPatient,
    profile,

    // Actions
    selectTreatmentPlan,
    clearTreatmentPlanLink,
    dismissTreatmentPrompt,
    closeToast,
    handleClinicSelect,
    handleServiceToggle,
    handleDoctorSelect,
    handleDateSelect,
    handleSubmit,
    nextStep,
    previousStep,
    updateBookingData,
    getCancellationInfo,
    handleClearDate,
  } = useBookingFlow();

  // ✅ Get current critical blocker (only shows blockers that prevent booking)
  const getCriticalBlocker = () => {
    // Same-day conflict - blocks datetime step onwards
    if (
      bookingStep !== "clinic" &&
      bookingStep !== "services" &&
      sameDayConflict
    ) {
      return {
        type: "destructive",
        title: "Existing Appointment on Selected Date",
        message: sameDayConflictDetails
          ? `You have a ${sameDayConflictDetails.status} appointment at ${sameDayConflictDetails.clinicName} on this date.`
          : "You already have an appointment scheduled for this date.",
      };
    }

    // Appointment limit exceeded - blocks confirmation
    if (
      bookingStep === "confirm" &&
      appointmentLimitCheck &&
      !appointmentLimitCheck.allowed
    ) {
      return {
        type: "destructive",
        title: "Booking Limit Reached",
        message: appointmentLimitCheck.message,
      };
    }

    return null;
  };

  const currentStep = BOOKING_STEPS[currentStepIndex] || BOOKING_STEPS[0];
  const criticalBlocker = getCriticalBlocker();

  // ✅ Access control
  if (!isPatient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              Only patients can book appointments.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ Success state
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="text-center p-8">
            <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-success" />
            <h1 className="text-2xl font-bold mb-4">
              {isConsultationOnly
                ? "Consultation Booked!"
                : "Appointment Booked!"}
            </h1>

            <div className="space-y-4 text-left">
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">
                      {bookingType?.replace(/_/g, " ")}
                    </span>
                  </div>
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

              {isLinkedToTreatment && selectedTreatment && (
                <Alert className="bg-purple-50 border-purple-200">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <div className="text-sm">
                    <strong>Linked to Treatment:</strong>{" "}
                    {selectedTreatment.treatment_name}
                    <br />
                    <span className="text-xs">
                      Visit #{selectedTreatment.visits_completed + 1}
                    </span>
                  </div>
                </Alert>
              )}

              {isConsultationOnly && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <div className="text-sm">
                    <strong>Consultation Only:</strong> Your doctor will assess
                    your needs and recommend treatments during your visit.
                  </div>
                </Alert>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Redirecting to your appointments...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={closeToast}
        />
      )}

      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Calendar className="w-10 h-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Book Appointment</h1>
                <p className="text-muted-foreground">
                  Step {currentStepIndex + 1} of {totalSteps}:{" "}
                  {currentStep.label}
                </p>
              </div>
            </div>
            <Progress value={stepProgress} className="w-32" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <ProgressIndicator
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            progress={stepProgress}
            steps={BOOKING_STEPS.map((s) => s.label)}
          />
        </div>

        {/* Alerts - Context-Aware Warnings */}
        <div className="space-y-4 mb-8">
          {/* CRITICAL BLOCKER - Always shown if exists */}
          {criticalBlocker && (
            <Alert variant={criticalBlocker.type}>
              <XCircle className="h-5 w-5" />
              <div className="flex-1">
                <strong>{criticalBlocker.title}</strong>
                <p className="text-sm mt-1">{criticalBlocker.message}</p>
                {sameDayConflict && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      (window.location.href = "/patient/appointments/upcoming")
                    }
                  >
                    View My Appointments
                  </Button>
                )}
              </div>
            </Alert>
          )}

          {/* General Errors */}
          {error && !criticalBlocker && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <strong>Error</strong>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </Alert>
          )}

          {/* High Risk Warning - Only on confirm step */}
          {bookingStep === "confirm" &&
            patientReliability?.risk_level === "high_risk" && (
              <Alert variant="warning">
                <Shield className="h-4 w-4" />
                <div>
                  <strong>Attendance Reminder</strong>
                  <p className="text-sm mt-1">
                    Please ensure you attend this appointment. Multiple no-shows
                    may restrict future bookings.
                  </p>
                </div>
              </Alert>
            )}

          {/* Treatment Link Prompt - Only on services step if treatments exist */}
          {bookingStep === "services" &&
            showTreatmentLinkPrompt &&
            hasOngoingTreatments &&
            ongoingTreatments.length > 0 && (
              <TreatmentLinkPrompt
                treatments={ongoingTreatments}
                selectedTreatmentId={bookingData.treatmentPlanId}
                onSelectTreatment={selectTreatmentPlan}
                onDismiss={dismissTreatmentPrompt}
              />
            )}

          {/* Treatment Linked Badge - After services step */}
          {isLinkedToTreatment &&
            selectedTreatment &&
            bookingStep !== "clinic" && (
              <Alert className="bg-purple-50 border-purple-200">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900">
                    Treatment Plan Linked
                  </h4>
                  <p className="text-sm text-purple-800 mt-1">
                    Linked to:{" "}
                    <strong>{selectedTreatment.treatment_name}</strong>
                    <span className="text-xs block mt-1">
                      Visit #{selectedTreatment.visits_completed + 1} of{" "}
                      {selectedTreatment.total_visits_planned || "?"}
                    </span>
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearTreatmentPlanLink}
                    className="mt-2 text-purple-700"
                  >
                    Unlink
                  </Button>
                </div>
              </Alert>
            )}

          {/* Consultation-Only Badge - Doctor step onwards */}
          {isConsultationOnly &&
            (bookingStep === "doctor" ||
              bookingStep === "datetime" ||
              bookingStep === "confirm") && (
              <Alert>
                <Info className="h-4 w-4" />
                <div>
                  <strong>Consultation Only Booking</strong>
                  <p className="text-sm mt-1">
                    You're booking a consultation without services. The doctor
                    will assess your needs and recommend treatments.
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
                isConsultationOnly={isConsultationOnly}
              />
            )}

            {bookingStep === "doctor" && (
              <DoctorSelectionStep
                doctors={doctors}
                selectedDoctor={bookingData.doctor}
                onDoctorSelect={handleDoctorSelect}
                isConsultationOnly={isConsultationOnly}
                selectedServices={bookingData.services}
                consultationCheckResult={consultationCheckResult}
                skipConsultation={skipConsultation}
                setSkipConsultation={setSkipConsultation}
              />
            )}

            {bookingStep === "datetime" && (
              <DateTimeSelectionStep
                bookingData={bookingData}
                availableTimes={availableTimes}
                checkingAvailability={checkingAvailability}
                onUpdateBookingData={updateBookingData}
                onDateSelect={handleDateSelect}
                onClearDate={handleClearDate} // ✅ ADD THIS
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
                patientReliability={patientReliability}
                cancellationInfo={getCancellationInfo()}
                bookingLimitsInfo={bookingLimitsInfo}
                selectedTreatment={selectedTreatment}
                consultationCheckResult={consultationCheckResult}
                skipConsultation={skipConsultation}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStepIndex === 0 || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {bookingStep === "confirm" ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed || loading || !!criticalBlocker}
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed || !!criticalBlocker || validationLoading}
              size="lg"
            >
              {validationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
