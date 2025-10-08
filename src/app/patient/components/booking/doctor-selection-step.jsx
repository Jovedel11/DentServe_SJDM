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
          const fullName =
            `Dr. ${doctor.first_name} ${doctor.last_name}`.trim();
          const certifications = doctor.certifications || {};
          const awards = doctor.awards || [];
          const languages = doctor.languages_spoken || [];

          return (
            <Card
              key={doctor.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden touch-manipulation",
                "border-2",
                isSelected
                  ? "ring-2 ring-primary border-primary shadow-md bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onDoctorSelect(doctor)}
            >
              <CardContent className="p-0">
                {/* Doctor Header with Gradient Background */}
                <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-5 sm:p-6 border-b">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-background shadow-md">
                      <AvatarImage src={doctor.image_url} alt={fullName} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
                        {doctor.first_name?.[0]}
                        {doctor.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 truncate">
                        {doctor.display_name || fullName}
                      </h3>
                      <p className="text-primary font-semibold text-sm sm:text-base mb-2">
                        {doctor.specialization}
                      </p>

                      {doctor.rating > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-4 h-4",
                                  i < Math.floor(doctor.rating)
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {doctor.rating.toFixed(1)}
                          </span>
                          {doctor.total_reviews > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({doctor.total_reviews})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Doctor Details */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Consultation Fee */}
                  <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg p-4 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Consultation Fee
                      </span>
                      <div className="text-right">
                        {skipConsultation &&
                        consultationCheckResult?.canSkipConsultation ? (
                          <>
                            <span className="line-through text-muted-foreground text-sm mr-2">
                              {formatConsultationFee(doctor.consultation_fee)}
                            </span>
                            <span className="font-bold text-green-600 text-lg">
                              FREE
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-primary text-lg">
                            {formatConsultationFee(doctor.consultation_fee)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Experience
                        </p>
                        <p className="font-medium">
                          {formatExperience(doctor.experience_years)}
                        </p>
                      </div>
                    </div>

                    {doctor.is_available !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCheck className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>
                          <Badge
                            variant={
                              doctor.is_available ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {doctor.is_available ? "Available" : "Busy"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Education */}
                  {doctor.education && (
                    <div className="flex items-start gap-2 text-sm">
                      <GraduationCap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">
                          Education
                        </p>
                        <p className="text-foreground">{doctor.education}</p>
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {languages.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Languages className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Languages
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {languages.map((lang, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {doctor.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3 border-t pt-3">
                      {doctor.bio}
                    </p>
                  )}

                  {/* Certifications & Awards */}
                  {(Object.keys(certifications).length > 0 ||
                    awards.length > 0) && (
                    <div className="border-t pt-3 space-y-2">
                      {Object.keys(certifications).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(certifications)
                            .slice(0, 3)
                            .map(([cert, details]) => (
                              <Badge
                                key={cert}
                                variant="secondary"
                                className="text-xs"
                              >
                                {details.name || cert}
                              </Badge>
                            ))}
                        </div>
                      )}

                      {awards.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="w-4 h-4 text-yellow-500" />
                          <span className="text-muted-foreground">
                            {awards.length} professional award
                            {awards.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full mt-4"
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDoctorSelect(doctor);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      "Select Doctor"
                    )}
                  </Button>
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
