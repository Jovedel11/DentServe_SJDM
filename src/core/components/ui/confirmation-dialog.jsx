import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import {
  AlertTriangle,
  Shield,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Professional Confirmation Dialog Component
 * Replaces native window.confirm with a beautiful, accessible modal
 *
 * @param {boolean} open - Controls dialog visibility
 * @param {function} onOpenChange - Callback when dialog visibility changes
 * @param {function} onConfirm - Called when user confirms
 * @param {function} onCancel - Called when user cancels
 * @param {string} title - Dialog title
 * @param {string|React.ReactNode} description - Dialog description
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @param {string} variant - Visual style variant
 * @param {React.Component} icon - Icon component to display
 */
export const ConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // "default" | "warning" | "destructive" | "success" | "info"
  icon,
  children,
}) => {
  const variantStyles = {
    default: {
      iconBg: "bg-gradient-to-br from-primary/20 to-primary/10",
      iconColor: "text-primary",
      confirmClass: "bg-primary hover:bg-primary/90",
      Icon: icon || Info,
    },
    warning: {
      iconBg:
        "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900",
      iconColor: "text-amber-600 dark:text-amber-400",
      confirmClass: "bg-amber-600 hover:bg-amber-700 text-white",
      Icon: icon || AlertTriangle,
    },
    destructive: {
      iconBg: "bg-gradient-to-br from-destructive/20 to-destructive/10",
      iconColor: "text-destructive",
      confirmClass: "bg-destructive hover:bg-destructive/90",
      Icon: icon || XCircle,
    },
    success: {
      iconBg:
        "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950 dark:to-green-900",
      iconColor: "text-green-600 dark:text-green-500",
      confirmClass: "bg-green-600 hover:bg-green-700 text-white",
      Icon: icon || CheckCircle2,
    },
    info: {
      iconBg:
        "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900",
      iconColor: "text-blue-600 dark:text-blue-500",
      confirmClass: "bg-blue-600 hover:bg-blue-700 text-white",
      Icon: icon || Info,
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;
  const IconComponent = styles.Icon;

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="text-left">
          <div className="flex items-start gap-4 mb-2">
            <div
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm",
                styles.iconBg
              )}
            >
              <IconComponent
                className={cn("w-6 h-6 sm:w-7 sm:h-7", styles.iconColor)}
              />
            </div>
            <div className="flex-1 pt-1">
              <AlertDialogTitle className="text-xl sm:text-2xl font-bold">
                {title}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-base leading-relaxed text-foreground/80">
            {description}
          </AlertDialogDescription>
          {children && <div className="mt-4">{children}</div>}
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:space-x-2 gap-2">
          <AlertDialogCancel
            onClick={handleCancel}
            className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              "w-full sm:w-auto min-h-[44px] touch-manipulation font-semibold",
              styles.confirmClass
            )}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;
