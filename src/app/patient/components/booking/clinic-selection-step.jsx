import React, { useMemo, useCallback } from "react";
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Loader2,
  Star,
  Navigation,
  Building2,
  Circle,
  AlertTriangle,
  Info,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ClinicSelectionStep = ({
  clinics,
  clinicsLoading,
  selectedClinic,
  onClinicSelect,
  profile = null,
}) => {
  const isMobile = useIsMobile();

  const formatOperatingHours = useCallback((operatingHours) => {
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
  }, []);

  if (clinicsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20">
        <div className="relative">
          <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 animate-spin text-primary" />
          <div className="absolute inset-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 animate-ping" />
        </div>
        <p className="text-sm sm:text-base text-muted-foreground mt-4 font-medium">
          Finding the best clinics for you...
        </p>
      </div>
    );
  }

  if (!clinics || clinics.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 bg-gradient-to-br from-muted/50 to-muted rounded-2xl flex items-center justify-center">
          <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
          No Clinics Available
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto px-4">
          No clinics found in your area. Please try again later or adjust your
          search.
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
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Select a Clinic
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            {clinics.length} clinic{clinics.length !== 1 ? "s" : ""} available
            near you
          </p>
        </div>
      </div>

      {/* Policy Alerts */}
      <div className="space-y-3">
        {/* 1 Appointment Per Day Policy */}
        <Alert className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CalendarClock className="h-5 w-5 text-primary flex-shrink-0" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-foreground">
                One Appointment Per Day Policy
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                You can only book <strong>one appointment per day</strong>{" "}
                across all clinics. This will be checked when you select a date.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Operating Hours Info */}
        <Alert className="border-green-200 dark:border-green-800/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10">
          <Info className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100">
                Flexible Booking Hours
              </p>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200/90">
                You can book at any time! Operating hours shown are
                informational. Available time slots will respect clinic
                schedules automatically.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Clinics Grid */}
      <div className="grid gap-4 sm:gap-5">
        {clinics.map((clinic) => {
          const isSelected = selectedClinic?.id === clinic.id;
          const hoursInfo = formatOperatingHours(clinic.operating_hours);
          const isDisabled = false; // Allow selection regardless of hours
          const isClosed = !hoursInfo.isOpen;
          const imageUrl =
            clinic.image_url || clinic.image || "/api/placeholder/400/300";

          return (
            <Card
              key={clinic.id}
              className={cn(
                "group transition-all duration-300 overflow-hidden border-2 cursor-pointer",
                isDisabled && "opacity-60 cursor-not-allowed",
                isSelected
                  ? "ring-2 ring-primary border-primary shadow-lg bg-primary/[0.02]"
                  : "border-border hover:border-primary/50 hover:shadow-md",
                isClosed && !isSelected && "opacity-95"
              )}
              onClick={() => !isDisabled && onClinicSelect(clinic)}
            >
              <CardContent className="p-0">
                <div
                  className={cn(
                    "grid gap-0",
                    isMobile ? "grid-cols-1" : "grid-cols-[200px_1fr]"
                  )}
                >
                  {/* Clinic Image */}
                  <div
                    className={cn(
                      "relative overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10",
                      isMobile ? "h-48" : "h-full min-h-[180px]"
                    )}
                  >
                    <img
                      src={imageUrl}
                      alt={`${clinic.name} - Dental Clinic`}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-300",
                        !isDisabled && "group-hover:scale-105",
                        isDisabled && "grayscale"
                      )}
                      onError={(e) => {
                        e.target.src = "/api/placeholder/400/300";
                      }}
                      loading="lazy"
                    />

                    {/* Status Badges Overlay */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <Badge
                        variant={hoursInfo.isOpen ? "default" : "secondary"}
                        className={cn(
                          "shadow-lg backdrop-blur-md font-medium",
                          hoursInfo.isOpen
                            ? "bg-green-500/95 hover:bg-green-600/95 text-white border-green-400/20"
                            : "bg-muted/95 text-muted-foreground"
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
                          className="bg-white/95 dark:bg-card/95 backdrop-blur-md shadow-lg border-border/20"
                        >
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" />
                          <span className="font-semibold">
                            {clinic.rating.toFixed(1)}
                          </span>
                        </Badge>
                      )}
                    </div>

                    {/* Distance Badge */}
                    {clinic.distance_km !== undefined &&
                      clinic.distance_km > 0 && (
                        <div className="absolute bottom-3 right-3">
                          <Badge className="bg-foreground/90 hover:bg-foreground text-background backdrop-blur-md shadow-lg font-medium">
                            <Navigation className="w-3 h-3 mr-1.5" />
                            {clinic.distance_km.toFixed(1)} km
                          </Badge>
                        </div>
                      )}
                  </div>

                  {/* Clinic Info */}
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={cn(
                            "font-bold text-foreground mb-1.5 line-clamp-1",
                            isMobile ? "text-lg" : "text-xl"
                          )}
                        >
                          {clinic.name}
                        </h3>

                        {clinic.total_reviews > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "w-3.5 h-3.5",
                                    i < Math.floor(clinic.rating)
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-muted/30 fill-muted/30"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              ({clinic.total_reviews})
                            </span>
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2.5">
                      {/* Address */}
                      {clinic.address && (
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {clinic.address}
                          </span>
                        </div>
                      )}

                      {/* Phone */}
                      {clinic.phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {clinic.phone}
                          </span>
                        </div>
                      )}

                      {/* Operating Hours */}
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              hoursInfo.isOpen
                                ? "text-green-600 dark:text-green-500"
                                : "text-muted-foreground"
                            )}
                          >
                            {hoursInfo.text}
                          </span>
                          {hoursInfo.isOpen && (
                            <Badge
                              variant="outline"
                              className="text-xs border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/30"
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
                        "w-full sm:w-auto mt-3",
                        isSelected && "shadow-md"
                      )}
                      disabled={isDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        !isDisabled && onClinicSelect(clinic);
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
