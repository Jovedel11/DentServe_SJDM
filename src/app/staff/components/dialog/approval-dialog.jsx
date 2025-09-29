import React, { useState, memo } from "react";
import {
  Check,
  AlertTriangle,
  Building,
  PhoneCall,
  Bell,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Card, CardContent } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/core/components/ui/alert";
import { Textarea } from "@/core/components/ui/text-area";
import { Label } from "@/core/components/ui/label";
import { Checkbox } from "@/core/components/ui/checkbox";
import { Separator } from "@/core/components/ui/separator";

// Import subcomponents
import { PatientReliabilityBadge } from "../manage-appointment/patient-reliability-badge";

const ApprovalDialog = memo(
  ({ open, onClose, appointment, onApprove, isLoading }) => {
    const [formData, setFormData] = useState({
      notes: "",
      sendReminder: true,
      requireConfirmation: false,
      acknowledgedWarnings: [],
    });

    const [error, setError] = useState(null);

    const handleApprove = () => {
      if (!appointment) return;

      // Validation for high-risk patients
      const isHighRisk =
        appointment.patient_reliability?.risk_level === "high_risk";
      const hasCrossClinic = appointment.cross_clinic_appointments?.length > 0;

      if (
        (isHighRisk || hasCrossClinic) &&
        formData.acknowledgedWarnings.length === 0
      ) {
        setError("Please acknowledge all warnings before proceeding");
        return;
      }

      onApprove(formData);
      handleReset();
    };

    const handleReset = () => {
      setFormData({
        notes: "",
        sendReminder: true,
        requireConfirmation: false,
        acknowledgedWarnings: [],
      });
      setError(null);
    };

    const handleClose = () => {
      handleReset();
      onClose();
    };

    if (!appointment) return null;

    const isHighRisk =
      appointment.patient_reliability?.risk_level === "high_risk";
    const isModerateRisk =
      appointment.patient_reliability?.risk_level === "moderate_risk";
    const hasCrossClinic = appointment.cross_clinic_appointments?.length > 0;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Approve Appointment
            </DialogTitle>
            <DialogDescription>
              Confirm this appointment for {appointment.patient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Quick Warning Summary */}
            {appointment && (
              <div className="space-y-4">
                {/* Patient Reliability Quick View */}
                {appointment.patient_reliability && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-blue-800">
                          Patient Reliability
                        </Label>
                        <PatientReliabilityBadge
                          reliability={appointment.patient_reliability}
                        />
                      </div>

                      {isHighRisk && (
                        <div className="space-y-2">
                          <Alert className="border-red-200 bg-red-50 p-3">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700 text-sm">
                              <strong>High-Risk Patient Alert:</strong>{" "}
                              {
                                appointment.patient_reliability.statistics
                                  ?.completion_rate
                              }
                              % completion rate
                            </AlertDescription>
                          </Alert>
                          <div className="grid grid-cols-2 gap-2">
                            {appointment.patient_reliability.approval_flags
                              ?.require_confirmation && (
                              <Badge
                                variant="outline"
                                className="text-red-600 border-red-200 justify-center"
                              >
                                <PhoneCall className="w-3 h-3 mr-1" />
                                Confirmation Call Required
                              </Badge>
                            )}
                            {appointment.patient_reliability.approval_flags
                              ?.extra_reminders && (
                              <Badge
                                variant="outline"
                                className="text-yellow-600 border-yellow-200 justify-center"
                              >
                                <Bell className="w-3 h-3 mr-1" />
                                Extra Reminders
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {isModerateRisk && (
                        <Alert className="border-yellow-200 bg-yellow-50 p-3">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-700 text-sm">
                            <strong>Moderate Risk:</strong> Send extra reminders
                            and confirm 24h before appointment
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Cross-Clinic Quick Alert */}
                {hasCrossClinic && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Building className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Cross-Clinic Coordination
                    </AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Patient has {appointment.cross_clinic_appointments.length}{" "}
                      appointment(s) at other clinics.
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 h-auto p-1 ml-2"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Approval Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="approval-notes">Staff Notes</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any notes about this approval (optional)..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Approval Options
                </Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-reminder"
                    checked={formData.sendReminder}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        sendReminder: checked,
                      }))
                    }
                    disabled={isLoading}
                  />
                  <Label htmlFor="send-reminder" className="text-sm">
                    Send confirmation reminder to patient
                  </Label>
                </div>

                {/* High-risk patient specific options */}
                {isHighRisk && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="require-confirmation"
                        checked={formData.requireConfirmation}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            requireConfirmation: checked,
                          }))
                        }
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor="require-confirmation"
                        className="text-sm font-medium text-red-700"
                      >
                        <PhoneCall className="w-3 h-3 inline mr-1" />
                        Require confirmation call 24h before appointment
                        (Recommended)
                      </Label>
                    </div>

                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-700 text-sm">
                        <strong>High-Risk Patient Protocol:</strong> Consider
                        requiring appointment deposit and send multiple
                        reminders
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {/* Moderate risk patient options */}
                {isModerateRisk && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-700 text-sm">
                      <strong>Moderate Risk Protocol:</strong> Extra reminders
                      will be sent automatically
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Warning Acknowledgment */}
              {(isHighRisk || hasCrossClinic) && (
                <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="acknowledge-risks"
                      checked={formData.acknowledgedWarnings.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const warnings = [];
                          if (isHighRisk) warnings.push("high_risk");
                          if (hasCrossClinic) warnings.push("cross_clinic");
                          setFormData((prev) => ({
                            ...prev,
                            acknowledgedWarnings: warnings,
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            acknowledgedWarnings: [],
                          }));
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="acknowledge-risks"
                      className="text-sm text-orange-700 leading-relaxed"
                    >
                      I acknowledge the patient warnings and have reviewed the
                      recommendations. I understand the risks and will follow
                      the appropriate protocols.
                    </Label>
                  </div>
                </div>
              )}
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
              onClick={handleApprove}
              disabled={
                isLoading ||
                ((isHighRisk || hasCrossClinic) &&
                  formData.acknowledgedWarnings.length === 0)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve Appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

ApprovalDialog.displayName = "ApprovalDialog";

export { ApprovalDialog };
