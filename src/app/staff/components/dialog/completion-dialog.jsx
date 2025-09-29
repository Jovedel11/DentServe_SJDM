import React, { useState, memo } from "react";
import { CheckCircle, Info, AlertTriangle, Loader2 } from "lucide-react";

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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/core/components/ui/alert";
import { Textarea } from "@/core/components/ui/text-area";
import { Label } from "@/core/components/ui/label";
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs";

const CompletionDialog = memo(
  ({ open, onClose, appointment, onComplete, isLoading }) => {
    const [formData, setFormData] = useState({
      notes: "",
      followUpRequired: false,
      followUpNotes: "",
      servicesCompleted: [],
    });

    const [error, setError] = useState(null);

    const handleComplete = () => {
      if (!formData.notes.trim()) {
        setError("Treatment summary is required for completion");
        return;
      }

      if (formData.notes.length < 20) {
        setError(
          "Please provide a more detailed treatment summary (minimum 20 characters)"
        );
        return;
      }

      onComplete(formData);
      handleReset();
    };

    const handleReset = () => {
      setFormData({
        notes: "",
        followUpRequired: false,
        followUpNotes: "",
        servicesCompleted: [],
      });
      setError(null);
    };

    const handleClose = () => {
      handleReset();
      onClose();
    };

    const handleServiceToggle = (serviceId, checked) => {
      setFormData((prev) => ({
        ...prev,
        servicesCompleted: checked
          ? [...prev.servicesCompleted, serviceId]
          : prev.servicesCompleted.filter((id) => id !== serviceId),
      }));
    };

    const addQuickTemplate = (template) => {
      setFormData((prev) => ({
        ...prev,
        notes: template,
      }));
    };

    if (!appointment) return null;

    const quickTemplates = [
      {
        name: "Routine Cleaning",
        template:
          "Routine cleaning completed successfully. Patient tolerated procedure well. No complications observed. Oral hygiene instructions provided.",
      },
      {
        name: "Examination",
        template:
          "Dental examination completed. Findings documented in patient chart. Treatment recommendations discussed with patient.",
      },
      {
        name: "Treatment Procedure",
        template:
          "Treatment procedure completed as planned. Patient responded well to treatment. Post-treatment instructions provided.",
      },
    ];

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Complete Appointment
            </DialogTitle>
            <DialogDescription>
              Document treatment and completion details for{" "}
              {appointment.patient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Patient Reliability Update Notice */}
            {appointment.patient_reliability && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">
                  Positive Impact on Patient Record
                </AlertTitle>
                <AlertDescription className="text-green-700">
                  Completing this appointment will improve the patient's
                  reliability score and completion rate. Current rate:{" "}
                  {appointment.patient_reliability.statistics?.completion_rate}%
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="completion" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="completion">Treatment Summary</TabsTrigger>
                <TabsTrigger value="services">Services Completed</TabsTrigger>
                <TabsTrigger value="followup">Follow-up Care</TabsTrigger>
              </TabsList>

              <TabsContent value="completion" className="space-y-4">
                <div>
                  <Label htmlFor="completion-notes">Treatment Summary *</Label>
                  <Textarea
                    id="completion-notes"
                    placeholder="Document the treatment provided, patient response, medications prescribed, observations, etc."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    disabled={isLoading}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.notes.length}/1000 characters
                  </p>
                </div>

                {/* Quick completion templates */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Quick Templates:
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {quickTemplates.map((template, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => addQuickTemplate(template.template)}
                        type="button"
                        disabled={isLoading}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4">
                {appointment.services && appointment.services.length > 0 ? (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      Mark services as completed (
                      {formData.servicesCompleted.length}/
                      {appointment.services.length})
                    </Label>
                    <div className="space-y-3">
                      {appointment.services.map((service, idx) => (
                        <Card key={idx} className="p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={`service-${service.id}`}
                              checked={formData.servicesCompleted.includes(
                                service.id
                              )}
                              onCheckedChange={(checked) =>
                                handleServiceToggle(service.id, checked)
                              }
                              disabled={isLoading}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`service-${service.id}`}
                                className="text-sm font-medium"
                              >
                                {service.name}
                              </Label>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span>{service.duration_minutes} minutes</span>
                                {service.min_price && (
                                  <span>
                                    ₱{service.min_price} - ₱{service.max_price}
                                  </span>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {formData.servicesCompleted.length ===
                      appointment.services.length && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">
                          All scheduled services marked as completed
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No specific services were scheduled for this appointment
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="followup" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="follow-up-required"
                    checked={formData.followUpRequired}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        followUpRequired: checked,
                      }))
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="follow-up-required"
                    className="text-base font-medium"
                  >
                    Follow-up appointment required
                  </Label>
                </div>

                {formData.followUpRequired && (
                  <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                    <div>
                      <Label htmlFor="follow-up-notes">
                        Follow-up Instructions
                      </Label>
                      <Textarea
                        id="follow-up-notes"
                        placeholder="Specify follow-up care instructions, timeline, and any special requirements..."
                        value={formData.followUpNotes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            followUpNotes: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                        rows={4}
                      />
                    </div>

                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-700">
                        A follow-up reminder will be automatically created for
                        clinic staff
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Patient reliability context for follow-up */}
                {appointment.patient_reliability?.risk_level === "high_risk" &&
                  formData.followUpRequired && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-700">
                        <strong>High-Risk Patient:</strong> Consider requiring
                        confirmation for follow-up appointment
                      </AlertDescription>
                    </Alert>
                  )}
              </TabsContent>
            </Tabs>
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
              onClick={handleComplete}
              disabled={!formData.notes.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

CompletionDialog.displayName = "CompletionDialog";

export { CompletionDialog };
