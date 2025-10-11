import React from "react";
import {
  Stethoscope,
  Calendar,
  Star,
  CreditCard,
  Award,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Info,
  Briefcase,
  Languages,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/core/components/ui/avatar";
import { Alert } from "@/core/components/ui/alert";
import { Button } from "@/core/components/ui/button";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { cn } from "@/lib/utils";

const DoctorSelectionStep = ({
  doctors,
  selectedDoctor,
  onDoctorSelect,
  isConsultationOnly = false,
  selectedServices = [],
  consultationCheckResult,
  skipConsultation,
  setSkipConsultation,
}) => {
  const isMobile = useIsMobile();

  const formatConsultationFee = (fee) => {
    if (!fee) return "Consultation fee varies";
    return `₱${parseFloat(fee).toLocaleString()}`;
  };

  const formatExperience = (years) => {
    if (!years || years === 0) return "New practitioner";
    if (years === 1) return "1 year";
    return `${years} years`;
  };

  if (!doctors || doctors.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Choose Your Doctor
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Select from our qualified dental professionals
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div>
            <strong>No Doctors Available</strong>
            <p className="text-sm mt-1">
              No doctors are currently available at the selected clinic.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Choose Your Doctor</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {doctors.length} qualified professional
            {doctors.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      {/* Consultation Skip Notice */}
      {!isConsultationOnly && consultationCheckResult && (
        <div
          className={cn(
            "rounded-xl border-2 p-4",
            consultationCheckResult.canSkipConsultation
              ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800"
              : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800"
          )}
        >
          <div className="flex items-start gap-3">
            {consultationCheckResult.canSkipConsultation ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between gap-4 mb-2">
                <strong
                  className={
                    consultationCheckResult.canSkipConsultation
                      ? "text-green-900 dark:text-green-100"
                      : "text-amber-900 dark:text-amber-100"
                  }
                >
                  {consultationCheckResult.canSkipConsultation
                    ? "✓ Consultation Fee Can Be Waived"
                    : "Consultation Fee Required"}
                </strong>

                {consultationCheckResult.canSkipConsultation && (
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={skipConsultation}
                      onChange={(e) => setSkipConsultation(e.target.checked)}
                      className="w-4 h-4 rounded border-green-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium whitespace-nowrap">
                      Skip fee
                    </span>
                  </label>
                )}
              </div>

              <p className="text-xs sm:text-sm mb-2">
                {consultationCheckResult.canSkipConsultation
                  ? "You had a recent consultation at this clinic."
                  : "Selected service(s) require consultation."}
              </p>

              {consultationCheckResult.checks?.map(
                (check, idx) =>
                  check.last_consultation_date && (
                    <p key={idx} className="text-xs text-muted-foreground">
                      Last visit:{" "}
                      {new Date(
                        check.last_consultation_date
                      ).toLocaleDateString()}
                      {check.days_valid_remaining &&
                        ` (Valid for ${check.days_valid_remaining} more days)`}
                    </p>
                  )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {doctors.map((doctor) => {
          const isSelected = selectedDoctor?.id === doctor.id;
          const isUnavailable = !doctor.is_available; // ✅ Check availability

          return (
            <Card
              key={doctor.id}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-lg border-2 relative",
                isSelected
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20 ring-2 ring-green-500 ring-offset-2"
                  : isUnavailable
                  ? "border-gray-300 bg-gray-100 dark:bg-gray-900/50 opacity-70" // ✅ Grayed out
                  : "border-border hover:border-green-300 dark:hover:border-green-700",
                isUnavailable && "cursor-not-allowed" // ✅ Change cursor
              )}
              onClick={() => {
                if (!isUnavailable) {
                  onDoctorSelect(doctor);
                }
              }}
            >
              <CardContent className="p-4 sm:p-6">
                {/* ✅ NEW: Unavailable Badge */}
                {isUnavailable && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge
                      variant="destructive"
                      className="text-xs flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" />
                      Unavailable
                    </Badge>
                  </div>
                )}

                {/* Existing doctor card content */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Avatar */}
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                    <AvatarImage src={doctor.image_url} alt={doctor.name} />
                    <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900">
                      {doctor.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "DR"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Doctor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={cn(
                            "font-bold text-lg sm:text-xl truncate",
                            isUnavailable && "text-muted-foreground"
                          )}
                        >
                          {doctor.name}
                        </h3>
                        {doctor.specialization && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <Stethoscope className="w-3 h-3 mr-1" />
                            {doctor.specialization}
                          </Badge>
                        )}
                      </div>

                      {isSelected && !isUnavailable && (
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                      )}
                    </div>

                    {/* Experience & Rating */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                      {doctor.experience_years > 0 && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          <span>
                            {formatExperience(doctor.experience_years)} exp.
                          </span>
                        </div>
                      )}
                      {doctor.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {doctor.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Consultation Fee */}
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={cn(
                          "font-semibold",
                          isUnavailable
                            ? "text-muted-foreground"
                            : "text-primary"
                        )}
                      >
                        {formatConsultationFee(doctor.consultation_fee)}
                      </span>
                    </div>

                    {/* Certifications */}
                    {doctor.certifications &&
                      doctor.certifications.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {doctor.certifications
                            .slice(0, 2)
                            .map((cert, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                <Award className="w-3 h-3 mr-1" />
                                {cert}
                              </Badge>
                            ))}
                          {doctor.certifications.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doctor.certifications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* ✅ NEW: Availability Status Footer */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {isUnavailable ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">
                          Currently Unavailable
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Available Now
                        </span>
                      </>
                    )}
                  </div>

                  {isSelected && !isUnavailable && (
                    <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300">
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorSelectionStep;
