import React from "react";
import { Filter, X } from "lucide-react";
import { Badge } from "@/core/components/ui/badge";

const FilterSection = ({
  statusFilter,
  setStatusFilter,
  bookingTypeFilter,
  setBookingTypeFilter,
  stats,
}) => {
  const hasActiveFilters =
    statusFilter !== "all" || bookingTypeFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
    setBookingTypeFilter("all");
  };

  return (
    <div className="mt-6 p-6 bg-card rounded-xl border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={statusFilter === "all" ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => setStatusFilter("all")}
            >
              All ({stats.total})
            </Badge>
            <Badge
              variant={statusFilter === "pending" ? "default" : "outline"}
              className="cursor-pointer hover:bg-warning/10 transition-colors"
              onClick={() => setStatusFilter("pending")}
            >
              Pending ({stats.pending})
            </Badge>
            <Badge
              variant={statusFilter === "confirmed" ? "default" : "outline"}
              className="cursor-pointer hover:bg-success/10 transition-colors"
              onClick={() => setStatusFilter("confirmed")}
            >
              Confirmed ({stats.confirmed})
            </Badge>
          </div>
        </div>

        {/* Booking Type Filter */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Booking Type
          </label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={bookingTypeFilter === "all" ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => setBookingTypeFilter("all")}
            >
              All ({stats.total})
            </Badge>
            <Badge
              variant={
                bookingTypeFilter === "consultation_only"
                  ? "default"
                  : "outline"
              }
              className="cursor-pointer hover:bg-blue-500/10 transition-colors"
              onClick={() => setBookingTypeFilter("consultation_only")}
            >
              Consultation ({stats.consultationOnly})
            </Badge>
            <Badge
              variant={
                ["consultation_with_service", "service_only"].includes(
                  bookingTypeFilter
                )
                  ? "default"
                  : "outline"
              }
              className="cursor-pointer hover:bg-purple-500/10 transition-colors"
              onClick={() => setBookingTypeFilter("consultation_with_service")}
            >
              With Treatment ({stats.withTreatment})
            </Badge>
            <Badge
              variant={
                bookingTypeFilter === "treatment_plan_follow_up"
                  ? "default"
                  : "outline"
              }
              className="cursor-pointer hover:bg-green-500/10 transition-colors"
              onClick={() => setBookingTypeFilter("treatment_plan_follow_up")}
            >
              Follow-up ({stats.treatmentPlanLinked})
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
