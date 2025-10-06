import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  X,
  ExternalLink,
  Reply,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  Stethoscope,
  CalendarCheck,
  CalendarX2,
  FileText,
  AlertCircle,
} from "lucide-react";

const NotificationDetailsModal = ({
  isOpen,
  onClose,
  notification,
  onMarkAsRead,
  onOpenFeedbackReply,
  onNavigate,
  getFeedbackDetails,
}) => {
  const navigate = useNavigate();
  const { isPatient, isStaff, isAdmin } = useAuth();
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ✅ LOAD FEEDBACK DETAILS
  useEffect(() => {
    if (
      isOpen &&
      notification &&
      (notification.type === "feedback_request" ||
        notification.type === "feedback_response") &&
      getFeedbackDetails
    ) {
      setLoadingDetails(true);

      // Extract feedback ID from notification metadata
      const feedbackId = notification.metadata?.feedback_id || notification.id;

      getFeedbackDetails(feedbackId)
        .then((result) => {
          if (result.success) {
            setFeedbackDetails(result.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingDetails(false));
    } else {
      setFeedbackDetails(null);
    }
  }, [isOpen, notification, getFeedbackDetails]);

  if (!notification) return null;

  // ✅ NOTIFICATION TYPE CONFIGS WITH ENHANCED ICONS
  const getNotificationConfig = (type) => {
    const configs = {
      appointment_reminder: {
        icon: <Clock className="h-6 w-6" />,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
        title: "Appointment Reminder",
      },
      appointment_confirmed: {
        icon: <CalendarCheck className="h-6 w-6" />,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        title: "Appointment Confirmed",
      },
      appointment_cancelled: {
        icon: <CalendarX2 className="h-6 w-6" />,
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        title: "Appointment Cancelled",
      },
      feedback_request: {
        icon: <MessageSquare className="h-6 w-6" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        title: "New Feedback Received",
      },
      feedback_response: {
        icon: <Reply className="h-6 w-6" />,
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
        title: "Feedback Response",
      },
      partnership_request: {
        icon: <User className="h-6 w-6" />,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
        title: "Partnership Request",
      },
    };

    return (
      configs[type] || {
        icon: <Bell className="h-6 w-6" />,
        color: "text-gray-600",
        bgColor: "bg-gray-50 dark:bg-gray-900/20",
        title: "Notification",
      }
    );
  };

  const config = getNotificationConfig(notification.type);

  // ✅ FORMAT DATE
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ GET PRIORITY BADGE WITH DUAL RATINGS
  const getPriorityBadge = () => {
    const clinicRating =
      notification.metadata?.clinic_rating || feedbackDetails?.clinic_rating;
    const doctorRating =
      notification.metadata?.doctor_rating || feedbackDetails?.doctor_rating;
    const legacyRating =
      notification.metadata?.rating || feedbackDetails?.rating;

    if (notification.priority === 1) {
      return (
        <Badge variant="destructive" className="mb-2">
          <AlertCircle className="w-3 h-3 mr-1" />
          High Priority
        </Badge>
      );
    }

    if (
      notification.type === "feedback_request" &&
      (clinicRating <= 2 || doctorRating <= 2 || legacyRating <= 2)
    ) {
      return (
        <Badge variant="destructive" className="mb-2">
          <Star className="w-3 h-3 mr-1" />
          Low Rating - Urgent Response Required
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

  // ✅ ENHANCED NAVIGATION HANDLERS (Role-based)
  const handleNavigateToPage = (path) => {
    navigate(path);
    onClose();
  };

  // ✅ GET ACTION BUTTONS BASED ON NOTIFICATION TYPE AND USER ROLE
  const getActionButtons = () => {
    const buttons = [];

    switch (notification.type) {
      case "appointment_confirmed":
        if (isPatient) {
          buttons.push({
            label: "View Upcoming Appointments",
            icon: <CalendarCheck className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/patient/appointments"),
          });
        } else if (isStaff || isAdmin) {
          buttons.push({
            label: "View Appointments",
            icon: <CalendarCheck className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/staff/appointments"),
          });
        }
        break;

      case "appointment_cancelled":
        if (isPatient) {
          buttons.push({
            label: "Book New Appointment",
            icon: <Calendar className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/patient/book-appointment"),
          });
          buttons.push({
            label: "View All Appointments",
            icon: <FileText className="h-4 w-4" />,
            variant: "outline",
            onClick: () => handleNavigateToPage("/patient/appointments"),
          });
        } else if (isStaff || isAdmin) {
          buttons.push({
            label: "View Appointments",
            icon: <Calendar className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/staff/appointments"),
          });
        }
        break;

      case "appointment_reminder":
        if (isPatient) {
          buttons.push({
            label: "View Appointment Details",
            icon: <Calendar className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/patient/appointments"),
          });
        } else if (isStaff || isAdmin) {
          buttons.push({
            label: "View Appointments",
            icon: <Calendar className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/staff/appointments"),
          });
        }
        break;

      case "feedback_request":
        if (isStaff || isAdmin) {
          if (feedbackDetails && !feedbackDetails.response) {
            buttons.push({
              label: "Reply to Feedback",
              icon: <Reply className="h-4 w-4" />,
              variant: "default",
              onClick: handleFeedbackReply,
            });
          }
          buttons.push({
            label: "View All Feedback",
            icon: <MessageSquare className="h-4 w-4" />,
            variant: "outline",
            onClick: () => handleNavigateToPage("/staff/feedback"),
          });
        }
        break;

      case "feedback_response":
        if (isPatient) {
          buttons.push({
            label: "View My Feedback",
            icon: <MessageSquare className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/patient/feedback"),
          });
        }
        break;

      case "partnership_request":
        if (isAdmin) {
          buttons.push({
            label: "Review Partnership Request",
            icon: <User className="h-4 w-4" />,
            variant: "default",
            onClick: () => handleNavigateToPage("/admin/partnerships"),
          });
        }
        break;

      default:
        break;
    }

    return buttons;
  };

  const actionButtons = getActionButtons();

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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {formatDate(notification.created_at)}
                </span>
                {!notification.is_read && (
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Unread
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {notification.type.replace(/_/g, " ")}
                </Badge>
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

          {/* ✅ RELATED APPOINTMENT DATA */}
          {notification.related_data &&
            Object.keys(notification.related_data).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Related Information
                </h4>

                <div className="border rounded-lg p-4 bg-background space-y-3">
                  {notification.related_data.clinic_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">Clinic:</span>
                      <span>{notification.related_data.clinic_name}</span>
                    </div>
                  )}

                  {notification.related_data.doctor_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">Doctor:</span>
                      <span>{notification.related_data.doctor_name}</span>
                    </div>
                  )}

                  {notification.related_data.appointment_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">Date:</span>
                      <span>
                        {formatDate(
                          `${notification.related_data.appointment_date} ${
                            notification.related_data.appointment_time || ""
                          }`
                        )}
                      </span>
                    </div>
                  )}

                  {notification.related_data.status && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">Status:</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {notification.related_data.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* ✅ FEEDBACK DETAILS WITH DUAL RATINGS */}
          {(notification.type === "feedback_request" ||
            notification.type === "feedback_response") && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback Details
              </h4>

              {loadingDetails ? (
                <div className="flex items-center justify-center p-8 border rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                  <span className="text-sm text-muted-foreground">
                    Loading feedback details...
                  </span>
                </div>
              ) : feedbackDetails ? (
                <div className="border rounded-lg p-4 space-y-4 bg-background">
                  {/* ✅ DUAL RATINGS DISPLAY */}
                  {(feedbackDetails.clinic_rating ||
                    feedbackDetails.doctor_rating ||
                    feedbackDetails.rating) && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Ratings:</span>
                      <div className="flex flex-wrap gap-4">
                        {feedbackDetails.clinic_rating && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Clinic:</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < feedbackDetails.clinic_rating
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-sm text-muted-foreground">
                                ({feedbackDetails.clinic_rating}/5)
                              </span>
                            </div>
                          </div>
                        )}

                        {feedbackDetails.doctor_rating && (
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Doctor:</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < feedbackDetails.doctor_rating
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-sm text-muted-foreground">
                                ({feedbackDetails.doctor_rating}/5)
                              </span>
                            </div>
                          </div>
                        )}

                        {feedbackDetails.rating &&
                          !feedbackDetails.clinic_rating &&
                          !feedbackDetails.doctor_rating && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Overall:
                              </span>
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
                      </div>
                    </div>
                  )}

                  {/* Feedback Type */}
                  {feedbackDetails.feedback_type && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Type:</span>
                      <Badge variant="outline" className="capitalize">
                        {feedbackDetails.feedback_type}
                      </Badge>
                    </div>
                  )}

                  {/* Patient Info (Staff view only) */}
                  {(isStaff || isAdmin) && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
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
                  )}

                  {/* Comment */}
                  {feedbackDetails.comment && (
                    <div>
                      <span className="text-sm font-medium">Comment:</span>
                      <p className="text-sm text-foreground mt-2 p-3 bg-muted/50 rounded-md border">
                        {feedbackDetails.comment}
                      </p>
                    </div>
                  )}

                  {/* Response */}
                  {feedbackDetails.response && (
                    <div>
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Reply className="h-4 w-4" />
                        Staff Response:
                      </span>
                      <p className="text-sm text-foreground mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                        {feedbackDetails.response}
                      </p>
                      {feedbackDetails.responded_at && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Responded by{" "}
                          {feedbackDetails.responder_name || "Staff"} on{" "}
                          {formatDate(feedbackDetails.responded_at)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
                  Could not load feedback details
                </div>
              )}
            </div>
          )}

          {/* ✅ METADATA */}
          {notification.sent_via && notification.sent_via.length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-4">
              <span className="font-medium">Sent via:</span>{" "}
              {notification.sent_via.map((channel, index) => (
                <Badge
                  key={channel}
                  variant="secondary"
                  className="text-xs ml-1"
                >
                  {channel}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            {!notification.is_read && (
              <Button variant="outline" size="sm" onClick={handleMarkAsRead}>
                <Eye className="h-4 w-4 mr-1" />
                Mark as Read
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ✅ DYNAMIC ACTION BUTTONS */}
            {actionButtons.map((button, index) => (
              <Button
                key={index}
                variant={button.variant}
                size="sm"
                onClick={button.onClick}
              >
                {button.icon}
                <span className="ml-1">{button.label}</span>
              </Button>
            ))}

            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDetailsModal;
