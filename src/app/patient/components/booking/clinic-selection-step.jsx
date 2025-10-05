import React from "react";
import { MapPin, Phone, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";

/**
 * ✅ STEP 1: Clinic Selection
 * - Shows available clinics
 * - Distance info if location available
 * - No eligibility warnings yet (happens after selection)
 */
const ClinicSelectionStep = ({
  clinics,
  clinicsLoading,
  selectedClinic,
  onClinicSelect,
}) => {
  if (clinicsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading clinics...</span>
      </div>
    );
  }

  if (!clinics || clinics.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Clinics Available</h3>
        <p className="text-muted-foreground">
          No clinics found in your area. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Select a Clinic</h2>
        <p className="text-muted-foreground">
          Choose a dental clinic near you to book your appointment.
        </p>
      </div>

      <div className="grid gap-4">
        {clinics.map((clinic) => {
          const isSelected = selectedClinic?.id === clinic.id;
          const operatingHours = clinic.operating_hours || {};

          return (
            <Card
              key={clinic.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onClinicSelect(clinic)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{clinic.name}</h3>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {clinic.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{clinic.address}</span>
                        </div>
                      )}

                      {clinic.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{clinic.phone}</span>
                        </div>
                      )}

                      {clinic.operating_hours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Open today: {operatingHours.today || "Closed"}
                          </span>
                        </div>
                      )}

                      {clinic.distance_km !== undefined && (
                        <div className="mt-2 text-primary font-medium">
                          📍 {clinic.distance_km.toFixed(1)} km away
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClinicSelect(clinic);
                    }}
                  >
                    {isSelected ? "Selected" : "Select"}
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

export default ClinicSelectionStep;
