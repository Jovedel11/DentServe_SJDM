import React from "react";
import { MapPin, Star } from "lucide-react";
import SelectionCard from "@/core/components/ui/selection-card";
import Loader from "@/core/components/Loader";

const ClinicSelectionStep = ({
  clinics,
  clinicsLoading,
  selectedClinic,
  onClinicSelect,
}) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MapPin className="w-6 h-6 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">
          Select Your Clinic
        </h2>
      </div>

      {clinicsLoading ? (
        <Loader message="Finding nearby clinics..." />
      ) : clinics?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clinics.map((clinic) => (
            <SelectionCard
              key={clinic.id}
              isSelected={selectedClinic?.id === clinic.id}
              onClick={() => onClinicSelect(clinic)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {clinic.name}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {clinic.address}, {clinic.city}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {clinic.rating || "N/A"} ({clinic.total_reviews || 0}{" "}
                      reviews)
                    </span>
                  </div>
                  {clinic.distance_km && (
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {clinic.distance_km}km away
                    </span>
                  )}
                </div>
              </div>

              {clinic.badges && clinic.badges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {clinic.badges.map((badge) => (
                    <span
                      key={badge.badge_name}
                      className="px-3 py-1 bg-success/10 text-success text-xs font-medium rounded-full border border-success/20"
                    >
                      {badge.badge_name}
                    </span>
                  ))}
                </div>
              )}
            </SelectionCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No clinics available
          </h3>
          <p className="text-muted-foreground">
            Please try again later or contact support.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClinicSelectionStep;
