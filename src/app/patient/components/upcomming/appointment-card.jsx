import React, { useMemo } from "react";
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
  Stethoscope,
  Activity,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import StatusBadge from "./status-badge";
import { Badge } from "@/core/components/ui/badge";

const AppointmentCard = ({
  appointment,
  reminder,
  onViewDetails,
  onDownload,
  onCancel,
  formatDate,
  formatTime,
}) => {
  // Get booking type config
  const getBookingTypeConfig = (bookingType) => {
    const configs = {
      consultation_only: {
        label: "Consultation Only",
        color: "bg-blue-100 text-blue-700 border-blue-300",
        icon: Stethoscope,
      },
      service_only: {
        label: "Service Only",
        color: "bg-green-100 text-green-700 border-green-300",
        icon: Activity,
      },
      consultation_with_service: {
        label: "Consultation + Service",
        color: "bg-purple-100 text-purple-700 border-purple-300",
        icon: Activity,
      },
      treatment_plan_follow_up: {
        label: "Treatment Follow-up",
        color: "bg-orange-100 text-orange-700 border-orange-300",
        icon: Calendar,
      },
    };
    return configs[bookingType] || configs.consultation_only;
  };

  const bookingConfig = getBookingTypeConfig(appointment.booking_type);
  const BookingIcon = bookingConfig.icon;

  const hasTreatmentPlan = appointment.treatment_plan != null;

  // ✅ ENHANCED: Calculate accurate fees based on booking type
  const feeBreakdown = useMemo(() => {
    const bookingType = appointment.booking_type;
    const services = appointment.services || [];
    const consultationFee = appointment.consultation_fee_charged || 0;

    // Calculate service fees from services array
    const serviceFees = services.reduce((total, service) => {
      // Use min_price or average of min/max price
      const servicePrice = service.min_price || 0;
      return total + servicePrice;
    }, 0);

    let totalEstimate = 0;
    let label = "Estimated Fee:";
    let breakdown = [];

    switch (bookingType) {
      case "consultation_only":
        totalEstimate = consultationFee;
        label = "Consultation Fee:";
        breakdown = [{ label: "Consultation", amount: consultationFee }];
        break;

      case "service_only":
        totalEstimate = serviceFees;
        label = "Service Fee:";
        breakdown = services.map((s) => ({
          label: s.name,
          amount: s.min_price || 0,
        }));
        break;

      case "consultation_with_service":
        totalEstimate = consultationFee + serviceFees;
        label = "Total Estimated Fee:";
        breakdown = [
          { label: "Consultation", amount: consultationFee },
          ...services.map((s) => ({
            label: s.name,
            amount: s.min_price || 0,
          })),
        ];
        break;

      case "treatment_plan_follow_up":
        // For treatment follow-ups, show service fees if available
        totalEstimate = serviceFees > 0 ? serviceFees : consultationFee;
        label = "Treatment Visit Fee:";
        breakdown =
          services.length > 0
            ? services.map((s) => ({ label: s.name, amount: s.min_price || 0 }))
            : [{ label: "Follow-up Visit", amount: consultationFee }];
        break;

      default:
        totalEstimate = consultationFee;
        label = "Estimated Fee:";
        breakdown = [{ label: "Fee", amount: consultationFee }];
    }

    return {
      total: totalEstimate,
      label,
      breakdown,
      hasBreakdown: breakdown.length > 1 || services.length > 0,
    };
  }, [
    appointment.booking_type,
    appointment.services,
    appointment.consultation_fee_charged,
  ]);

  return (
    <div
      className={`bg-card rounded-xl border p-6 hover:shadow-lg transition-all duration-300 ${
        reminder.urgent ? "ring-2 ring-warning/50" : ""
      }`}
    >
      {hasTreatmentPlan && (
        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-orange-800">
            <Activity className="w-3 h-3" />
            <span className="font-medium">Linked to Treatment:</span>
            <span>{appointment.treatment_plan.treatment_name}</span>
            {appointment.treatment_plan.progress_percentage != null && (
              <Badge variant="outline" className="ml-auto text-xs">
                {appointment.treatment_plan.progress_percentage}% complete
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-xl font-bold text-foreground">
              {appointment.services && appointment.services.length > 0
                ? appointment.services.map((s) => s.name).join(", ")
                : "Consultation Appointment"}
            </h3>
            <StatusBadge status={appointment.status} urgent={reminder.urgent} />
            <Badge
              className={`${bookingConfig.color} border text-xs font-medium`}
            >
              <BookingIcon className="w-3 h-3 mr-1" />
              {bookingConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {reminder.message}
          </p>
        </div>
      </div>

      {/* Symptoms Alert */}
      {appointment.symptoms && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Reported Symptoms:
              </p>
              <p className="text-sm text-amber-800">{appointment.symptoms}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* ✅ ENHANCED: Fee Information with Breakdown */}
      {feeBreakdown.total > 0 && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {feeBreakdown.label}
              </span>
            </div>
            <span className="font-bold text-lg text-foreground">
              ₱{Number(feeBreakdown.total).toLocaleString()}
            </span>
          </div>

          {/* ✅ NEW: Fee Breakdown */}
          {feeBreakdown.hasBreakdown && feeBreakdown.breakdown.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Breakdown:</p>
              {feeBreakdown.breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}:</span>
                  <span className="font-medium">
                    ₱{Number(item.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Note about estimates */}
          {appointment.booking_type !== "consultation_only" && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              * Actual fees may vary. Final cost will be determined at the
              clinic.
            </p>
          )}
        </div>
      )}

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
