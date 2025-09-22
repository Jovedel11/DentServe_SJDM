import React from "react";
import { Badge } from "@/core/components/ui/badge";

export const StepContainer = React.memo(({ icon, title, badge, children }) => {
  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        </div>
        {badge && (
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20"
          >
            {badge}
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
});

StepContainer.displayName = "StepContainer";
