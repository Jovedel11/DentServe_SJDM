import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Clock,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  FileText,
  XCircle,
  AlertTriangle,
  Ban,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Alert } from "@/core/components/ui/alert";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/text-area";
import Loader from "@/core/components/Loader";
import { cn } from "@/lib/utils";

const DateTimeSelectionStep = ({
  bookingData,
  availableTimes,
  checkingAvailability,
  onUpdateBookingData,
  onDateSelect,
  sameDayConflict,
  sameDayConflictDetails,
  bookingLimitsInfo,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // ✅ Sync selectedMonth when date changes
  useEffect(() => {
    if (bookingData.date) {
      const dateObj = new Date(bookingData.date);
      if (
        dateObj.getMonth() !== selectedMonth.getMonth() ||
        dateObj.getFullYear() !== selectedMonth.getFullYear()
      ) {
        setSelectedMonth(dateObj);
      }
    }
  }, [bookingData.date]);

  const handleDateChange = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
    } else {
      onUpdateBookingData({
        date: date,
        time: null,
      });
    }
  };

  const handleTimeSelect = (time) => {
    onUpdateBookingData({ time });
  };

  const handleSymptomsChange = (e) => {
    onUpdateBookingData({ symptoms: e.target.value });
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      const isSelected = bookingData.date === date.toISOString().split("T")[0];

      days.push({
        date,
        dateString: date.toISOString().split("T")[0],
        day: date.getDate(),
        isCurrentMonth,
        isPast,
        isToday,
        isSelected,
        isDisabled: isPast || !isCurrentMonth,
      });
    }

    return days;
  }, [selectedMonth, bookingData.date]);

  const navigateMonth = (direction) => {
    setSelectedMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const formatTimeSlots = (times) => {
    if (!Array.isArray(times)) return [];

    return times.map((time) => {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));

      return {
        value: time,
        label: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        period:
          parseInt(hours) < 12
            ? "morning"
            : parseInt(hours) < 17
            ? "afternoon"
            : "evening",
      };
    });
  };

  const timeSlots = formatTimeSlots(availableTimes);
  const groupedTimeSlots = useMemo(() => {
    return timeSlots.reduce((acc, slot) => {
      if (!acc[slot.period]) acc[slot.period] = [];
      acc[slot.period].push(slot);
      return acc;
    }, {});
  }, [timeSlots]);

  const selectedDate = bookingData.date ? new Date(bookingData.date) : null;
  const formattedSelectedDate = selectedDate?.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ✅ NEW: Check if conflict exists
  const hasConflict = sameDayConflict || sameDayConflictDetails;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Calendar className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Select Date & Time
          </h2>
          <p className="text-muted-foreground mt-1">
            Choose your preferred appointment date and time
          </p>
        </div>
      </div>

      {/* ⚠️ CRITICAL: Same-Day Conflict Warning - Show IMMEDIATELY */}
      {hasConflict && bookingData.date && (
        <Alert variant="destructive" className="border-2 border-destructive">
          <XCircle className="h-6 w-6" />
          <div className="flex-1">
            <strong className="text-lg">
              ⚠️ Cannot Book: Existing Appointment on This Date
            </strong>

            {sameDayConflictDetails && (
              <div className="mt-3 space-y-3">
                {/* Appointment details */}
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm font-semibold mb-2">
                    📅 Your Existing Appointment:
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <strong>
                        {new Date(
                          sameDayConflictDetails.date
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <strong>{sameDayConflictDetails.time}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clinic:</span>
                      <strong>{sameDayConflictDetails.clinicName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Doctor:</span>
                      <strong>{sameDayConflictDetails.doctorName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={
                          sameDayConflictDetails.status === "confirmed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {sameDayConflictDetails.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Policy explanation */}
                <div className="bg-background border rounded-lg p-3">
                  <p className="text-sm font-semibold mb-2">
                    📋 Our Booking Policy:
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Only 1 appointment per day</strong> is allowed
                      across all clinics
                    </li>
                    <li>
                      To book another appointment on the same day, you must{" "}
                      <strong>first cancel</strong> your existing appointment
                    </li>
                    <li>
                      {sameDayConflictDetails.status === "confirmed" ? (
                        <span className="text-warning">
                          ⚠️ <strong>Important:</strong> Your existing
                          appointment is confirmed. If it's part of an ongoing
                          treatment, canceling may affect your treatment plan.
                          Please consult with your dentist before canceling.
                        </span>
                      ) : (
                        <span className="text-success">
                          ✓ Your existing appointment is pending and can be
                          canceled if needed.
                        </span>
                      )}
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (window.location.href = "/patient/appointments/upcoming")
                    }
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View & Manage Appointments
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onUpdateBookingData({ date: null, time: null })
                    }
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Choose Different Date
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Alert>
      )}

      {/* ⚠️ BOOKING POLICY REMINDER - Enhanced with limits */}
      {!hasConflict && bookingLimitsInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <div className="text-sm">
            <strong>Booking Guidelines:</strong>
            <ul className="mt-2 space-y-1 ml-4 list-disc">
              <li>
                <strong>1 appointment per day</strong> across all clinics
              </li>
              <li>
                Maximum{" "}
                <strong>
                  {bookingLimitsInfo.maxTotalPending} pending appointments
                </strong>{" "}
                at a time
              </li>
              <li>
                Book up to{" "}
                <strong>{bookingLimitsInfo.maxAdvanceDays} days</strong> in
                advance
              </li>
              <li>
                You have{" "}
                <strong>{bookingLimitsInfo.totalRemaining} slot(s)</strong>{" "}
                remaining
              </li>
            </ul>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Date Selection */}
        <Card className={cn(hasConflict && "opacity-50 pointer-events-none")}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Choose Date</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {selectedMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(1)}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="p-2 font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  )
                )}

                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      !day.isDisabled && handleDateChange(day.dateString)
                    }
                    disabled={day.isDisabled}
                    className={cn(
                      "p-2 text-sm rounded-md transition-all duration-200 hover:bg-muted",
                      day.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground",
                      day.isToday && "bg-primary/10 text-primary font-semibold",
                      day.isSelected &&
                        "bg-primary text-primary-foreground font-semibold shadow-md",
                      day.isDisabled &&
                        "opacity-40 cursor-not-allowed hover:bg-transparent",
                      !day.isDisabled && !day.isSelected && "hover:bg-muted"
                    )}
                  >
                    {day.day}
                  </button>
                ))}
              </div>

              {/* Alternative Input */}
              <div className="pt-4 border-t">
                <Label htmlFor="date-input" className="text-sm font-medium">
                  Or select date manually:
                </Label>
                <Input
                  id="date-input"
                  type="date"
                  value={bookingData.date || ""}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card className={cn(hasConflict && "opacity-50 pointer-events-none")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Choose Time
            </CardTitle>
            {formattedSelectedDate && (
              <p className="text-sm text-muted-foreground">
                Available times for {formattedSelectedDate}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!bookingData.date ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Select a Date First
                </h3>
                <p className="text-muted-foreground">
                  Please choose a date to see available time slots
                </p>
              </div>
            ) : checkingAvailability ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader message="Checking available times..." />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Times Available
                </h3>
                <p className="text-muted-foreground">
                  No appointment slots are available for the selected date.
                  Please choose a different date.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTimeSlots).map(([period, slots]) => (
                  <div key={period} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {period}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {slots.length} slot{slots.length !== 1 ? "s" : ""}{" "}
                        available
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <Button
                          key={slot.value}
                          variant={
                            bookingData.time === slot.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handleTimeSelect(slot.value)}
                          className="justify-center"
                        >
                          {slot.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Symptoms/Notes Section - Only show if NO conflict */}
      {bookingData.date && bookingData.time && !hasConflict && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Additional Notes (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="symptoms" className="text-sm font-medium">
                Symptoms, concerns, or special requests:
              </Label>
              <Textarea
                id="symptoms"
                placeholder="Please describe any symptoms, concerns, or special requests that will help us prepare for your visit..."
                value={bookingData.symptoms || ""}
                onChange={handleSymptomsChange}
                className="min-h-[120px] resize-none"
                maxLength={500}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>This information will be shared with clinic staff</span>
                <span>{bookingData.symptoms?.length || 0}/500</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary - Only show if NO conflict */}
      {bookingData.date && bookingData.time && !hasConflict && (
        <Alert>
          <Info className="h-4 w-4" />
          <div>
            <strong>Appointment Scheduled</strong>
            <p className="text-sm mt-1">
              Your appointment is scheduled for {formattedSelectedDate} at{" "}
              {timeSlots.find((t) => t.value === bookingData.time)?.label}
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default DateTimeSelectionStep;
