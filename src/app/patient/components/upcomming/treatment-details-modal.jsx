import React from "react";
import {
  X,
  Activity,
  Calendar,
  Building,
  User,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { useNavigate } from "react-router-dom";

const TreatmentDetailsModal = ({
  treatment,
  onClose,
  formatDate,
  formatTime,
}) => {
  const navigate = useNavigate();

  if (!treatment) return null;

  const progressPercentage = treatment.progress_percentage || 0;
  const visitsCompleted = treatment.visits_completed || 0;
  const totalVisits = treatment.total_visits_planned; // Can be null
  const visits = treatment.recent_visits || [];

  const timeline = treatment.timeline || {};
  const clinic = treatment.clinic || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {treatment.treatment_name}
              </h2>
              {treatment.treatment_category && (
                <p className="text-sm text-muted-foreground capitalize">
                  {treatment.treatment_category}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Treatment Progress
              </h3>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {Math.round(progressPercentage)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {visitsCompleted}/{totalVisits ?? "∞"} visits
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-4 overflow-hidden mb-2">
              <div
                className="h-4 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>

            <Badge
              variant={treatment.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {treatment.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Clinic Information */}
            <div className="bg-muted/30 rounded-lg p-6 border">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Clinic Information
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Clinic Name:
                  </span>
                  <p className="font-medium text-foreground">
                    {clinic.name || "N/A"}
                  </p>
                </div>
                {clinic.address && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Address:
                    </span>
                    <p className="font-medium text-foreground">
                      {clinic.address}
                    </p>
                  </div>
                )}
                {clinic.phone && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Phone:
                    </span>
                    <p className="font-medium text-foreground">
                      {clinic.phone}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Timeline
              </h4>
              <div className="space-y-3">
                {/* ✅ FIXED: Use timeline.start_date */}
                {timeline.start_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Started:
                    </span>
                    <p className="font-medium text-foreground">
                      {formatDate(timeline.start_date)}
                    </p>
                  </div>
                )}
                {/* ✅ FIXED: Use timeline.last_visit_date */}
                {timeline.last_visit_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Last Visit:
                    </span>
                    <p className="font-medium text-foreground">
                      {formatDate(timeline.last_visit_date)}
                    </p>
                  </div>
                )}
                {/* ✅ FIXED: Use timeline.expected_end_date */}
                {timeline.expected_end_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Expected End:
                    </span>
                    <p className="font-medium text-foreground">
                      {formatDate(timeline.expected_end_date)}
                    </p>
                  </div>
                )}
                {/* ✅ FIXED: Use treatment.follow_up_interval_days */}
                {treatment.follow_up_interval_days && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Follow-up Interval:
                    </span>
                    <p className="font-medium text-foreground">
                      Every {treatment.follow_up_interval_days} days
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ FIXED: Cancellation History - Use total_cancelled_attempts */}
          {treatment.total_cancelled_attempts > 0 && (
            <div className="mt-8 mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Cancellation History
              </h4>
              <p className="text-sm text-yellow-800">
                This treatment has {treatment.total_cancelled_attempts}{" "}
                cancelled booking attempt
                {treatment.total_cancelled_attempts > 1 ? "s" : ""}. These
                appointments were not completed and do not count toward your
                treatment progress.
              </p>
            </div>
          )}

          {/* ✅ FIXED: Description - Use treatment.description */}
          {treatment.description && (
            <div className="mb-8 p-6 bg-muted/30 rounded-lg border">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Treatment Description
              </h4>
              <p className="text-foreground">{treatment.description}</p>
            </div>
          )}

          {/* ✅ FIXED: Diagnosis - Use treatment.diagnosis */}
          {treatment.diagnosis && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                Diagnosis
              </h4>
              <p className="text-blue-800">{treatment.diagnosis}</p>
            </div>
          )}

          {/* Visit History */}
          {visits && visits.length > 0 && (
            <div className="mb-8">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Visit History
              </h4>
              <div className="space-y-3">
                {visits.map((visit, idx) => (
                  <div
                    key={visit.appointment_id || idx}
                    className={`p-4 rounded-lg border ${
                      visit.is_completed
                        ? "bg-success/10 border-success/30"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {visit.is_completed ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <Clock className="w-5 h-5 text-warning" />
                        )}
                        <h5 className="font-semibold text-foreground">
                          Visit #{visit.visit_number}
                        </h5>
                      </div>
                      <Badge
                        variant={visit.is_completed ? "default" : "outline"}
                      >
                        {visit.is_completed
                          ? "Completed"
                          : visit.appointment_status || "Pending"}
                      </Badge>
                    </div>
                    {visit.visit_purpose && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {visit.visit_purpose}
                      </p>
                    )}
                    {/* ✅ FIXED: Use visit.appointment_date from database */}
                    {visit.appointment_date && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(visit.appointment_date)}
                        </span>
                        {visit.appointment_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(visit.appointment_time)}
                          </span>
                        )}
                      </div>
                    )}
                    {visit.completion_notes && visit.is_completed && (
                      <p className="mt-2 text-sm text-foreground bg-muted/50 p-2 rounded">
                        {visit.completion_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ FIXED: Completed Treatment - Use treatment.status */}
          {treatment.status === "completed" && (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h4 className="font-bold text-green-900 mb-2">
                Treatment Completed!
              </h4>
              <p className="text-sm text-green-800">
                You have successfully completed all{" "}
                {totalVisits || visitsCompleted} visits for this treatment.
              </p>
              {/* ✅ FIXED: Use treatment.actual_end_date or timeline.actual_end_date */}
              {treatment.actual_end_date && (
                <p className="text-xs text-green-700 mt-2">
                  Completed on {formatDate(treatment.actual_end_date)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TreatmentDetailsModal;
