import React, { useState, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useStaffNotifications } from "@/core/hooks/useStaffNotification";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";

const StaffNotificationCenter = ({
  className = "",
  variant = "icon", // "icon", "dropdown", "full"
}) => {
  const { user, profile, isStaff, isAdmin } = useAuth();

  // ✅ STAFF NOTIFICATIONS INTEGRATION
  const {
    notifications,
    loading,
    error,
    stats,
    markSingleAsRead,
    markAllAsRead,
    refresh,
    getFilteredNotifications,
    hasUnread,
    isEmpty,
  } = useStaffNotifications();

  // ✅ REAL-TIME UPDATES
  const { isConnected } = useAppointmentRealtime({
    onNotificationReceived: useCallback(
      (update) => {
        console.log("New staff notification received:", update);
        refresh(); // Refresh notifications when new ones arrive
      },
      [refresh]
    ),
    enableNotifications: true,
    enableAppointments: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");

  // ✅ ACCESS CONTROL
  if (!user || (!isStaff() && !isAdmin())) {
    return null;
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markSingleAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.appointment_id) {
      window.location.href = `/staff/appointments`;
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
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "appointment_confirmed":
        return "📅";
      case "appointment_cancelled":
        return "❌";
      case "appointment_reminder":
        return "⏰";
      default:
        return "🔔";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1:
        return "bg-red-100 text-red-800 border-red-200";
      case 2:
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const filteredNotifications = getFilteredNotifications(selectedFilter);

  // ✅ ICON VARIANT (for navbar)
  if (variant === "icon") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            {hasUnread ? "🔔" : "🔕"}
          </div>

          {/* Unread Badge */}
          {stats.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {stats.unreadCount > 99 ? "99+" : stats.unreadCount}
            </span>
          )}

          {/* Real-time Indicator */}
          {isConnected && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <div className="absolute right-0 mt-2 w-96 z-50 bg-white border rounded-lg shadow-lg max-h-96 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Staff Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    {hasUnread && (
                      <button
                        onClick={() => {
                          markAllAsRead();
                          setIsOpen(false);
                        }}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>{stats.unreadCount} unread</span>
                  <span>{stats.urgent} urgent</span>
                  <span>{stats.todayCount} today</span>
                </div>
              </div>

              {/* Filters */}
              <div className="p-2 border-b flex flex-wrap gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "unread", label: "Unread" },
                  { key: "urgent", label: "Urgent" },
                  { key: "appointments", label: "Appointments" },
                  { key: "messages", label: "Messages" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFilter(key)}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedFilter === key
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-80">
                {loading ? (
                  <div className="p-4 text-center text-gray-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    Loading...
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-red-600">
                    Error: {error}
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-2xl mb-2">🔕</div>
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  <div>
                    {filteredNotifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 hover:bg-gray-50 cursor-pointer border-b transition-colors ${
                          !notification.is_read ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h4
                                className={`font-medium text-sm truncate ${
                                  !notification.is_read
                                    ? "text-gray-900"
                                    : "text-gray-600"
                                }`}
                              >
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-1 ml-2">
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                                {notification.priority === 1 && (
                                  <span className="text-xs bg-red-500 text-white px-1 py-0.5 rounded">
                                    URGENT
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{formatTime(notification.created_at)}</span>
                              {notification.related_data && (
                                <span className="text-blue-600">
                                  📅{" "}
                                  {notification.related_data.appointment_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {!loading && !isEmpty && (
                <div className="p-3 border-t bg-gray-50">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = "/staff/notifications";
                    }}
                    className="w-full text-sm text-blue-600 hover:text-blue-800"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ✅ FULL PAGE VARIANT (for dedicated notifications page)
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Staff Notifications
              </h1>
              <p className="text-gray-600 mt-1">
                {stats.total} total • {stats.unreadCount} unread •{" "}
                {stats.urgent} urgent
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              {hasUnread && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All", count: stats.total },
              { key: "unread", label: "Unread", count: stats.unreadCount },
              { key: "urgent", label: "Urgent", count: stats.urgent },
              {
                key: "appointments",
                label: "Appointments",
                count:
                  stats.byType.appointment_confirmed +
                  stats.byType.appointment_cancelled,
              },
              { key: "today", label: "Today", count: stats.todayCount },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setSelectedFilter(key)}
                className={`px-3 py-2 text-sm rounded-lg ${
                  selectedFilter === key
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {label}
                {count > 0 && <span className="ml-1 text-xs">({count})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div>
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 hover:bg-gray-50 cursor-pointer border-b transition-colors ${
                !notification.is_read ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3
                      className={`font-medium ${
                        !notification.is_read
                          ? "text-gray-900"
                          : "text-gray-700"
                      }`}
                    >
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 ml-4">
                      {!notification.is_read && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                      {notification.priority === 1 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          URGENT
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{notification.message}</p>
                  {notification.related_data && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        📅 {notification.related_data.appointment_date} at{" "}
                        {notification.related_data.appointment_time}
                      </span>
                      {notification.related_data.clinic_name && (
                        <span>🏥 {notification.related_data.clinic_name}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaffNotificationCenter;
