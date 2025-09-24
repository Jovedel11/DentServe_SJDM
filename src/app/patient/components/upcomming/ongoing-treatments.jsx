import React from "react";
import {
  Activity,
  User,
  Building,
  Calendar,
  Clock,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import Loader from "@/core/components/Loader";

const OngoingTreatments = ({
  treatments,
  loading,
  error,
  formatDate,
  formatTime,
}) => {
  if (!treatments.length && !loading && !error) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">
          Ongoing Treatments
        </h2>
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
          {treatments.map((treatment) => (
            <div
              key={treatment.id}
              className="bg-card rounded-xl border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {treatment.treatment_type}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{treatment.doctor_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="w-4 h-4" />
                    <span>{treatment.clinic_name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {treatment.progress}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {treatment.completed_sessions}/{treatment.total_sessions}{" "}
                    sessions
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${treatment.progress}%` }}
                  />
                </div>
              </div>

              {/* Next Appointment */}
              {treatment.next_appointment && (
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Next Session
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {formatDate(treatment.next_appointment.date)} at{" "}
                        {formatTime(treatment.next_appointment.time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      <span>{treatment.next_appointment.service_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Duration: {treatment.next_appointment.duration}
                      </span>
                    </div>
                  </div>
                  {treatment.next_appointment.cancellable && (
                    <button className="mt-3 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium">
                      Cancel Next Session
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OngoingTreatments;
