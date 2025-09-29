import React, { useState, memo } from "react";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

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
import { Label } from "@/core/components/ui/label";
import { Checkbox } from "@/core/components/ui/checkbox";

// Import warning display components
import { PatientReliabilityDashboard } from "../manage-appointment/patient-realibility-dashboard";
import { CrossClinicWarning } from "../manage-appointment/cross-clinic-warning";

const WarningValidationDialog = memo(
  ({ open, onClose, validationData, appointment, onProceed }) => {
    const [acknowledgedWarnings, setAcknowledgedWarnings] = useState([]);

    const handleProceed = () => {
      if (validationData?.actionType) {
        onProceed(validationData.actionType);
      }
      setAcknowledgedWarnings([]);
    };

    const handleClose = () => {
      setAcknowledgedWarnings([]);
      onClose();
    };

    const handleAcknowledgeAll = (checked) => {
      if (checked) {
        const allCategories =
          validationData?.warnings?.map((w) => w.category) || [];
        setAcknowledgedWarnings(allCategories);
      } else {
        setAcknowledgedWarnings([]);
      }
    };

    if (!validationData || !appointment) return null;

    const {
      warnings,
      requirements,
      businessRules,
      riskAssessment,
      canProceed,
    } = validationData;
    const criticalWarnings = warnings.filter((w) => w.type === "critical");
    const hasRequiredAcknowledgment = warnings.some((w) => w.actionRequired);

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Comprehensive Patient Analysis
            </DialogTitle>
            <DialogDescription>
              Review all warnings and recommendations before proceeding with
              appointment action
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Warning Summary */}
            {warnings && warnings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  ⚠️ Warnings & Alerts
                </h3>
                <div className="space-y-3">
                  {warnings.map((warning, idx) => {
                    const getAlertVariant = (type) => {
                      switch (type) {
                        case "critical":
                          return "destructive";
                        case "error":
                          return "destructive";
                        default:
                          return "default";
                      }
                    };

                    const getIcon = (type) => {
                      switch (type) {
                        case "critical":
                          return AlertCircle;
                        case "error":
                          return AlertCircle;
                        case "warning":
                          return AlertTriangle;
                        default:
                          return Info;
                      }
                    };

                    const Icon = getIcon(warning.type);

                    return (
                      <Alert key={idx} variant={getAlertVariant(warning.type)}>
                        <Icon className="h-4 w-4" />
                        <AlertTitle>{warning.title}</AlertTitle>
                        <AlertDescription>
                          {warning.message}
                          {warning.recommendations && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">
                                Recommendation:
                              </p>
                              <ul className="text-sm mt-1 ml-4">
                                {Array.isArray(warning.recommendations) ? (
                                  warning.recommendations.map((rec, i) => (
                                    <li key={i}>• {rec}</li>
                                  ))
                                ) : (
                                  <li>• {warning.recommendations}</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Patient Reliability Dashboard */}
            {riskAssessment && (
              <PatientReliabilityDashboard reliabilityData={riskAssessment} />
            )}

            {/* Cross-Clinic Data */}
            {appointment.cross_clinic_appointments?.length > 0 && (
              <CrossClinicWarning
                crossClinicData={appointment.cross_clinic_appointments}
              />
            )}

            {/* Staff Requirements */}
            {requirements && requirements.length > 0 && (
              <Alert className="border-purple-200 bg-purple-50">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <AlertTitle className="text-purple-800">
                  Required Staff Actions
                </AlertTitle>
                <AlertDescription>
                  <ul className="space-y-2 mt-2">
                    {requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        <span className="text-purple-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Business Rules Passed */}
            {businessRules && businessRules.length > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">
                  Validation Checks Passed
                </AlertTitle>
                <AlertDescription>
                  <ul className="space-y-1 mt-2">
                    {businessRules.map((rule, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-green-700"
                      >
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Cannot Proceed Warning */}
            {!canProceed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Cannot Be Completed</AlertTitle>
                <AlertDescription>
                  Critical issues must be resolved before proceeding with this
                  appointment action.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasRequiredAcknowledgment && canProceed && (
                <>
                  <Checkbox
                    id="acknowledge-warnings"
                    checked={acknowledgedWarnings.length > 0}
                    onCheckedChange={handleAcknowledgeAll}
                  />
                  <Label htmlFor="acknowledge-warnings" className="text-sm">
                    I acknowledge all warnings and have reviewed the patient
                    analysis
                  </Label>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {canProceed && (
                <Button
                  onClick={handleProceed}
                  disabled={
                    hasRequiredAcknowledgment &&
                    acknowledgedWarnings.length === 0
                  }
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Proceed with Caution
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

WarningValidationDialog.displayName = "WarningValidationDialog";

export { WarningValidationDialog };
