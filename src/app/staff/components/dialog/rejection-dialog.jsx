import React, { useState, memo } from "react";
import { X, AlertCircle, Info, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Textarea } from "@/core/components/ui/text-area";
import { Label } from "@/core/components/ui/label";
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

const RejectionDialog = memo(
  ({ open, onClose, appointment, onReject, isLoading }) => {
    const [formData, setFormData] = useState({
      reason: "",
      category: "other",
      suggestReschedule: false,
    });

    const [error, setError] = useState(null);

    const handleReject = () => {
      if (!formData.reason.trim()) {
        setError("Rejection reason is required");
        return;
      }

      if (formData.reason.length < 10) {
        setError(
          "Please provide a more detailed reason (minimum 10 characters)"
        );
        return;
      }

      onReject(formData);
      handleReset();
    };

    const handleReset = () => {
      setFormData({
        reason: "",
        category: "other",
        suggestReschedule: false,
      });
      setError(null);
    };

    const handleClose = () => {
      handleReset();
      onClose();
    };

    if (!appointment) return null;

    const rejectionCategories = [
      { value: "other", label: "Other" },
      { value: "doctor_unavailable", label: "Doctor Unavailable" },
      { value: "overbooked", label: "Overbooked" },
      { value: "patient_request", label: "Patient Request" },
      { value: "system_error", label: "System Error" },
      { value: "staff_decision", label: "Staff Decision" },
    ];

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              Reject Appointment
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this appointment for{" "}
              {appointment.patient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="rejection-category">Rejection Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {rejectionCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this appointment is being rejected..."
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                disabled={isLoading}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.reason.length}/500 characters
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="suggest-reschedule"
                checked={formData.suggestReschedule}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    suggestReschedule: checked,
                  }))
                }
                disabled={isLoading}
              />
              <Label htmlFor="suggest-reschedule">
                Suggest rescheduling to patient
              </Label>
            </div>

            {/* Patient impact notice */}
            {appointment.patient_reliability && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-sm">
                  <strong>Patient Impact:</strong> Rejection will be recorded
                  but won't affect reliability score since it's a clinic
                  decision.
                </AlertDescription>
              </Alert>
            )}

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
                {appointment.services && appointment.services.length > 0 && (
                  <p>
                    <strong>Services:</strong>{" "}
                    {appointment.services.map((s) => s.name).join(", ")}
                  </p>
                )}
              </div>
            </div>
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
              onClick={handleReject}
              disabled={!formData.reason.trim() || isLoading}
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Reject Appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

RejectionDialog.displayName = "RejectionDialog";

export { RejectionDialog };
