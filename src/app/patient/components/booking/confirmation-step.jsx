import React, { useMemo } from "react";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  CreditCard,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import Alert from "@/core/components/Alert";

const ConfirmationStep = ({
  bookingData,
  services,
  profile,
  appointmentLimitInfo,
  crossClinicWarnings = [],
}) => {
  // Calculate totals with enhanced pricing info
  const { totalDuration, totalCost, selectedServices, estimatedRange } =
    useMemo(() => {
      const selected = services.filter((service) =>
        bookingData.services?.includes(service.id)
      );

      const minTotal = selected.reduce(
        (total, service) => total + (parseFloat(service.min_price) || 0),
        0
      );
      const maxTotal = selected.reduce(
        (total, service) => total + (parseFloat(service.max_price) || 0),
        0
      );

      return {
        totalDuration: selected.reduce(
          (total, service) => total + (service.duration_minutes || 0),
          0
        ),
        totalCost: maxTotal,
        minCost: minTotal,
        selectedServices: selected,
        estimatedRange:
          minTotal !== maxTotal
            ? `₱${minTotal} - ₱${maxTotal}`
            : `₱${maxTotal}`,
      };
    }, [services, bookingData.services]);

  // Format appointment date nicely
  const formattedDate = useMemo(() => {
    if (!bookingData.date) return "";
    return new Date(bookingData.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [bookingData.date]);

  // Calculate cancellation deadline
  const cancellationDeadline = useMemo(() => {
    if (!bookingData.date || !bookingData.time) return null;

    const appointmentDateTime = new Date(
      `${bookingData.date}T${bookingData.time}`
    );
    const policyHours = bookingData.clinic?.cancellation_policy_hours || 24;
    const deadline = new Date(
      appointmentDateTime.getTime() - policyHours * 60 * 60 * 1000
    );

    return {
      deadline: deadline.toLocaleString(),
      hours: policyHours,
    };
  }, [bookingData.date, bookingData.time, bookingData.clinic]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <CheckCircle2 className="w-6 h-6 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">
          Review & Confirm Your Appointment
        </h2>
      </div>

      {/* Enhanced Alerts */}
      <div className="space-y-4 mb-8">
        {/* Payment Notice */}
        <Alert
          type="warning"
          title="Payment Information"
          message="This booking does not include online payment. Please prepare cash payment for your appointment."
          icon={<CreditCard className="w-5 h-5" />}
        />

        {/* Cross-clinic warnings */}
        {crossClinicWarnings.length > 0 && (
          <Alert
            type="info"
            title="Care Coordination Notice"
            message={`You have ${crossClinicWarnings.length} other appointment(s) at different clinics around this time. Please inform your healthcare providers for better care coordination.`}
            icon={<Info className="w-5 h-5" />}
          />
        )}

        {/* Appointment limit info */}
        {appointmentLimitInfo?.data && (
          <Alert
            type="info"
            title="Appointment Limits"
            message={`This will be appointment ${
              appointmentLimitInfo.data.clinic_appointments + 1
            } of ${appointmentLimitInfo.data.clinic_limit} at this clinic.`}
            icon={<Info className="w-5 h-5" />}
          />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Appointment Details - Enhanced */}
        <div className="space-y-6">
          <div className="bg-muted/30 rounded-lg p-6 border">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Appointment Details
            </h3>

            <div className="space-y-4">
              {/* Clinic Info */}
              <div className="pb-4 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Clinic:
                </span>
                <p className="font-semibold text-foreground text-lg">
                  {bookingData.clinic?.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {bookingData.clinic?.address}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {bookingData.clinic?.phone}
                  </span>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="pb-4 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Doctor:
                </span>
                <p className="font-semibold text-foreground text-lg">
                  {bookingData.doctor?.name}
                </p>
                <p className="text-sm text-primary font-medium">
                  {bookingData.doctor?.specialization}
                </p>
              </div>

              {/* Date & Time Info */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Date & Time:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">
                    {formattedDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">
                    {bookingData.time} ({totalDuration} minutes)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Services Summary */}
          <div className="bg-accent/10 rounded-lg p-6 border border-accent/20">
            <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Selected Services
            </h4>
            <div className="space-y-3">
              {selectedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex justify-between items-center p-3 bg-background rounded-lg border"
                >
                  <div>
                    <span className="font-medium">{service.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {service.duration_minutes} minutes • {service.category}
                    </p>
                  </div>
                  <span className="font-semibold text-primary">
                    ₱{service.min_price}-₱{service.max_price}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <div>
                  <span className="font-bold text-lg">Estimated Total:</span>
                  <p className="text-xs text-muted-foreground">
                    Final price may vary
                  </p>
                </div>
                <span className="font-bold text-2xl text-primary">
                  {estimatedRange}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          {cancellationDeadline && (
            <div className="bg-warning/10 rounded-lg p-6 border border-warning/20">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Cancellation Policy
              </h4>
              <p className="text-sm text-foreground">
                You can cancel this appointment until{" "}
                <strong>{cancellationDeadline.deadline}</strong>
                <br />
                <span className="text-muted-foreground">
                  ({cancellationDeadline.hours} hours notice required)
                </span>
              </p>
            </div>
          )}

          {/* Symptoms/Notes */}
          {bookingData.symptoms && (
            <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Your Notes
              </h4>
              <p className="text-foreground bg-background p-3 rounded-lg border">
                {bookingData.symptoms}
              </p>
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                This will be sent to the clinic staff
              </p>
            </div>
          )}
        </div>

        {/* Patient Information - Enhanced */}
        <div className="space-y-6">
          <div className="bg-muted/30 rounded-lg p-6 border">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Patient Information
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Name:
                </span>
                <p className="font-semibold text-foreground text-lg">
                  {profile?.first_name} {profile?.last_name}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Email:
                </span>
                <p className="font-medium text-foreground">{profile?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Phone:
                </span>
                <p className="font-medium text-foreground">
                  {profile?.phone || "Not provided"}
                </p>
              </div>
            </div>

            {/* Important Notes */}
            <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/20">
              <h4 className="font-medium text-info mb-2">Important Notes:</h4>
              <ul className="text-sm text-info space-y-1">
                <li>• Please arrive 15 minutes early</li>
                <li>• Bring a valid ID and insurance card</li>
                <li>• Payment is due at the time of service</li>
                <li>
                  • Cancellations must be made{" "}
                  {cancellationDeadline?.hours || 24} hours in advance
                </li>
              </ul>
            </div>
          </div>

          {/* Cross-clinic appointments display */}
          {crossClinicWarnings.length > 0 && (
            <div className="bg-info/10 rounded-lg p-6 border border-info/20">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-info" />
                Other Appointments
              </h4>
              <div className="space-y-2">
                {crossClinicWarnings.slice(0, 3).map((appointment, index) => (
                  <div
                    key={index}
                    className="text-sm bg-background p-2 rounded border"
                  >
                    <p className="font-medium">{appointment.clinic_name}</p>
                    <p className="text-muted-foreground">
                      {new Date(
                        appointment.appointment_date
                      ).toLocaleDateString()}{" "}
                      at {appointment.appointment_time}
                    </p>
                  </div>
                ))}
                {crossClinicWarnings.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{crossClinicWarnings.length - 3} more appointments
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationStep;
