import React, { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Bell,
  Calendar,
  User,
  MapPin,
  Clock,
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  Reply,
  Eye,
  EyeOff,
} from "lucide-react";

const NotificationDetailsModal = ({
  isOpen,
  onClose,
  notification,
  onMarkAsRead,
  onOpenFeedbackReply,
  getFeedbackDetails,
}) => {
  const { isPatient, isStaff, isAdmin } = useAuth();
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ✅ LOAD FEEDBACK DETAILS
  useEffect(() => {
    if (
      isOpen &&
      notification &&
      notification.type === "feedback_request" &&
      getFeedbackDetails
    ) {
      setLoadingDetails(true);

      // Extract feedback ID from notification
      const feedbackId = notification.metadata?.feedback_id || notification.id;

      getFeedbackDetails(feedbackId)
        .then((result) => {
          if (result.success) {
            setFeedbackDetails(result.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingDetails(false));
    }
  }, [isOpen, notification, getFeedbackDetails]);

  if (!notification) return null;

  // ✅ NOTIFICATION TYPE CONFIGS
  const getNotificationConfig = (type) => {
    const configs = {
      appointment_reminder: {
        icon: <Clock className="h-6 w-6" />,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        title: "Appointment Reminder",
      },
      appointment_confirmed: {
        icon: <CheckCircle className="h-6 w-6" />,
        color: "text-green-600",
        bgColor: "bg-green-50",
        title: "Appointment Confirmed",
      },
      appointment_cancelled: {
        icon: <X className="h-6 w-6" />,
        color: "text-red-600",
        bgColor: "bg-red-50",
        title: "Appointment Cancelled",
      },
      feedback_request: {
        icon: <MessageSquare className="h-6 w-6" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        title: "Feedback Request",
      },
      partnership_request: {
        icon: <User className="h-6 w-6" />,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        title: "Partnership Request",
      },
    };

    return (
      configs[type] || {
        icon: <Bell className="h-6 w-6" />,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        title: "Notification",
      }
    );
  };

  const config = getNotificationConfig(notification.type);

  // ✅ FORMAT DATE
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ GET PRIORITY BADGE
  const getPriorityBadge = () => {
    if (notification.priority === 1) {
      return (
        <Badge variant="destructive" className="mb-2">
          High Priority
        </Badge>
      );
    }
    if (
      notification.type === "feedback_request" &&
      notification.metadata?.rating <= 2
    ) {
      return (
        <Badge variant="destructive" className="mb-2">
          Low Rating - Urgent
        </Badge>
      );
    }
    return null;
  };

  // ✅ HANDLE ACTIONS
  const handleMarkAsRead = async () => {
    if (!notification.is_read && onMarkAsRead) {
      await onMarkAsRead([notification.id]);
    }
  };

  const handleFeedbackReply = () => {
    if (onOpenFeedbackReply && feedbackDetails) {
      onOpenFeedbackReply(feedbackDetails);
      onClose();
    }
  };

  const handleViewAppointment = () => {
    if (notification.appointment_id) {
      const basePath = isPatient ? "/patient" : "/staff";
      window.location.href = `${basePath}/appointments/${notification.appointment_id}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${config.bgColor}`}>
              <div className={config.color}>{config.icon}</div>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-left">
                {notification.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {formatDate(notification.created_at)}
                </span>
                {!notification.is_read && (
                  <Badge variant="secondary" className="text-xs">
                    Unread
                  </Badge>
                )}
              </div>
              {getPriorityBadge()}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* ✅ NOTIFICATION MESSAGE */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-foreground leading-relaxed">
              {notification.message}
            </p>
          </div>

          {/* ✅ APPOINTMENT DETAILS */}
          {notification.related_data && (
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">
                Related Information
              </h4>

              {notification.related_data.clinic_name && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{notification.related_data.clinic_name}</span>
                </div>
              )}

              {notification.related_data.doctor_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{notification.related_data.doctor_name}</span>
                </div>
              )}

              {notification.related_data.appointment_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDate(
                      `${notification.related_data.appointment_date} ${
                        notification.related_data.appointment_time || ""
                      }`
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ✅ FEEDBACK DETAILS */}
          {notification.type === "feedback_request" && (
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Feedback Details</h4>

              {loadingDetails ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading details...
                  </span>
                </div>
              ) : feedbackDetails ? (
                <div className="border rounded-lg p-4 space-y-3">
                  {/* Rating */}
                  {feedbackDetails.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Rating:</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < feedbackDetails.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-sm text-muted-foreground">
                          ({feedbackDetails.rating}/5)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Feedback Type */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Type:</span>
                    <Badge variant="outline" className="capitalize">
                      {feedbackDetails.feedback_type}
                    </Badge>
                  </div>

                  {/* Patient Info */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">From:</span>
                    <span className="text-sm">
                      {feedbackDetails.is_anonymous
                        ? "Anonymous Patient"
                        : feedbackDetails.patient_name || "Unknown Patient"}
                    </span>
                    {feedbackDetails.is_anonymous && (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>

                  {/* Comment */}
                  {feedbackDetails.comment && (
                    <div>
                      <span className="text-sm font-medium">Comment:</span>
                      <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded">
                        {feedbackDetails.comment}
                      </p>
                    </div>
                  )}

                  {/* Response */}
                  {feedbackDetails.response && (
                    <div>
                      <span className="text-sm font-medium">Response:</span>
                      <p className="text-sm text-muted-foreground mt-1 p-3 bg-blue-50 rounded">
                        {feedbackDetails.response}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        Responded by {feedbackDetails.responder_name || "Staff"}{" "}
                        on {formatDate(feedbackDetails.responded_at)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Could not load feedback details
                </div>
              )}
            </div>
          )}

          {/* ✅ AVAILABLE ACTIONS */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Available Actions</h4>
              <div className="flex flex-wrap gap-2">
                {notification.actions.map((action) => (
                  <Badge key={action} variant="outline" className="text-xs">
                    {action.replace("_", " ").toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* ✅ METADATA */}
          {notification.sent_via && notification.sent_via.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Sent via:</span>{" "}
              {notification.sent_via.join(", ")}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {!notification.is_read && (
              <Button variant="outline" size="sm" onClick={handleMarkAsRead}>
                <Eye className="h-4 w-4 mr-1" />
                Mark as Read
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ FEEDBACK REPLY BUTTON */}
            {notification.type === "feedback_request" &&
              (isStaff || isAdmin) &&
              feedbackDetails &&
              !feedbackDetails.response && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFeedbackReply}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Reply to Feedback
                </Button>
              )}

            {/* ✅ VIEW APPOINTMENT BUTTON */}
            {notification.appointment_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAppointment}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Appointment
              </Button>
            )}

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDetailsModal;
