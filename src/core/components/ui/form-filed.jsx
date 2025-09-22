import React from "react";

export const FormField = React.memo(({ label, children, required = false }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-3">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
});

FormField.displayName = "FormField";
