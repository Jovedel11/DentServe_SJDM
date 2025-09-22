import React from "react";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import Loader from "@/core/components/Loader";

const DateTimeSelectionStep = ({
  bookingData,
  availableTimes,
  checkingAvailability,
  onUpdateBookingData,
}) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="w-6 h-6 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">
          Select Date & Time
        </h2>
      </div>

      <div className="space-y-8">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Choose Date:
          </label>
          <input
            type="date"
            value={bookingData.date || ""}
            onChange={(e) =>
              onUpdateBookingData({
                date: e.target.value,
                time: null,
              })
            }
            min={new Date().toISOString().split("T")[0]}
            className="w-full max-w-xs px-4 py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>

        {/* Time Selection */}
        {bookingData.date && (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-4">
              Available Times:
            </label>
            {checkingAvailability ? (
              <Loader message="Checking availability..." size="small" />
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => onUpdateBookingData({ time })}
                    className={`p-4 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                      bookingData.time === time
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-muted">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  No available times for this date.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please select a different date.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Symptoms/Notes */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Symptoms/Notes (Optional):
          </label>
          <textarea
            value={bookingData.symptoms || ""}
            onChange={(e) => onUpdateBookingData({ symptoms: e.target.value })}
            placeholder="Describe any symptoms, concerns, or special requests..."
            rows={4}
            className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            This information will be shared with the clinic staff to help them
            prepare for your visit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DateTimeSelectionStep;
