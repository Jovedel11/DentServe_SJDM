import React, { useMemo } from "react";
import {
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  AlertTriangle,
  DollarSign,
  Repeat,
  Sparkles,
  Package,
  Activity,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ServicesSelectionStep = ({
  services,
  selectedServices,
  onServiceToggle,
  isConsultationOnly = false,
  ongoingTreatments = [],
  onTreatmentSelect,
  selectedTreatment = null,
}) => {
  const isMobile = useIsMobile();
  const selectedCount = selectedServices?.length || 0;
  const maxServices = 3;

  const serviceAnalysis = useMemo(() => {
    const selected = services.filter((s) => selectedServices.includes(s.id));

    const requiresConsultation = selected.filter(
      (s) => s.requires_consultation
    );
    const noConsultationNeeded = selected.filter(
      (s) => !s.requires_consultation
    );

    return {
      selectedCount: selected.length,
      requiresConsultation,
      noConsultationNeeded,
      hasRequiresConsultation: requiresConsultation.length > 0,
      allNoConsultation:
        requiresConsultation.length === 0 && selected.length > 0,
    };
  }, [services, selectedServices]);

  // Calculate totals
  const selectedServiceDetails = services.filter((s) =>
    selectedServices?.includes(s.id)
  );

  const totalDuration = selectedServiceDetails.reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );

  const totalEstimatedCost = selectedServiceDetails.reduce((sum, s) => {
    const price = s.treatment_price || s.min_price || 0;
    return sum + price;
  }, 0);

  const hasTreatmentServices = selectedServiceDetails.some(
    (s) => s.requires_multiple_visits
  );

  // Group services by category
  const groupedServices = useMemo(() => {
    const groups = {};
    services.forEach((service) => {
      const category = service.category || "Other Services";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(service);
    });
    return groups;
  }, [services]);

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-2xl flex items-center justify-center shadow-sm">
          <Stethoscope className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
          No Services Available
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 px-4">
          This clinic hasn't added services yet.
        </p>
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          size={isMobile ? "default" : "lg"}
        >
          Choose Another Clinic
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Package className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Select Services
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Choose up to {maxServices} services, or skip for consultation only
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Alert className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
        <Info className="w-5 h-5 text-primary flex-shrink-0" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-semibold text-sm sm:text-base text-foreground">
              Consultation Only Available
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Skip service selection if you want to consult with the doctor
              first. Treatment services can be added after your consultation.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-purple-500/5 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg sm:text-xl text-foreground">
                    {selectedCount} Service{selectedCount !== 1 ? "s" : ""}{" "}
                    Selected
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {maxServices - selectedCount} slot
                  {maxServices - selectedCount !== 1 ? "s" : ""} remaining
                </p>
              </div>
              <Badge
                variant={
                  selectedCount >= maxServices ? "destructive" : "default"
                }
                className="text-sm px-3 py-1.5 font-semibold"
              >
                {selectedCount}/{maxServices}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border/50">
              {totalDuration > 0 && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs">
                      Duration
                    </span>
                    <span className="font-semibold text-foreground">
                      ~{totalDuration} min
                    </span>
                  </div>
                </div>
              )}

              {totalEstimatedCost > 0 && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs">
                      Estimated Cost
                    </span>
                    <span className="font-semibold text-foreground">
                      ₱{totalEstimatedCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {hasTreatmentServices && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                  <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
                  <span className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                    Some services require multiple visits. Treatment plan will
                    be created.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ongoing Treatments Alert */}
      {ongoingTreatments &&
        ongoingTreatments.length > 0 &&
        !selectedTreatment && (
          <Alert className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-r from-purple-50/50 to-purple-100/50 dark:from-purple-950/10 dark:to-purple-900/10">
            <Activity className="h-5 w-5 text-purple-600 dark:text-purple-500 flex-shrink-0" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold text-sm sm:text-base text-purple-900 dark:text-purple-100">
                  You have {ongoingTreatments.length} ongoing treatment
                  {ongoingTreatments.length > 1 ? "s" : ""} at this clinic
                </p>
                <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200">
                  You can link this appointment to an existing treatment plan
                  for continuity of care.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

      {/* Selected Treatment Alert */}
      {selectedTreatment && (
        <Alert className="border-green-200 dark:border-green-800/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100">
                Linked to: {selectedTreatment.treatment_name}
              </p>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                This appointment will be part of your ongoing treatment plan.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Consultation Requirements Alert */}
      {serviceAnalysis.hasRequiresConsultation && (
        <Alert className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/10 dark:to-yellow-950/10">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-amber-900 dark:text-amber-100">
                Consultation Required
              </p>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                Selected service(s) require consultation. Fee may be waived if
                you had a recent visit.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Services by Category */}
      <div className="space-y-6">
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                {category}
              </h3>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {categoryServices.map((service) => {
                const isSelected = selectedServices?.includes(service.id);
                const isDisabled = !isSelected && selectedCount >= maxServices;

                return (
                  <Card
                    key={service.id}
                    className={cn(
                      "group cursor-pointer transition-all duration-300 overflow-hidden border-2",
                      isSelected &&
                        "ring-2 ring-primary border-primary shadow-lg bg-primary/[0.02]",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      !isSelected &&
                        !isDisabled &&
                        "hover:shadow-md hover:border-primary/50"
                    )}
                    onClick={() => !isDisabled && onServiceToggle(service.id)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        {/* Service Icon */}
                        <div
                          className={cn(
                            "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-primary/10 text-primary group-hover:bg-primary/15"
                          )}
                        >
                          <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>

                        {/* Service Details */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg text-foreground mb-1.5 line-clamp-1">
                                {service.name}
                              </h3>
                              {service.category && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-medium"
                                >
                                  {service.category}
                                </Badge>
                              )}
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                  <CheckCircle2 className="w-5 h-5 text-primary" />
                                </div>
                              </div>
                            )}
                          </div>

                          {service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {service.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            {service.duration_minutes && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                  {service.duration_minutes} min
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4 text-primary" />
                              <span className="text-sm font-semibold text-primary">
                                ₱
                                {(
                                  service.treatment_price ||
                                  service.min_price ||
                                  0
                                ).toLocaleString()}
                                {service.max_price &&
                                  service.max_price !== service.min_price && (
                                    <span className="text-xs text-muted-foreground font-normal ml-1">
                                      - ₱{service.max_price.toLocaleString()}
                                    </span>
                                  )}
                              </span>
                            </div>

                            {service.requires_multiple_visits && (
                              <Badge
                                variant="outline"
                                className="text-xs font-medium"
                              >
                                <Repeat className="w-3 h-3 mr-1" />
                                {service.typical_visit_count || 2}+ visits
                              </Badge>
                            )}
                          </div>

                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={isDisabled}
                            className="w-full sm:w-auto mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              !isDisabled && onServiceToggle(service.id);
                            }}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Selected
                              </>
                            ) : isDisabled ? (
                              "Limit Reached"
                            ) : (
                              "Select Service"
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
        ))}
      </div>

      {/* Skip Guidance */}
      {selectedCount === 0 && (
        <Alert className="border-green-200 dark:border-green-800/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10">
          <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100">
                Consultation Only
              </p>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                You can proceed without selecting services. The doctor will
                recommend appropriate treatments during your visit.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ServicesSelectionStep;
