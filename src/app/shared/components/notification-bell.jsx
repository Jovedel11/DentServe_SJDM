import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useAppointmentNotifications } from "@/core/hooks/useAppointmentNotification";
import { useAppointmentRealtime } from "@/core/hooks/useAppointmentRealtime";

const NotificationBell = ({
  className = "",
  variant = "ghost",
  size = "icon",
  showPreview = true,
  maxPreviewItems = 5,
}) => {
  const { user, isPatient } = useAuth();

  // ✅ REAL HOOK INTEGRATION
  const {
    notifications,
    loading,
    error,
    unreadCount,
    filter,
    markAsRead,
    markSingleAsRead,
    markAllAsRead,
    refresh,
    updateFilter,
    isEmpty,
    hasUnread,
  } = useAppointmentNotifications();

  // ✅ REALTIME INTEGRATION
  const { isConnected } = useAppointmentRealtime({
    onNotificationReceived: useCallback(
      (update) => {
        console.log("New notification received:", update);
        refresh(); // Refresh notifications when new ones arrive
      },
      [refresh]
    ),
    enableNotifications: true,
    enableAppointments: false,
  });

  // ✅ LOCAL STATE
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // ✅ ACCESS CONTROL
  if (!user || !isPatient || !isPatient()) {
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

    // Apply current filter
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (filter === "read") {
      filtered = filtered.filter((n) => n.is_read);
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
  }, [notifications, filter, searchQuery, maxPreviewItems]);

  // ✅ NOTIFICATION ICON MAPPING
  const getNotificationIcon = (type) => {
    const iconMap = {
      appointment_reminder: "⏰",
      appointment_confirmed: "✅",
      appointment_cancelled: "❌",
    };
    return iconMap[type] || iconMap.general;
  };

  // ✅ ACTION HANDLERS
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markSingleAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.related_appointment_id) {
      window.location.href = `/patient/appointments/${notification.related_appointment_id}`;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setToastMessage("All notifications marked as read");
      setTimeout(() => setToastMessage(""), 3000);
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

  return (
    <div className="relative">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded">
          {toastMessage}
        </div>
      )}

      {/* Bell Button */}
      <button
        ref={bellRef}
        className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xl">{hasUnread ? "🔔" : "🔕"}</span>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Real-time Indicator */}
        {isConnected && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        )}
      </button>

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
            className="absolute right-0 mt-2 w-96 z-50 bg-white border rounded-lg shadow-lg max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex items-center gap-2">
                  {hasUnread && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      disabled={loading}
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

              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "unread", label: "Unread" },
                  { key: "read", label: "Read" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateFilter(key)}
                    className={`px-3 py-1 text-sm rounded ${
                      filter === key
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {label}
                    {key === "unread" && unreadCount > 0 && (
                      <span className="ml-1">({unreadCount})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">
                    Loading notifications...
                  </p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-red-500 mb-4">Error: {error}</p>
                  <button
                    onClick={refresh}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              ) : isEmpty || filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="text-4xl mb-4 block">🔕</span>
                  <h4 className="font-medium mb-2">
                    {searchQuery
                      ? "No matching notifications"
                      : "No notifications"}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "You're all caught up! New notifications will appear here."}
                  </p>
                </div>
              ) : (
                <div>
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer border-b transition-colors ${
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
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatTime(notification.created_at)}</span>
                            {notification.sent_via && (
                              <div className="flex gap-1">
                                {notification.sent_via.map((channel) => (
                                  <span
                                    key={channel}
                                    className="px-1 py-0.5 bg-gray-200 rounded text-xs"
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
                    window.location.href = "/patient/notifications";
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
};

export default NotificationBell;
