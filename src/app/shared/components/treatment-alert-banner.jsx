import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Star,
  X,
} from "lucide-react";
import { Alert } from "@/core/components/ui/alert";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { useNavigate } from "react-router-dom";

/**
 * ✅ NEW: Treatment Alert Banner
 * Shows on FIRST RENDER of UpcomingAppointments
 * Displays urgent treatment reminders
 */
export const TreatmentAlertBanner = ({ treatments, summary, onDismiss }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no treatments or dismissed
  if (!treatments || treatments.length === 0 || dismissed) return null;

  const urgentTreatments = treatments.filter((t) => t.alert_level === "urgent");
  const soonTreatments = treatments.filter((t) => t.alert_level === "soon");
  const needsScheduling = treatments.filter((t) => t.requires_scheduling);

  // Priority: Urgent > Needs Scheduling > Soon
  const primaryAlert =
    urgentTreatments.length > 0
      ? { type: "urgent", treatments: urgentTreatments }
      : needsScheduling.length > 0
      ? { type: "scheduling", treatments: needsScheduling }
      : soonTreatments.length > 0
      ? { type: "soon", treatments: soonTreatments }
      : null;

  if (!primaryAlert) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  // ✅ URGENT: Overdue treatments
  if (primaryAlert.type === "urgent") {
    return (
      <Alert variant="destructive" className="mb-6 border-2">
        <AlertCircle className="w-5 h-5" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-2">
                ⚠️ Treatment{urgentTreatments.length > 1 ? "s" : ""} Overdue
              </h4>
              <p className="text-sm mb-3">
                You have {urgentTreatments.length} treatment plan
                {urgentTreatments.length > 1 ? "s" : ""} that{" "}
                {urgentTreatments.length > 1 ? "are" : "is"} overdue. Please
                schedule your next visit as soon as possible to continue your
                treatment.
              </p>

              {/* List overdue treatments */}
              <div className="space-y-2 mb-4">
                {urgentTreatments.slice(0, 3).map((treatment) => (
                  <div
                    key={treatment.id}
                    className="bg-destructive/10 rounded p-2 text-sm"
                  >
                    <p className="font-semibold">{treatment.treatment_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {treatment.timeline.days_since_last_visit} days since last
                      visit •{treatment.clinic.name}
                    </p>
                  </div>
                ))}
                {urgentTreatments.length > 3 && (
                  <p className="text-xs">
                    +{urgentTreatments.length - 3} more overdue treatments
                  </p>
                )}
              </div>

              <Button
                onClick={() => navigate("/book-appointment")}
                size="sm"
                variant="default"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Now
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // ✅ NEEDS SCHEDULING: No next appointment scheduled
  if (primaryAlert.type === "scheduling") {
    return (
      <Alert className="mb-6 bg-yellow-50 border-yellow-200">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-2">
                Treatment{needsScheduling.length > 1 ? "s" : ""} Need
                {needsScheduling.length === 1 ? "s" : ""} Scheduling
              </h4>
              <p className="text-sm text-yellow-800 mb-3">
                {needsScheduling.length} treatment plan
                {needsScheduling.length > 1 ? "s" : ""} waiting for next
                appointment. Keep your treatment on track by scheduling now.
              </p>

              {needsScheduling.slice(0, 2).map((treatment) => (
                <div
                  key={treatment.id}
                  className="bg-yellow-100 rounded p-2 text-sm mb-2"
                >
                  <p className="font-medium text-yellow-900">
                    {treatment.treatment_name}
                  </p>
                  <p className="text-xs text-yellow-700">
                    Progress: {treatment.progress.visits_completed}/
                    {treatment.progress.total_visits_planned} visits •
                    {treatment.follow_up_interval_days &&
                      ` Recommended interval: ${treatment.follow_up_interval_days} days`}
                  </p>
                </div>
              ))}

              <Button
                onClick={() => navigate("/book-appointment")}
                size="sm"
                className="mt-2"
              >
                Schedule Next Visit
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // ✅ SOON: Upcoming appointments within 3 days
  if (primaryAlert.type === "soon") {
    return (
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <Calendar className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">
                Upcoming Treatment Visit{soonTreatments.length > 1 ? "s" : ""}
              </h4>
              <p className="text-sm text-blue-800">
                You have {soonTreatments.length} treatment appointment
                {soonTreatments.length > 1 ? "s" : ""} coming up in the next few
                days.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
};

export default TreatmentAlertBanner;
