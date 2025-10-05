import React from "react";
import {
  X,
  Download,
  Stethoscope,
  User,
  Calendar,
  Phone,
  FileText,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react";
import StatusBadge from "./status-badge";
import { Badge } from "@/core/components/ui/badge";

const DetailsModal = ({
  appointment,
  onClose,
  onDownload,
  formatDate,
  formatTime,
}) => {
  if (!appointment) return null;

  // Get booking type config
  const getBookingTypeConfig = (bookingType) => {
    const configs = {
      consultation_only: {
        label: "Consultation Only",
        color: "bg-blue-100 text-blue-700",
      },
      service_only: {
        label: "Service Only",
        color: "bg-green-100 text-green-700",
      },
      consultation_with_service: {
        label: "Consultation + Service",
        color: "bg-purple-100 text-purple-700",
      },
      treatment_plan_follow_up: {
        label: "Treatment Follow-up",
        color: "bg-orange-100 text-orange-700",
      },
    };
    return configs[bookingType] || configs.consultation_only;
  };

  const bookingConfig = getBookingTypeConfig(appointment.booking_type);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Appointment Details
            </h2>
            <Badge className={`${bookingConfig.color} mt-2`}>
              {bookingConfig.label}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Symptoms Alert */}
          {appointment.symptoms && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">
                    Reported Symptoms
                  </p>
                  <p className="text-sm text-amber-800">
                    {appointment.symptoms}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Service Information */}
              <div className="bg-muted/30 rounded-lg p-6 border">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  Service Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Services:
                    </span>
                    <p className="font-medium text-foreground">
                      {appointment.services && appointment.services.length > 0
                        ? appointment.services.map((s) => s.name).join(", ")
                        : "Consultation Only"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Status:
                    </span>
                    <div className="mt-1">
                      <StatusBadge status={appointment.status} />
                    </div>
                  </div>
                  {appointment.duration_minutes && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Duration:
                      </span>
                      <p className="font-medium text-foreground">
                        {appointment.duration_minutes} minutes
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Healthcare Provider */}
              <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Healthcare Provider
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Doctor:
                    </span>
                    <p className="font-medium text-foreground">
                      {appointment.doctor?.name || "N/A"}
                    </p>
                    {appointment.doctor?.specialization && (
                      <p className="text-sm text-primary font-medium">
                        {appointment.doctor.specialization}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Clinic:
                    </span>
                    <p className="font-medium text-foreground">
                      {appointment.clinic?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Address:
                    </span>
                    <p className="font-medium text-foreground">
                      {appointment.clinic?.address || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Consultation Fee */}
              {appointment.consultation_fee_charged != null && (
                <div className="bg-accent/10 rounded-lg p-6 border border-accent/20">
                  <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Fee Information
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Consultation Fee:
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                      ₱
                      {Number(
                        appointment.consultation_fee_charged
                      ).toLocaleString()}
                    </span>
                  </div>
                  {appointment.booking_type === "service_only" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      * Consultation fee waived for this appointment
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Schedule */}
              <div className="bg-accent/10 rounded-lg p-6 border border-accent/20">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Schedule
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Date:
                    </span>
                    <p className="font-medium text-foreground">
                      {formatDate(appointment.appointment_date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Time:
                    </span>
                    <p className="font-medium text-foreground">
                      {formatTime(appointment.appointment_time)}
                      {appointment.duration_minutes &&
                        ` (${appointment.duration_minutes} min)`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-muted/30 rounded-lg p-6 border">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Phone:
                    </span>
                    <p className="font-medium text-foreground">
                      {appointment.clinic?.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Email:
                    </span>
                    <p className="font-medium text-foreground">
                      {appointment.clinic?.email || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-info/10 rounded-lg p-6 border border-info/20">
                <h4 className="font-medium text-info mb-2">Important Notes:</h4>
                <ul className="text-sm text-info space-y-1">
                  <li>• Please arrive 15 minutes early</li>
                  <li>• Bring a valid ID and insurance card</li>
                  <li>• Payment is due at the time of service</li>
                  <li>• Cancellations must be made 24 hours in advance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="mt-8 p-4 bg-muted/30 rounded-lg border">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Notes
              </h4>
              <p className="text-foreground">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={() => onDownload(appointment)}
            className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Download Details
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;
