import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  Sparkles,
  X,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";

import { Card, CardContent } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Progress } from "@/core/components/ui/progress";
import { Badge } from "@/core/components/ui/badge";
import Toast from "@/core/components/ui/toast";
import ProgressIndicator from "@/core/components/ui/process-indicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";

import ClinicSelectionStep from "../components/booking/clinic-selection-step";
import ServicesSelectionStep from "../components/booking/service-selection-step";
import DoctorSelectionStep from "../components/booking/doctor-selection-step";
import DateTimeSelectionStep from "../components/booking/date-time-selection-step";
import ConfirmationStep from "../components/booking/confirmation-step";
import TreatmentLinkModal from "@/app/patient/components/booking/treatment-link-modal";
import { useTreatmentPlans } from "@/hooks/appointment/useTreatmentPlans";

import { useBookingFlow } from "../hook/useBookingFlow";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { FaTeeth } from "react-icons/fa";
import { cn } from "@/lib/utils";

const BOOKING_STEPS = [
  { key: "clinic", label: "Clinic", icon: Hospital, color: "text-blue-600" },
  {
    key: "services",
    label: "Services",
    icon: FaTeeth,
    color: "text-purple-600",
  },
  { key: "doctor", label: "Doctor", icon: Users, color: "text-green-600" },
  {
    key: "datetime",
    label: "Date & Time",
    icon: CalendarClock,
    color: "text-orange-600",
  },
  {
    key: "confirm",
    label: "Confirm",
    icon: CalendarCheck,
    color: "text-pink-600",
  },
];

const BookAppointment = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);
  const [blockerDetails, setBlockerDetails] = useState(null);

  const { followUpBooking, startFollowUpBooking } = useTreatmentPlans();
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
    bookingError,

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
    clearBookingError,
    handleTreatmentPlanSelect,
  } = useBookingFlow();

  // Auto-scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bookingStep]);

  // Check for critical blockers
  useEffect(() => {
    const checkBlockers = () => {
      // Same-day conflict blocker
      if (
        !bookingError &&
        bookingStep !== "clinic" &&
        bookingStep !== "services" &&
        sameDayConflict
      ) {
        setBlockerDetails({
          type: "conflict",
          title: "Existing Appointment Conflict",
          message: sameDayConflictDetails
            ? `You have a ${sameDayConflictDetails.status} appointment at ${sameDayConflictDetails.clinicName} on this date.`
            : "You already have an appointment scheduled for this date.",
          icon: XCircle,
          action: {
            label: "View My Appointments",
            onClick: () =>
              (window.location.href = "/patient/appointments/upcoming"),
          },
        });
        setShowBlockerDialog(true);
        return;
      }

      // Limit reached blocker
      if (
        !bookingError &&
        bookingStep === "confirm" &&
        appointmentLimitCheck &&
        !appointmentLimitCheck.allowed
      ) {
        setBlockerDetails({
          type: "limit",
          title: "Booking Limit Reached",
          message: appointmentLimitCheck.message,
          icon: AlertTriangle,
        });
        setShowBlockerDialog(true);
        return;
      }

      // No blocker
      setShowBlockerDialog(false);
      setBlockerDetails(null);
    };

    checkBlockers();
  }, [
    bookingStep,
    sameDayConflict,
    sameDayConflictDetails,
    appointmentLimitCheck,
    bookingError,
  ]);

  const currentStep = BOOKING_STEPS[currentStepIndex] || BOOKING_STEPS[0];
  const StepIcon = currentStep.icon;

  // Access control
  if (!isPatient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto shadow-xl">
          <CardContent className="text-center p-6 sm:p-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-destructive" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              Access Denied
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              Only patients can book appointments. Please log in with a patient
              account.
            </p>
            <Button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-lg mx-auto shadow-2xl animate-in zoom-in-95 fade-in-0 duration-500">
          <CardContent className="text-center p-6 sm:p-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-success/10 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-700">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-success animate-in zoom-in-50 duration-1000" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {isConsultationOnly
                ? "Consultation Booked Successfully!"
                : "Appointment Booked Successfully!"}
            </h1>

            <div className="space-y-4 text-left animate-in slide-in-from-bottom-4 fade-in-0 duration-700">
              <div className="bg-gradient-to-br from-card to-muted/50 border rounded-xl p-4 sm:p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Appointment Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {bookingType?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Clinic:</span>
                    <span className="font-medium text-right">
                      {bookingData.clinic?.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Doctor:</span>
                    <span className="font-medium text-right">
                      {bookingData.doctor?.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-right">
                      {new Date(bookingData.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{bookingData.time}</span>
                  </div>
                </div>
              </div>

              {isLinkedToTreatment && selectedTreatment && (
                <div className="bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <strong className="text-purple-900 dark:text-purple-100">
                        Linked to Treatment:
                      </strong>{" "}
                      {selectedTreatment.treatment_name}
                      <br />
                      <span className="text-xs text-purple-700 dark:text-purple-300">
                        Visit #{selectedTreatment.visits_completed + 1}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isConsultationOnly && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                      <strong>Consultation Only:</strong> Your doctor will
                      assess your needs and recommend treatments during your
                      visit.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span>Redirecting to your appointments...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={closeToast}
        />
      )}

      {/* Error/Blocker Dialog */}
      <AlertDialog
        open={showBlockerDialog || Boolean(bookingError)}
        onOpenChange={(open) => {
          if (!open) {
            setShowBlockerDialog(false);
            clearBookingError();
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {(blockerDetails?.icon || bookingError) && (
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    bookingError?.type === "limit_reached"
                      ? "bg-amber-100 dark:bg-amber-950"
                      : bookingError?.type === "same_day_conflict"
                      ? "bg-orange-100 dark:bg-orange-950"
                      : bookingError?.type === "clinic_closed"
                      ? "bg-blue-100 dark:bg-blue-950"
                      : bookingError?.type === "before_opening" ||
                        bookingError?.type === "after_closing"
                      ? "bg-yellow-100 dark:bg-yellow-950"
                      : bookingError?.type === "doctor_unavailable" ||
                        bookingError?.type === "doctor_not_at_clinic"
                      ? "bg-red-100 dark:bg-red-950"
                      : "bg-destructive/10"
                  )}
                >
                  {blockerDetails?.icon ? (
                    <blockerDetails.icon
                      className={cn(
                        "w-6 h-6",
                        bookingError?.type === "limit_reached"
                          ? "text-amber-600"
                          : bookingError?.type === "same_day_conflict"
                          ? "text-orange-600"
                          : "text-destructive"
                      )}
                    />
                  ) : (
                    <AlertTriangle
                      className={cn(
                        "w-6 h-6",
                        bookingError?.type === "limit_reached"
                          ? "text-amber-600"
                          : bookingError?.type === "same_day_conflict"
                          ? "text-orange-600"
                          : bookingError?.type === "clinic_closed"
                          ? "text-blue-600"
                          : bookingError?.type === "before_opening" ||
                            bookingError?.type === "after_closing"
                          ? "text-yellow-600"
                          : bookingError?.type === "doctor_unavailable" ||
                            bookingError?.type === "doctor_not_at_clinic"
                          ? "text-red-600"
                          : "text-destructive"
                      )}
                    />
                  )}
                </div>
              )}
              <AlertDialogTitle className="text-lg">
                {bookingError?.title || blockerDetails?.title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              {bookingError?.message || blockerDetails?.message}
            </AlertDialogDescription>

            {(bookingError?.suggestion || blockerDetails?.action) && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {bookingError?.suggestion || "Action available"}
                </p>
              </div>
            )}

            {/* Conflict details */}
            {bookingError?.type === "same_day_conflict" &&
              bookingError?.data && (
                <div className="mt-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">
                    Existing Appointment:
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2">
                      <Hospital className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Clinic:</span>
                      <strong>{bookingError.data.clinicName}</strong>
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Doctor:</span>
                      {bookingError.data.doctorName}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Time:</span>
                      {bookingError.data.time}
                    </p>
                  </div>
                </div>
              )}

            {/* Clinic hours info */}
            {(bookingError?.type === "clinic_closed" ||
              bookingError?.type === "before_opening" ||
              bookingError?.type === "after_closing") &&
              bookingError?.data && (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Clinic Hours:
                  </h4>
                  <div className="text-sm space-y-1">
                    {bookingError.data.clinic_opens_at && (
                      <p>
                        Opens:{" "}
                        <strong>{bookingError.data.clinic_opens_at}</strong>
                      </p>
                    )}
                    {bookingError.data.clinic_closes_at && (
                      <p>
                        Closes:{" "}
                        <strong>{bookingError.data.clinic_closes_at}</strong>
                      </p>
                    )}
                    {bookingError.data.day && (
                      <p className="text-muted-foreground capitalize">
                        Day: {bookingError.data.day}
                      </p>
                    )}
                  </div>
                </div>
              )}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {(blockerDetails?.action ||
              bookingError?.type === "same_day_conflict") && (
              <AlertDialogAction
                onClick={() => {
                  if (blockerDetails?.action?.onClick) {
                    blockerDetails.action.onClick();
                  } else if (bookingError?.type === "same_day_conflict") {
                    window.location.href = "/patient/appointments/upcoming";
                  }
                }}
                className="w-full sm:w-auto"
              >
                {blockerDetails?.action?.label || "View Appointments"}
              </AlertDialogAction>
            )}
            <AlertDialogCancel className="w-full sm:w-auto">
              {bookingError?.type === "same_day_conflict"
                ? "Choose Another Date"
                : bookingError?.type === "clinic_closed"
                ? "Choose Another Day"
                : bookingError?.type === "before_opening" ||
                  bookingError?.type === "after_closing"
                ? "Choose Another Time"
                : bookingError?.type === "doctor_unavailable" ||
                  bookingError?.type === "doctor_not_at_clinic"
                ? "Choose Another Doctor"
                : "Close"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                  "bg-gradient-to-br from-primary/20 to-purple-500/20",
                  currentStep.color
                )}
              >
                <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Book Appointment
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Step {currentStepIndex + 1} of {totalSteps}:{" "}
                  {currentStep.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isMobile && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(stepProgress)}%
                </Badge>
              )}
              <Progress value={stepProgress} className="w-full sm:w-32 h-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Progress Indicator */}
        <div className="mb-6 sm:mb-8">
          <ProgressIndicator
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            progress={stepProgress}
            steps={BOOKING_STEPS.map((s) => s.label)}
          />
        </div>

        {/* Contextual Alerts */}
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {/* High Risk Warning */}
          {bookingStep === "confirm" &&
            patientReliability?.risk_level === "high_risk" && (
              <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="text-sm sm:text-base text-amber-900 dark:text-amber-100">
                      Attendance Reminder
                    </strong>
                    <p className="text-xs sm:text-sm mt-1 text-amber-800 dark:text-amber-200">
                      Please ensure you attend this appointment. Multiple
                      no-shows may restrict future bookings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Treatment Linked Badge */}
          {isLinkedToTreatment &&
            selectedTreatment &&
            bookingStep !== "clinic" && (
              <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 animate-in slide-in-from-top-2 fade-in-50">
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm sm:text-base">
                      Treatment Plan Linked
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200 mt-1">
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
                      className="mt-2 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 h-8"
                    >
                      Unlink
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Consultation-Only Badge */}
          {isConsultationOnly &&
            (bookingStep === "doctor" ||
              bookingStep === "datetime" ||
              bookingStep === "confirm") && (
              <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 animate-in slide-in-from-top-2 fade-in-50">
                <CardContent className="p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm sm:text-base text-blue-900 dark:text-blue-100">
                      Consultation Only Booking
                    </strong>
                    <p className="text-xs sm:text-sm mt-1 text-blue-800 dark:text-blue-200">
                      You're booking a consultation without services. The doctor
                      will assess your needs and recommend treatments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Step Content */}
        <Card className="mb-6 sm:mb-8 shadow-lg border-2 transition-all duration-300 hover:shadow-xl">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              {bookingStep === "clinic" && (
                <ClinicSelectionStep
                  clinics={clinics}
                  clinicsLoading={clinicsLoading}
                  selectedClinic={bookingData.clinic}
                  onClinicSelect={handleClinicSelect}
                  profile={profile} // ✅ Pass profile for same-day check
                />
              )}

              {bookingStep === "services" && (
                <ServicesSelectionStep
                  services={services}
                  selectedServices={bookingData.services}
                  onServiceToggle={handleServiceToggle}
                  isConsultationOnly={isConsultationOnly}
                  ongoingTreatments={ongoingTreatments}
                  onTreatmentSelect={handleTreatmentPlanSelect}
                  selectedTreatment={selectedTreatment}
                />
              )}

              <TreatmentLinkModal
                show={showTreatmentLinkPrompt}
                treatments={ongoingTreatments}
                onSelectTreatment={async (treatmentId) => {
                  // Option A: Full Pre-fill Mode - Navigate to follow-up booking page
                  navigate(
                    `/patient/appointments/book-follow-up/${treatmentId}`
                  );
                }}
                onDismiss={dismissTreatmentPrompt}
                loading={followUpBooking?.loading || false}
              />

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
                  selectedTreatment={selectedTreatment} // ✅ Pass treatment
                />
              )}

              {bookingStep === "datetime" && (
                <DateTimeSelectionStep
                  bookingData={bookingData}
                  availableTimes={availableTimes}
                  checkingAvailability={checkingAvailability}
                  onUpdateBookingData={updateBookingData}
                  onDateSelect={handleDateSelect}
                  onClearDate={handleClearDate}
                  sameDayConflict={sameDayConflict}
                  sameDayConflictDetails={sameDayConflictDetails}
                  bookingLimitsInfo={bookingLimitsInfo}
                  appointmentLimitCheck={appointmentLimitCheck} // ✅ Pass limit check
                  selectedTreatment={selectedTreatment} // ✅ Pass treatment
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
                  isConsultationOnly={isConsultationOnly}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4 sticky bottom-4 sm:static bg-background sm:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none shadow-lg sm:shadow-none border sm:border-0">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStepIndex === 0 || loading}
            size={isMobile ? "default" : "lg"}
            className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {bookingStep === "confirm" ? (
            <Button
              onClick={handleSubmit}
              disabled={
                !canProceed ||
                loading ||
                showBlockerDialog ||
                Boolean(bookingError)
              }
              size={isMobile ? "default" : "lg"}
              className="w-full sm:w-auto min-h-[44px] touch-manipulation shadow-lg hover:shadow-xl transition-all duration-200"
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
              disabled={
                !canProceed ||
                showBlockerDialog ||
                validationLoading ||
                Boolean(bookingError)
              }
              size={isMobile ? "default" : "lg"}
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
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
