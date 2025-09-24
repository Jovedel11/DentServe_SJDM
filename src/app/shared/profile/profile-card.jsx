import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/core/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Reusable ProfileCard Component
 * Used across: Patient Profile, Staff Profile, Admin Profile, Doctor Cards
 * Purpose: Consistent card layout for profile information sections
 */
export const ProfileCard = ({
  title,
  icon: Icon,
  children,
  className,
  editMode = false,
  onEdit,
  editLabel = "Edit",
  delay = 0,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn("w-full", className)}
    >
      <Card className="border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-6 bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-3 text-xl font-semibold text-card-foreground">
              {Icon && <Icon className="w-5 h-5 text-primary flex-shrink-0" />}
              {title}
            </h3>
            {editMode && onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {editLabel}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </Card>
    </motion.div>
  );
};
