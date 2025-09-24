import React from "react";
import { motion } from "framer-motion";
import { FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

export const AlertMessage = ({
  type = "info",
  message,
  onClose,
  className,
  id, // Add unique ID prop
  ...props
}) => {
  if (!message) return null;

  const variants = {
    success: {
      bgClass: "bg-success/10 border-success/20 text-success-foreground",
      icon: FiCheckCircle,
      iconClass: "text-success",
    },
    error: {
      bgClass:
        "bg-destructive/10 border-destructive/20 text-destructive-foreground",
      icon: FiAlertCircle,
      iconClass: "text-destructive",
    },
    warning: {
      bgClass: "bg-warning/10 border-warning/20 text-warning-foreground",
      icon: FiAlertCircle,
      iconClass: "text-warning",
    },
    info: {
      bgClass: "bg-info/10 border-info/20 text-info-foreground",
      icon: FiAlertCircle,
      iconClass: "text-info",
    },
  };

  const variant = variants[type] || variants.info;
  const Icon = variant.icon;

  return (
    <motion.div
      key={id || `alert-${type}-${Date.now()}`} // Ensure unique key
      className={cn(
        "mb-6 p-4 border-2 rounded-xl flex items-center gap-3",
        variant.bgClass,
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <Icon className={cn("text-xl flex-shrink-0", variant.iconClass)} />
      <span className="font-medium flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
        >
          <FiX className="text-lg" />
        </button>
      )}
    </motion.div>
  );
};
