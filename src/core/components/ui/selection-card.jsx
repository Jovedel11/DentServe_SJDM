import React from "react";
import { Check } from "lucide-react";

const SelectionCard = ({
  isSelected,
  onClick,
  disabled = false,
  children,
  className = "",
}) => {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : disabled
          ? "border-muted bg-muted/30 cursor-not-allowed opacity-60"
          : "border-border hover:border-primary/50"
      } ${className}`}
    >
      <div className="relative">
        {isSelected && (
          <div className="absolute top-0 right-0">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default SelectionCard;
