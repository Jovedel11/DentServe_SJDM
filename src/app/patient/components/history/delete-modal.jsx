import { FiAlertTriangle, FiTrash2, FiLoader } from "react-icons/fi";
import { motion } from "framer-motion";

export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  appointmentDetails,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full dark:bg-red-900/20 flex-shrink-0">
            <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Permanently Delete Appointment
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              This action cannot be undone. The appointment will be permanently
              removed from your records.
            </p>
          </div>
        </div>

        {appointmentDetails && (
          <div className="bg-muted/50 rounded-lg p-3 mb-6 text-sm">
            <div className="font-medium text-foreground mb-1">
              {appointmentDetails.type}
            </div>
            <div className="text-muted-foreground space-y-1">
              <div>
                {new Date(appointmentDetails.date).toLocaleDateString()} •{" "}
                {appointmentDetails.time}
              </div>
              <div>
                {appointmentDetails.doctor} at {appointmentDetails.clinic}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : (
              <FiTrash2 className="w-4 h-4" />
            )}
            {loading ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
