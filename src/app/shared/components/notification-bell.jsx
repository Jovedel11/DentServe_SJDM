import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/core/contexts/ThemeProvider";
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  Clock,
  Calendar,
  AlertTriangle,
  Info,
  Heart,
  User,
  Settings,
  Trash2,
  MoreVertical,
  Filter,
  Search,
} from "lucide-react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";

const NotificationBell = ({
  className = "",
  variant = "ghost",
  size = "icon",
  showPreview = true,
  maxPreviewItems = 5,
}) => {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Mock data - replace with actual Supabase calls
  const mockNotifications = [
    {
      id: "1",
      user_id: "user_1",
      notification_type: "appointment_reminder",
      title: "Appointment Reminder",
      message:
        "Your dental appointment with Dr. Maria Santos is tomorrow at 2:00 PM",
      related_appointment_id: "appt_1",
      is_read: false,
      sent_via: ["push", "email"],
      scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000),
      sent_at: new Date(),
      created_at: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      id: "2",
      user_id: "user_1",
      notification_type: "appointment_confirmed",
      title: "Appointment Confirmed",
      message:
        "Your appointment has been confirmed for March 25, 2024 at 10:00 AM",
      related_appointment_id: "appt_2",
      is_read: false,
      sent_via: ["push", "sms"],
      scheduled_for: null,
      sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "3",
      user_id: "user_1",
      notification_type: "appointment_cancelled",
      title: "Appointment Cancelled",
      message:
        "Dr. Jennifer Lim has cancelled your appointment scheduled for March 20, 2024",
      related_appointment_id: "appt_3",
      is_read: true,
      sent_via: ["push", "email"],
      scheduled_for: null,
      sent_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: "4",
      user_id: "user_1",
      notification_type: "payment_reminder",
      title: "Payment Due",
      message: "Your payment of ₱2,500 for dental cleaning is due tomorrow",
      related_appointment_id: "appt_4",
      is_read: false,
      sent_via: ["push", "email"],
      scheduled_for: new Date(Date.now() + 12 * 60 * 60 * 1000),
      sent_at: new Date(Date.now() - 45 * 60 * 1000),
      created_at: new Date(Date.now() - 45 * 60 * 1000),
    },
    {
      id: "5",
      user_id: "user_1",
      notification_type: "system_update",
      title: "New Features Available",
      message:
        "Check out our new online prescription feature and updated booking system",
      related_appointment_id: null,
      is_read: true,
      sent_via: ["push"],
      scheduled_for: null,
      sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      id: "6",
      user_id: "user_1",
      notification_type: "appointment_reminder",
      title: "Follow-up Required",
      message:
        "Please schedule a follow-up appointment after your recent dental procedure",
      related_appointment_id: "appt_5",
      is_read: false,
      sent_via: ["push", "email"],
      scheduled_for: null,
      sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual Supabase call
        await new Promise((resolve) => setTimeout(resolve, 500));
        setNotifications(mockNotifications);
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Click outside handler
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

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !notification.is_read) ||
      (filter === "read" && notification.is_read);

    const matchesSearch =
      !searchQuery ||
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Get notification icon and color based on type
  const getNotificationIcon = (type) => {
    const iconMap = {
      appointment_reminder: { icon: Clock, color: "text-warning" },
      appointment_confirmed: { icon: Check, color: "text-success" },
      appointment_cancelled: { icon: X, color: "text-destructive" },
      payment_reminder: { icon: AlertTriangle, color: "text-warning" },
      payment_confirmed: { icon: CheckCheck, color: "text-success" },
      system_update: { icon: Settings, color: "text-info" },
      promotion: { icon: Heart, color: "text-primary" },
      general: { icon: Info, color: "text-muted-foreground" },
    };
    return iconMap[type] || iconMap.general;
  };

  // Handle notification actions
  const markAsRead = async (notificationId) => {
    try {
      // TODO: Supabase update call
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // TODO: Supabase bulk update
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // TODO: Supabase delete call
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.related_appointment_id) {
      // Navigate to appointment details
      window.location.href = `/patient/appointments/${notification.related_appointment_id}`;
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        ref={bellRef}
        variant={variant}
        size={size}
        className={`relative hover:bg-sidebar-accent transition-colors ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4 text-primary" />
        ) : (
          <Bell className="h-4 w-4" />
        )}

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1"
            >
              <Badge className="h-5 w-5 p-0 text-xs bg-destructive text-destructive-foreground flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse animation for new notifications */}
        {unreadCount > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </Button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 mt-2 w-96 z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">
                    Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs h-7 px-2"
                      >
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:border-primary focus:outline-none"
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
                      onClick={() => setFilter(key)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filter === key
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {label}
                      {key === "unread" && unreadCount > 0 && (
                        <span className="ml-1 text-xs">({unreadCount})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading notifications...
                    </p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h4 className="font-medium text-foreground mb-2">
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
                  <div className="divide-y divide-border">
                    {filteredNotifications.map((notification, index) => {
                      const { icon: Icon, color } = getNotificationIcon(
                        notification.notification_type
                      );

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer group ${
                            !notification.is_read ? "bg-primary/5" : ""
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`flex-shrink-0 mt-1 ${color}`}>
                              <Icon className="h-5 w-5" />
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
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {formatDistanceToNow(
                                    new Date(notification.created_at),
                                    { addSuffix: true }
                                  )}
                                </span>
                                {notification.sent_via && (
                                  <div className="flex items-center gap-1">
                                    {notification.sent_via.map((channel) => (
                                      <span
                                        key={channel}
                                        className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                                      >
                                        {channel}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {!isLoading && filteredNotifications.length > 0 && (
                <div className="p-3 border-t border-border bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-sm"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = "/patient/notifications";
                    }}
                  >
                    View all notifications
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
