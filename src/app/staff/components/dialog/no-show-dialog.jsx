import React, { useState, memo } from "react";
import { UserX, AlertTriangle, Clock4, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/core/components/ui/alert";
import { Textarea } from "@/core/components/ui/text-area";
import { Label } from "@/core/components/ui/label";
import { Checkbox } from "@/core/components/ui/checkbox";

const NoShowDialog = memo(
  ({ open, onClose, appointment, onMarkNoShow, isLoading }) => {
    const [formData, setFormData] = useState({
      staffNotes: "",
      attemptedContact: false,
      rescheduleOffered: false,
    });

    const handleMarkNoShow = () => {
      onMarkNoShow(formData);
      handleReset();
    };

    const handleReset = () => {
      setFormData({
        staffNotes: "",
        attemptedContact: false,
        rescheduleOffered: false,
      });
    };

    const handleClose = () => {
      handleReset();
      onClose();
    };

    if (!appointment) return null;

    const currentNoShows =
      appointment.patient_reliability?.statistics?.no_show_count || 0;
    const completionRate =
      appointment.patient_reliability?.statistics?.completion_rate || 0;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-gray-600" />
              Mark as No-Show
            </DialogTitle>
            <DialogDescription>
              Record that {appointment.patient?.name} did not attend their
              appointment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Reliability Impact Warning */}
            {appointment.patient_reliability && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">
                  Impact on Patient Record
                </AlertTitle>
                <AlertDescription className="text-orange-700">
                  <div className="space-y-2">
                    <p>
                      This will negatively impact the patient's reliability
                      score:
                    </p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Current completion rate: {completionRate}%</li>
                      <li>• Current no-shows: {currentNoShows}</li>
                      <li>• This will be no-show #{currentNoShows + 1}</li>
                    </ul>
                    {currentNoShows >= 2 && (
                      <p className="text-sm font-medium text-red-700 mt-2">
                        ⚠️ This will move patient to HIGH RISK category
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="no-show-notes">Staff Notes</Label>
              <Textarea
                id="no-show-notes"
                placeholder="Document any attempts to contact the patient, circumstances, etc..."
                value={formData.staffNotes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    staffNotes: e.target.value,
                  }))
                }
                disabled={isLoading}
                rows={4}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Contact Attempts</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attempted-contact"
                  checked={formData.attemptedContact}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      attemptedContact: checked,
                    }))
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="attempted-contact">
                  Attempted to contact patient
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reschedule-offered"
                  checked={formData.rescheduleOffered}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      rescheduleOffered: checked,
                    }))
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="reschedule-offered">
                  Offered rescheduling opportunity
                </Label>
              </div>
            </div>

            {/* Appointment Details Summary */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Appointment Details:</h4>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(appointment.appointment_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.appointment_time}
                </p>
                <p>
                  <strong>Doctor:</strong>{" "}
                  {appointment.doctor?.name || "Unassigned"}
                </p>
                <p>
                  <strong>Duration:</strong>{" "}
                  {appointment.duration_minutes || 30} minutes
                </p>
              </div>
            </div>

            {/* Grace period information */}
            <Alert>
              <Clock4 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Grace Period Policy:</strong> Patients are marked as
                no-show only after 15 minutes past their appointment time
              </AlertDescription>
            </Alert>

            {/* Future booking impact */}
            {currentNoShows >= 1 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 text-sm">
                  <strong>Future Booking Impact:</strong> This patient may
                  require additional verification for future appointments due to
                  their no-show history.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkNoShow}
              disabled={isLoading}
              variant="secondary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4 mr-2" />
                  Mark as No-Show
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

NoShowDialog.displayName = "NoShowDialog";

export { NoShowDialog };
