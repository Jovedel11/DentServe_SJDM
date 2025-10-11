import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Building,
  Calendar,
  Clock,
  Stethoscope,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  CalendarPlus,
  TrendingUp,
  MapPin,
  Phone,
  Eye,
} from "lucide-react";
import Loader from "@/core/components/Loader";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";

const OngoingTreatments = ({
  treatments,
  loading,
  error,
  formatDate,
  formatTime,
  onViewDetails,
}) => {
  const navigate = useNavigate();

  if (!treatments.length && !loading && !error) return null;

  // ✅ Alert level styling
  const getAlertConfig = (treatment) => {
    const isOverdue =
      treatment.timeline?.is_overdue ||
      (treatment.next_visit_date &&
        new Date(treatment.next_visit_date) < new Date());

    if (isOverdue) {
      return {
        color: "destructive",
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: AlertCircle,
        label: "Overdue - Schedule ASAP",
      };
    }

    if (treatment.timeline?.days_until_next_visit != null) {
      const days = treatment.timeline.days_until_next_visit;
      if (days <= 7 && days > 0) {
        return {
          color: "warning",
          bg: "bg-orange-50",
          border: "border-orange-200",
          text: "text-orange-700",
          icon: AlertTriangle,
          label: "Coming Soon (Within 7 days)",
        };
      }
    }

    if (treatment.next_appointment) {
      return {
        color: "default",
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: Calendar,
        label: "Scheduled",
      };
    }

    return {
      color: "secondary",
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      icon: CheckCircle,
      label: "On Track",
    };
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Ongoing Treatments
            </h2>
            <p className="text-sm text-muted-foreground">
              Track your multi-visit treatment progress
            </p>
          </div>
        </div>
        {treatments.length > 0 && (
          <Badge variant="secondary" className="text-base px-3 py-1">
            {treatments.length} Active
          </Badge>
        )}
      </div>

      {loading && <Loader message="Loading treatments..." />}

      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">
              Error loading treatments: {error}
            </span>
          </div>
        </div>
      )}

      {treatments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {treatments.map((treatment) => {
            const alertConfig = getAlertConfig(treatment);
            const AlertIcon = alertConfig.icon;
            const isOverdue =
              treatment.timeline?.is_overdue ||
              (treatment.next_visit_date &&
                new Date(treatment.next_visit_date) < new Date());
            const requiresScheduling = treatment.requires_scheduling;

            return (
              <div
                key={treatment.id}
                className={`bg-card rounded-xl border-2 ${
                  isOverdue ? "border-destructive/50" : "border-border"
                } p-6 hover:shadow-lg transition-all duration-300`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {treatment.treatment_name}
                    </h3>
                    <Badge
                      variant={alertConfig.color}
                      className="mb-2 flex items-center gap-1 w-fit"
                    >
                      <AlertIcon className="w-3 h-3" />
                      {alertConfig.label}
                    </Badge>
                    {treatment.treatment_category && (
                      <p className="text-sm text-muted-foreground capitalize">
                        {treatment.treatment_category}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {Math.round(
                        treatment.progress_percentage ||
                          treatment.progress?.percentage ||
                          0
                      )}
                      %
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {treatment.visits_completed ||
                        treatment.progress?.visits_completed ||
                        0}
                      /
                      {treatment.total_visits_planned ||
                        treatment.progress?.total_visits_planned ||
                        "?"}{" "}
                      visits
                    </div>
                    {treatment.status && (
                      <Badge variant="outline" className="mt-1 capitalize">
                        {treatment.status}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        isOverdue
                          ? "bg-destructive"
                          : "bg-gradient-to-r from-primary to-primary/70"
                      }`}
                      style={{
                        width: `${Math.min(
                          treatment.progress_percentage ||
                            treatment.progress?.percentage ||
                            0,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Clinic Info */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">
                      {treatment.clinic?.name ||
                        treatment.clinic_name ||
                        "Clinic"}
                    </span>
                  </div>
                  {(treatment.clinic?.address || treatment.clinic_address) && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {treatment.clinic?.address || treatment.clinic_address}
                      </span>
                    </div>
                  )}
                  {(treatment.clinic?.phone || treatment.clinic_phone) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {treatment.clinic?.phone || treatment.clinic_phone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Timeline Info */}
                {treatment.timeline && (
                  <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                    {treatment.timeline.start_date && (
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-muted-foreground mb-1">Started</p>
                        <p className="font-medium">
                          {formatDate(treatment.timeline.start_date)}
                        </p>
                      </div>
                    )}
                    {treatment.timeline.expected_end_date && (
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-muted-foreground mb-1">
                          Expected End
                        </p>
                        <p className="font-medium">
                          {formatDate(treatment.timeline.expected_end_date)}
                        </p>
                      </div>
                    )}
                    {treatment.timeline.days_since_last_visit != null && (
                      <div className="p-2 bg-muted/20 rounded col-span-2">
                        <p className="text-muted-foreground mb-1">Last Visit</p>
                        <p className="font-medium">
                          {treatment.timeline.days_since_last_visit === 0
                            ? "Today"
                            : `${treatment.timeline.days_since_last_visit} days ago`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Overdue Warning */}
                {isOverdue && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-destructive text-sm">
                          Treatment Overdue
                        </p>
                        <p className="text-xs text-destructive/80 mt-1">
                          Please schedule your next visit as soon as possible to
                          continue your treatment plan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Appointment or Schedule Reminder */}
                {treatment.next_appointment ? (
                  <div
                    className={`p-4 ${alertConfig.bg} border ${alertConfig.border} rounded-lg mb-4`}
                  >
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Next Scheduled Visit
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">
                          {formatDate(treatment.next_appointment.date)} at{" "}
                          {formatTime(treatment.next_appointment.time)}
                        </span>
                      </div>
                      {treatment.next_appointment.doctor && (
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>
                            {treatment.next_appointment.doctor.name}
                            {treatment.next_appointment.doctor.specialization &&
                              ` - ${treatment.next_appointment.doctor.specialization}`}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {treatment.next_appointment.status}
                      </Badge>
                    </div>
                  </div>
                ) : requiresScheduling ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2 mb-3">
                      <CalendarPlus className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-900 text-sm">
                          Schedule Your Next Visit
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          {treatment.follow_up_interval_days
                            ? `Recommended interval: ${treatment.follow_up_interval_days} days`
                            : "Continue your treatment plan"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => navigate("/patient/appointments/book")}
                    >
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Schedule Next Visit
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-sm text-green-800 font-medium">
                      Treatment on track
                    </p>
                  </div>
                )}

                {/* View Details Button */}
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(treatment)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View Treatment Details
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OngoingTreatments;
