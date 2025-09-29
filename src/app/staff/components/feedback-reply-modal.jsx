import React, { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/text-area";
import { Badge } from "@/core/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Separator } from "@/core/components/ui/separator";
import {
  MessageSquare,
  Star,
  User,
  Calendar,
  MapPin,
  Send,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Stethoscope,
  Building,
  Clock,
} from "lucide-react";

const FeedbackReplyModal = ({
  isOpen,
  onClose,
  feedbackData,
  onSubmitReply,
}) => {
  const { profile, isStaff, isAdmin } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [responderType, setResponderType] = useState("staff"); // ✅ New state for responder type
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ✅ ACCESS CONTROL
  if (!isStaff && !isAdmin) {
    return null;
  }

  if (!feedbackData) {
    return null;
  }

  // ✅ EXTRACT FEEDBACK DATA
  const {
    id: feedbackId,
    rating,
    comment,
    feedback_type,
    is_anonymous,
    created_at,
    response: existing_response,
    responded_at,
    patient,
    clinic,
    doctor,
    appointment,
    responder,
    patient_name,
    doctor_name,
    responder_name,
    responder_type: existing_responder_type,
  } = feedbackData;

  // ✅ SET DEFAULT RESPONDER TYPE BASED ON FEEDBACK TYPE
  useEffect(() => {
    if (feedback_type === "doctor" && doctor) {
      setResponderType("doctor");
    } else if (
      feedback_type === "service" ||
      feedback_type === "facility" ||
      feedback_type === "general"
    ) {
      setResponderType("staff");
    } else {
      setResponderType("staff");
    }
  }, [feedback_type, doctor]);

  // ✅ HANDLE REPLY SUBMISSION
  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      setError("Reply message is required");
      return;
    }

    if (replyText.length > 1000) {
      setError("Reply must be under 1000 characters");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await onSubmitReply(
        feedbackId,
        replyText.trim(),
        responderType
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setReplyText("");
          onClose();
        }, 2000);
      } else {
        setError(result.error || "Failed to submit reply");
      }
    } catch (err) {
      setError(err.message || "Failed to submit reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ RESET ON CLOSE
  const handleClose = () => {
    setReplyText("");
    setError(null);
    setSuccess(false);
    setResponderType("staff");
    onClose();
  };

  // ✅ GET RATING DISPLAY
  const getRatingDisplay = (rating) => {
    const stars = Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
    return stars;
  };

  // ✅ GET URGENCY LEVEL
  const getUrgencyLevel = (rating) => {
    if (rating <= 2)
      return {
        level: "high",
        color: "bg-red-100 text-red-800",
        label: "High Priority",
      };
    if (rating === 3)
      return {
        level: "medium",
        color: "bg-yellow-100 text-yellow-800",
        label: "Medium Priority",
      };
    return {
      level: "low",
      color: "bg-green-100 text-green-800",
      label: "Low Priority",
    };
  };

  const urgency = getUrgencyLevel(rating);

  // ✅ FORMAT DATE
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ GET FEEDBACK TYPE DISPLAY
  const getFeedbackTypeDisplay = (type) => {
    const types = {
      general: {
        label: "General Feedback",
        icon: <MessageSquare className="h-4 w-4" />,
        color: "bg-blue-100 text-blue-800",
      },
      service: {
        label: "Service Feedback",
        icon: <Building className="h-4 w-4" />,
        color: "bg-green-100 text-green-800",
      },
      doctor: {
        label: "Doctor Feedback",
        icon: <Stethoscope className="h-4 w-4" />,
        color: "bg-purple-100 text-purple-800",
      },
      facility: {
        label: "Facility Feedback",
        icon: <MapPin className="h-4 w-4" />,
        color: "bg-orange-100 text-orange-800",
      },
    };
    return types[type] || types.general;
  };

  const feedbackTypeDisplay = getFeedbackTypeDisplay(feedback_type);

  // ✅ GET RESPONDER OPTIONS BASED ON FEEDBACK TYPE
  const getResponderOptions = () => {
    const options = [
      {
        value: "staff",
        label: "Clinic Staff",
        description: "Responding on behalf of the clinic",
        icon: <UserCheck className="h-4 w-4" />,
      },
    ];

    // Add doctor option if feedback is about doctor or if doctor exists
    if (feedback_type === "doctor" || doctor) {
      options.push({
        value: "doctor",
        label: doctor_name || "Doctor",
        description: "Responding as the doctor",
        icon: <Stethoscope className="h-4 w-4" />,
      });
    }

    return options;
  };

  const responderOptions = getResponderOptions();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Reply to Patient Feedback
          </DialogTitle>
          <DialogDescription>
            Respond professionally to this patient's feedback. Your response
            will be sent to the patient.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ✅ FEEDBACK OVERVIEW */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {feedbackTypeDisplay.icon}
                <Badge className={feedbackTypeDisplay.color}>
                  {feedbackTypeDisplay.label}
                </Badge>
                <Badge className={urgency.color}>{urgency.label}</Badge>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(created_at)}
              </div>
            </div>

            {/* Rating */}
            {rating && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Rating:</span>
                <div className="flex items-center gap-1">
                  {getRatingDisplay(rating)}
                  <span className="text-sm text-gray-600 ml-1">
                    ({rating}/5)
                  </span>
                </div>
              </div>
            )}

            {/* Patient Info */}
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                <strong>From:</strong>{" "}
                {is_anonymous ? "Anonymous Patient" : patient_name || "Patient"}
              </span>
            </div>

            {/* Clinic & Doctor Info */}
            {clinic?.name && (
              <div className="flex items-center gap-2 mb-3">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Clinic:</strong> {clinic.name}
                </span>
              </div>
            )}

            {doctor_name && (
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Doctor:</strong> {doctor_name}
                </span>
              </div>
            )}

            {/* Appointment Info */}
            {appointment && (
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Appointment:</strong>{" "}
                  {formatDate(
                    `${appointment.appointment_date} ${
                      appointment.appointment_time || ""
                    }`
                  )}
                </span>
              </div>
            )}

            {/* Comment */}
            {comment && (
              <div className="mt-3">
                <h4 className="text-sm font-medium mb-2">Patient's Comment:</h4>
                <div className="bg-white p-3 rounded border text-sm">
                  {comment}
                </div>
              </div>
            )}
          </div>

          {/* ✅ EXISTING RESPONSE (if any) */}
          {existing_response && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Previous Response
              </h4>
              <div className="bg-white p-3 rounded border text-sm mb-2">
                {existing_response}
              </div>
              <div className="text-xs text-gray-500">
                Responded by{" "}
                {responder_name || existing_responder_type || "Staff"} on{" "}
                {formatDate(responded_at)}
              </div>
            </div>
          )}

          {!existing_response && (
            <>
              <Separator />

              {/* ✅ RESPONDER TYPE SELECTION */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Responding As:
                  </label>
                  <Select
                    value={responderType}
                    onValueChange={setResponderType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {responderOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-gray-500">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Responder Type Info */}
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  {responderType === "staff" ? (
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3 w-3" />
                      You are responding on behalf of the clinic. This shows as
                      a clinic response to the patient.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-3 w-3" />
                      You are responding as the doctor. This shows as a personal
                      response from the doctor.
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ REPLY TEXTAREA */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Your Response:</label>
                <Textarea
                  placeholder="Write a professional and empathetic response to the patient's feedback..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  className="resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{replyText.length}/1000 characters</span>
                  {replyText.length > 900 && (
                    <span className="text-orange-600">
                      {1000 - replyText.length} characters remaining
                    </span>
                  )}
                </div>
              </div>

              {/* ✅ ERROR/SUCCESS MESSAGES */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Response submitted successfully!
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {!existing_response && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReply}
                disabled={
                  isSubmitting || !replyText.trim() || replyText.length > 1000
                }
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Response
                  </div>
                )}
              </Button>
            </div>
          )}
          {existing_response && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackReplyModal;
