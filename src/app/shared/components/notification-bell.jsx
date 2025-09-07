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
import { useAppointmentNotifications } from "@/core/hooks/useAppointmentNotification";

const NotificationBell = ({
  className = "",
  variant = "ghost",
  size = "icon",
  showPreview = true,
  maxPreviewItems = 5,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    refresh,
  } = useAppointmentNotifications();

  // Remove the mock data loading effect and replace with:
  useEffect(() => {
    // Initial load handled by hook
    refresh();
  }, [refresh]);

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
