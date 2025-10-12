import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthProvider";
import { useUnifiedNotificationSystem } from "@/app/shared/hook/useUnifiedNotificationSystem";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import { useIsMobile } from "@/core/hooks/use-mobile";
import FeedbackReplyModal from "@/app/staff/components/feedback-reply-modal";
import NotificationDetailsModal from "@/app/shared/components/notification-details-modal";
import AllNotificationsModal from "@/app/staff/components/all-notification-modal";
import {
  Bell,
  BellRing,
  Search,
  X,
  CheckCheck,
  MessageSquare,
  Calendar,
  Star,
  User,
  Reply,
  AlertCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Building2,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";

const UnifiedNotificationBell = ({
  className = "",
  variant = "ghost",
  size = "icon",
  showPreview = true,
  maxPreviewItems = 8,
}) => {
  const navigate = useNavigate();
  const { user, isPatient, isStaff, isAdmin, profile } = useAuth();
  const isMobile = useIsMobile();

  // ✅ UNIFIED NOTIFICATION SYSTEM
  const {
    notifications,
    allNotifications,
    loading,
    error,
    unreadCount,
    stats,
    fetchNotifications,
    loadAllNotifications,
    markAsRead,
    respondToFeedback,
    getFeedbackDetails,
    getNotificationNavigationPath,
    hasUnread,
    urgentNotifications,
    todayNotifications,
    feedbackNotifications,
    appointmentNotifications,
    isConnected,
    canRespondToFeedback,
    refresh,
  } = useUnifiedNotificationSystem();

  // ✅ REALTIME INTEGRATION
  const { isConnected: realtimeConnected } = useAppointmentRealtime({
    onNotificationReceived: useCallback(
      (update) => {
        console.log("🔔 New notification received:", update);
        refresh();
      },
      [refresh]
    ),
    onAppointmentStatusChange: useCallback(
      (statusChange) => {
        console.log("📅 Appointment status changed:", statusChange);
        refresh();
      },
      [refresh]
    ),
    enableNotifications: true,
    enableAppointments: true,
    enableFeedback: true,
  });

  // ✅ LOCAL STATE
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");
  const [feedbackReplyModal, setFeedbackReplyModal] = useState({
    isOpen: false,
    feedbackData: null,
  });
  const [notificationDetailsModal, setNotificationDetailsModal] = useState({
    isOpen: false,
    notification: null,
  });
  const [allNotificationsModal, setAllNotificationsModal] = useState(false);

  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // ✅ ACCESS CONTROL
  if (!user || (!isPatient && !isStaff && !isAdmin)) {
    return null;
  }

  // ✅ CLICK OUTSIDE HANDLER
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ USER-SPECIFIC NOTIFICATION FILTERING
  const userRelevantNotifications = useMemo(() => {
    if (isAdmin) {
      // Admin ONLY sees partnership requests
      return notifications.filter((n) => n.type === "partnership_request");
    }

    if (isPatient) {
      // Patient sees: appointment_confirmed, appointment_reminder, appointment_cancelled, feedback_response
      const allowedTypes = [
        "appointment_confirmed",
        "appointment_reminder",
        "appointment_cancelled",
        "feedback_response",
      ];
      return notifications.filter((n) => allowedTypes.includes(n.type));
    }

    if (isStaff) {
      // Staff sees: feedback_request and appointment notifications (confirmed, cancelled, reminder for treatment follow-ups)
      const allowedTypes = [
        "feedback_request",
        "appointment_confirmed", // When patient books (staff gets notified)
        "appointment_cancelled", // When patient cancels
        "appointment_reminder", // For treatment follow-ups
      ];
      return notifications.filter((n) => allowedTypes.includes(n.type));
    }

    return notifications;
  }, [notifications, isAdmin, isPatient, isStaff]);

  // ✅ FILTERED AND SORTED NOTIFICATIONS
  const filteredNotifications = useMemo(() => {
    let filtered = userRelevantNotifications;

    // Apply filter
    switch (activeFilter) {
      case "unread":
        filtered = filtered.filter((n) => !n.is_read);
        break;
      case "read":
        filtered = filtered.filter((n) => n.is_read);
        break;
      case "urgent":
        filtered = urgentNotifications.filter((n) =>
          userRelevantNotifications.some((un) => un.id === n.id)
        );
        break;
      case "today":
        filtered = todayNotifications.filter((n) =>
          userRelevantNotifications.some((un) => un.id === n.id)
        );
        break;
      case "appointments":
        filtered = appointmentNotifications.filter((n) =>
          userRelevantNotifications.some((un) => un.id === n.id)
        );
        break;
      case "feedback":
        filtered = feedbackNotifications.filter((n) =>
          userRelevantNotifications.some((un) => un.id === n.id)
        );
        break;
      case "partnerships":
        filtered = filtered.filter((n) => n.type === "partnership_request");
        break;
      default:
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.message?.toLowerCase().includes(query)
      );
    }

    // Sort: Unread first, then newest
    filtered.sort((a, b) => {
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return filtered.slice(0, maxPreviewItems);
  }, [
    userRelevantNotifications,
    activeFilter,
    searchQuery,
    maxPreviewItems,
    urgentNotifications,
    todayNotifications,
    appointmentNotifications,
    feedbackNotifications,
  ]);

  // ✅ USER-SPECIFIC NOTIFICATION CONFIG
  const getNotificationConfig = useCallback((type, metadata = {}) => {
    const configs = {
      appointment_reminder: {
        icon: <Clock className="h-4 w-4" />,
        color: "text-orange-600",
        bgColor:
          "bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800",
        urgentBg: "bg-orange-100 dark:bg-orange-900/20",
      },
      appointment_confirmed: {
        icon: <CheckCheck className="h-4 w-4" />,
        color: "text-green-600",
        bgColor:
          "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800",
        urgentBg: "bg-green-100 dark:bg-green-900/20",
      },
      appointment_cancelled: {
        icon: <X className="h-4 w-4" />,
        color: "text-red-600",
        bgColor:
          "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800",
        urgentBg: "bg-red-100 dark:bg-red-900/20",
      },
      feedback_request: {
        icon: <MessageSquare className="h-4 w-4" />,
        color: "text-blue-600",
        bgColor:
          "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800",
        urgentBg:
          metadata?.rating <= 2
            ? "bg-red-100 dark:bg-red-900/20"
            : "bg-blue-100 dark:bg-blue-900/20",
      },
      feedback_response: {
        icon: <Reply className="h-4 w-4" />,
        color: "text-purple-600",
        bgColor:
          "bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800",
        urgentBg: "bg-purple-100 dark:bg-purple-900/20",
      },
      partnership_request: {
        icon: <User className="h-4 w-4" />,
        color: "text-indigo-600",
        bgColor:
          "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800",
        urgentBg: "bg-indigo-100 dark:bg-indigo-900/20",
      },
      admin_message: {
        icon: <AlertCircle className="h-4 w-4" />,
        color: "text-purple-600",
        bgColor:
          "bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800",
        urgentBg: "bg-purple-100 dark:bg-purple-900/20",
      },
    };

    return (
      configs[type] || {
        icon: <Bell className="h-4 w-4" />,
        color: "text-gray-600",
        bgColor:
          "bg-gray-50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-800",
        urgentBg: "bg-gray-100 dark:bg-gray-900/20",
      }
    );
  }, []);

  // ✅ ACTION HANDLERS
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    setNotificationDetailsModal({
      isOpen: true,
      notification,
    });
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = userRelevantNotifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
        showToast("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      showToast("Failed to mark notifications as read", "error");
    }
  };

  const handleFeedbackReply = async (feedbackId, response) => {
    try {
      const result = await respondToFeedback(feedbackId, response);

      if (result.success) {
        showToast("Reply sent successfully! Patient will be notified.");
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error responding to feedback:", error);
      showToast("Failed to send reply", "error");
      return { success: false, error: error.message };
    }
  };

  const handleOpenFeedbackReply = (feedbackData) => {
    setFeedbackReplyModal({
      isOpen: true,
      feedbackData,
    });
  };

  const handleNavigateToNotification = (notification) => {
    const path = getNotificationNavigationPath(notification);
    if (path) {
      navigate(path);
      setNotificationDetailsModal({ isOpen: false, notification: null });
    }
  };

  const showToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(""), 3000);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? "Just now" : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    }
  };

  // ✅ USER-SPECIFIC FILTER OPTIONS
  const getFilterOptions = useCallback(() => {
    const baseFilters = [
      { key: "all", label: "All", count: userRelevantNotifications.length },
      {
        key: "unread",
        label: "Unread",
        count: userRelevantNotifications.filter((n) => !n.is_read).length,
      },
    ];

    const roleSpecificFilters = [];

    // Admin only sees partnerships
    if (isAdmin) {
      return [
        ...baseFilters,
        {
          key: "partnerships",
          label: "Partnerships",
          count: userRelevantNotifications.length,
        },
      ];
    }

    // Patient filters
    if (isPatient) {
      const patientAppointments = userRelevantNotifications.filter((n) =>
        [
          "appointment_confirmed",
          "appointment_reminder",
          "appointment_cancelled",
        ].includes(n.type)
      );
      const patientFeedback = userRelevantNotifications.filter(
        (n) => n.type === "feedback_response"
      );

      if (patientAppointments.length > 0) {
        roleSpecificFilters.push({
          key: "appointments",
          label: "Appointments",
          count: patientAppointments.length,
        });
      }

      if (patientFeedback.length > 0) {
        roleSpecificFilters.push({
          key: "feedback",
          label: "Responses",
          count: patientFeedback.length,
        });
      }
    }

    // Staff filters
    if (isStaff) {
      const staffAppointments = userRelevantNotifications.filter((n) =>
        [
          "appointment_confirmed",
          "appointment_cancelled",
          "appointment_reminder",
        ].includes(n.type)
      );
      const staffFeedback = userRelevantNotifications.filter(
        (n) => n.type === "feedback_request"
      );

      if (staffAppointments.length > 0) {
        roleSpecificFilters.push({
          key: "appointments",
          label: "Appointments",
          count: staffAppointments.length,
        });
      }

      if (staffFeedback.length > 0) {
        roleSpecificFilters.push({
          key: "feedback",
          label: "Feedback",
          count: staffFeedback.length,
        });
      }
    }

    // Urgent notifications (for both patient and staff)
    const relevantUrgent = urgentNotifications.filter((n) =>
      userRelevantNotifications.some((un) => un.id === n.id)
    );
    if (relevantUrgent.length > 0) {
      roleSpecificFilters.push({
        key: "urgent",
        label: "Urgent",
        count: relevantUrgent.length,
      });
    }

    // Today's notifications
    const relevantToday = todayNotifications.filter((n) =>
      userRelevantNotifications.some((un) => un.id === n.id)
    );
    if (relevantToday.length > 0) {
      roleSpecificFilters.push({
        key: "today",
        label: "Today",
        count: relevantToday.length,
      });
    }

    return [...baseFilters, ...roleSpecificFilters];
  }, [
    userRelevantNotifications,
    isAdmin,
    isPatient,
    isStaff,
    urgentNotifications,
    todayNotifications,
  ]);

  // ✅ PRIORITY INDICATOR
  const getPriorityIndicator = useCallback(
    (notification) => {
      const isUrgent = urgentNotifications.some(
        (n) => n.id === notification.id
      );
      const isFeedback = notification.type === "feedback_request";

      // Extract ratings from message (embedded in notification message by database)
      const clinicRatingMatch = notification.message?.match(/Clinic: (\d)★/);
      const doctorRatingMatch = notification.message?.match(/Doctor: (\d)★/);
      const clinicRating = clinicRatingMatch
        ? parseInt(clinicRatingMatch[1])
        : null;
      const doctorRating = doctorRatingMatch
        ? parseInt(doctorRatingMatch[1])
        : null;

      if (
        isUrgent ||
        (isFeedback && (clinicRating <= 2 || doctorRating <= 2))
      ) {
        return (
          <Badge variant="destructive" className="text-xs whitespace-nowrap">
            {clinicRating && `🏥${clinicRating}★`}{" "}
            {doctorRating && `👨‍⚕️${doctorRating}★`} Urgent
          </Badge>
        );
      }

      if (isFeedback && (clinicRating || doctorRating)) {
        return (
          <div className="flex items-center gap-1">
            {clinicRating && (
              <Badge variant="outline" className="text-xs">
                <Building2 className="w-3 h-3 mr-1" />
                {clinicRating}★
              </Badge>
            )}
            {doctorRating && (
              <Badge variant="outline" className="text-xs">
                <Stethoscope className="w-3 h-3 mr-1" />
                {doctorRating}★
              </Badge>
            )}
          </div>
        );
      }

      if (notification.type === "feedback_response") {
        return (
          <Badge variant="secondary" className="text-xs">
            <Reply className="w-3 h-3 mr-1" />
            {isMobile ? "Reply" : "Staff Replied"}
          </Badge>
        );
      }

      return null;
    },
    [urgentNotifications, isMobile]
  );

  // ✅ MOBILE-RESPONSIVE DROPDOWN WIDTH
  const dropdownWidth = isMobile ? "w-[calc(100vw-2rem)]" : "w-96";
  const dropdownMaxHeight = isMobile ? "max-h-[70vh]" : "max-h-[500px]";

  // Calculate unread count from user-relevant notifications
  const userUnreadCount = useMemo(
    () => userRelevantNotifications.filter((n) => !n.is_read).length,
    [userRelevantNotifications]
  );

  return (
    <>
      <div className="relative">
        {/* Toast Message */}
        {toastMessage && (
          <div
            className={`fixed ${
              isMobile ? "top-2 left-2 right-2" : "top-4 right-4"
            } z-50 px-4 py-2 rounded shadow-lg text-white ${
              toastMessage.type === "error" ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {toastMessage.message}
          </div>
        )}

        {/* Bell Button */}
        <Button
          ref={bellRef}
          variant={variant}
          size={size}
          className={`relative ${className}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {userUnreadCount > 0 ? (
            <BellRing className="h-4 w-4 text-orange-600 animate-wiggle" />
          ) : (
            <Bell className="h-4 w-4" />
          )}

          {/* Unread Badge */}
          {userUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
              {userUnreadCount > 99 ? "99+" : userUnreadCount}
            </span>
          )}

          {/* Real-time Connection Indicator */}
          {(isConnected || realtimeConnected) && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          )}
        </Button>

        {/* Notifications Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 md:bg-transparent"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <div
              ref={dropdownRef}
              className={`absolute ${
                isMobile ? "left-1/2 -translate-x-1/2" : "right-0"
              } mt-2 ${dropdownWidth} z-50 bg-background border rounded-lg shadow-lg ${dropdownMaxHeight} overflow-hidden`}
            >
              {/* Header */}
              <div className="p-3 md:p-4 border-b bg-muted/50">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <h3 className="font-semibold text-sm md:text-base text-foreground">
                    Notifications
                    {isAdmin && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Admin
                      </Badge>
                    )}
                  </h3>
                  <div className="flex items-center gap-1 md:gap-2">
                    {userUnreadCount > 0 && (
                      <Button
                        onClick={handleMarkAllAsRead}
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        disabled={loading}
                      >
                        <CheckCheck className="h-3 w-3 md:mr-1" />
                        <span className="hidden md:inline">Mark all read</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => setIsOpen(false)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-2 md:mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 md:py-2 text-xs md:text-sm border rounded-lg bg-background focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                  {getFilterOptions().map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveFilter(key)}
                      className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded whitespace-nowrap ${
                        activeFilter === key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {label}
                      {count > 0 && <span className="ml-1">({count})</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-60 md:max-h-80">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading notifications...
                    </p>
                  </div>
                ) : error ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-destructive mb-4 text-sm">{error}</p>
                    <Button
                      onClick={() => refresh()}
                      variant="outline"
                      size="sm"
                    >
                      Retry
                    </Button>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-medium mb-2 text-sm md:text-base text-foreground">
                      {searchQuery
                        ? "No matching notifications"
                        : "No notifications"}
                    </h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search query"
                        : isAdmin
                        ? "No partnership requests at the moment"
                        : "You're all caught up! New notifications will appear here."}
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredNotifications.map((notification) => {
                      const config = getNotificationConfig(
                        notification.type,
                        notification.metadata
                      );
                      const isUrgent = urgentNotifications.some(
                        (n) => n.id === notification.id
                      );
                      const canReply =
                        notification.type === "feedback_request" &&
                        canRespondToFeedback;

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-3 md:p-4 hover:bg-muted/50 cursor-pointer border-b transition-colors ${
                            !notification.is_read
                              ? isUrgent
                                ? config.urgentBg
                                : config.bgColor
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-2 md:gap-3">
                            {/* Icon */}
                            <div
                              className={`${config.color} mt-1 flex-shrink-0`}
                            >
                              {config.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1 gap-2">
                                <h4
                                  className={`font-medium text-xs md:text-sm truncate ${
                                    !notification.is_read
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {notification.title}
                                </h4>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {getPriorityIndicator(notification)}
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-2">
                                {notification.message}
                              </p>

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {formatTime(notification.created_at)}
                                </span>
                                {canReply && (
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <Reply className="h-3 w-3" />
                                    <span className="hidden md:inline">
                                      Can Reply
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {!loading && userRelevantNotifications.length > 0 && (
                <div className="p-2 md:p-3 border-t bg-muted/50 space-y-2">
                  <div className="text-xs text-center text-muted-foreground">
                    Showing{" "}
                    {Math.min(filteredNotifications.length, maxPreviewItems)}{" "}
                    recent
                    {userRelevantNotifications.length > maxPreviewItems && (
                      <span className="ml-1">
                        • {userRelevantNotifications.length - maxPreviewItems}{" "}
                        more
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      setAllNotificationsModal(true);
                    }}
                    variant="ghost"
                    className="w-full text-xs md:text-sm h-8"
                  >
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    View All ({userRelevantNotifications.length})
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <NotificationDetailsModal
        isOpen={notificationDetailsModal.isOpen}
        onClose={() =>
          setNotificationDetailsModal({ isOpen: false, notification: null })
        }
        notification={notificationDetailsModal.notification}
        onMarkAsRead={markAsRead}
        onOpenFeedbackReply={handleOpenFeedbackReply}
        onNavigate={handleNavigateToNotification}
        getFeedbackDetails={getFeedbackDetails}
      />

      <AllNotificationsModal
        isOpen={allNotificationsModal}
        onClose={() => setAllNotificationsModal(false)}
        allNotifications={userRelevantNotifications}
        loading={loading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={() =>
          markAsRead(
            userRelevantNotifications.filter((n) => !n.is_read).map((n) => n.id)
          )
        }
        onViewDetails={(notification) => {
          setAllNotificationsModal(false);
          setNotificationDetailsModal({ isOpen: true, notification });
        }}
        stats={{
          ...stats,
          total: userRelevantNotifications.length,
          unread: userUnreadCount,
        }}
        loadAllNotifications={loadAllNotifications}
      />

      {feedbackReplyModal.isOpen && (
        <FeedbackReplyModal
          isOpen={feedbackReplyModal.isOpen}
          onClose={() =>
            setFeedbackReplyModal({ isOpen: false, feedbackData: null })
          }
          feedbackData={feedbackReplyModal.feedbackData}
          onSubmitReply={handleFeedbackReply}
        />
      )}
    </>
  );
};

export default UnifiedNotificationBell;
