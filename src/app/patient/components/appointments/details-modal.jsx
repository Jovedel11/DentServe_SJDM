import React from "react";
import {
  X,
  Download,
  Stethoscope,
  User,
  Calendar,
  Phone,
  FileText,
} from "lucide-react";
import StatusBadge from "./status-badge";

const DetailsModal = ({
  appointment,
  onClose,
  onDownload,
  formatDate,
  formatTime,
}) => {
  if (!appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">
            Appointment Details
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
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
                      {appointment.services?.map((s) => s.name).join(", ") ||
                        "N/A"}
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
