import React, { useState } from "react";
import {
  Bell,
  Send,
  Calendar,
  Heart,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { useAppointmentReminders } from "@/hooks/appointment/useAppointmentReminders";

// single Appointment Reminder Button
export const SingleReminderButton = ({
  appointment,
  variant = "outline",
  size = "sm",
}) => {
  const { sendSingleReminder, loading } = useAppointmentReminders();
  const [showDialog, setShowDialog] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    const res = await sendSingleReminder(appointment);
    setResult(res);

    if (res.success) {
      setTimeout(() => {
        setShowDialog(false);
        setResult(null);
      }, 2000);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDialog(true)}
        disabled={loading}
      >
        <Bell className="w-4 h-4 mr-2" />
        Send Reminder
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Appointment Reminder</DialogTitle>
            <DialogDescription>
              Send a reminder email to {appointment.patient?.name} for their
              appointment on{" "}
              {new Date(appointment.appointment_date).toLocaleDateString()} at{" "}
              {appointment.appointment_time}
            </DialogDescription>
          </DialogHeader>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>
                {result.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Reminder sent successfully!</span>
                  </div>
                ) : (
                  `Failed: ${result.error}`
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// bulk tomorrow's Reminders Button
export const BulkTomorrowRemindersButton = ({ appointments }) => {
  const { sendTomorrowReminders, loading } = useAppointmentReminders();
  const [showDialog, setShowDialog] = useState(false);
  const [result, setResult] = useState(null);

  // filter for tomorrow's confirmed appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const tomorrowAppointments = appointments.filter(
    (apt) => apt.appointment_date === tomorrowStr && apt.status === "confirmed"
  );

  const handleSend = async () => {
    const res = await sendTomorrowReminders(tomorrowAppointments);
    setResult(res);

    if (res.success) {
      setTimeout(() => {
        setShowDialog(false);
        setResult(null);
      }, 3000);
    }
  };

  if (tomorrowAppointments.length === 0) {
    return (
      <Button variant="outline" disabled>
        <Calendar className="w-4 h-4 mr-2" />
        No Tomorrow Appointments
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="default"
        onClick={() => setShowDialog(true)}
        disabled={loading}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Send Tomorrow's Reminders ({tomorrowAppointments.length})
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Tomorrow's Appointment Reminders</DialogTitle>
            <DialogDescription>
              Send reminder emails to {tomorrowAppointments.length} patient
              {tomorrowAppointments.length > 1 ? "s" : ""} with confirmed
              appointments tomorrow.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {tomorrowAppointments.slice(0, 10).map((apt) => (
              <div key={apt.id} className="text-sm p-2 bg-muted rounded">
                <strong>{apt.patient?.name}</strong> - {apt.appointment_time}
              </div>
            ))}
            {tomorrowAppointments.length > 10 && (
              <div className="text-sm text-muted-foreground text-center">
                +{tomorrowAppointments.length - 10} more
              </div>
            )}
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>
                {result.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>
                      Sent {result.successful}/{result.total} reminders
                      successfully!
                    </span>
                  </div>
                ) : (
                  `Failed: ${result.error}`
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send All Reminders
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// treatment Follow-up Reminder Button
export const TreatmentReminderButton = ({
  treatment,
  patient,
  clinic,
  doctor,
}) => {
  const { sendTreatmentReminder, loading } = useAppointmentReminders();
  const [showDialog, setShowDialog] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    const res = await sendTreatmentReminder(treatment, patient, clinic, doctor);
    setResult(res);

    if (res.success) {
      setTimeout(() => {
        setShowDialog(false);
        setResult(null);
      }, 2000);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        disabled={loading}
      >
        <Heart className="w-4 h-4 mr-2" />
        Send Follow-up Reminder
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Treatment Follow-up Reminder</DialogTitle>
            <DialogDescription>
              Remind {patient.first_name} to schedule their next visit for{" "}
              {treatment.treatment_name}
            </DialogDescription>
          </DialogHeader>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription>
                {result.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Reminder sent successfully!</span>
                  </div>
                ) : (
                  `Failed: ${result.error}`
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
