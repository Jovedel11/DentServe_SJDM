import React, { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Bell,
  Search,
  Filter,
  CheckCheck,
  Clock,
  MessageSquare,
  Calendar,
  User,
  X,
  AlertCircle,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";

const AllNotificationsModal = ({
  isOpen,
  onClose,
  allNotifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onViewDetails,
  stats,
  loadAllNotifications,
}) => {
  const { isPatient, isStaff, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date"); // date, priority, type

  // ✅ LOAD ALL NOTIFICATIONS ON OPEN
  useEffect(() => {
    if (isOpen && loadAllNotifications) {
      loadAllNotifications();
    }
  }, [isOpen, loadAllNotifications]);

  // ✅ FILTER AND SORT NOTIFICATIONS
  const filteredAndSortedNotifications = React.useMemo(() => {
    let filtered = allNotifications || [];

    // Apply filter
    switch (activeFilter) {
      case "unread":
        filtered = filtered.filter((n) => !n.is_read);
        break;
      case "read":
        filtered = filtered.filter((n) => n.is_read);
        break;
      case "urgent":
        filtered = filtered.filter(
          (n) =>
            n.priority === 1 ||
            (n.type === "feedback_request" && n.metadata?.rating <= 2)
        );
        break;
      case "today":
        const today = new Date().toDateString();
        filtered = filtered.filter(
          (n) => new Date(n.created_at).toDateString() === today
        );
        break;
      case "appointments":
        filtered = filtered.filter((n) =>
          [
            "appointment_confirmed",
            "appointment_cancelled",
            "appointment_reminder",
          ].includes(n.type)
        );
        break;
      case "feedback":
        filtered = filtered.filter((n) => n.type === "feedback_request");
        break;
      case "partnerships":
        filtered = filtered.filter((n) => n.type === "partnership_request");
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

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          if (a.is_read !== b.is_read) return a.is_read ? 1 : -1; // Unread first
          return (a.priority || 5) - (b.priority || 5); // Lower priority number = higher priority
        case "type":
          return a.type.localeCompare(b.type);
        case "date":
        default:
          return new Date(b.created_at) - new Date(a.created_at); // Newest first
      }
    });

    return filtered;
  }, [allNotifications, activeFilter, searchQuery, sortBy]);

  // ✅ NOTIFICATION TYPE CONFIGS
  const getNotificationConfig = (type, metadata = {}) => {
    const configs = {
      appointment_reminder: {
        icon: <Clock className="h-4 w-4" />,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      appointment_confirmed: {
        icon: <CheckCheck className="h-4 w-4" />,
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      appointment_cancelled: {
        icon: <X className="h-4 w-4" />,
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
      feedback_request: {
        icon: <MessageSquare className="h-4 w-4" />,
        color: "text-blue-600",
        bgColor: metadata?.rating <= 2 ? "bg-red-50" : "bg-blue-50",
      },
      partnership_request: {
        icon: <User className="h-4 w-4" />,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
    };

    return (
      configs[type] || {
        icon: <Bell className="h-4 w-4" />,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
      }
    );
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
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    }
  };

  // ✅ GET PRIORITY INDICATOR
  const getPriorityIndicator = (notification) => {
    const isUrgent =
      notification.priority === 1 ||
      (notification.type === "feedback_request" &&
        notification.metadata?.rating <= 2);
    const isFeedback = notification.type === "feedback_request";
    const rating = notification.metadata?.rating;

    if (isUrgent) {
      return (
        <Badge variant="destructive" className="text-xs">
          {isFeedback && rating <= 2 ? `${rating}★ Urgent` : "Urgent"}
        </Badge>
      );
    }

    if (isFeedback && rating) {
      const stars = Array.from({ length: rating }, (_, i) => "★").join("");
      return (
        <Badge variant="outline" className="text-xs">
          {stars}
        </Badge>
      );
    }

    return null;
  };

  // ✅ FILTER OPTIONS
  const getFilterOptions = () => {
    const baseFilters = [
      { key: "all", label: "All", count: allNotifications?.length || 0 },
      { key: "unread", label: "Unread", count: stats?.unread || 0 },
      { key: "read", label: "Read", count: stats?.read || 0 },
    ];

    const roleSpecificFilters = [];

    if (stats?.urgent > 0) {
      roleSpecificFilters.push({
        key: "urgent",
        label: "Urgent",
        count: stats.urgent,
      });
    }

    if (stats?.today > 0) {
      roleSpecificFilters.push({
        key: "today",
        label: "Today",
        count: stats.today,
      });
    }

    if (stats?.appointments > 0) {
      roleSpecificFilters.push({
        key: "appointments",
        label: "Appointments",
        count: stats.appointments,
      });
    }

    if (stats?.feedback > 0 && (isStaff || isAdmin)) {
      roleSpecificFilters.push({
        key: "feedback",
        label: "Feedback",
        count: stats.feedback,
      });
    }

    if (stats?.partnerships > 0 && isAdmin) {
      roleSpecificFilters.push({
        key: "partnerships",
        label: "Partnerships",
        count: stats.partnerships,
      });
    }

    return [...baseFilters, ...roleSpecificFilters];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              All Notifications
              {stats?.urgent > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.urgent} Urgent
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {stats?.unread > 0 && (
                <Button
                  onClick={onMarkAllAsRead}
                  size="sm"
                  variant="outline"
                  disabled={loading}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark All Read ({stats.unread})
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ✅ SEARCH AND FILTERS */}
        <div className="border-b pb-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto">
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

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>
          </div>
        </div>

        {/* ✅ NOTIFICATIONS LIST */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">
                Loading all notifications...
              </p>
            </div>
          ) : filteredAndSortedNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2 text-foreground">
                {searchQuery || activeFilter !== "all"
                  ? "No matching notifications"
                  : "No notifications"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {searchQuery || activeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "You're all caught up! New notifications will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredAndSortedNotifications.map((notification) => {
                const config = getNotificationConfig(
                  notification.type,
                  notification.metadata
                );
                const isUrgent =
                  notification.priority === 1 ||
                  (notification.type === "feedback_request" &&
                    notification.metadata?.rating <= 2);

                return (
                  <div
                    key={notification.id}
                    onClick={() => onViewDetails(notification)}
                    className={`p-4 hover:bg-muted/50 cursor-pointer border-b transition-colors ${
                      !notification.is_read
                        ? isUrgent
                          ? "bg-red-50 border-red-200"
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
                          <div className="flex items-center gap-2 ml-2">
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
                          <span>{formatTime(notification.created_at)}</span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {notification.type.replace("_", " ")}
                            </Badge>
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

        {/* ✅ FOOTER STATS */}
        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          Showing {filteredAndSortedNotifications.length} of{" "}
          {allNotifications?.length || 0} notifications
          {stats && (
            <span className="ml-4">
              • {stats.unread} unread • {stats.urgent} urgent
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AllNotificationsModal;
