import React from "react";
import { Bell } from "lucide-react";
import StatusBadge from "./status-badge";

const UrgentReminders = ({ urgentAppointments, getReminderMessage }) => {
  if (urgentAppointments.length === 0) return null;

  return (
    <div className="mb-8 p-6 bg-warning/10 border border-warning/20 rounded-xl animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-6 h-6 text-warning" />
        <h3 className="text-xl font-bold text-foreground">
          Appointment Reminders
        </h3>
      </div>
      <div className="space-y-3">
        {urgentAppointments.map((appointment) => {
          const reminder = getReminderMessage(appointment);
          return (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-warning/30"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    reminder.type === "today" ? "bg-destructive" : "bg-warning"
                  }`}
                />
                <div>
                  <p className="font-medium text-foreground">
                    {appointment.clinic?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {reminder.message}
                  </p>
                </div>
              </div>
              {reminder.urgent && (
                <StatusBadge status={appointment.status} urgent={true} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UrgentReminders;
