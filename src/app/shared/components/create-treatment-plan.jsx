import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Calendar,
  Stethoscope,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/text-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Label } from "@/core/components/ui/label";
import { Alert } from "@/core/components/ui/alert";
import { useTreatmentPlans } from "@/hooks/appointment/useTreatmentPlans";

/**
 * ✅ NEW: Create Treatment Plan Dialog for Staff
 * Triggered after completing an appointment
 */
export const CreateTreatmentPlanDialog = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const { createTreatmentPlan, loading } = useTreatmentPlans();

  const [formData, setFormData] = useState({
    treatmentName: "",
    description: "",
    treatmentCategory: "",
    totalVisitsPlanned: "",
    followUpIntervalDays: 30,
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        treatmentName: "",
        description: "",
        treatmentCategory: "",
        totalVisitsPlanned: "",
        followUpIntervalDays: 30,
      });
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.treatmentName.trim()) {
      setError("Treatment name is required");
      return;
    }

    if (
      formData.totalVisitsPlanned &&
      parseInt(formData.totalVisitsPlanned) < 1
    ) {
      setError("Total visits must be at least 1");
      return;
    }

    try {
      const result = await createTreatmentPlan({
        patientId: appointment.patient.id || appointment.patient_id,
        clinicId: appointment.clinic.id || appointment.clinic_id,
        treatmentName: formData.treatmentName,
        description: formData.description,
        treatmentCategory: formData.treatmentCategory || null,
        totalVisitsPlanned: formData.totalVisitsPlanned
          ? parseInt(formData.totalVisitsPlanned)
          : null,
        followUpIntervalDays: parseInt(formData.followUpIntervalDays),
        initialAppointmentId: appointment.id, // Links this completed appointment as Visit #1
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess(result.treatmentPlan);
        }, 2000);
      } else {
        setError(result.error || "Failed to create treatment plan");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Create Treatment Plan
          </DialogTitle>
          <DialogDescription>
            Create a structured treatment plan for this patient. This will help
            track progress across multiple visits.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900">
                Treatment Plan Created!
              </h4>
              <p className="text-sm text-green-800 mt-1">
                The treatment plan has been successfully created and linked to
                this appointment.
              </p>
            </div>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Info */}
            <Alert>
              <Stethoscope className="w-4 h-4" />
              <div className="text-sm">
                <p>
                  <strong>Patient:</strong> {appointment.patient?.name}
                </p>
                <p>
                  <strong>Appointment:</strong>{" "}
                  {new Date(appointment.appointment_date).toLocaleDateString()}{" "}
                  - {appointment.services?.map((s) => s.name).join(", ")}
                </p>
              </div>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">{error}</p>
              </Alert>
            )}

            {/* Treatment Name */}
            <div>
              <Label htmlFor="treatmentName">
                Treatment Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="treatmentName"
                placeholder="e.g., Root Canal Treatment, Orthodontic Braces, Dental Implant"
                value={formData.treatmentName}
                onChange={(e) =>
                  setFormData({ ...formData, treatmentName: e.target.value })
                }
                required
              />
            </div>

            {/* Treatment Category */}
            <div>
              <Label htmlFor="category">Treatment Category</Label>
              <Select
                value={formData.treatmentCategory}
                onValueChange={(value) =>
                  setFormData({ ...formData, treatmentCategory: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orthodontics">Orthodontics</SelectItem>
                  <SelectItem value="endodontics">
                    Endodontics (Root Canal)
                  </SelectItem>
                  <SelectItem value="prosthodontics">
                    Prosthodontics (Implants/Dentures)
                  </SelectItem>
                  <SelectItem value="periodontics">
                    Periodontics (Gum Treatment)
                  </SelectItem>
                  <SelectItem value="oral_surgery">Oral Surgery</SelectItem>
                  <SelectItem value="cosmetic">Cosmetic Dentistry</SelectItem>
                  <SelectItem value="general">General Treatment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Treatment Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed treatment plan, procedures involved, expected outcomes..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>

            {/* Expected Visits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalVisits">Total Visits Planned</Label>
                <Input
                  id="totalVisits"
                  type="number"
                  min="1"
                  placeholder="e.g., 6"
                  value={formData.totalVisitsPlanned}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalVisitsPlanned: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty if number of visits is unknown
                </p>
              </div>

              <div>
                <Label htmlFor="interval">Follow-up Interval (days)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  value={formData.followUpIntervalDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      followUpIntervalDays: e.target.value,
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended days between visits
                </p>
              </div>
            </div>

            {/* Info Box */}
            <Alert className="bg-blue-50 border-blue-200">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p>
                  <strong>What happens next:</strong>
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>This completed appointment will be marked as Visit #1</li>
                  <li>
                    Patient will see treatment progress in their dashboard
                  </li>
                  <li>Future appointments can be auto-linked to this plan</li>
                  <li>Progress tracked automatically after each visit</li>
                </ul>
              </div>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Treatment Plan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateTreatmentPlanDialog;
