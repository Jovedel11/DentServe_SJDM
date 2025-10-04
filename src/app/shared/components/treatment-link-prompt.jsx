import React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Alert } from "@/core/components/ui/alert";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";

/**
 * ✅ NEW: Treatment Plan Link Prompt
 * Shows during booking when patient has ongoing treatments
 */
export const TreatmentLinkPrompt = ({
  treatments,
  selectedTreatmentId,
  onSelectTreatment,
  onDismiss,
}) => {
  if (!treatments || treatments.length === 0) return null;

  const selectedTreatment = treatments.find(
    (t) => t.id === selectedTreatmentId
  );

  return (
    <Alert className="border-purple-200 bg-purple-50">
      <Activity className="w-5 h-5 text-purple-600" />
      <div className="flex-1">
        <h4 className="font-semibold text-purple-900 mb-2">
          Link to Ongoing Treatment?
        </h4>
        <p className="text-sm text-purple-800 mb-4">
          You have {treatments.length} active treatment plan
          {treatments.length > 1 ? "s" : ""}. Would you like to link this
          appointment to one of them?
        </p>

        {/* Treatment Options */}
        <div className="space-y-3 mb-4">
          {treatments.map((treatment) => {
            const isSelected = treatment.id === selectedTreatmentId;
            const isOverdue = treatment.is_overdue;

            return (
              <Card
                key={treatment.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => onSelectTreatment(treatment.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {treatment.treatment_name}
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {treatment.clinic_name}
                      </p>
                    </div>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span>
                        {treatment.visits_completed}/
                        {treatment.total_visits_planned || "?"} visits
                      </span>
                    </div>
                    <span className="font-medium text-primary">
                      {treatment.progress_percentage}% complete
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        isOverdue ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${treatment.progress_percentage}%` }}
                    />
                  </div>

                  {isOverdue && (
                    <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Next visit was due {treatment.next_visit_due}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {selectedTreatment ? (
            <>
              <Button
                size="sm"
                onClick={() => onSelectTreatment(null)}
                variant="outline"
              >
                Unlink Treatment
              </Button>
              <div className="flex-1 text-xs text-purple-800 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Appointment will be linked to:{" "}
                <strong>{selectedTreatment.treatment_name}</strong>
              </div>
            </>
          ) : (
            <>
              <Button size="sm" onClick={onDismiss} variant="ghost">
                Book as Separate Appointment
              </Button>
              <span className="text-xs text-muted-foreground flex items-center">
                You can link it later with staff assistance
              </span>
            </>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default TreatmentLinkPrompt;
