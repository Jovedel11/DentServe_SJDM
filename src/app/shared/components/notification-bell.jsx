import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNotificationSystem } from "@/core/hooks/useNotificationSystem";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";
import { Bell, BellRing, Search, X, CheckCheck } from "lucide-react";
import { Button } from "@/core/components/ui/button";

const UnifiedNotificationBell = ({
  className = "",
  variant = "ghost",
  size = "icon",
  showPreview = true,
  maxPreviewItems = 5,
}) => {
  const { user, isPatient, isStaff, isAdmin, profile } = useAuth();

  // ✅ UNIFIED NOTIFICATION SYSTEM
  const {
    notifications,
    loading,
    error,
    unreadCount,
    filter,
    fetchNotifications,
    markAsRead,
    hasUnread,
    urgentNotifications,
    todayNotifications,
  } = useNotificationSystem();

  // ✅ REALTIME INTEGRATION
  const { isConnected } = useAppointmentRealtime({
    onNotificationReceived: useCallback(
      (update) => {
        console.log("🔔 New notification received:", update);
        fetchNotifications({ refresh: true });
      },
      [fetchNotifications]
    ),
    onAppointmentStatusChange: useCallback(
      (statusChange) => {
        console.log("📅 Appointment status changed:", statusChange);
        fetchNotifications({ refresh: true });
      },
      [fetchNotifications]
    ),
    enableNotifications: true,
    enableAppointments: true,
  });

  // ✅ LOCAL STATE
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // ✅ ACCESS CONTROL - Show for authenticated users
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

  // ✅ FILTERED NOTIFICATIONS
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
        filtered = filtered.filter((n) =>
          [
            "appointment_confirmed",
            "appointment_cancelled",
            "appointment_reminder",
          ].includes(n.notification_type)
        );
        break;
      case "feedback":
        filtered = filtered.filter(
          (n) => n.notification_type === "feedback_request"
        );
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
  ]);

  // ✅ NOTIFICATION TYPE MAPPING
  const getNotificationConfig = (type) => {
    const configs = {
      appointment_reminder: {
        icon: "⏰",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      appointment_confirmed: {
        icon: "✅",
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      appointment_cancelled: {
        icon: "❌",
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
      feedback_request: {
        icon: "💬",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      partnership_request: {
        icon: "🤝",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
    };
    return (
      configs[type] || {
        icon: "🔔",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
      }
    );
  };

  // ✅ ACTION HANDLERS
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    // Role-based navigation
    if (notification.related_appointment_id) {
      const basePath = isPatient
        ? "/patient"
        : isStaff || isAdmin
        ? "/staff"
        : "";
      window.location.href = `${basePath}/appointments/${notification.related_appointment_id}`;
    } else if (
      notification.notification_type === "feedback_request" &&
      isPatient
    ) {
      window.location.href = "/patient/feedback";
    } else if (
      notification.notification_type === "partnership_request" &&
      isAdmin
    ) {
      window.location.href = "/admin/partnerships";
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);
      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
        setToastMessage("All notifications marked as read");
        setTimeout(() => setToastMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    }
  };

  // ✅ FILTER OPTIONS BASED ON USER ROLE
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
        count: notifications.filter((n) =>
          [
            "appointment_confirmed",
            "appointment_cancelled",
            "appointment_reminder",
          ].includes(n.notification_type)
        ).length,
      });
    }

    if (isPatient) {
      roleSpecificFilters.push({
        key: "feedback",
        label: "Feedback",
        count: notifications.filter(
          (n) => n.notification_type === "feedback_request"
        ).length,
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

  return (
    <div className="relative">
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          {toastMessage}
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
          <BellRing className="h-4 w-4 text-orange-600" />
        ) : (
          <Bell className="h-4 w-4" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Real-time Connection Indicator */}
        {isConnected && (
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
            className="absolute right-0 mt-2 w-96 z-50 bg-background border rounded-lg shadow-lg max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Notifications</h3>
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
            <div className="overflow-y-auto max-h-64">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading notifications...
                  </p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-destructive mb-4">Error: {error}</p>
                  <Button
                    onClick={() => fetchNotifications({ refresh: true })}
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
                      notification.notification_type
                    );
                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 hover:bg-muted/50 cursor-pointer border-b transition-colors ${
                          !notification.is_read ? config.bgColor : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <span className="text-lg">{config.icon}</span>

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
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatTime(notification.created_at)}</span>
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
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && filteredNotifications.length > 0 && (
              <div className="p-3 border-t bg-muted/50">
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    const basePath = isPatient
                      ? "/patient"
                      : isStaff || isAdmin
                      ? "/staff"
                      : "/admin";
                    window.location.href = `${basePath}/notifications`;
                  }}
                  variant="ghost"
                  className="w-full text-sm"
                >
                  View all notifications
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedNotificationBell;
