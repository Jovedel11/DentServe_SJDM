import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, XCircle, Info, Calendar, Clock } from "lucide-react";

const CancelAppointmentModal = ({
  isOpen,
  appointment,
  canCancel,
  reason,
  onConfirm,
  onClose,
}) => {
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [loading, setLoading] = useState(false);

  const predefinedReasons = [
    "Personal emergency",
    "Schedule conflict",
    "Illness",
    "Travel plans",
    "Work commitment",
    "Family obligation",
    "Other (please specify)",
  ];

  const handleConfirm = async () => {
    if (!canCancel) return;

    const finalReason =
      selectedReason === "Other (please specify)"
        ? cancellationReason
        : selectedReason;

    if (!finalReason.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onConfirm(appointment.id, finalReason);
      setCancellationReason("");
      setSelectedReason("");
    } catch (error) {
      console.error("Error cancelling appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCancellationReason("");
    setSelectedReason("");
    onClose();
  };

  if (!isOpen || !appointment) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-card rounded-lg shadow-xl border"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              {canCancel ? (
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {canCancel ? "Cancel Appointment" : "Cannot Cancel Appointment"}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Appointment Info */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <h3 className="font-medium text-foreground">
                {appointment.service}
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(appointment.date)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatTime(appointment.time)} ({appointment.duration})
                </div>
                <div className="font-medium text-foreground">
                  Dr. {appointment.doctor}
                </div>
                <div className="text-muted-foreground">
                  {appointment.clinic}
                </div>
              </div>
            </div>

            {canCancel ? (
              /* Cancellation Form */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Reason for cancellation
                  </label>
                  <div className="space-y-2">
                    {predefinedReasons.map((reasonOption) => (
                      <label
                        key={reasonOption}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="cancellation-reason"
                          value={reasonOption}
                          checked={selectedReason === reasonOption}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">
                          {reasonOption}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedReason === "Other (please specify)" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Please specify your reason
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Please provide details..."
                      rows="3"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>
                )}

                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Cancellation Policy</p>
                      <p>
                        You can cancel appointments up to 48 hours before the
                        scheduled time. A confirmation email will be sent once
                        cancelled.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Cannot Cancel Message */
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-1">
                        Cancellation Not Allowed
                      </h4>
                      <p className="text-sm text-orange-700 dark:text-orange-400">
                        {reason}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Need to make changes?</p>
                      <p>
                        Please contact the clinic directly at{" "}
                        {appointment.contactInfo?.phone} to discuss your
                        options.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-lg transition-colors"
            >
              {canCancel ? "Keep Appointment" : "Close"}
            </button>
            {canCancel && (
              <button
                onClick={handleConfirm}
                disabled={
                  loading ||
                  !selectedReason ||
                  (selectedReason === "Other (please specify)" &&
                    !cancellationReason.trim())
                }
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Cancelling..." : "Cancel Appointment"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CancelAppointmentModal;
