import React, { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const Toast = ({ message, type = "info", onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const toastConfig = {
    error: {
      bg: "bg-destructive",
      text: "text-white",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    success: {
      bg: "bg-success",
      text: "text-white",
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    info: {
      bg: "bg-primary",
      text: "text-primary-foreground",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    warning: {
      bg: "bg-warning",
      text: "text-white",
      icon: <AlertCircle className="w-5 h-5" />,
    },
  };

  const config = toastConfig[type];

  return (
    <div
      className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-lg max-w-sm border animate-fadeIn ${config.bg} ${config.text}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
