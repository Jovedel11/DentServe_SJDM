import React from "react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const SelectionCard = React.memo(
  ({
    children,
    selected = false,
    disabled = false,
    onClick,
    title,
    subtitle,
    badge,
    className,
  }) => {
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-lg group",
          selected && "border-primary bg-primary/5 shadow-md",
          disabled && "opacity-60 cursor-not-allowed",
          !selected && !disabled && "hover:border-primary/50",
          className
        )}
        onClick={disabled ? undefined : onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              {subtitle && (
                <p className="text-primary font-semibold mt-1">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {badge && <Badge variant="secondary">{badge}</Badge>}
              {selected && <Check className="w-6 h-6 text-primary" />}
            </div>
          </div>
          {children}
        </CardContent>
      </Card>
    );
  }
);

SelectionCard.displayName = "SelectionCard";
