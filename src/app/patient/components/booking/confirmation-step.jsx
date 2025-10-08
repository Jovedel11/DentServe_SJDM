import React, { useMemo } from "react";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  CreditCard,
  Check,
  AlertTriangle,
  Shield,
  Info,
  Repeat,
  TrendingUp,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ConfirmationStep = ({
  bookingData,
  services,
  profile,
  appointmentLimitCheck,
  patientReliability,
  cancellationInfo,
  bookingLimitsInfo,
  selectedTreatment,
  crossClinicWarnings,
  skipConsultation,
  consultationCheckResult,
  isConsultationOnly,
}) => {
  const isMobile = useIsMobile();

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const patientAge = calculateAge(profile?.profile?.date_of_birth);

  // Gender display
  const genderDisplay = {
    M: "Male",
    F: "Female",
    male: "Male",
    female: "Female",
    other: "Other",
    "Prefer not to say": "Prefer not to say",
  };

  const consultationFee =
    skipConsultation && consultationCheckResult?.canSkipConsultation
      ? 0
      : bookingData.doctor?.consultation_fee || 0;

  // Calculate totals and treatment plan requirements
  const {
    totalDuration,
    totalCost,
    selectedServices,
    requiresTreatmentPlan,
    multiVisitServices,
    estimatedTotalVisits,
    estimatedCompletionWeeks,
  } = useMemo(() => {
    if (isConsultationOnly) {
      return {
        totalDuration: 30,
        totalCost: consultationFee,
        selectedServices: [],
        requiresTreatmentPlan: false,
        multiVisitServices: [],
        estimatedTotalVisits: 0,
        estimatedCompletionWeeks: 0,
      };
    }

    const selected = services.filter((service) =>
      bookingData.services?.includes(service.id)
    );

    const multiVisit = selected.filter(
      (s) =>
        s.requires_multiple_visits ||
        s.typical_visit_count > 1 ||
        s.category?.toLowerCase().includes("orthodontics") ||
        s.category?.toLowerCase().includes("implant")
    );

    const totalVisits = multiVisit.reduce(
      (sum, s) => sum + (s.typical_visit_count || 2),
      0
    );

    const weeksEstimate = totalVisits * 2;

    return {
      totalDuration: selected.reduce(
        (total, service) => total + (service.duration_minutes || 0),
        0
      ),
      totalCost:
        selected.reduce(
          (total, service) =>
            total +
            (parseFloat(service.treatment_price || service.min_price) || 0),
          0
        ) + consultationFee,
      selectedServices: selected,
      requiresTreatmentPlan: multiVisit.length > 0,
      multiVisitServices: multiVisit,
      estimatedTotalVisits: totalVisits,
      estimatedCompletionWeeks: weeksEstimate,
    };
  }, [services, bookingData.services, consultationFee, isConsultationOnly]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 dark:bg-pink-950 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Review & Confirm
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Please verify your appointment details
          </p>
        </div>
      </div>

      {/* ✅ Info Cards (Replaced Alerts) */}
      <div className="space-y-3 sm:space-y-4">
        {/* Consultation Only Notice */}
        {isConsultationOnly && (
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 animate-in slide-in-from-top-2 fade-in-50">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="text-sm sm:text-base text-blue-900 dark:text-blue-100">
                  Consultation Only Appointment
                </strong>
                <p className="text-xs sm:text-sm mt-1 text-blue-800 dark:text-blue-200">
                  You're booking a consultation with the doctor. Treatment
                  options will be discussed during your visit.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Treatment Plan Notice */}
        {requiresTreatmentPlan && (
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 animate-in slide-in-from-top-2 fade-in-50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-3">
                <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="text-sm sm:text-base text-purple-900 dark:text-purple-100">
                    Multi-Visit Service Selected
                  </strong>
                  <p className="text-xs sm:text-sm mt-1 text-purple-800 dark:text-purple-200">
                    The service{multiVisitServices.length > 1 ? "s" : ""} you
                    selected ({multiVisitServices.map((s) => s.name).join(", ")}
                    ) typically require
                    {multiVisitServices.length > 1 ? "" : "s"} multiple
                    appointments.
                  </p>
                </div>
              </div>
              <div className="pl-8 space-y-1 text-xs sm:text-sm text-purple-800 dark:text-purple-200">
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 dark:bg-purple-400 text-white dark:text-purple-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </span>
                  This booking is for your initial consultation
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 dark:bg-purple-400 text-white dark:text-purple-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </span>
                  Your dentist will create a personalized treatment plan
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 dark:bg-purple-400 text-white dark:text-purple-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </span>
                  Follow-up appointments will be scheduled based on your plan
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Limits Info */}
        {bookingLimitsInfo && bookingLimitsInfo.totalPending > 0 && (
          <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 animate-in slide-in-from-top-2 fade-in-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <strong className="text-sm sm:text-base text-amber-900 dark:text-amber-100">
                  Booking Status
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-amber-800 dark:text-amber-200">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">
                    Current Pending
                  </p>
                  <p className="font-bold text-lg">
                    {bookingLimitsInfo.totalPending}/
                    {bookingLimitsInfo.maxTotalPending}
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">
                    After This
                  </p>
                  <p className="font-bold text-lg">
                    {bookingLimitsInfo.totalPending + 1}/
                    {bookingLimitsInfo.maxTotalPending}
                  </p>
                </div>
              </div>
              {bookingLimitsInfo.totalPending + 1 >=
                bookingLimitsInfo.maxTotalPending && (
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    You're reaching your pending appointment limit. Wait for
                    confirmations before booking more.
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Notice */}
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 animate-in slide-in-from-top-2 fade-in-50">
          <CardContent className="p-4 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="text-sm sm:text-base text-green-900 dark:text-green-100">
                Payment Information
              </strong>
              <p className="text-xs sm:text-sm mt-1 text-green-800 dark:text-green-200">
                Payment is due at the time of service. Please prepare cash or
                inquire about available payment methods.
                {requiresTreatmentPlan &&
                  " Your dentist may offer payment plans for multi-visit treatments."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div
        className={cn(
          "grid gap-4 sm:gap-6",
          isMobile ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"
        )}
      >
        {/* Left Column - Appointment Details */}
        <div className="space-y-4 sm:space-y-6">
          {/* Clinic & Schedule */}
          <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Appointment Details
              </h3>

              <div className="space-y-4">
                {/* Clinic */}
                <div className="pb-4 border-b">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Clinic
                  </span>
                  <p className="font-semibold text-foreground text-base sm:text-lg mt-1">
                    {bookingData.clinic?.name}
                  </p>
                  <div className="flex items-start gap-2 mt-2 text-xs sm:text-sm">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {bookingData.clinic?.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm">
                    <Phone className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {bookingData.clinic?.phone}
                    </span>
                  </div>
                </div>

                {/* Doctor */}
                <div className="pb-4 border-b">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Doctor
                  </span>
                  <p className="font-semibold text-foreground text-base sm:text-lg mt-1">
                    {bookingData.doctor?.name}
                  </p>
                  <p className="text-xs sm:text-sm text-primary font-medium mt-1">
                    {bookingData.doctor?.specialization}
                  </p>
                  {bookingData.doctor?.consultation_fee && (
                    <div className="mt-2 inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Consultation:
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-primary">
                        ₱
                        {parseFloat(
                          bookingData.doctor.consultation_fee
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Date & Time */}
                <div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {requiresTreatmentPlan
                      ? "First Appointment"
                      : "Date & Time"}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="font-semibold text-foreground text-sm sm:text-base">
                      {new Date(bookingData.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="font-semibold text-foreground text-sm sm:text-base">
                      {bookingData.time}
                      {isConsultationOnly
                        ? " (30-45 min consultation)"
                        : ` (~${totalDuration} minutes)`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services or Consultation Info */}
          {isConsultationOnly ? (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="w-5 h-5 text-primary" />
                  Consultation Details
                </h4>
                <div className="space-y-3">
                  <div className="p-3 sm:p-4 bg-background rounded-lg border-2">
                    <p className="font-medium mb-2 text-sm sm:text-base">
                      General Consultation
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      The doctor will assess your dental health and recommend
                      appropriate treatments.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base sm:text-lg">
                        Consultation Fee:
                      </span>
                      <span className="font-bold text-xl sm:text-2xl text-primary">
                        ₱
                        {parseFloat(
                          bookingData.doctor?.consultation_fee || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      * Treatment costs will be discussed during your visit
                      based on your needs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Selected Services
                </h4>
                <div className="space-y-3">
                  {selectedServices.map((service) => {
                    const isMultiVisit = multiVisitServices.find(
                      (s) => s.id === service.id
                    );
                    const servicePrice =
                      service.treatment_price || service.min_price || 0;
                    return (
                      <div
                        key={service.id}
                        className="p-3 bg-background rounded-lg border-2 hover:border-primary/50 transition-colors duration-200"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <span className="font-medium text-sm sm:text-base">
                              {service.name}
                            </span>
                            {isMultiVisit && (
                              <div className="flex items-center gap-1 mt-1">
                                <Repeat className="w-3 h-3 text-primary" />
                                <span className="text-xs text-muted-foreground">
                                  ~{service.typical_visit_count || 2} visits •
                                  Treatment plan required
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-primary text-sm sm:text-base flex-shrink-0">
                            ₱{parseFloat(servicePrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <Separator className="my-3" />
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-muted-foreground">
                        Services Total:
                      </span>
                      <span className="font-semibold">
                        ₱{(totalCost - consultationFee).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-muted-foreground">
                        Consultation Fee:
                      </span>
                      <div className="text-right">
                        {skipConsultation &&
                        consultationCheckResult?.canSkipConsultation ? (
                          <>
                            <span className="line-through text-muted-foreground mr-2 text-xs">
                              ₱
                              {parseFloat(
                                bookingData.doctor?.consultation_fee || 0
                              ).toLocaleString()}
                            </span>
                            <span className="font-semibold text-green-600 text-sm">
                              FREE
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold">
                            ₱{parseFloat(consultationFee).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {skipConsultation &&
                      consultationCheckResult?.canSkipConsultation && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Consultation fee waived (recent visit found)
                        </p>
                      )}
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
                      <span className="font-bold text-sm sm:text-base">
                        Total Estimated Cost:
                      </span>
                      <span className="font-bold text-xl sm:text-2xl text-primary">
                        ₱{totalCost.toLocaleString()}
                      </span>
                    </div>
                    {requiresTreatmentPlan && (
                      <p className="text-xs text-muted-foreground mt-2">
                        * Additional costs may apply for subsequent visits. Your
                        dentist will provide a detailed treatment plan.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cross-Clinic Coordination */}
          {crossClinicWarnings && crossClinicWarnings.length > 0 && (
            <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm sm:text-base text-orange-900 dark:text-orange-100">
                    Care Coordination Notice
                  </strong>
                  <p className="text-xs sm:text-sm mt-1 text-orange-800 dark:text-orange-200">
                    You have {crossClinicWarnings.length} appointment(s) at
                    other clinics. Please inform your healthcare providers for
                    better care coordination.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancellation Policy */}
          {cancellationInfo && (
            <Card className="border border-info/30 bg-gradient-to-r from-info/5 to-info/10">
              <CardContent className="p-4">
                <h4 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-info" />
                  Cancellation Policy
                </h4>
                <p className="text-xs text-muted-foreground">
                  Free cancellation until{" "}
                  <strong className="text-foreground">
                    {cancellationInfo.cancellationDeadline.toLocaleDateString()}
                  </strong>{" "}
                  at{" "}
                  <strong className="text-foreground">
                    {cancellationInfo.cancellationDeadline.toLocaleTimeString()}
                  </strong>{" "}
                  ({cancellationInfo.policyHours}h notice required)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Symptoms/Notes */}
          {bookingData.symptoms && (
            <Card className="border-2 border-primary/30">
              <CardContent className="p-4">
                <h4 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Your Notes
                </h4>
                <p className="text-xs sm:text-sm text-foreground bg-muted p-3 rounded-lg border">
                  {bookingData.symptoms}
                </p>
                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Will be shared with clinic staff
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Patient Information & Important Notes */}
        <div className="space-y-4 sm:space-y-6">
          {/* Patient Info */}
          <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Patient Information
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Name
                  </span>
                  <p className="font-semibold text-foreground text-base sm:text-lg mt-1">
                    {profile?.profile?.first_name} {profile?.profile?.last_name}
                  </p>
                </div>

                {(profile?.profile?.gender || patientAge !== null) && (
                  <div className="grid grid-cols-2 gap-4">
                    {profile?.profile?.gender && (
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                          Gender
                        </span>
                        <p className="font-medium text-foreground mt-1 text-sm sm:text-base">
                          {genderDisplay[profile.profile.gender] ||
                            profile.profile.gender}
                        </p>
                      </div>
                    )}
                    {patientAge !== null && (
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                          Age
                        </span>
                        <p className="font-medium text-foreground mt-1 text-sm sm:text-base">
                          {patientAge} years old
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Email
                  </span>
                  <p className="font-medium text-foreground mt-1 text-sm sm:text-base break-all">
                    {profile?.email}
                  </p>
                </div>

                <div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Phone
                  </span>
                  <p className="font-medium text-foreground mt-1 text-sm sm:text-base">
                    {profile?.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Treatment Plan Timeline */}
          {requiresTreatmentPlan && (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Your Treatment Journey
                </h4>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Initial Consultation
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(bookingData.date).toLocaleDateString()} -
                        Assessment & treatment plan creation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-primary/30 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      2+
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Follow-up Treatments
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{estimatedTotalVisits - 1} additional appointments over{" "}
                        {estimatedCompletionWeeks} weeks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-success/30 rounded-full flex items-center justify-center text-xs font-bold text-success flex-shrink-0">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Treatment Complete
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Final assessment & care instructions
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Important Notes */}
          <Card className="border-2 border-info/30 bg-gradient-to-r from-info/5 to-info/10 shadow-md">
            <CardContent className="p-4 sm:p-6">
              <h4 className="font-semibold text-info mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Info className="w-4 h-4" />
                Important Reminders
              </h4>
              <ul className="text-xs sm:text-sm text-info-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <span>Arrive 15 minutes early for registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <span>Bring valid ID and insurance card (if applicable)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <span>Payment is due at time of service</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <span>
                    Cancel {cancellationInfo?.policyHours || 24}+ hours in
                    advance to avoid charges
                  </span>
                </li>
                {requiresTreatmentPlan && (
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                    <span>
                      Your dentist will discuss treatment plan and costs during
                      first visit
                    </span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Attendance Reminder */}
          {patientReliability &&
            patientReliability.risk_level !== "low_risk" && (
              <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <strong className="text-amber-900 dark:text-amber-100">
                      Attendance Commitment
                    </strong>
                    <p className="mt-1 text-amber-800 dark:text-amber-200">
                      {patientReliability.risk_level === "high_risk"
                        ? "Please ensure you attend. Multiple no-shows may restrict future bookings."
                        : "Please attend or cancel with adequate notice."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationStep;
