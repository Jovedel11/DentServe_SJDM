import React from "react";

const StatsCard = ({ title, value, icon, color = "primary", trend }) => (
  <div className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
      <div
        className={`w-12 h-12 rounded-lg bg-${color}/10 flex items-center justify-center`}
      >
        {icon}
      </div>
    </div>
  </div>
);

export default StatsCard;
