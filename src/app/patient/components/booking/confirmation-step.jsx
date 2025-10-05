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
} from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Alert } from "@/core/components/ui/alert";
import { Separator } from "@/core/components/ui/separator";

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
        totalDuration: 30, // Default consultation duration
        totalCost: bookingData.doctor?.consultation_fee || 0,
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
        ) + consultationFee, // ✅ USE CALCULATED FEE, NOT FULL FEE
      selectedServices: selected,
      requiresTreatmentPlan: multiVisit.length > 0,
      multiVisitServices: multiVisit,
      estimatedTotalVisits: totalVisits,
      estimatedCompletionWeeks: weeksEstimate,
    };
  }, [
    services,
    bookingData.services,
    bookingData.doctor?.consultation_fee,
    isConsultationOnly,
    consultationFee, // ✅ ADD DEPENDENCY
  ]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <CheckCircle2 className="w-6 h-6 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">
          Review & Confirm Your Appointment
        </h2>
      </div>

      {isConsultationOnly && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <div>
            <strong className="text-blue-900">
              Consultation Only Appointment
            </strong>
            <p className="text-sm mt-1 text-blue-800">
              You're booking a consultation with the doctor. Treatment options
              will be discussed during your visit.
            </p>
          </div>
        </Alert>
      )}

      {/* Treatment Plan Notice */}
      {requiresTreatmentPlan && (
        <Alert className="mb-6 border-purple-200 bg-purple-50">
          <Repeat className="h-4 w-4 text-purple-600" />
          <div>
            <strong className="text-purple-900">
              Multi-Visit Service Selected
            </strong>
            <p className="text-sm mt-1 text-purple-800">
              The service{multiVisitServices.length > 1 ? "s" : ""} you selected
              ({multiVisitServices.map((s) => s.name).join(", ")}) typically
              require{multiVisitServices.length > 1 ? "" : "s"} multiple
              appointments.
            </p>
            <p className="text-xs mt-2 text-muted-foreground">
              <strong>What happens next:</strong>
              <br />
              1. This booking is for your initial consultation
              <br />
              2. Your dentist will create a personalized treatment plan
              <br />
              3. Follow-up appointments will be scheduled based on your plan
            </p>
          </div>
        </Alert>
      )}

      {bookingLimitsInfo && bookingLimitsInfo.totalPending > 0 && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <div>
            <strong>Booking Status</strong>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <span className="text-muted-foreground">Current Pending:</span>
                <strong className="ml-2">
                  {bookingLimitsInfo.totalPending}/
                  {bookingLimitsInfo.maxTotalPending}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">After This:</span>
                <strong className="ml-2">
                  {bookingLimitsInfo.totalPending + 1}/
                  {bookingLimitsInfo.maxTotalPending}
                </strong>
              </div>
            </div>
            {bookingLimitsInfo.totalPending + 1 >=
              bookingLimitsInfo.maxTotalPending && (
              <p className="text-xs text-warning mt-2">
                ⚠️ You're reaching your pending appointment limit. Wait for
                confirmations before booking more.
              </p>
            )}
          </div>
        </Alert>
      )}

      {/* Payment Notice */}
      <Alert type="warning" className="mb-6">
        <CreditCard className="w-5 h-5" />
        <div>
          <strong>Payment Information</strong>
          <p className="text-sm mt-1">
            Payment is due at the time of service. Please prepare cash or
            inquire about available payment methods.
            {requiresTreatmentPlan &&
              " Your dentist may offer payment plans for multi-visit treatments."}
          </p>
        </div>
      </Alert>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Appointment Details */}
        <div className="space-y-6">
          {/* Clinic & Schedule */}
          <Card className="border-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Appointment Details
              </h3>

              <div className="space-y-4">
                {/* Clinic */}
                <div className="pb-4 border-b">
                  <span className="text-sm font-medium text-muted-foreground">
                    Clinic:
                  </span>
                  <p className="font-semibold text-foreground text-lg">
                    {bookingData.clinic?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {bookingData.clinic?.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {bookingData.clinic?.phone}
                    </span>
                  </div>
                </div>

                {/* Doctor */}
                <div className="pb-4 border-b">
                  <span className="text-sm font-medium text-muted-foreground">
                    Doctor:
                  </span>
                  <p className="font-semibold text-foreground text-lg">
                    {bookingData.doctor?.name}
                  </p>
                  <p className="text-sm text-primary font-medium">
                    {bookingData.doctor?.specialization}
                  </p>
                  {bookingData.doctor?.consultation_fee && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Consultation: ₱
                      {parseFloat(
                        bookingData.doctor.consultation_fee
                      ).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Date & Time */}
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {requiresTreatmentPlan
                      ? "First Appointment:"
                      : "Date & Time:"}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-foreground">
                      {new Date(bookingData.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-foreground">
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
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Consultation Details
                </h4>
                <div className="space-y-3">
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="font-medium mb-2">General Consultation</p>
                    <p className="text-sm text-muted-foreground">
                      The doctor will assess your dental health and recommend
                      appropriate treatments.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">
                        Consultation Fee:
                      </span>
                      <span className="font-bold text-2xl text-primary">
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
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
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
                        className="p-3 bg-background rounded-lg border"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="font-medium">{service.name}</span>
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
                          <span className="font-semibold text-primary">
                            ₱{parseFloat(servicePrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Services Total:</span>
                      <span className="font-semibold">
                        ₱
                        {(
                          totalCost -
                          (bookingData.doctor?.consultation_fee || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Consultation Fee:</span>
                      <div className="text-right">
                        {skipConsultation &&
                        consultationCheckResult?.canSkipConsultation ? (
                          <>
                            <span className="line-through text-muted-foreground mr-2">
                              ₱
                              {parseFloat(
                                bookingData.doctor?.consultation_fee || 0
                              ).toLocaleString()}
                            </span>
                            <span className="font-semibold text-green-600">
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
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Consultation fee waived (recent visit found)
                        </p>
                      )}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">
                        Total Estimated Cost:
                      </span>
                      <span className="font-bold text-2xl text-primary">
                        ₱{totalCost.toLocaleString()}
                      </span>
                    </div>
                    {requiresTreatmentPlan && (
                      <p className="text-xs text-muted-foreground">
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
            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <div>
                <strong>Care Coordination Notice</strong>
                <p className="text-sm mt-1">
                  You have {crossClinicWarnings.length} appointment(s) at other
                  clinics. Please inform your healthcare providers for better
                  care coordination.
                </p>
              </div>
            </Alert>
          )}

          {/* Cancellation Policy */}
          {cancellationInfo && (
            <Card className="border border-info/20 bg-info/5">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Cancellation Policy
                </h4>
                <p className="text-xs text-muted-foreground">
                  Free cancellation until{" "}
                  <strong>
                    {cancellationInfo.cancellationDeadline.toLocaleDateString()}
                  </strong>{" "}
                  at{" "}
                  <strong>
                    {cancellationInfo.cancellationDeadline.toLocaleTimeString()}
                  </strong>{" "}
                  ({cancellationInfo.policyHours}h notice required)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Symptoms/Notes */}
          {bookingData.symptoms && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Your Notes
                </h4>
                <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
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

        {/* Patient Information & Important Notes */}
        <div className="space-y-6">
          {/* Patient Info */}
          <Card className="border-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Patient Information
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Name:
                  </span>
                  <p className="font-semibold text-foreground text-lg">
                    {profile?.profile?.first_name} {profile?.profile?.last_name}
                  </p>
                </div>

                {(profile?.profile?.gender || patientAge !== null) && (
                  <div className="grid grid-cols-2 gap-4">
                    {profile?.profile?.gender && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Gender:
                        </span>
                        <p className="font-medium text-foreground">
                          {genderDisplay[profile.profile.gender] ||
                            profile.profile.gender}
                        </p>
                      </div>
                    )}
                    {patientAge !== null && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Age:
                        </span>
                        <p className="font-medium text-foreground">
                          {patientAge} years old
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Email:
                  </span>
                  <p className="font-medium text-foreground">
                    {profile?.email}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Phone:
                  </span>
                  <p className="font-medium text-foreground">
                    {profile?.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Treatment Plan Timeline */}
          {requiresTreatmentPlan && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Your Treatment Journey
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Initial Consultation</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(bookingData.date).toLocaleDateString()} -
                        Assessment & treatment plan creation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/30 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      2+
                    </div>
                    <div>
                      <p className="font-medium">Follow-up Treatments</p>
                      <p className="text-xs text-muted-foreground">
                        ~{estimatedTotalVisits - 1} additional appointments over{" "}
                        {estimatedCompletionWeeks} weeks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/30 rounded-full flex items-center justify-center text-xs font-bold text-success flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium">Treatment Complete</p>
                      <p className="text-xs text-muted-foreground">
                        Final assessment & care instructions
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Important Notes */}
          <Card className="border-2 border-info/20 bg-info/5">
            <CardContent className="p-6">
              <h4 className="font-semibold text-info mb-3 flex items-center gap-2">
                <Info className="w-4 w-4" />
                Important Reminders
              </h4>
              <ul className="text-sm text-info space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Arrive 15 minutes early for registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Bring valid ID and insurance card (if applicable)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Payment is due at time of service</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Cancel {cancellationInfo?.policyHours || 24}+ hours in
                    advance to avoid charges
                  </span>
                </li>
                {requiresTreatmentPlan && (
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
              <Alert variant="warning">
                <Shield className="h-4 w-4" />
                <div className="text-sm">
                  <strong>Attendance Commitment</strong>
                  <p className="mt-1">
                    {patientReliability.risk_level === "high_risk"
                      ? "Please ensure you attend. Multiple no-shows may restrict future bookings."
                      : "Please attend or cancel with adequate notice."}
                  </p>
                </div>
              </Alert>
            )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationStep;
