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
  const formatConsultationFee = (fee) => {
    if (!fee) return "Consultation fee varies";
    return `₱${parseFloat(fee).toLocaleString()}`;
  };

  const formatExperience = (years) => {
    if (!years || years === 0) return "New practitioner";
    if (years === 1) return "1 year of experience";
    return `${years} years of experience`;
  };

  if (!doctors || doctors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Choose Your Doctor</h2>
          <p className="text-muted-foreground">
            Select from our qualified dental professionals
          </p>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Choose Your Doctor</h2>
        <p className="text-muted-foreground">
          Select from our qualified dental professionals
        </p>
      </div>

      {/* Consultation-Only Notice */}
      {isConsultationOnly && (
        <Alert>
          <Info className="h-4 w-4" />
          <div className="text-sm">
            <strong>Consultation Only Booking</strong>
            <p className="mt-1">
              You're booking a consultation-only appointment. The doctor will
              assess your needs and recommend appropriate treatments during your
              visit.
            </p>
          </div>
        </Alert>
      )}

      {/* ✅ Consultation Skip Option */}
      {!isConsultationOnly && consultationCheckResult && (
        <>
          {consultationCheckResult.canSkipConsultation ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <strong className="text-green-900">
                      Consultation Fee Can Be Waived
                    </strong>
                    <p className="text-sm mt-1 text-green-800">
                      You had a recent consultation at this clinic. You can skip
                      the consultation fee for this booking.
                    </p>
                    {consultationCheckResult.checks?.map(
                      (check, idx) =>
                        check.last_consultation_date && (
                          <p
                            key={idx}
                            className="text-xs mt-2 text-muted-foreground"
                          >
                            Last consultation:{" "}
                            {new Date(
                              check.last_consultation_date
                            ).toLocaleDateString()}
                            {check.days_valid_remaining &&
                              ` (Valid for ${check.days_valid_remaining} more days)`}
                          </p>
                        )
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={skipConsultation}
                      onChange={(e) => setSkipConsultation(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium whitespace-nowrap">
                      Skip consultation fee
                    </span>
                  </label>
                </div>
              </div>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <div className="text-sm">
                <strong className="text-amber-900">
                  Consultation Fee Required
                </strong>
                <p className="mt-1 text-amber-800">
                  The selected service(s) require consultation. The doctor's
                  consultation fee will be charged.
                </p>
                {consultationCheckResult.checks?.some((c) => !c.allowed) && (
                  <div className="mt-2 p-2 bg-amber-100 rounded text-xs">
                    <strong>Why?</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {consultationCheckResult.checks.map((check, idx) => {
                        if (!check.allowed) {
                          return (
                            <li key={idx}>
                              {check.reason ===
                              "Consultation required before booking this service"
                                ? "You haven't had a consultation at this clinic yet"
                                : check.reason ===
                                  "Previous consultation expired"
                                ? `Your last consultation expired (was ${
                                    check.message?.match(
                                      /(\d+) days ago/
                                    )?.[1] || "more than 30"
                                  } days ago)`
                                : check.message || check.reason}
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </Alert>
          )}
        </>
      )}

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {doctors.map((doctor) => {
          const isSelected = selectedDoctor?.id === doctor.id;
          const fullName =
            `Dr. ${doctor.first_name} ${doctor.last_name}`.trim();
          const certifications = doctor.certifications || {};
          const awards = doctor.awards || [];

          return (
            <Card
              key={doctor.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? "ring-2 ring-primary bg-primary/5" : ""
              }`}
              onClick={() => onDoctorSelect(doctor)}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Doctor Header with Avatar */}
                  <div className="flex items-start gap-4">
                    <Avatar className="w-20 h-20 border-2">
                      <AvatarImage src={doctor.image_url} alt={fullName} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {doctor.first_name?.[0]}
                        {doctor.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-foreground">
                          {doctor.display_name}
                        </h3>
                        {isSelected && (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        )}
                      </div>

                      <p className="text-primary font-semibold mt-1">
                        {doctor.specialization}
                      </p>

                      {doctor.rating > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium">
                              {doctor.rating.toFixed(1)}
                            </span>
                            {doctor.total_reviews && (
                              <span className="text-sm text-muted-foreground">
                                ({doctor.total_reviews} reviews)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ FIXED: Consultation Fee Display */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Consultation Fee:
                      </span>
                      <div className="text-right">
                        {skipConsultation &&
                        consultationCheckResult?.canSkipConsultation ? (
                          <>
                            <span className="line-through text-muted-foreground text-sm mr-2">
                              {formatConsultationFee(doctor.consultation_fee)}
                            </span>
                            <span className="font-bold text-green-600">
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
                    {skipConsultation &&
                      consultationCheckResult?.canSkipConsultation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Service-only booking (consultation waived)
                        </p>
                      )}
                  </div>

                  {/* Doctor Details */}
                  <div className="space-y-3">
                    {/* Experience */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatExperience(doctor.experience_years)}
                      </span>
                    </div>

                    {/* Education */}
                    {doctor.education && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Education</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {doctor.education}
                        </p>
                      </div>
                    )}

                    {/* Bio */}
                    {doctor.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {doctor.bio}
                      </p>
                    )}

                    {/* Certifications & Awards */}
                    {(Object.keys(certifications).length > 0 ||
                      awards.length > 0) && (
                      <div className="pt-3 border-t space-y-2">
                        {Object.keys(certifications).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(certifications)
                              .slice(0, 2)
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
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">
                              {awards.length} professional award
                              {awards.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Availability */}
                  <div className="pt-3 border-t">
                    <Badge
                      variant={doctor.is_available ? "default" : "secondary"}
                    >
                      {doctor.is_available
                        ? "Available"
                        : "Currently Unavailable"}
                    </Badge>
                  </div>

                  {/* Select Button */}
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDoctorSelect(doctor);
                    }}
                  >
                    {isSelected ? "Selected" : "Select Doctor"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Services Info (if any selected) */}
      {!isConsultationOnly && selectedServices.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <div className="text-sm">
            <strong>Note:</strong>{" "}
            {skipConsultation && consultationCheckResult?.canSkipConsultation
              ? "You're booking service-only (consultation fee waived based on your recent visit)."
              : "The doctor's consultation fee will be charged in addition to the service fees during your appointment."}
          </div>
        </Alert>
      )}
    </div>
  );
};

export default DoctorSelectionStep;
