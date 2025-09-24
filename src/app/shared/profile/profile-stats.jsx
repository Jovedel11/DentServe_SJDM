import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Reusable ProfileStats Component
 * Used across: Patient Profile, Staff Profile, Doctor Cards
 * Purpose: Display statistics in consistent card format
 */
export const ProfileStats = ({ stats, className }) => {
  const getStatCardClasses = (color) => {
    const baseClasses =
      "flex items-start gap-4 p-4 rounded-xl border-2 border-transparent transition-all duration-300 hover:-translate-y-0.5 md:flex-row flex-col md:items-start items-center text-center md:text-left";

    const colorClasses = {
      primary:
        "bg-gradient-to-br from-primary/10 to-primary/20 border-primary/20",
      success:
        "bg-gradient-to-br from-success/10 to-success/20 border-success/20",
      warning:
        "bg-gradient-to-br from-warning/10 to-warning/20 border-warning/20",
      info: "bg-gradient-to-br from-info/10 to-info/20 border-info/20",
    };

    return cn(baseClasses, colorClasses[color] || colorClasses.primary);
  };

  const getStatIconClasses = (color) => {
    const baseClasses =
      "w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0";

    const colorClasses = {
      primary: "bg-primary",
      success: "bg-success",
      warning: "bg-warning",
      info: "bg-info",
    };

    return cn(baseClasses, colorClasses[color] || colorClasses.primary);
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            className={getStatCardClasses(stat.color)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <div className={getStatIconClasses(stat.color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
