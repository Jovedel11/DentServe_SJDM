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
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
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

  // Sync selectedMonth when date changes from ANY source
  useEffect(() => {
    if (bookingData.date) {
      try {
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

  // Handle date changes with proper formatting
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

  // Memoize calendar days generation
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

  // Memoize time slot formatting
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

  // Better date formatting
  const formattedSelectedDate = useMemo(() => {
    if (!bookingData.date) return null;

    try {
      const [year, month, day] = bookingData.date.split("-").map(Number);
      const date = new Date(year, month - 1, day);

      return date.toLocaleDateString("en-US", {
        weekday: isMobile ? "short" : "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return null;
    }
  }, [bookingData.date, isMobile]);

  const hasConflict = sameDayConflict || sameDayConflictDetails;

  // Clear date and time
  const handleClearDateTime = useCallback(() => {
    if (onClearDate) {
      onClearDate();
    } else {
      onUpdateBookingData({ date: null, time: null });
    }
  }, [onClearDate, onUpdateBookingData]);

  const periodIcons = {
    morning: "🌅",
    afternoon: "☀️",
    evening: "🌙",
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Select Date & Time
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Choose your preferred appointment date and time
          </p>
        </div>
        {isMobile && (
          <Badge variant="outline" className="gap-1.5">
            <Smartphone className="w-3 h-3" />
            Mobile View
          </Badge>
        )}
      </div>

      {/* CRITICAL: Same-Day Conflict Warning */}
      {hasConflict && bookingData.date && (
        <Alert
          variant="destructive"
          className="border-2 animate-in fade-in-50 slide-in-from-top-4"
        >
          <XCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <p className="font-bold text-base sm:text-lg mb-1">
                  Cannot Book: Existing Appointment on This Date
                </p>
                <p className="text-xs sm:text-sm opacity-90">
                  You already have an appointment scheduled for the selected
                  date
                </p>
              </div>

              {sameDayConflictDetails && (
                <>
                  {/* Appointment Details Card */}
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Your Existing Appointment
                    </p>
                    <div className="space-y-2 text-xs sm:text-sm">
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
                        <strong className="text-right line-clamp-1">
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
                          className="text-xs capitalize"
                        >
                          {sameDayConflictDetails.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Policy Explanation */}
                  <div className="bg-background border rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Booking Policy
                    </p>
                    <ul className="text-xs sm:text-sm space-y-2 ml-4 list-disc marker:text-primary">
                      <li>
                        <strong>Only 1 appointment per day</strong> is allowed
                        across all clinics
                      </li>
                      <li>
                        To book another appointment on the same day, you must{" "}
                        <strong>cancel</strong> your existing one first
                      </li>
                      {sameDayConflictDetails.status === "confirmed" && (
                        <li className="text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          Your existing appointment is confirmed. Canceling may
                          affect your treatment plan.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href =
                          "/patient/appointments/upcoming")
                      }
                      className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
          </AlertDescription>
        </Alert>
      )}

      {/* Date & Time Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
        {/* Date Selection */}
        <Card
          className={cn(
            "transition-all duration-300",
            hasConflict && "opacity-50 pointer-events-none blur-[2px]"
          )}
        >
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-lg sm:text-xl font-bold">Choose Date</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  className="h-9 w-9 flex-shrink-0"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold min-w-[140px] text-center flex-1 sm:flex-none">
                  {selectedMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(1)}
                  className="h-9 w-9 flex-shrink-0"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 sm:pb-6">
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Weekday Headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="p-2 font-semibold text-muted-foreground text-xs sm:text-sm"
                    >
                      {isMobile ? day.charAt(0) : day}
                    </div>
                  )
                )}

                {/* Calendar Days */}
                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      !day.isDisabled && handleDateChange(day.dateString)
                    }
                    disabled={day.isDisabled}
                    className={cn(
                      "aspect-square p-1 text-xs sm:text-sm rounded-lg transition-all duration-200",
                      "hover:bg-muted active:scale-95 touch-manipulation font-medium",
                      "min-h-[44px]", // Minimum touch target
                      day.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/30",
                      day.isToday &&
                        "bg-primary/10 text-primary font-bold ring-2 ring-primary/30",
                      day.isSelected &&
                        "bg-primary text-primary-foreground font-bold shadow-lg ring-2 ring-primary scale-105",
                      day.isDisabled &&
                        "opacity-30 cursor-not-allowed hover:bg-transparent active:scale-100",
                      !day.isDisabled &&
                        !day.isSelected &&
                        "hover:bg-muted hover:shadow-sm hover:scale-105"
                    )}
                    aria-label={day.date.toLocaleDateString()}
                    aria-selected={day.isSelected}
                  >
                    {day.day}
                  </button>
                ))}
              </div>

              {/* Manual Input Toggle */}
              <div className="pt-4 border-t">
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
                  <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 fade-in-50">
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
                      className="w-full"
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
            "transition-all duration-300",
            hasConflict && "opacity-50 pointer-events-none blur-[2px]"
          )}
        >
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Clock className="w-5 h-5" />
              Choose Time
            </CardTitle>
            {formattedSelectedDate && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Available times for {formattedSelectedDate}
              </p>
            )}
          </CardHeader>
          <CardContent className="pb-5 sm:pb-6">
            {/* Clinic Hours Information */}
            {bookingData.clinicInfo && (
              <div className="mb-4">
                {bookingData.clinicInfo.is_closed ? (
                  <Alert className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10">
                    <Info className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                          Clinic Closed on{" "}
                          {bookingData.clinicInfo.day_of_week
                            .charAt(0)
                            .toUpperCase() +
                            bookingData.clinicInfo.day_of_week.slice(1)}
                          s
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          This clinic is normally closed on this day. Please
                          select a different date.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-primary/30 bg-primary/5">
                    <Info className="h-5 w-5 text-primary flex-shrink-0" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">Operating Hours</p>
                        <p className="text-xs text-muted-foreground">
                          Open from{" "}
                          <strong>{bookingData.clinicInfo.opening_time}</strong>{" "}
                          to{" "}
                          <strong>{bookingData.clinicInfo.closing_time}</strong>
                          {bookingData.date ===
                            new Date().toISOString().split("T")[0] && (
                            <span className="block mt-1 text-amber-700 dark:text-amber-300">
                              Same-day bookings must be at least{" "}
                              <strong>2 hours</strong> in advance
                            </span>
                          )}
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {!bookingData.date ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-muted/50 to-muted rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  Select a Date First
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                  Please choose a date to see available time slots
                </p>
              </div>
            ) : checkingAvailability ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                <Loader message="Checking available times..." />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-muted/50 to-muted rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  No Times Available
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mb-4">
                  No appointment slots available for this date
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDateTime}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Choose Different Date
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {Object.entries(groupedTimeSlots).map(([period, slots]) => (
                  <div key={period} className="space-y-3">
                    {/* Period Header */}
                    <div className="flex items-center gap-2 sticky top-0 bg-card z-10 pb-2 pt-1">
                      <Badge
                        variant="outline"
                        className="capitalize text-xs font-semibold"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {period}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {slots.length} available
                      </span>
                    </div>

                    {/* Time Slots Grid */}
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
                            "justify-center transition-all duration-200 touch-manipulation font-medium",
                            "min-h-[48px]", // Larger touch target
                            bookingData.time === slot.value &&
                              "ring-2 ring-primary shadow-lg scale-105"
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
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-purple-500/5 animate-in fade-in-50 slide-in-from-bottom-4">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-5 h-5" />
              Additional Notes (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 sm:pb-6">
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
                className="min-h-[120px] resize-none text-sm"
                maxLength={500}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Shared with clinic staff
                </span>
                <span className="font-medium">
                  {bookingData.symptoms?.length || 0}/500
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {bookingData.date && bookingData.time && !hasConflict && (
        <Alert className="border-green-200 dark:border-green-800/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10 animate-in fade-in-50 slide-in-from-bottom-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100">
                Appointment Scheduled
              </p>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                {formattedSelectedDate} at{" "}
                <strong>
                  {timeSlots.find((t) => t.value === bookingData.time)?.label}
                </strong>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DateTimeSelectionStep;
