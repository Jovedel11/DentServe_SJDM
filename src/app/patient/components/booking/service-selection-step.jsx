import React, { useMemo } from "react";
import { FaTeeth } from "react-icons/fa";
import {
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
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/core/components/ui/card";
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
      <div className="text-center py-12 sm:py-16">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center">
          <FaTeeth className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2">
          No Services Available
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6">
          This clinic hasn't added services yet.
        </p>
        <Button onClick={() => window.history.back()}>
          Choose Another Clinic
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold">Select Services</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Choose up to {maxServices} services, or skip for consultation only
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Consultation Only Available
            </p>
            <p className="text-blue-800 dark:text-blue-200 text-xs sm:text-sm">
              Skip service selection if you want to consult with the doctor
              first. Treatment services can be added after your consultation.
            </p>
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">
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
                className="text-sm px-3 py-1"
              >
                {selectedCount}/{maxServices}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
              {totalDuration > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Duration: </span>
                    <span className="font-semibold">~{totalDuration} min</span>
                  </div>
                </div>
              )}

              {totalEstimatedCost > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Estimated: </span>
                    <span className="font-semibold">
                      ₱{totalEstimatedCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {hasTreatmentServices && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-start gap-2 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                  <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Some services require multiple visits. Treatment plan will
                    be created.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {ongoingTreatments &&
        ongoingTreatments.length > 0 &&
        !selectedTreatment && (
          <Alert className="mb-6 border-purple-200 bg-purple-50">
            <Activity className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-purple-900 mb-1">
                    You have {ongoingTreatments.length} ongoing treatment
                    {ongoingTreatments.length > 1 ? "s" : ""} at this clinic
                  </p>
                  <p className="text-sm text-purple-700">
                    You can link this appointment to an existing treatment plan
                    for continuity of care.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

      {/* Show selected treatment if linked */}
      {selectedTreatment && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <p className="font-medium text-green-900">
              Linked to: {selectedTreatment.treatment_name}
            </p>
            <p className="text-sm text-green-700">
              This appointment will be part of your ongoing treatment plan.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Consultation Requirements Alert */}
      {serviceAnalysis.hasRequiresConsultation && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <div className="text-sm">
            <strong className="text-amber-900 dark:text-amber-100">
              Consultation Required
            </strong>
            <p className="mt-1 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
              Selected service(s) require consultation. Fee may be waived if you
              had a recent visit.
            </p>
          </div>
        </Alert>
      )}

      {/* Services by Category */}
      <div className="space-y-6">
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FaTeeth className="w-5 h-5 text-primary" />
              {category}
            </h3>

            <div className="grid gap-3 sm:gap-4">
              {categoryServices.map((service) => {
                const isSelected = selectedServices?.includes(service.id);
                const isDisabled = !isSelected && selectedCount >= maxServices;

                return (
                  <Card
                    key={service.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 touch-manipulation overflow-hidden",
                      "border-2",
                      isSelected &&
                        "ring-2 ring-primary border-primary shadow-md bg-primary/5",
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
                            "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          <FaTeeth className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>

                        {/* Service Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base sm:text-lg text-foreground mb-1">
                                {service.name}
                              </h3>
                              {service.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {service.category}
                                </Badge>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                            )}
                          </div>

                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {service.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                            {service.duration_minutes && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {service.duration_minutes} min
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-primary">
                                ₱
                                {(
                                  service.treatment_price ||
                                  service.min_price ||
                                  0
                                ).toLocaleString()}
                                {service.max_price &&
                                  service.max_price !== service.min_price && (
                                    <span className="text-xs text-muted-foreground">
                                      {" "}
                                      - ₱{service.max_price.toLocaleString()}
                                    </span>
                                  )}
                              </span>
                            </div>

                            {service.requires_multiple_visits && (
                              <Badge variant="outline" className="text-xs">
                                <Repeat className="w-3 h-3 mr-1" />
                                {service.typical_visit_count || 2}+ visits
                              </Badge>
                            )}
                          </div>

                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={isDisabled}
                            className="w-full sm:w-auto"
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
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                💡 Consultation Only
              </p>
              <p className="text-green-800 dark:text-green-200 text-xs sm:text-sm">
                You can proceed without selecting services. The doctor will
                recommend appropriate treatments during your visit.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesSelectionStep;
