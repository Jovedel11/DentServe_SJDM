import React, { useMemo } from "react";
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Loader2,
  Star,
  Navigation,
  Building2,
  Calendar,
  Circle,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ClinicSelectionStep = ({
  clinics,
  clinicsLoading,
  selectedClinic,
  onClinicSelect,
}) => {
  const isMobile = useIsMobile();

  const formatOperatingHours = (operatingHours) => {
    if (!operatingHours || typeof operatingHours !== "object") {
      return { text: "Hours not available", isOpen: false };
    }

    try {
      const now = new Date();
      const daysOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const currentDay = daysOfWeek[now.getDay()];
      const isWeekend = currentDay === "saturday" || currentDay === "sunday";

      // Get today's hours from nested structure
      let todayHours = null;
      if (operatingHours.weekdays || operatingHours.weekends) {
        const hoursGroup = isWeekend
          ? operatingHours.weekends
          : operatingHours.weekdays;
        todayHours = hoursGroup?.[currentDay];
      } else {
        todayHours = operatingHours[currentDay];
      }

      if (
        !todayHours ||
        todayHours.closed === true ||
        todayHours.is_closed === true
      ) {
        return { text: "Closed today", isOpen: false };
      }

      const openTime = todayHours.start || todayHours.open;
      const closeTime = todayHours.end || todayHours.close;

      if (openTime && closeTime) {
        // Check if currently open
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const isCurrentlyOpen =
          currentTime >= openTime && currentTime <= closeTime;

        return {
          text: `${openTime} - ${closeTime}`,
          isOpen: isCurrentlyOpen,
          openTime,
          closeTime,
        };
      }

      return { text: "Hours not available", isOpen: false };
    } catch (error) {
      console.error("Error formatting hours:", error);
      return { text: "Hours not available", isOpen: false };
    }
  };

  if (clinicsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary mb-4" />
        <span className="text-sm sm:text-base text-muted-foreground">
          Finding the best clinics for you...
        </span>
      </div>
    );
  }

  if (!clinics || clinics.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2">
          No Clinics Available
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto">
          No clinics found in your area. Please try again later or adjust your
          search.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Select a Clinic</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {clinics.length} clinic{clinics.length !== 1 ? "s" : ""} available
            near you
          </p>
        </div>
      </div>

      {/* Clinics Grid */}
      <div className="grid gap-4 sm:gap-5">
        {clinics.map((clinic) => {
          const isSelected = selectedClinic?.id === clinic.id;
          const hoursInfo = formatOperatingHours(clinic.operating_hours);
          const hasImage = clinic.image_url || clinic.image;
          const imageUrl =
            clinic.image_url || clinic.image || "/assets/images/dental.png";

          return (
            <Card
              key={clinic.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden",
                "border-2 touch-manipulation",
                isSelected
                  ? "ring-2 ring-primary border-primary shadow-md"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onClinicSelect(clinic)}
            >
              <CardContent className="p-0">
                <div
                  className={cn(
                    "grid gap-0",
                    isMobile ? "grid-cols-1" : "grid-cols-[180px_1fr]"
                  )}
                >
                  {/* Clinic Image */}
                  <div
                    className={cn(
                      "relative overflow-hidden bg-gradient-to-br from-primary/5 to-purple-500/5",
                      isMobile ? "h-40" : "h-full min-h-[160px]"
                    )}
                  >
                    <img
                      src={imageUrl}
                      alt={clinic.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/assets/images/dental.png";
                      }}
                      loading="lazy"
                    />

                    {/* Status Badge Overlay */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <Badge
                        variant={hoursInfo.isOpen ? "default" : "secondary"}
                        className={cn(
                          "shadow-md backdrop-blur-sm",
                          hoursInfo.isOpen
                            ? "bg-green-500/90 hover:bg-green-600/90"
                            : "bg-gray-500/90"
                        )}
                      >
                        <Circle
                          className={cn(
                            "w-2 h-2 mr-1.5",
                            hoursInfo.isOpen && "fill-white animate-pulse"
                          )}
                        />
                        {hoursInfo.isOpen ? "Open Now" : "Closed"}
                      </Badge>

                      {clinic.rating > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-white/90 backdrop-blur-sm"
                        >
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" />
                          {clinic.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    {/* Distance Badge */}
                    {clinic.distance_km !== undefined &&
                      clinic.distance_km > 0 && (
                        <div className="absolute bottom-3 right-3">
                          <Badge className="bg-black/70 hover:bg-black/80 backdrop-blur-sm">
                            <Navigation className="w-3 h-3 mr-1" />
                            {clinic.distance_km.toFixed(1)} km
                          </Badge>
                        </div>
                      )}
                  </div>

                  {/* Clinic Info */}
                  <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={cn(
                            "font-bold text-foreground mb-1 truncate",
                            isMobile ? "text-lg" : "text-xl"
                          )}
                        >
                          {clinic.name}
                        </h3>

                        {clinic.total_reviews > 0 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "w-3 h-3",
                                    i < Math.floor(clinic.rating)
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-gray-300"
                                  )}
                                />
                              ))}
                            </div>
                            <span>({clinic.total_reviews} reviews)</span>
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      {/* Address */}
                      {clinic.address && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{clinic.address}</span>
                        </div>
                      )}

                      {/* Phone */}
                      {clinic.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{clinic.phone}</span>
                        </div>
                      )}

                      {/* Operating Hours */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-medium text-sm",
                              hoursInfo.isOpen
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {hoursInfo.text}
                          </span>
                          {hoursInfo.isOpen && (
                            <Badge
                              variant="outline"
                              className="text-xs border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
                            >
                              Open
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size={isMobile ? "default" : "sm"}
                      className={cn(
                        "w-full sm:w-auto mt-2",
                        isSelected && "shadow-md"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClinicSelect(clinic);
                      }}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        "Select Clinic"
                      )}
                    </Button>
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

export default ClinicSelectionStep;
