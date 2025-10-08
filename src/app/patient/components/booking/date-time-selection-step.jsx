import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  CheckCircle2,
  Smartphone,
  X,
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
import { useIsMobile } from "@/core/hooks/use-mobile";

const DateTimeSelectionStep = ({
  bookingData,
  availableTimes,
  checkingAvailability,
  onUpdateBookingData,
  onDateSelect,
  onClearDate,
  sameDayConflict,
  sameDayConflictDetails,
  bookingLimitsInfo,
}) => {
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showManualInput, setShowManualInput] = useState(false);

  // ✅ FIX: Properly sync selectedMonth when date changes from ANY source
  useEffect(() => {
    if (bookingData.date) {
      try {
        // Parse date string correctly (avoid timezone issues)
        const [year, month, day] = bookingData.date.split("-").map(Number);
        const dateObj = new Date(year, month - 1, day);

        if (
          dateObj.getMonth() !== selectedMonth.getMonth() ||
          dateObj.getFullYear() !== selectedMonth.getFullYear()
        ) {
          setSelectedMonth(new Date(year, month - 1, 1));
        }
      } catch (error) {
        console.error("Date parsing error:", error);
      }
    }
  }, [bookingData.date, selectedMonth]);

  // ✅ IMPROVED: Handle date changes with proper formatting
  const handleDateChange = useCallback(
    (dateString) => {
      try {
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          console.warn("Invalid date format:", dateString);
          return;
        }

        const [year, month, day] = dateString.split("-").map(Number);
        const selectedDate = new Date(year, month - 1, day);

        // Check if date is valid
        if (isNaN(selectedDate.getTime())) {
          console.warn("Invalid date:", dateString);
          return;
        }

        // Check if date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          console.warn("Cannot select past date");
          return;
        }

        // Update selected month if needed
        if (
          selectedDate.getMonth() !== selectedMonth.getMonth() ||
          selectedDate.getFullYear() !== selectedMonth.getFullYear()
        ) {
          setSelectedMonth(new Date(year, month - 1, 1));
        }

        // Call the appropriate handler
        if (onDateSelect) {
          onDateSelect(dateString);
        } else {
          onUpdateBookingData({
            date: dateString,
            time: null, // Reset time when date changes
          });
        }
      } catch (error) {
        console.error("Error handling date change:", error);
      }
    },
    [onDateSelect, onUpdateBookingData, selectedMonth]
  );

  const handleTimeSelect = useCallback(
    (time) => {
      onUpdateBookingData({ time });
    },
    [onUpdateBookingData]
  );

  const handleSymptomsChange = useCallback(
    (e) => {
      onUpdateBookingData({ symptoms: e.target.value });
    },
    [onUpdateBookingData]
  );

  // ✅ OPTIMIZED: Memoize calendar days generation
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

      // ✅ FIX: Use consistent date string format
      const dateString = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const isSelected = bookingData.date === dateString;

      days.push({
        date,
        dateString,
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

  const navigateMonth = useCallback((direction) => {
    setSelectedMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  }, []);

  // ✅ OPTIMIZED: Memoize time slot formatting
  const timeSlots = useMemo(() => {
    if (!Array.isArray(availableTimes)) return [];

    return availableTimes.map((time) => {
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
  }, [availableTimes]);

  const groupedTimeSlots = useMemo(() => {
    return timeSlots.reduce((acc, slot) => {
      if (!acc[slot.period]) acc[slot.period] = [];
      acc[slot.period].push(slot);
      return acc;
    }, {});
  }, [timeSlots]);

  // ✅ IMPROVED: Better date formatting
  const formattedSelectedDate = useMemo(() => {
    if (!bookingData.date) return null;

    try {
      const [year, month, day] = bookingData.date.split("-").map(Number);
      const date = new Date(year, month - 1, day);

      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return null;
    }
  }, [bookingData.date]);

  const hasConflict = sameDayConflict || sameDayConflictDetails;

  // ✅ NEW: Clear date and time
  const handleClearDateTime = useCallback(() => {
    if (onClearDate) {
      onClearDate();
    } else {
      onUpdateBookingData({ date: null, time: null });
    }
  }, [onClearDate, onUpdateBookingData]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Select Date & Time
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Choose your preferred appointment date and time
          </p>
        </div>
        {isMobile && (
          <Badge variant="outline" className="gap-1.5">
            <Smartphone className="w-3 h-3" />
            Mobile
          </Badge>
        )}
      </div>

      {/* ⚠️ CRITICAL: Same-Day Conflict Warning */}
      {hasConflict && bookingData.date && (
        <Alert
          variant="destructive"
          className="border-2 border-destructive animate-in fade-in-50 slide-in-from-top-2"
        >
          <XCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <strong className="text-base sm:text-lg block">
              ⚠️ Cannot Book: Existing Appointment on This Date
            </strong>

            {sameDayConflictDetails && (
              <>
                {/* Appointment details */}
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-semibold mb-2">
                    📅 Your Existing Appointment:
                  </p>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Date:</span>
                      <strong className="text-right">
                        {new Date(
                          sameDayConflictDetails.date
                        ).toLocaleDateString("en-US", {
                          weekday: isMobile ? "short" : "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Time:</span>
                      <strong>{sameDayConflictDetails.time}</strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Clinic:</span>
                      <strong className="text-right break-words">
                        {sameDayConflictDetails.clinicName}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Doctor:</span>
                      <strong className="text-right">
                        {sameDayConflictDetails.doctorName}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={
                          sameDayConflictDetails.status === "confirmed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {sameDayConflictDetails.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Policy explanation */}
                <div className="bg-background border rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-semibold mb-2">
                    📋 Our Booking Policy:
                  </p>
                  <ul className="text-xs sm:text-sm space-y-1.5 ml-4 list-disc marker:text-primary">
                    <li>
                      <strong>Only 1 appointment per day</strong> is allowed
                      across all clinics
                    </li>
                    <li>
                      To book another appointment on the same day, you must{" "}
                      <strong>first cancel</strong> your existing appointment
                    </li>
                    <li className="text-xs">
                      {sameDayConflictDetails.status === "confirmed" ? (
                        <span className="text-warning">
                          ⚠️ <strong>Important:</strong> Your existing
                          appointment is confirmed.
                          {!isMobile &&
                            " If it's part of an ongoing treatment, canceling may affect your treatment plan."}
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
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (window.location.href = "/patient/appointments/upcoming")
                    }
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Appointments
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearDateTime}
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Choose Different Date
                  </Button>
                </div>
              </>
            )}
          </div>
        </Alert>
      )}

      {/* Booking Limits Info */}
      {bookingData.date && !hasConflict && bookingLimitsInfo && (
        <Alert
          className={cn(
            "animate-in fade-in-50 slide-in-from-top-2",
            bookingLimitsInfo.totalPending >= bookingLimitsInfo.maxTotalPending
              ? "border-destructive bg-destructive/10"
              : "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
          )}
        >
          <Info className="h-4 w-4 flex-shrink-0" />
          <div className="text-xs sm:text-sm flex-1">
            <strong>Your Booking Status:</strong>
            <div className="mt-2 space-y-1.5">
              {bookingLimitsInfo.totalPending >=
              bookingLimitsInfo.maxTotalPending ? (
                <div className="text-destructive font-semibold flex items-start gap-2">
                  <Ban className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <strong>Booking limit reached:</strong>
                    <div className="text-xs font-normal mt-1">
                      You have{" "}
                      <strong>
                        {bookingLimitsInfo.totalPending} pending appointment(s)
                      </strong>
                      . You cannot book more until at least one is confirmed or
                      canceled.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full sm:w-auto"
                      onClick={() =>
                        (window.location.href =
                          "/patient/appointments/upcoming")
                      }
                    >
                      View My Appointments
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span>
                      <strong>Current:</strong> {bookingLimitsInfo.totalPending}
                      /{bookingLimitsInfo.maxTotalPending} pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      <strong>After this:</strong>{" "}
                      {bookingLimitsInfo.totalPending + 1}/
                      {bookingLimitsInfo.maxTotalPending}
                    </span>
                  </div>
                  {bookingLimitsInfo.totalPending + 1 >=
                  bookingLimitsInfo.maxTotalPending ? (
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs sm:text-sm font-semibold">
                        ⚠️ This will be your last available slot
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">
                        You can book{" "}
                        <strong>
                          {bookingLimitsInfo.maxTotalPending -
                            bookingLimitsInfo.totalPending -
                            1}{" "}
                          more
                        </strong>{" "}
                        after this
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Date & Time Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Date Selection */}
        <Card
          className={cn(
            "transition-all duration-200",
            hasConflict && "opacity-50 pointer-events-none blur-sm"
          )}
        >
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-lg sm:text-xl">Choose Date</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  className="h-8 w-8 flex-shrink-0"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center flex-1 sm:flex-none">
                  {selectedMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(1)}
                  className="h-8 w-8 flex-shrink-0"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-xs sm:text-sm">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="p-1 sm:p-2 font-medium text-muted-foreground text-xs"
                    >
                      {isMobile ? day.charAt(0) : day}
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
                      "aspect-square p-0.5 sm:p-2 text-xs sm:text-sm rounded-md transition-all duration-200",
                      "hover:bg-muted active:scale-95 touch-manipulation",
                      "min-h-[32px] sm:min-h-[40px]", // Minimum touch target
                      day.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40",
                      day.isToday &&
                        "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20",
                      day.isSelected &&
                        "bg-primary text-primary-foreground font-semibold shadow-md ring-2 ring-primary",
                      day.isDisabled &&
                        "opacity-30 cursor-not-allowed hover:bg-transparent",
                      !day.isDisabled &&
                        !day.isSelected &&
                        "hover:bg-muted hover:shadow-sm"
                    )}
                    aria-label={day.date.toLocaleDateString()}
                    aria-selected={day.isSelected}
                  >
                    {day.day}
                  </button>
                ))}
              </div>

              {/* Manual Input Toggle */}
              <div className="pt-3 sm:pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full text-xs sm:text-sm"
                >
                  {showManualInput ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Hide Manual Input
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Use Manual Date Input
                    </>
                  )}
                </Button>

                {showManualInput && (
                  <div className="mt-3 animate-in slide-in-from-top-2 fade-in-50">
                    <Label
                      htmlFor="date-input"
                      className="text-xs sm:text-sm font-medium"
                    >
                      Select date manually:
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
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card
          className={cn(
            "transition-all duration-200",
            hasConflict && "opacity-50 pointer-events-none blur-sm"
          )}
        >
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Clock className="w-5 h-5" />
              Choose Time
            </CardTitle>
            {formattedSelectedDate && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isMobile
                  ? "Times for selected date"
                  : `Available times for ${formattedSelectedDate}`}
              </p>
            )}
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            {!bookingData.date ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  Select a Date First
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground px-4">
                  Please choose a date to see available time slots
                </p>
              </div>
            ) : checkingAvailability ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <Loader message="Checking available times..." />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  No Times Available
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground px-4">
                  No appointment slots are available for the selected date.
                  Please choose a different date.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDateTime}
                  className="mt-4"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Choose Different Date
                </Button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {Object.entries(groupedTimeSlots).map(([period, slots]) => (
                  <div key={period} className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 sticky top-0 bg-card z-10 pb-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {period}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {slots.length} slot{slots.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "grid gap-2",
                        isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                      )}
                    >
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
                          className={cn(
                            "justify-center transition-all duration-200 touch-manipulation",
                            "min-h-[44px]", // Minimum touch target
                            bookingData.time === slot.value &&
                              "ring-2 ring-primary shadow-md"
                          )}
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

      {/* Symptoms/Notes Section */}
      {bookingData.date && bookingData.time && !hasConflict && (
        <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 animate-in fade-in-50 slide-in-from-bottom-2">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Additional Notes (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <div className="space-y-3">
              <Label
                htmlFor="symptoms"
                className="text-xs sm:text-sm font-medium"
              >
                Symptoms, concerns, or special requests:
              </Label>
              <Textarea
                id="symptoms"
                placeholder="Please describe any symptoms, concerns, or special requests that will help us prepare for your visit..."
                value={bookingData.symptoms || ""}
                onChange={handleSymptomsChange}
                className="min-h-[100px] sm:min-h-[120px] resize-none text-sm"
                maxLength={500}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Shared with clinic staff
                </span>
                <span>{bookingData.symptoms?.length || 0}/500</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {bookingData.date && bookingData.time && !hasConflict && (
        <Alert className="animate-in fade-in-50 slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <div className="flex-1">
            <strong className="text-sm sm:text-base">
              Appointment Scheduled
            </strong>
            <p className="text-xs sm:text-sm mt-1">
              {formattedSelectedDate} at{" "}
              {timeSlots.find((t) => t.value === bookingData.time)?.label}
            </p>
          </div>
        </Alert>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  );
};

export default DateTimeSelectionStep;
