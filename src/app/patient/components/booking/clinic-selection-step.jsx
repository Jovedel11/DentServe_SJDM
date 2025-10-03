import React from "react";
import {
  MapPin,
  Star,
  Phone,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/core/components/ui/avatar";
import Loader from "@/core/components/Loader";
import { cn } from "@/lib/utils";

const ClinicSelectionStep = ({
  clinics,
  clinicsLoading,
  selectedClinic,
  onClinicSelect,
}) => {
  if (clinicsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Select Your Clinic
            </h2>
            <p className="text-muted-foreground mt-1">
              Choose from our network of dental clinics
            </p>
          </div>
        </div>
        <Loader message="Finding nearby clinics..." />
      </div>
    );
  }

  if (!clinics?.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Select Your Clinic
            </h2>
            <p className="text-muted-foreground mt-1">
              Choose from our network of dental clinics
            </p>
          </div>
        </div>
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Clinics Available
            </h3>
            <p className="text-muted-foreground">
              No clinics found in your area. Please try again later.
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
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Select Your Clinic
          </h2>
          <p className="text-muted-foreground mt-1">
            Choose from our network of dental clinics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {clinics.map((clinic) => {
          const isSelected = selectedClinic?.id === clinic.id;
          const operatingHours = clinic.operating_hours || {};
          const servicesCount = clinic.services?.length || 0;
          const doctorsCount = clinic.doctors?.length || 0;

          return (
            <Card
              key={clinic.id}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-lg group relative overflow-hidden",
                isSelected &&
                  "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
                !isSelected && "hover:border-primary/50 hover:shadow-md"
              )}
              onClick={() => onClinicSelect(clinic)}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary-foreground fill-current" />
                </div>
              )}

              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16 border-2 border-muted">
                    <AvatarImage src={clinic.image_url} alt={clinic.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {clinic.name?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                      {clinic.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-2">
                      {clinic.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium text-foreground">
                            {clinic.rating.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({clinic.total_reviews} reviews)
                          </span>
                        </div>
                      )}

                      {clinic.distance_km && (
                        <Badge variant="secondary" className="text-xs">
                          {clinic.distance_km.toFixed(1)} km away
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {clinic.address}, {clinic.city}
                    </span>
                  </div>

                  {clinic.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {clinic.phone}
                      </span>
                    </div>
                  )}

                  {operatingHours.today && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Open today: {operatingHours.today}
                      </span>
                    </div>
                  )}

                  {/* ✅ Show services and doctors count instead of amenities */}
                  <div className="flex flex-wrap gap-1 pt-2">
                    {servicesCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {servicesCount} Services
                      </Badge>
                    )}
                    {doctorsCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {doctorsCount} Doctors
                      </Badge>
                    )}
                    {clinic.is_active && (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600 border-green-600"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-muted">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Cancellation Policy:
                      </span>
                      <span className="font-medium text-foreground">
                        {clinic.cancellation_policy_hours || 24}h notice
                        required
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ClinicSelectionStep;
