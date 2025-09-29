import React, { useMemo } from "react";
import {
  FileText,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { Alert } from "@/core/components/ui/alert";
import { cn } from "@/lib/utils";

const ServicesSelectionStep = ({
  services,
  selectedServices = [],
  onServiceToggle,
}) => {
  const { totalDuration, totalMinCost, totalMaxCost, selectedServiceDetails } =
    useMemo(() => {
      const selected = services.filter((service) =>
        selectedServices.includes(service.id)
      );

      return {
        totalDuration: selected.reduce(
          (total, service) => total + (service.duration_minutes || 0),
          0
        ),
        totalMinCost: selected.reduce(
          (total, service) => total + (parseFloat(service.min_price) || 0),
          0
        ),
        totalMaxCost: selected.reduce(
          (total, service) => total + (parseFloat(service.max_price) || 0),
          0
        ),
        selectedServiceDetails: selected,
      };
    }, [services, selectedServices]);

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatPrice = (min, max) => {
    if (min === max) return `₱${max.toLocaleString()}`;
    return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
  };

  const maxReached = selectedServices.length >= 3;
  const hasValidationErrors = totalDuration > 480; // 8 hours max

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Select Services
            </h2>
            <p className="text-muted-foreground mt-1">
              Choose up to 3 services for your appointment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={maxReached ? "destructive" : "secondary"}
            className="text-sm px-3 py-1"
          >
            {selectedServices.length}/3 selected
          </Badge>
        </div>
      </div>

      {/* Validation Alerts */}
      {hasValidationErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div>
            <strong>Duration Limit Exceeded</strong>
            <p className="text-sm mt-1">
              Total service duration ({formatDuration(totalDuration)}) exceeds
              the maximum allowed (8 hours). Please remove some services.
            </p>
          </div>
        </Alert>
      )}

      {maxReached && (
        <Alert>
          <Info className="h-4 w-4" />
          <div>
            <strong>Maximum Services Selected</strong>
            <p className="text-sm mt-1">
              You've selected the maximum number of services. Remove a service
              to add a different one.
            </p>
          </div>
        </Alert>
      )}

      {services.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              const isDisabled = !isSelected && maxReached;

              return (
                <Card
                  key={service.id}
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:shadow-md group relative",
                    isSelected &&
                      "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
                    isDisabled && "opacity-60 cursor-not-allowed",
                    !isSelected && !isDisabled && "hover:border-primary/50"
                  )}
                  onClick={() => !isDisabled && onServiceToggle(service.id)}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="pr-8">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            {formatDuration(service.duration_minutes)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <CreditCard className="w-4 h-4" />
                          <span>
                            {formatPrice(service.min_price, service.max_price)}
                          </span>
                        </div>
                      </div>

                      {service.category && (
                        <Badge variant="outline" className="text-xs w-fit">
                          {service.category}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selection Summary */}
          {selectedServices.length > 0 && (
            <div className="lg:col-span-2">
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    Selected Services Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {selectedServiceDetails.map((service, index) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                            {index + 1}
                          </span>
                          <span className="font-medium text-foreground">
                            {service.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {formatDuration(service.duration_minutes)}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatPrice(service.min_price, service.max_price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          Total Duration: {formatDuration(totalDuration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          Estimated Cost:{" "}
                          {formatPrice(totalMinCost, totalMaxCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {totalDuration > 240 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <div className="text-sm">
                        <strong>Extended Appointment</strong>
                        <p className="mt-1">
                          Your appointment duration is{" "}
                          {formatDuration(totalDuration)}. This may require
                          scheduling across multiple time slots.
                        </p>
                      </div>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Services Available
            </h3>
            <p className="text-muted-foreground">
              No services found for the selected clinic.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServicesSelectionStep;
