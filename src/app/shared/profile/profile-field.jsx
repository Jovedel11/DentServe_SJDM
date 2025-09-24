import React from "react";
import { FiCheckCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";

/**
 * Reusable ProfileField Component
 * Used across: All profile forms and displays
 * Purpose: Consistent field layout with edit/view states
 */
export const ProfileField = ({
  label,
  value,
  isEditing = false,
  type = "text",
  placeholder,
  onChange,
  className,
  verified = false,
  disabled = false,
  required = false,
  options = [], // For select fields
  rows = 3, // For textarea
  ...props
}) => {
  const inputClasses = cn(
    "w-full px-4 py-3 border-2 border-border bg-input text-foreground rounded-xl text-base transition-all duration-300",
    "focus:outline-none focus:border-primary focus:ring-4 focus:ring-ring/10",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    className
  );

  const renderInput = () => {
    if (type === "select") {
      return (
        <select
          value={value || ""}
          onChange={onChange}
          className={inputClasses}
          disabled={disabled}
          {...props}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === "textarea") {
      return (
        <textarea
          value={value || ""}
          onChange={onChange}
          rows={rows}
          className={cn(inputClasses, "resize-vertical")}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
      );
    }

    return (
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        className={inputClasses}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>

      {isEditing ? (
        renderInput()
      ) : (
        <div className="flex items-center gap-2">
          <span className="py-3 text-base text-foreground flex items-center min-h-[48px] flex-1">
            {value || "Not provided"}
          </span>
          {verified && (
            <FiCheckCircle className="text-success text-lg flex-shrink-0" />
          )}
        </div>
      )}
    </div>
  );
};
