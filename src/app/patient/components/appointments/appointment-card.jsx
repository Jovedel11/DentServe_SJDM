import React from "react";
import {
  Clock,
  User,
  Building,
  MapPin,
  Calendar,
  Phone,
  FileText,
  Eye,
  Download,
  X,
} from "lucide-react";
import StatusBadge from "./status-badge";

const AppointmentCard = ({
  appointment,
  reminder,
  onViewDetails,
  onDownload,
  onCancel,
  formatDate,
  formatTime,
}) => {
  return (
    <div
      className={`bg-card rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
        reminder.urgent ? "ring-2 ring-warning/50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-foreground">
              {appointment.services?.map((s) => s.name).join(", ") ||
                "Appointment"}
            </h3>
            <StatusBadge status={appointment.status} urgent={reminder.urgent} />
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {reminder.message}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {appointment.doctor?.name || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Doctor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {appointment.clinic?.name || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Clinic</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">
                {appointment.clinic?.address || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Address</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {formatDate(appointment.appointment_date)}
              </p>
              <p className="text-sm text-muted-foreground">Date</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {formatTime(appointment.appointment_time)}
                {appointment.duration_minutes &&
                  ` (${appointment.duration_minutes} min)`}
              </p>
              <p className="text-sm text-muted-foreground">Time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {appointment.clinic?.phone || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Phone</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {appointment.notes && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground">Notes:</h4>
          </div>
          <p className="text-muted-foreground text-sm">{appointment.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => onViewDetails(appointment)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors font-medium"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
        <button
          onClick={() => onDownload(appointment)}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        {["confirmed", "pending"].includes(appointment.status) && (
          <button
            onClick={() => onCancel(appointment)}
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors font-medium"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;
