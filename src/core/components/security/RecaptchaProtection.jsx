import { useState, useEffect } from "react";
import { Shield, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";

const RecaptchaProtection = ({
  isVisible = true,
  onVerificationChange,
  action = "form_submit",
  executeRecaptcha,
  isVerifying = false,
  verified = false,
  error = null,
  hasAttempted = false,
  showBadge = true,
  size = "normal", // 'compact', 'normal', 'large'
}) => {
  const [animationState, setAnimationState] = useState("idle"); // 'idle', 'verifying', 'success', 'error'

  // Update animation state based on props
  useEffect(() => {
    if (error) {
      setAnimationState("error");
    } else if (verified) {
      setAnimationState("success");
    } else if (isVerifying) {
      setAnimationState("verifying");
    } else if (hasAttempted) {
      setAnimationState("idle");
    } else {
      setAnimationState("ready"); // Show ready state when not attempted yet
    }
  }, [isVerifying, verified, error, hasAttempted]);

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (onVerificationChange) {
          onVerificationChange({ verified: false, error: null });
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, onVerificationChange]);

  if (!isVisible) return null;

  // Size configurations
  const sizeClasses = {
    compact: {
      container: "p-2",
      icon: 16,
      text: "text-xs",
      badge: "text-xs px-2 py-1",
    },
    normal: {
      container: "p-3",
      icon: 20,
      text: "text-sm",
      badge: "text-sm px-3 py-1.5",
    },
    large: {
      container: "p-4",
      icon: 24,
      text: "text-base",
      badge: "text-base px-4 py-2",
    },
  };

  const currentSize = sizeClasses[size];

  // Get status display info
  const getStatusInfo = () => {
    switch (animationState) {
      case "verifying":
        return {
          icon: RefreshCw,
          iconColor: "text-blue-500",
          bgColor: "bg-blue-50 border-blue-200",
          message: "Verifying security...",
          spinning: true,
        };
      case "success":
        return {
          icon: ShieldCheck,
          iconColor: "text-green-500",
          bgColor: "bg-green-50 border-green-200",
          message: "Verified by reCAPTCHA",
          spinning: false,
        };
      case "error":
        return {
          icon: AlertTriangle,
          iconColor: "text-red-500",
          bgColor: "bg-red-50 border-red-200",
          message: error || "Security verification failed",
          spinning: false,
        };
      case "ready":
      default:
        return {
          icon: Shield,
          iconColor: "text-gray-500",
          bgColor: "bg-gray-50 border-gray-200",
          message: "Protected by reCAPTCHA",
          spinning: false,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Main Protection Indicator */}
      <div
        className={`
        flex items-center space-x-2 border rounded-lg transition-all duration-300
        ${statusInfo.bgColor} ${currentSize.container}
      `}
      >
        <IconComponent
          size={currentSize.icon}
          className={`
            ${statusInfo.iconColor} transition-colors duration-300
            ${statusInfo.spinning ? "animate-spin" : ""}
          `}
        />
        <span
          className={`font-medium ${statusInfo.iconColor} ${currentSize.text}`}
        >
          {statusInfo.message}
        </span>
      </div>

      {/* Google reCAPTCHA Badge (Optional) */}
      {showBadge && (
        <div
          className={`
          flex items-center space-x-1 bg-gray-100 border border-gray-300 rounded
          ${currentSize.badge} ${currentSize.text}
        `}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className="text-blue-600"
          >
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
          <span className="text-gray-600">Google reCAPTCHA</span>
        </div>
      )}

      {/* Error Details (if any) */}
      {error && animationState === "error" && (
        <div className="text-center">
          <button
            type="button"
            onClick={executeRecaptcha}
            className={`
              text-blue-600 hover:text-blue-800 ${currentSize.text}
              flex items-center space-x-1 transition-colors duration-200
            `}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RecaptchaProtection;
