import React, { useMemo } from "react";
import { FaTeeth } from "react-icons/fa";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Alert, AlertDescription } from "@/core/components/ui/alert";

/**
 * ✅ STEP 2: Service Selection
 * - Services are OPTIONAL (can skip for consultation-only)
 * - Shows treatment plan info for multi-visit services
 * - Maximum 3 services
 */
const ServicesSelectionStep = ({
  services,
  selectedServices,
  onServiceToggle,
  isConsultationOnly = false,
}) => {
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

  // Calculate totals for selected services
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

  const servicesRequiringConsultation = useMemo(() => {
    return services.filter(
      (s) => selectedServices.includes(s.id) && s.requires_consultation
    );
  }, [services, selectedServices]);

  const hasServicesRequiringConsultation =
    servicesRequiringConsultation.length > 0;

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-12">
        <FaTeeth className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Services Available</h3>
        <p className="text-muted-foreground mb-4">
          This clinic hasn't added services yet.
        </p>
        <Button onClick={() => window.history.back()}>
          Choose Another Clinic
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Services (Optional)</h2>
        <p className="text-muted-foreground">
          Choose up to {maxServices} services, or skip to book consultation
          only.
        </p>
      </div>

      {/* Consultation-Only Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Consultation Only:</strong> You can skip service selection if
          you want to consult with the doctor first. Treatment services can be
          added after your consultation.
        </AlertDescription>
      </Alert>

      {/* Selected Services Summary */}
      {selectedCount > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {selectedCount} Service{selectedCount !== 1 ? "s" : ""}{" "}
                  Selected
                </span>
                <Badge
                  variant={
                    selectedCount >= maxServices ? "destructive" : "default"
                  }
                >
                  {maxServices - selectedCount} slots remaining
                </Badge>
              </div>

              {totalDuration > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Estimated duration: ~{totalDuration} minutes</span>
                </div>
              )}

              {totalEstimatedCost > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    Estimated cost:{" "}
                  </span>
                  <span className="font-semibold">
                    ₱{totalEstimatedCost.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    + doctor consultation fee
                  </span>
                </div>
              )}

              {hasTreatmentServices && (
                <Alert className="mt-2" variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Some selected services require multiple visits. Treatment
                    plan will be created.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {hasServicesRequiringConsultation && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <div className="text-sm">
            <strong className="text-amber-900">Consultation Required</strong>
            <p className="mt-1 text-amber-800">
              The following service(s) require a prior consultation or will
              include consultation:
            </p>
            <ul className="mt-2 ml-4 list-disc text-amber-800">
              {servicesRequiringConsultation.map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>
                  {s.consultation_validity_days && (
                    <span className="text-xs ml-1">
                      (Valid for {s.consultation_validity_days} days after
                      consultation)
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              💡 If you had a recent consultation at this clinic, you may be
              eligible to skip the consultation fee. This will be checked in the
              next step.
            </p>
          </div>
        </Alert>
      )}

      {serviceAnalysis.selectedCount > 0 && (
        <div className="space-y-3">
          {serviceAnalysis.hasRequiresConsultation && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div className="text-sm">
                <strong className="text-amber-900">
                  Consultation Required
                </strong>
                <p className="mt-1 text-amber-800">
                  The following service(s) require consultation:
                </p>
                <ul className="mt-2 ml-4 list-disc text-amber-800">
                  {serviceAnalysis.requiresConsultation.map((s) => (
                    <li key={s.id}>
                      <strong>{s.name}</strong>
                      {s.consultation_validity_days && (
                        <span className="text-xs ml-1">
                          (Valid for {s.consultation_validity_days} days)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 p-2 bg-amber-100 rounded text-xs">
                  <strong>What this means:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    <li>
                      You'll be charged a consultation fee in addition to
                      service costs
                    </li>
                    <li>
                      If you had a recent consultation at this clinic (within{" "}
                      {serviceAnalysis.requiresConsultation[0]
                        ?.consultation_validity_days || 30}{" "}
                      days), you may be able to skip the consultation fee
                    </li>
                    <li>
                      This will be automatically checked when you select a
                      doctor
                    </li>
                  </ul>
                </div>
              </div>
            </Alert>
          )}

          {serviceAnalysis.allNoConsultation && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="text-sm">
                <strong className="text-green-900">
                  No Consultation Required
                </strong>
                <p className="mt-1 text-green-800">
                  The selected service(s) don't require a prior consultation.
                  You can book directly!
                </p>
              </div>
            </Alert>
          )}
        </div>
      )}

      {/* Services Grid */}
      <div className="grid gap-4">
        {services.map((service) => {
          const isSelected = selectedServices?.includes(service.id);
          const isDisabled = !isSelected && selectedCount >= maxServices;

          return (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-primary" : ""
              } ${
                isDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"
              }`}
              onClick={() => !isDisabled && onServiceToggle(service.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <FaTeeth className="w-6 h-6 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold">
                          {service.name}
                        </h3>
                        {service.category && (
                          <Badge variant="secondary" className="mt-1">
                            {service.category}
                          </Badge>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-6 h-6 text-primary ml-auto" />
                      )}
                    </div>

                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {service.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {service.duration_minutes && (
                        <div>
                          <span className="text-muted-foreground">
                            Duration:
                          </span>
                          <span className="ml-2 font-medium">
                            {service.duration_minutes} min
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <span className="ml-2 font-semibold text-primary">
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
                        <div className="col-span-2">
                          <Badge variant="outline" className="text-xs">
                            📋 Requires {service.typical_visit_count || 2}+
                            visits
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    disabled={isDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      !isDisabled && onServiceToggle(service.id);
                    }}
                  >
                    {isSelected ? "Selected" : isDisabled ? "Full" : "Select"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Skip Option */}
      {selectedCount === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            💡 <strong>Tip:</strong> You can proceed without selecting services
            for consultation only. The doctor will recommend appropriate
            treatments during your visit.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ServicesSelectionStep;
