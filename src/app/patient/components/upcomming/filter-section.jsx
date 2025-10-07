import React from "react";
import { Filter, Calendar, Clock, Activity, Stethoscope } from "lucide-react";

const FilterSection = ({
  statusFilter,
  setStatusFilter,
  bookingTypeFilter,
  setBookingTypeFilter,
  stats,
}) => {
  return (
    <div className="glass-effect rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Filter */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Appointment Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg border transition-all ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <div className="flex flex-col items-center">
                <Activity className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">All</span>
                <span className="text-xs opacity-75">({stats.total})</span>
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-4 py-2 rounded-lg border transition-all ${
                statusFilter === "pending"
                  ? "bg-warning text-warning-foreground border-warning shadow-md"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <div className="flex flex-col items-center">
                <Clock className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">Pending</span>
                <span className="text-xs opacity-75">({stats.pending})</span>
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("confirmed")}
              className={`px-4 py-2 rounded-lg border transition-all ${
                statusFilter === "confirmed"
                  ? "bg-success text-success-foreground border-success shadow-md"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <div className="flex flex-col items-center">
                <Calendar className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">Confirmed</span>
                <span className="text-xs opacity-75">({stats.confirmed})</span>
              </div>
            </button>
          </div>
        </div>

        {/* ✅ ONLY UPDATED: Changed stat reference */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Appointment Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBookingTypeFilter("all")}
              className={`px-4 py-2.5 rounded-lg border transition-all ${
                bookingTypeFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-medium">All Types</span>
                <span className="text-xs opacity-75">({stats.total})</span>
              </div>
            </button>

            <button
              onClick={() => setBookingTypeFilter("consultation_only")}
              className={`px-4 py-2.5 rounded-lg border transition-all ${
                bookingTypeFilter === "consultation_only"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Stethoscope className="w-4 h-4" />
                <span className="text-xs font-medium">Consultation</span>
                <span className="text-xs opacity-75">
                  ({stats.consultationOnly})
                </span>
              </div>
            </button>

            <button
              onClick={() => setBookingTypeFilter("consultation_with_service")}
              className={`px-4 py-2.5 rounded-lg border transition-all ${
                bookingTypeFilter === "consultation_with_service"
                  ? "bg-purple-600 text-white border-purple-600 shadow-md"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-medium">With Service</span>
                {/* ✅ CHANGED: from withTreatment to withServices */}
                <span className="text-xs opacity-75">
                  ({stats.withServices})
                </span>
              </div>
            </button>

            <button
              onClick={() => setBookingTypeFilter("treatment_plan_follow_up")}
              className={`px-4 py-2.5 rounded-lg border transition-all ${
                bookingTypeFilter === "treatment_plan_follow_up"
                  ? "bg-green-600 text-white border-green-600 shadow-md"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Treatment Plan</span>
                {/* ✅ CHANGED: from treatmentPlanLinked to linkedToTreatmentPlan */}
                <span className="text-xs opacity-75">
                  ({stats.linkedToTreatmentPlan})
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {(statusFilter !== "all" || bookingTypeFilter !== "all") && (
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Active filters:{" "}
              <span className="font-medium text-foreground">
                {statusFilter !== "all" && `Status: ${statusFilter}`}
                {statusFilter !== "all" && bookingTypeFilter !== "all" && " • "}
                {bookingTypeFilter !== "all" &&
                  `Type: ${bookingTypeFilter.replace(/_/g, " ")}`}
              </span>
            </p>
            <button
              onClick={() => {
                setStatusFilter("all");
                setBookingTypeFilter("all");
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSection;
