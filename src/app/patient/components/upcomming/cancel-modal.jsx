import React from "react";
import { AlertTriangle, X } from "lucide-react";

const CancelModal = ({
  isOpen,
  appointment,
  canCancel,
  reason,
  eligibilityMessage,
  loading,
  onClose,
  onConfirm,
  onReasonChange,
}) => {
  if (!isOpen || !appointment) return null;

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(appointment.id, reason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <h3 className="text-xl font-bold text-foreground">
            Cancel Appointment
          </h3>
        </div>

        {!canCancel ? (
          <div>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
              <p className="text-destructive font-medium">
                {eligibilityMessage || "Outside cancellation window"}
              </p>
            </div>
            <p className="text-muted-foreground mb-6">
              Please contact the clinic directly to discuss cancellation
              options.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to cancel your appointment with{" "}
              <strong className="text-foreground">
                {appointment.clinic?.name}
              </strong>
              ?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-3">
                Reason for cancellation: *
              </label>
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Please provide a reason for cancellation..."
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                required
              />
              {!reason.trim() && (
                <p className="text-destructive text-sm mt-1">
                  Cancellation reason is required
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors font-medium"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleConfirm}
                disabled={!reason.trim() || loading}
                className="flex items-center gap-2 px-6 py-3 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Confirm Cancel
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CancelModal;
