import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useUnifiedNotificationSystem } from "@/app/shared/hook/useUnifiedNotificationSystem";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import FeedbackReplyModal from "@/app/staff/components/feedback-reply-modal";
import NotificationDetailsModal from "@/app/staff/components/notification-details-modal";
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
  const { user, isPatient, isStaff, isAdmin, profile } = useAuth();

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

  // ✅ FILTERED NOTIFICATIONS (Preview only)
  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications;

    // Apply filter
    switch (activeFilter) {
      case "unread":
        filtered = filtered.filter((n) => !n.is_read);
        break;
      case "read":
        filtered = filtered.filter((n) => n.is_read);
        break;
      case "urgent":
        filtered = urgentNotifications;
        break;
      case "today":
        filtered = todayNotifications;
        break;
      case "appointments":
        filtered = appointmentNotifications;
        break;
      case "feedback":
        filtered = feedbackNotifications;
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

    return filtered.slice(0, maxPreviewItems);
  }, [
    notifications,
    activeFilter,
    searchQuery,
    maxPreviewItems,
    urgentNotifications,
    todayNotifications,
    appointmentNotifications,
    feedbackNotifications,
  ]);

  // ✅ NOTIFICATION TYPE MAPPING WITH DUAL RATINGS SUPPORT
  const getNotificationConfig = (type, metadata = {}) => {
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
  };

  // ✅ ACTION HANDLERS
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    // ✅ NEW: Open details modal instead of direct navigation
    setNotificationDetailsModal({
      isOpen: true,
      notification,
    });
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications
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

  // ✅ HANDLE FEEDBACK REPLY
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

  // ✅ OPEN FEEDBACK REPLY MODAL
  const handleOpenFeedbackReply = (feedbackData) => {
    setFeedbackReplyModal({
      isOpen: true,
      feedbackData,
    });
  };

  // ✅ TOAST HELPER
  const showToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(""), 3000);
  };

  // ✅ FORMAT TIME
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

  // ✅ FILTER OPTIONS
  const getFilterOptions = () => {
    const baseFilters = [
      { key: "all", label: "All", count: notifications.length },
      { key: "unread", label: "Unread", count: unreadCount },
      { key: "read", label: "Read", count: notifications.length - unreadCount },
    ];

    const roleSpecificFilters = [];

    if (isPatient || isStaff || isAdmin) {
      roleSpecificFilters.push({
        key: "appointments",
        label: "Appointments",
        count: appointmentNotifications.length,
      });
    }

    if (canRespondToFeedback) {
      roleSpecificFilters.push({
        key: "feedback",
        label: "Feedback",
        count: feedbackNotifications.length,
      });
    }

    if (urgentNotifications.length > 0) {
      roleSpecificFilters.push({
        key: "urgent",
        label: "Urgent",
        count: urgentNotifications.length,
      });
    }

    if (todayNotifications.length > 0) {
      roleSpecificFilters.push({
        key: "today",
        label: "Today",
        count: todayNotifications.length,
      });
    }

    return [...baseFilters, ...roleSpecificFilters];
  };

  // ✅ GET NOTIFICATION PRIORITY INDICATOR WITH DUAL RATINGS
  const getPriorityIndicator = (notification) => {
    const isUrgent = urgentNotifications.some((n) => n.id === notification.id);
    const isFeedback = notification.type === "feedback_request";
    const isFeedbackResponse = notification.type === "feedback_response";

    // ✅ Extract dual ratings from metadata or message
    const clinicRating = notification.metadata?.clinic_rating;
    const doctorRating = notification.metadata?.doctor_rating;
    const legacyRating = notification.metadata?.rating;

    if (isUrgent) {
      if (
        isFeedback &&
        (clinicRating <= 2 || doctorRating <= 2 || legacyRating <= 2)
      ) {
        return (
          <Badge variant="destructive" className="text-xs">
            {clinicRating && `🏥${clinicRating}★`}{" "}
            {doctorRating && `👨‍⚕️${doctorRating}★`} Urgent
          </Badge>
        );
      }
      return (
        <Badge variant="destructive" className="text-xs">
          Urgent
        </Badge>
      );
    }

    if (isFeedback) {
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

    if (isFeedbackResponse) {
      return (
        <Badge variant="secondary" className="text-xs">
          <Reply className="w-3 h-3 mr-1" />
          Staff Replied
        </Badge>
      );
    }

    return null;
  };

  return (
    <>
      <div className="relative">
        {/* Toast Message */}
        {toastMessage && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${
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
          {hasUnread ? (
            <BellRing className="h-4 w-4 text-orange-600 animate-wiggle" />
          ) : (
            <Bell className="h-4 w-4" />
          )}

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
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
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <div
              ref={dropdownRef}
              className="absolute right-0 mt-2 w-96 z-50 bg-background border rounded-lg shadow-lg max-h-[500px] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">
                    Notifications
                    {stats?.urgent > 0 && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {stats.urgent} Urgent
                      </Badge>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {hasUnread && (
                      <Button
                        onClick={handleMarkAllAsRead}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={loading}
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Mark all read
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
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 overflow-x-auto">
                  {getFilterOptions().map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveFilter(key)}
                      className={`px-3 py-1 text-sm rounded whitespace-nowrap ${
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
              <div className="overflow-y-auto max-h-80">
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
                    <p className="text-destructive mb-4">Error: {error}</p>
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
                    <h4 className="font-medium mb-2 text-foreground">
                      {searchQuery
                        ? "No matching notifications"
                        : "No notifications"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search query"
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
                        canRespondToFeedback &&
                        !notification.metadata?.response;

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 hover:bg-muted/50 cursor-pointer border-b transition-colors ${
                            !notification.is_read
                              ? isUrgent
                                ? config.urgentBg
                                : config.bgColor
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`${config.color} mt-1`}>
                              {config.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4
                                  className={`font-medium text-sm truncate ${
                                    !notification.is_read
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {notification.title}
                                </h4>
                                <div className="flex items-center gap-1 ml-2">
                                  {getPriorityIndicator(notification)}
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {notification.message}
                              </p>

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {formatTime(notification.created_at)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {canReply && (
                                    <div className="flex items-center gap-1 text-blue-600">
                                      <Reply className="h-3 w-3" />
                                      <span>Can Reply</span>
                                    </div>
                                  )}
                                  {notification.sent_via && (
                                    <div className="flex gap-1">
                                      {notification.sent_via.map((channel) => (
                                        <span
                                          key={channel}
                                          className="px-1 py-0.5 bg-muted rounded text-xs"
                                        >
                                          {channel}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ✅ ENHANCED FOOTER */}
              {!loading && (
                <div className="p-3 border-t bg-muted/50 space-y-2">
                  {/* Show preview count */}
                  <div className="text-xs text-center text-muted-foreground">
                    Showing{" "}
                    {Math.min(filteredNotifications.length, maxPreviewItems)}{" "}
                    recent notifications
                    {stats?.total > maxPreviewItems && (
                      <span className="ml-1">
                        • {stats.total - maxPreviewItems} more available
                      </span>
                    )}
                  </div>

                  {/* View All Button */}
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      setAllNotificationsModal(true);
                    }}
                    variant="ghost"
                    className="w-full text-sm"
                  >
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    View All Notifications ({stats?.total || 0})
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ✅ NOTIFICATION DETAILS MODAL */}
      <NotificationDetailsModal
        isOpen={notificationDetailsModal.isOpen}
        onClose={() =>
          setNotificationDetailsModal({ isOpen: false, notification: null })
        }
        notification={notificationDetailsModal.notification}
        onMarkAsRead={markAsRead}
        onOpenFeedbackReply={handleOpenFeedbackReply}
        getFeedbackDetails={getFeedbackDetails}
      />

      {/* ✅ ALL NOTIFICATIONS MODAL */}
      <AllNotificationsModal
        isOpen={allNotificationsModal}
        onClose={() => setAllNotificationsModal(false)}
        allNotifications={allNotifications}
        loading={loading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={() =>
          markAsRead(
            allNotifications.filter((n) => !n.is_read).map((n) => n.id)
          )
        }
        onViewDetails={(notification) => {
          setAllNotificationsModal(false);
          setNotificationDetailsModal({ isOpen: true, notification });
        }}
        stats={stats}
        loadAllNotifications={loadAllNotifications}
      />

      {/* ✅ FEEDBACK REPLY MODAL */}
      <FeedbackReplyModal
        isOpen={feedbackReplyModal.isOpen}
        onClose={() =>
          setFeedbackReplyModal({ isOpen: false, feedbackData: null })
        }
        feedbackData={feedbackReplyModal.feedbackData}
        onSubmitReply={handleFeedbackReply}
      />
    </>
  );
};

export default UnifiedNotificationBell;
