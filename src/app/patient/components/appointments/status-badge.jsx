import React from "react";
import { Clock, CheckCircle2, X } from "lucide-react";

const StatusBadge = ({ status, urgent = false }) => {
  const statusConfig = {
    pending: {
      bg: "bg-warning/10",
      text: "text-warning",
      border: "border-warning/20",
      icon: <Clock className="w-3 h-3" />,
    },
    confirmed: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/20",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    cancelled: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive/20",
      icon: <X className="w-3 h-3" />,
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.icon}
      <span className="capitalize">{status}</span>
      {urgent && (
        <span className="ml-1 px-1.5 py-0.5 bg-destructive text-white rounded-full text-xs">
          URGENT
        </span>
      )}
    </div>
  );
};

export default StatusBadge;