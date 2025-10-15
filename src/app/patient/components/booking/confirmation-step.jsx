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
  Stethoscope,
  Package,
  Heart,
  Mail,
  UserCircle2,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500/20 to-pink-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-pink-600 dark:text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Review & Confirm
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Please verify your appointment details
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="space-y-3">
        {/* Consultation Only Notice */}
        {isConsultationOnly && (
          <Alert className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 animate-in slide-in-from-top-2 fade-in-50">
            <Info className="w-5 h-5 text-primary flex-shrink-0" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold text-sm sm:text-base">
                  Consultation Only Appointment
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  You're booking a consultation with the doctor. Treatment
                  options will be discussed during your visit.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Treatment Plan Notice */}
        {requiresTreatmentPlan && (
          <Alert className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10 animate-in slide-in-from-top-2 fade-in-50">
            <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-500 flex-shrink-0" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-sm sm:text-base text-purple-900 dark:text-purple-100">
                    Multi-Visit Service Selected
                  </p>
                  <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200 mt-1">
                    The service{multiVisitServices.length > 1 ? "s" : ""} you
                    selected ({multiVisitServices.map((s) => s.name).join(", ")}
                    ) typically require
                    {multiVisitServices.length > 1 ? "" : "s"} multiple
                    appointments.
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    "This booking is for your initial consultation",
                    "Your dentist will create a personalized treatment plan",
                    "Follow-up appointments will be scheduled based on your plan",
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-purple-600 dark:bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200 flex-1">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Booking Limits Info */}
        {bookingLimitsInfo && bookingLimitsInfo.totalPending > 0 && (
          <Alert className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 animate-in slide-in-from-top-2 fade-in-50">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-sm sm:text-base text-amber-900 dark:text-amber-100">
                  Booking Status
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/50 rounded-lg p-3 border">
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">
                      Current Pending
                    </p>
                    <p className="font-bold text-lg text-foreground">
                      {bookingLimitsInfo.totalPending}/
                      {bookingLimitsInfo.maxTotalPending}
                    </p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border">
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">
                      After This
                    </p>
                    <p className="font-bold text-lg text-foreground">
                      {bookingLimitsInfo.totalPending + 1}/
                      {bookingLimitsInfo.maxTotalPending}
                    </p>
                  </div>
                </div>
                {bookingLimitsInfo.totalPending + 1 >=
                  bookingLimitsInfo.maxTotalPending && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/20">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      You're reaching your pending appointment limit. Wait for
                      confirmations before booking more.
                    </p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Notice */}
        <Alert className="border-green-200 dark:border-green-800/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10 animate-in slide-in-from-top-2 fade-in-50">
          <CreditCard className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100">
                Payment Information
              </p>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                Payment is due at the time of service. Please prepare cash or
                inquire about available payment methods.
                {requiresTreatmentPlan &&
                  " Your dentist may offer payment plans for multi-visit treatments."}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content Grid */}
      <div
        className={cn(
          "grid gap-5 sm:gap-6",
          isMobile ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"
        )}
      >
        {/* Left Column - Appointment Details */}
        <div className="space-y-5">
          {/* Clinic & Schedule */}
          <Card className="border-2 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CalendarDays className="w-5 h-5 text-primary" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clinic */}
              <div className="pb-4 border-b">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                  Clinic
                </p>
                <p className="font-bold text-foreground text-base sm:text-lg mb-2">
                  {bookingData.clinic?.name}
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 text-xs sm:text-sm">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {bookingData.clinic?.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Phone className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {bookingData.clinic?.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Doctor */}
              <div className="pb-4 border-b">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                  Doctor
                </p>
                <p className="font-bold text-foreground text-base sm:text-lg mb-1">
                  {bookingData.doctor?.name}
                </p>
                <p className="text-xs sm:text-sm text-primary font-semibold mb-2">
                  {bookingData.doctor?.specialization}
                </p>
                {bookingData.doctor?.consultation_fee && (
                  <Badge variant="outline" className="gap-1.5">
                    <span className="text-xs">Consultation:</span>
                    <span className="font-semibold">
                      ₱
                      {parseFloat(
                        bookingData.doctor.consultation_fee
                      ).toLocaleString()}
                    </span>
                  </Badge>
                )}
              </div>

              {/* Date & Time */}
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                  {requiresTreatmentPlan ? "First Appointment" : "Date & Time"}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">
                      {new Date(bookingData.date).toLocaleDateString("en-US", {
                        weekday: isMobile ? "short" : "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
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
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-purple-500/5 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  Consultation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background rounded-xl border-2">
                  <p className="font-semibold mb-2 text-sm sm:text-base">
                    General Consultation
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    The doctor will assess your dental health and recommend
                    appropriate treatments.
                  </p>
                </div>
                <Separator />
                <div className="space-y-3 pt-2">
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
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    Treatment costs will be discussed during your visit based on
                    your needs.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-purple-500/5 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="w-5 h-5 text-primary" />
                  Selected Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedServices.map((service) => {
                  const isMultiVisit = multiVisitServices.find(
                    (s) => s.id === service.id
                  );
                  const servicePrice =
                    service.treatment_price || service.min_price || 0;
                  return (
                    <div
                      key={service.id}
                      className="p-3 bg-background rounded-xl border-2 hover:border-primary/50 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base line-clamp-1">
                            {service.name}
                          </p>
                          {isMultiVisit && (
                            <div className="flex items-center gap-1.5 mt-1">
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
                        <div className="space-y-1">
                          <span className="line-through text-muted-foreground text-xs block">
                            ₱
                            {parseFloat(
                              bookingData.doctor?.consultation_fee || 0
                            ).toLocaleString()}
                          </span>
                          <Badge className="bg-green-600 hover:bg-green-700 font-semibold">
                            FREE
                          </Badge>
                        </div>
                      ) : (
                        <span className="font-semibold">
                          ₱{parseFloat(consultationFee).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {skipConsultation &&
                    consultationCheckResult?.canSkipConsultation && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500">
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Consultation fee waived (recent visit found)
                        </span>
                      </div>
                    )}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center bg-gradient-to-r from-primary/10 to-purple-500/10 p-3 sm:p-4 rounded-xl border border-primary/20">
                    <span className="font-bold text-sm sm:text-base">
                      Total Estimated Cost:
                    </span>
                    <span className="font-bold text-xl sm:text-2xl text-primary">
                      ₱{totalCost.toLocaleString()}
                    </span>
                  </div>
                  {requiresTreatmentPlan && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      Additional costs may apply for subsequent visits. Your
                      dentist will provide a detailed treatment plan.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cross-Clinic Coordination */}
          {crossClinicWarnings && crossClinicWarnings.length > 0 && (
            <Alert className="border-orange-200 dark:border-orange-800/50 bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-orange-950/10 dark:to-amber-950/10">
              <Info className="w-5 h-5 text-orange-600 dark:text-orange-500 flex-shrink-0" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold text-sm sm:text-base text-orange-900 dark:text-orange-100">
                    Care Coordination Notice
                  </p>
                  <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-200">
                    You have {crossClinicWarnings.length} appointment(s) at
                    other clinics. Please inform your healthcare providers for
                    better care coordination.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Policy */}
          {cancellationInfo && (
            <Card className="border border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Cancellation Policy
                </h4>
                <p className="text-xs text-muted-foreground">
                  Free cancellation until{" "}
                  <strong className="text-foreground">
                    {cancellationInfo.cancellationDeadline.toLocaleDateString()}
                  </strong>{" "}
                  at{" "}
                  <strong className="text-foreground">
                    {cancellationInfo.cancellationDeadline.toLocaleTimeString(
                      "en-US",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
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
                <p className="text-xs sm:text-sm text-foreground bg-muted/50 p-3 rounded-lg border">
                  {bookingData.symptoms}
                </p>
                <p className="text-xs text-primary mt-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Will be shared with clinic staff
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Patient Information & Important Notes */}
        <div className="space-y-5">
          {/* Patient Info */}
          <Card className="border-2 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <UserCircle2 className="w-5 h-5 text-primary" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                  Name
                </p>
                <p className="font-bold text-foreground text-base sm:text-lg">
                  {profile?.profile?.first_name} {profile?.profile?.last_name}
                </p>
              </div>

              {(profile?.profile?.gender || patientAge !== null) && (
                <div className="grid grid-cols-2 gap-4">
                  {profile?.profile?.gender && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                        Gender
                      </p>
                      <p className="font-semibold text-foreground text-sm sm:text-base">
                        {genderDisplay[profile.profile.gender] ||
                          profile.profile.gender}
                      </p>
                    </div>
                  )}
                  {patientAge !== null && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                        Age
                      </p>
                      <p className="font-semibold text-foreground text-sm sm:text-base">
                        {patientAge} years old
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                  Email
                </p>
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="font-medium text-foreground text-sm sm:text-base break-all">
                    {profile?.email}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                  Phone
                </p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="font-medium text-foreground text-sm sm:text-base">
                    {profile?.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Treatment Plan Timeline */}
          {requiresTreatmentPlan && (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-purple-500/5 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Your Treatment Journey
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0 shadow-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      Initial Consultation
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(bookingData.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      - Assessment & treatment plan creation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    2+
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      Follow-up Treatments
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{estimatedTotalVisits - 1} additional appointments over{" "}
                      {estimatedCompletionWeeks} weeks
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600/20 dark:bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      Treatment Complete
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Final assessment & care instructions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Important Notes */}
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-primary">
                <Info className="w-5 h-5" />
                Important Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {[
                  "Arrive 15 minutes early for registration",
                  "Bring valid ID and insurance card (if applicable)",
                  "Payment is due at time of service",
                  `Cancel ${
                    cancellationInfo?.policyHours || 24
                  }+ hours in advance to avoid charges`,
                  ...(requiresTreatmentPlan
                    ? [
                        "Your dentist will discuss treatment plan and costs during first visit",
                      ]
                    : []),
                ].map((text, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs sm:text-sm"
                  >
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-500" />
                    <span className="text-foreground">{text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Attendance Reminder */}
          {patientReliability &&
            patientReliability.risk_level !== "low_risk" && (
              <Alert className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                      Attendance Commitment
                    </p>
                    <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                      {patientReliability.risk_level === "high_risk"
                        ? "Please ensure you attend. Multiple no-shows may restrict future bookings."
                        : "Please attend or cancel with adequate notice."}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationStep;
