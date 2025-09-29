import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
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
import Loader from "@/core/components/Loader";
import { cn } from "@/lib/utils";

const DateTimeSelectionStep = ({
  bookingData,
  availableTimes,
  checkingAvailability,
  onUpdateBookingData,
  onDateSelect,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Date Selection */}
        <Card>
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
        <Card>
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

      {/* Selection Summary */}
      {bookingData.date && bookingData.time && (
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
