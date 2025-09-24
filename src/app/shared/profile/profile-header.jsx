import React from "react";
import { motion } from "framer-motion";
import { FiRefreshCw, FiEdit3, FiSave, FiX } from "react-icons/fi";
import { Button } from "@/core/components/ui/button";

/**
 * Reusable ProfileHeader Component
 * Used across: Patient Profile, Staff Profile, Admin Profile
 * Purpose: Consistent header with edit controls and progress
 */
export const ProfileHeader = ({
  title,
  subtitle,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onRefresh,
  saving = false,
  refreshing = false,
  completion = 0,
  showProgress = true,
}) => {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex justify-between items-start gap-6 md:flex-row flex-col">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground mb-4">{subtitle}</p>

          {/* Profile Completion */}
          {showProgress && (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-full h-2 max-w-xs">
                <motion.div
                  className="bg-gradient-to-r from-primary to-success h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completion}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {completion}% Complete
              </span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 md:w-auto w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing || saving}
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>

          {!isEditing ? (
            <Button
              onClick={onEdit}
              disabled={saving}
              className="md:flex-initial flex-1"
            >
              <FiEdit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-start gap-3 md:w-auto w-full">
              <Button
                variant="outline"
                onClick={() => onCancel()}
                disabled={saving}
                className="md:flex-initial flex-1"
              >
                <FiX className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => onSave()}
                disabled={saving}
                className="md:flex-initial flex-1"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
