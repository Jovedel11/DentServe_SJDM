import React from "react";
import {
  Stethoscope,
  Star,
  CreditCard,
  Award,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Info,
  Briefcase,
  Languages,
  UserCheck,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Switch } from "@/core/components/ui/switch";
import { Label } from "@/core/components/ui/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/core/components/ui/avatar";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
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
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Choose Your Doctor
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Select from our qualified dental professionals
            </p>
          </div>
        </div>

        {/* Error State */}
        <div className="text-center py-16 sm:py-20">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-2xl flex items-center justify-center shadow-sm">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
            No Doctors Available
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto px-4">
            No doctors are currently available at the selected clinic. Please
            try again later or choose another clinic.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size={isMobile ? "default" : "lg"}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Choose Your Doctor
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            {doctors.length} qualified professional
            {doctors.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      {/* Consultation Skip Notice */}
      {!isConsultationOnly && consultationCheckResult && (
        <Alert
          className={cn(
            "border-2 animate-in fade-in-50 slide-in-from-top-2",
            consultationCheckResult.canSkipConsultation
              ? "border-green-200 dark:border-green-800/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10"
              : "border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10"
          )}
        >
          {consultationCheckResult.canSkipConsultation ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          )}

          <AlertDescription>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-semibold text-sm sm:text-base mb-1",
                      consultationCheckResult.canSkipConsultation
                        ? "text-green-900 dark:text-green-100"
                        : "text-amber-900 dark:text-amber-100"
                    )}
                  >
                    {consultationCheckResult.canSkipConsultation
                      ? "Consultation Fee Can Be Waived"
                      : "Consultation Fee Required"}
                  </p>
                  <p
                    className={cn(
                      "text-xs sm:text-sm",
                      consultationCheckResult.canSkipConsultation
                        ? "text-green-800 dark:text-green-200"
                        : "text-amber-800 dark:text-amber-200"
                    )}
                  >
                    {consultationCheckResult.canSkipConsultation
                      ? "You had a recent consultation at this clinic."
                      : "Selected service(s) require consultation."}
                  </p>
                </div>

                {/* Toggle Switch */}
                {consultationCheckResult.canSkipConsultation && (
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Switch
                      id="skip-consultation"
                      checked={skipConsultation}
                      onCheckedChange={setSkipConsultation}
                      className="data-[state=checked]:bg-green-600"
                    />
                    <Label
                      htmlFor="skip-consultation"
                      className="text-sm font-medium cursor-pointer whitespace-nowrap"
                    >
                      Skip fee
                    </Label>
                  </div>
                )}
              </div>

              {/* Last Consultation Info */}
              {consultationCheckResult.checks?.map(
                (check, idx) =>
                  check.last_consultation_date && (
                    <div
                      key={idx}
                      className="flex items-start gap-2 pt-2 border-t border-border/50"
                    >
                      <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          Last visit:{" "}
                          <strong className="text-foreground">
                            {new Date(
                              check.last_consultation_date
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </strong>
                        </p>
                        {check.days_valid_remaining && (
                          <p className="text-success">
                            Valid for{" "}
                            <strong>
                              {check.days_valid_remaining} more days
                            </strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )
              )}
            </div>
          </AlertDescription>
        </Alert>
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
                "group cursor-pointer transition-all duration-300 overflow-hidden border-2",
                "hover:shadow-lg touch-manipulation",
                isSelected
                  ? "ring-2 ring-primary border-primary shadow-xl bg-primary/[0.02]"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onDoctorSelect(doctor)}
            >
              <CardContent className="p-0">
                {/* Doctor Header with Gradient Background */}
                <div className="bg-gradient-to-r from-green-500/10 via-primary/10 to-purple-500/10 p-5 sm:p-6 border-b">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-background shadow-lg ring-2 ring-primary/10">
                      <AvatarImage
                        src={doctor.image_url}
                        alt={fullName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg sm:text-xl">
                        {doctor.first_name?.[0]}
                        {doctor.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 line-clamp-1">
                        {doctor.display_name || fullName}
                      </h3>
                      <p className="text-primary font-semibold text-sm sm:text-base mb-2 line-clamp-1">
                        {doctor.specialization}
                      </p>

                      {doctor.rating > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-3.5 h-3.5 sm:w-4 sm:h-4",
                                  i < Math.floor(doctor.rating)
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-muted/30 fill-muted/30"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-foreground">
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
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Details */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Consultation Fee Highlight */}
                  <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-purple-500/5 rounded-xl p-4 border border-primary/10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Consultation Fee
                        </span>
                      </div>
                      <div className="text-right">
                        {skipConsultation &&
                        consultationCheckResult?.canSkipConsultation ? (
                          <div className="space-y-1">
                            <span className="line-through text-muted-foreground text-xs block">
                              {formatConsultationFee(doctor.consultation_fee)}
                            </span>
                            <Badge className="bg-green-600 hover:bg-green-700 font-bold">
                              FREE
                            </Badge>
                          </div>
                        ) : (
                          <span className="font-bold text-primary text-lg sm:text-xl">
                            {formatConsultationFee(doctor.consultation_fee)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          Experience
                        </p>
                        <p className="font-semibold text-sm text-foreground line-clamp-1">
                          {formatExperience(doctor.experience_years)}
                        </p>
                      </div>
                    </div>

                    {doctor.is_available !== undefined && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30">
                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                          <UserCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            Status
                          </p>
                          <Badge
                            variant={
                              doctor.is_available ? "default" : "secondary"
                            }
                            className={cn(
                              "text-xs font-medium",
                              doctor.is_available &&
                                "bg-green-600 hover:bg-green-700"
                            )}
                          >
                            {doctor.is_available ? "Available" : "Busy"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Education */}
                  {doctor.education && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <GraduationCap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">
                          Education
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {doctor.education}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {languages.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Languages className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Languages
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {languages.map((lang, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs font-medium"
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
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed pt-3 border-t">
                      {doctor.bio}
                    </p>
                  )}

                  {/* Certifications & Awards */}
                  {(Object.keys(certifications).length > 0 ||
                    awards.length > 0) && (
                    <div className="pt-3 border-t space-y-3">
                      {Object.keys(certifications).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <p className="text-xs font-semibold text-muted-foreground">
                              Certifications
                            </p>
                          </div>
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
                            {Object.keys(certifications).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{Object.keys(certifications).length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {awards.length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                          <Award className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-100">
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
                    className={cn(
                      "w-full mt-4 touch-manipulation",
                      isSelected && "shadow-md"
                    )}
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
