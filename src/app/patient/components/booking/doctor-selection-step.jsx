import React from "react";
import {
  Stethoscope,
  User,
  Calendar,
  Star,
  CreditCard,
  Award,
  Languages,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/core/components/ui/avatar";
import { Separator } from "@/core/components/ui/separator";
import { cn } from "@/lib/utils";

const DoctorSelectionStep = ({ doctors, selectedDoctor, onDoctorSelect }) => {
  const formatConsultationFee = (fee) => {
    if (!fee) return "Consultation fee varies";
    return `₱${parseFloat(fee).toLocaleString()} consultation fee`;
  };

  const formatExperience = (years) => {
    if (!years) return "Experience varies";
    return `${years} ${years === 1 ? "year" : "years"} experience`;
  };

  if (!doctors?.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Choose Your Doctor
            </h2>
            <p className="text-muted-foreground mt-1">
              Select from our qualified dental professionals
            </p>
          </div>
        </div>

        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Doctors Available
            </h3>
            <p className="text-muted-foreground">
              No doctors are currently available at the selected clinic.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Choose Your Doctor
          </h2>
          <p className="text-muted-foreground mt-1">
            Select from our qualified dental professionals
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {doctors.map((doctor) => {
          const isSelected = selectedDoctor?.id === doctor.id;
          const fullName =
            `Dr. ${doctor.first_name} ${doctor.last_name}`.trim();
          const languages = doctor.languages_spoken || [];
          const certifications = doctor.certifications || {};
          const awards = doctor.awards || [];

          return (
            <Card
              key={doctor.id}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-lg group relative",
                isSelected &&
                  "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
                !isSelected && "hover:border-primary/50"
              )}
              onClick={() => onDoctorSelect(doctor)}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary-foreground fill-current" />
                </div>
              )}

              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Doctor Header */}
                  <div className="flex items-start gap-4">
                    <Avatar className="w-20 h-20 border-2 border-muted">
                      <AvatarImage src={doctor.image_url} alt={fullName} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {doctor.first_name?.charAt(0)}
                        {doctor.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                        {doctor.first_name || "."} {doctor.last_name}
                      </h3>

                      <p className="text-primary font-semibold mb-2">
                        {doctor.specialization}
                      </p>

                      {doctor.rating > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium text-foreground">
                              {doctor.rating.toFixed(1)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({doctor.total_reviews} reviews)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatExperience(doctor.experience_years)}
                        </span>
                      </div>

                      {doctor.consultation_fee && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {formatConsultationFee(doctor.consultation_fee)}
                          </span>
                        </div>
                      )}

                      {languages.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Speaks: {languages.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Education & Bio */}
                    {doctor.education && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            Education
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {doctor.education}
                        </p>
                      </div>
                    )}

                    {doctor.bio && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {doctor.bio}
                        </p>
                      </div>
                    )}

                    {/* Certifications & Awards */}
                    {((certifications &&
                      Object.keys(certifications).length > 0) ||
                      (awards && awards.length > 0)) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          {certifications &&
                            Object.keys(certifications).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(certifications)
                                  .slice(0, 3)
                                  .map(([cert, details]) => (
                                    <Badge
                                      key={cert}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {details.name} ({details.year})
                                    </Badge>
                                  ))}
                              </div>
                            )}

                          {awards && awards.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm text-muted-foreground">
                                {awards.length} professional award
                                {awards.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Availability Status */}
                  <div className="pt-2">
                    <Badge
                      variant={doctor.is_available ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {doctor.is_available
                        ? "Available"
                        : "Limited Availability"}
                    </Badge>
                  </div>
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
