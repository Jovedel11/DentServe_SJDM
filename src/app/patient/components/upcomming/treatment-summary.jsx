import React from "react";
import { Activity, AlertCircle, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";

const TreatmentSummary = ({ summary }) => {
  if (!summary || summary.total_active === 0) return null;

  return (
    <Card className="mb-6 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Treatment Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <p className="text-2xl font-bold text-primary">
              {summary.total_active}
            </p>
            <p className="text-xs text-muted-foreground">Active Treatments</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {summary.scheduled_count}
            </p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">
              {summary.needs_scheduling}
            </p>
            <p className="text-xs text-muted-foreground">Needs Scheduling</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">
              {summary.overdue_count}
            </p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>
        {summary.completion_avg > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Average Progress
            </span>
            <Badge variant="secondary" className="text-base">
              <TrendingUp className="w-4 h-4 mr-1" />
              {Math.round(summary.completion_avg)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TreatmentSummary;
