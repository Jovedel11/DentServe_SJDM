import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const NotificationToast = ({
  isVisible,
  type,
  title,
  message,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        );
      case "error":
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "warning":
        return (
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        );
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
      case "warning":
        return "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800";
      case "info":
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800";
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed top-4 right-4 z-[100] max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className={`p-4 border rounded-lg shadow-lg backdrop-blur-sm ${getStyles()}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">{getIcon()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground mb-1">
                  {title}
                </div>
                <div className="text-sm text-muted-foreground">{message}</div>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Progress bar */}
            {duration > 0 && (
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 rounded-full"
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationToast;
