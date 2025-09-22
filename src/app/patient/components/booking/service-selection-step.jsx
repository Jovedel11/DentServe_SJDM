import React, { useMemo } from "react";
import { FileText, Clock, CreditCard, CheckCircle2 } from "lucide-react";
import SelectionCard from "@/core/components/ui/selection-card";

const ServicesSelectionStep = ({
  services,
  selectedServices = [],
  onServiceToggle,
}) => {
  const { totalDuration, totalCost, selectedServiceDetails } = useMemo(() => {
    const selected = services.filter((service) =>
      selectedServices.includes(service.id)
    );

    return {
      totalDuration: selected.reduce(
        (total, service) => total + (service.duration_minutes || 0),
        0
      ),
      totalCost: selected.reduce(
        (total, service) => total + (parseFloat(service.max_price) || 0),
        0
      ),
      selectedServiceDetails: selected,
    };
  }, [services, selectedServices]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold text-foreground">
            Select Services
          </h2>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-full">
          <span className="text-primary font-medium">
            {selectedServices.length}/3 selected
          </span>
        </div>
      </div>

      <p className="text-muted-foreground mb-8 text-lg">
        Choose up to 3 services for your appointment
      </p>

      {services.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {services.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              const maxReached = selectedServices.length >= 3;

              return (
                <SelectionCard
                  key={service.id}
                  isSelected={isSelected}
                  disabled={maxReached && !isSelected}
                  onClick={() => onServiceToggle(service.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {service.name}
                    </h4>
                  </div>

                  {service.description && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {service.duration_minutes} minutes
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        ₱{service.min_price} - ₱{service.max_price}
                      </div>
                    </div>
                  </div>

                  <span className="inline-block px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                    {service.category}
                  </span>
                </SelectionCard>
              );
            })}
          </div>

          {/* Selected Services Summary */}
          {selectedServices.length > 0 && (
            <div className="p-6 bg-accent/10 rounded-xl border border-accent/20">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Selected Services Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-medium">
                    Total Duration: {totalDuration} minutes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span className="font-bold text-lg">
                    Estimated Total: ₱{totalCost}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No services available
          </h3>
          <p className="text-muted-foreground">
            No services found for this clinic.
          </p>
        </div>
      )}
    </div>
  );
};

export default ServicesSelectionStep;
