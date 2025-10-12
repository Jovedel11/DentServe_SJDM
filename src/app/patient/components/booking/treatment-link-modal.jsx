import React from "react";
import {
  Activity,
  Calendar,
  Building,
  Stethoscope,
  ArrowRight,
  X,
  TrendingUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent } from "@/core/components/ui/card";
import { cn } from "@/lib/utils";

const TreatmentLinkModal = ({
  show,
  treatments,
  onSelectTreatment,
  onDismiss,
  loading = false,
}) => {
  if (!show || !treatments || treatments.length === 0) return null;

  const getAlertConfig = (treatment) => {
    const isOverdue = treatment.is_overdue;

    if (isOverdue) {
      return {
        color: "destructive",
        bg: "bg-red-50",
        border: "border-red-300",
        icon: AlertCircle,
        label: "Overdue",
      };
    }

    return {
      color: "default",
      bg: "bg-green-50",
      border: "border-green-300",
      icon: CheckCircle,
      label: "Active",
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-border">
        {/* Header */}
        <div className="p-6 border-b border-border bg-primary/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Ongoing Treatment Detected
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {treatments.length} active treatment
                  {treatments.length > 1 ? "s" : ""} at this clinic
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 text-sm mb-1">
                  Link to Treatment Plan?
                </p>
                <p className="text-xs text-blue-700">
                  Select a treatment below to automatically use the same doctor,
                  clinic, and services. Or continue with your current
                  selections.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {treatments.map((treatment) => {
              const alertConfig = getAlertConfig(treatment);
              const AlertIcon = alertConfig.icon;

              return (
                <Card
                  key={treatment.id}
                  className={cn(
                    "border-2 hover:border-primary transition-all cursor-pointer",
                    loading && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => !loading && onSelectTreatment(treatment.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Treatment Name & Status */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {treatment.treatment_name}
                          </h3>
                          <Badge
                            variant={alertConfig.color}
                            className="flex items-center gap-1"
                          >
                            <AlertIcon className="w-3 h-3" />
                            {alertConfig.label}
                          </Badge>
                        </div>

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span className="font-medium">
                              {treatment.visits_completed || 0}/
                              {treatment.total_visits_planned || "?"} visits
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 bg-primary rounded-full transition-all"
                              style={{
                                width: `${treatment.progress_percentage || 0}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="font-medium">
                              {treatment.clinic_name}
                            </span>
                          </div>

                          {treatment.assigned_doctor && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>
                                {treatment.assigned_doctor.name}
                                {treatment.assigned_doctor.specialization &&
                                  ` - ${treatment.assigned_doctor.specialization}`}
                              </span>
                            </div>
                          )}

                          {treatment.next_visit_due && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>
                                Next visit:{" "}
                                {new Date(
                                  treatment.next_visit_due
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Icon */}
                      <div className="flex items-center">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30">
          <Button
            variant="outline"
            className="w-full"
            onClick={onDismiss}
            disabled={loading}
          >
            Continue Without Linking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TreatmentLinkModal;
