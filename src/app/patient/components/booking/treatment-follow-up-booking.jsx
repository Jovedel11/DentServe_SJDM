import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  Building,
  Stethoscope,
  CreditCard,
  Activity,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  Package,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent } from "@/core/components/ui/card";
import { Alert } from "@/core/components/ui/alert";
import Loader from "@/core/components/Loader";
import { useTreatmentPlanFollowUp } from "@/hooks/appointment/useTreatmentFollowUp";
import { cn } from "@/lib/utils";

const TreatmentFollowUpBooking = () => {
  const navigate = useNavigate();
  const { id: treatmentPlanId } = useParams();
  const location = useLocation();

  const {
    loading,
    error,
    bookingInfo,
    availableTimes,
    checkingAvailability,
    getFollowUpBookingInfo,
    checkAvailableTimesForFollowUp,
    bookFollowUpAppointment,
    isReady,
    hasRecommendedDate,
    doctorAvailable,
    clearError,
  } = useTreatmentPlanFollowUp();

  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [symptoms, setSymptoms] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ✅ Validate treatmentPlanId exists
  useEffect(() => {
    if (!treatmentPlanId) {
      console.error("❌ No treatment plan ID in URL");
      navigate("/patient/appointments/upcoming", { replace: true });
    }
  }, [treatmentPlanId, navigate]);

  // ✅ Load booking info on mount
  useEffect(() => {
    if (treatmentPlanId) {
      console.log("📋 Loading treatment plan:", treatmentPlanId);
      getFollowUpBookingInfo(treatmentPlanId);
    }
  }, [treatmentPlanId, getFollowUpBookingInfo]);

  // ✅ SIMPLIFIED: Set recommended date ONLY from staff-set next_visit_date
  useEffect(() => {
    if (isReady && bookingInfo && !selectedDate) {
      const recommendedDate = bookingInfo.recommended_date;

      if (recommendedDate) {
        console.log("📅 Using staff-set recommended date:", recommendedDate);
        setSelectedDate(recommendedDate);
        checkAvailableTimesForFollowUp(treatmentPlanId, recommendedDate);
      } else {
        console.warn("⚠️ No recommended date from staff");
      }
    }
  }, [
    isReady,
    bookingInfo,
    selectedDate,
    treatmentPlanId,
    checkAvailableTimesForFollowUp,
  ]);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setSelectedTime(null);
    checkAvailableTimesForFollowUp(treatmentPlanId, newDate);
  };

  const handleConfirm = async () => {
    if (!selectedTime || !selectedDate) {
      return;
    }

    setSubmitting(true);
    const result = await bookFollowUpAppointment({
      treatmentPlanId,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime,
      symptoms: symptoms || null,
    });

    setSubmitting(false);

    if (result.success) {
      navigate("/patient/appointments/upcoming", {
        state: { message: "Follow-up appointment booked successfully!" },
      });
    }
  };

  const handleBack = () => {
    navigate("/patient/appointments/upcoming");
  };

  // Loading state
  if (loading && !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Loading treatment plan details..." />
      </div>
    );
  }

  // Error state
  if (error && !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <div className="ml-2">
              <h3 className="font-semibold">Failed to Load Booking Info</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </Alert>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Appointments
          </Button>
        </div>
      </div>
    );
  }

  if (!isReady || !bookingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Preparing booking information..." />
      </div>
    );
  }

  const { treatment_plan, clinic, doctor, services, pricing } = bookingInfo;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Book Next Treatment Visit
          </h1>
          <p className="text-muted-foreground mt-1">
            Continue your treatment plan
          </p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Treatment Progress Card */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">
                  {treatment_plan.treatment_name}
                </h2>
              </div>
              {treatment_plan.treatment_category && (
                <Badge variant="secondary" className="mb-2">
                  {treatment_plan.treatment_category}
                </Badge>
              )}
              {treatment_plan.description && (
                <p className="text-sm text-muted-foreground">
                  {treatment_plan.description}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">
                {treatment_plan.progress_percentage || 0}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Visit {treatment_plan.next_visit_number} of{" "}
                {treatment_plan.total_visits_planned || "?"}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
              style={{ width: `${treatment_plan.progress_percentage || 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pre-filled Information */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Clinic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Clinic</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{clinic.name}</p>
              <p className="text-muted-foreground">{clinic.address}</p>
              <p className="text-muted-foreground">{clinic.phone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Doctor</h3>
            </div>
            {doctor ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">{doctor.name}</p>
                <p className="text-muted-foreground">{doctor.specialization}</p>
                <Badge
                  variant={doctor.is_available ? "default" : "destructive"}
                  className="mt-2"
                >
                  {doctor.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No doctor assigned
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      {services && services.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Treatment Services</h3>
            </div>
            <div className="space-y-2">
              {services.map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.duration_minutes} minutes
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      ₱{service.min_price?.toLocaleString()} - ₱
                      {service.max_price?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Appointment Date</h3>
          </div>

          <div className="space-y-3">
            {/* ✅ Show staff-set recommended date */}
            {bookingInfo.recommended_date && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Staff Recommended Date:</strong>{" "}
                  {new Date(bookingInfo.recommended_date).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            )}

            {/* Date Input - constrained by treatment plan dates */}
            <div className="space-y-2">
              <label
                htmlFor="appointment-date"
                className="text-sm font-medium text-foreground"
              >
                Select Date
              </label>
              <input
                id="appointment-date"
                type="date"
                value={selectedDate || ""}
                onChange={(e) => handleDateChange(e.target.value)}
                min={
                  treatment_plan?.start_date ||
                  new Date().toISOString().split("T")[0]
                }
                max={
                  treatment_plan?.expected_end_date ||
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
                className="w-full p-3 border border-border rounded-lg text-foreground bg-background focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Treatment Timeline Info */}
            {treatment_plan?.start_date &&
              treatment_plan?.expected_end_date && (
                <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span>Treatment Started:</span>
                    <span className="font-medium">
                      {new Date(treatment_plan.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected End:</span>
                    <span className="font-medium">
                      {new Date(
                        treatment_plan.expected_end_date
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Time Selection */}
      {selectedDate && availableTimes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Select Time</h3>
            </div>

            {checkingAvailability ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  Checking availability...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableTimes.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    onClick={() => setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className="text-sm"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            )}

            {!checkingAvailability && availableTimes.length === 0 && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm ml-2">
                  No available time slots for this date. Please select another
                  date.
                </p>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Symptoms (Optional) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">
              Additional Notes (Optional)
            </h3>
          </div>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Any new symptoms or concerns since last visit?"
            className="w-full p-3 border rounded-lg min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Estimated Cost</h3>
          </div>
          <div className="space-y-2 text-sm">
            {pricing.consultation_fee > 0 && (
              <div className="flex justify-between">
                <span>Consultation Fee</span>
                <span className="font-medium">
                  ₱{pricing.consultation_fee?.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total Estimated Range</span>
              <span className="font-bold text-primary">
                ₱{pricing.min_total?.toLocaleString()} - ₱
                {pricing.max_total?.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Duration: {pricing.total_duration_minutes} minutes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <div className="ml-2">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1"
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={
            !selectedTime || !selectedDate || submitting || !doctorAvailable
          }
          className="flex-1"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Appointment
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TreatmentFollowUpBooking;
