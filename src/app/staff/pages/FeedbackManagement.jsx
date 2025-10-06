import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Star,
  Calendar,
  User,
  UserX,
  Reply,
  Filter,
  TrendingUp,
  Eye,
  EyeOff,
  Send,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  Stethoscope,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Award,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useStaffFeedback } from "@/hooks/feedback/useStaffFeedback";

const FeedbackManagement = () => {
  const { user, profile, isStaff, isAdmin } = useAuth();

  // ✅ USE THE HOOK
  const {
    loading,
    error,
    filteredFeedbacks,
    filters,
    totalFeedbacks,
    pendingResponses,
    avgRating,
    avgClinicRating,
    avgDoctorRating,
    responseRate,
    urgentFeedbacks,
    ratingDistribution,
    updateFilters,
    respondToFeedback,
    refreshData,
    clearError,
    isEmpty,
    canRespond,
  } = useStaffFeedback({
    autoFetch: true,
    includeAnalytics: true,
  });

  // ✅ LOCAL UI STATE
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // ✅ HANDLE REPLY SUBMISSION
  const handleReplySubmit = async (feedbackId) => {
    if (!replyText.trim()) {
      showToast("Please enter a response", "error");
      return;
    }

    if (replyText.trim().length < 10) {
      showToast("Response must be at least 10 characters", "error");
      return;
    }

    setSendingReply(true);
    try {
      const result = await respondToFeedback(feedbackId, replyText.trim());

      if (result.success) {
        showToast(
          result.patient_notified
            ? "Response sent! Patient has been notified."
            : "Response sent successfully!"
        );
      setReplyingTo(null);
      setReplyText("");
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      showToast(err.message || "Failed to send response", "error");
    } finally {
      setSendingReply(false);
    }
  };

  // ✅ TOAST HELPER
  const showToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(""), 3000);
  };

  // ✅ GET RATING COLOR
  const getRatingColor = (rating) => {
    if (rating >= 4) return "text-green-600 dark:text-green-400";
    if (rating >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // ✅ GET FEEDBACK TYPE BADGE COLOR
  const getFeedbackTypeColor = (type) => {
    const colors = {
      doctor:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      service:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      facility:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      general:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
    };
    return colors[type] || colors.general;
  };

  // ✅ GET FEEDBACK TYPE ICON
  const getFeedbackTypeIcon = (type) => {
    const icons = {
      doctor: <Stethoscope className="w-3 h-3" />,
      service: <Award className="w-3 h-3" />,
      facility: <Building2 className="w-3 h-3" />,
      general: <MessageSquare className="w-3 h-3" />,
    };
    return icons[type] || icons.general;
  };

  // ✅ RENDER DUAL STAR RATINGS
  const renderStars = (rating, size = "normal") => {
    const sizeClasses = {
      large: "w-5 h-5",
      normal: "w-4 h-4",
      small: "w-3 h-3",
    };

    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`${sizeClasses[size]} ${
          index < Math.floor(rating || 0)
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-300 dark:text-gray-600"
        }`}
      />
    ));
  };

  // ✅ GET URGENCY INDICATOR
  const getUrgencyBadge = (feedback) => {
    const lowClinic = feedback.clinic_rating && feedback.clinic_rating <= 2;
    const lowDoctor = feedback.doctor_rating && feedback.doctor_rating <= 2;
    const isUrgent = feedback.rating <= 2 || lowClinic || lowDoctor;

    if (!isUrgent) return null;

    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full">
        <AlertCircle className="w-3 h-3 mr-1" />
        Urgent
      </span>
    );
  };

  // ✅ ACCESS CONTROL
  if (!user || (!isStaff && !isAdmin)) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            Only staff and admin users can access feedback management.
          </p>
        </div>
      </div>
    );
  }

  // ✅ LOADING STATE
  if (loading && filteredFeedbacks.length === 0) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
          <div className="h-16 bg-muted rounded-xl"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 right-4 z-50"
            >
              <div
                className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
                  toastMessage.type === "error"
                    ? "bg-red-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {toastMessage.type === "error" ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{toastMessage.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Header */}
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Feedback Management
          </h1>
            <p className="text-muted-foreground">
              Monitor and respond to patient feedback • Improve service quality
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-200">
                    Error Loading Feedback
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
          </p>
        </div>
      </div>
              <button
                onClick={clearError}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

      {/* Statistics Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Total Feedback */}
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {totalFeedbacks}
            </h3>
            <p className="text-sm text-muted-foreground">Total Feedback</p>
            {urgentFeedbacks > 0 && (
              <div className="mt-3 flex items-center text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3 mr-1" />
                {urgentFeedbacks} urgent
          </div>
            )}
        </div>

          {/* Clinic Rating */}
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {avgClinicRating}
            </h3>
            <p className="text-sm text-muted-foreground">Clinic Rating</p>
            <div className="mt-3 flex items-center">
              {renderStars(parseFloat(avgClinicRating), "small")}
          </div>
        </div>

          {/* Doctor Rating */}
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Stethoscope className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {avgDoctorRating}
            </h3>
            <p className="text-sm text-muted-foreground">Doctor Rating</p>
            <div className="mt-3 flex items-center">
              {renderStars(parseFloat(avgDoctorRating), "small")}
          </div>
        </div>

          {/* Response Rate */}
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Reply className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {responseRate}%
            </h3>
            <p className="text-sm text-muted-foreground">Response Rate</p>
            <div className="mt-3 w-full bg-muted rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${responseRate}%` }}
              />
            </div>
          </div>

          {/* Pending */}
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {pendingResponses}
            </h3>
            <p className="text-sm text-muted-foreground">Pending Response</p>
            {pendingResponses > 0 && (
              <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                Requires attention
              </div>
            )}
          </div>
        </motion.div>

        {/* Filters Bar */}
        <motion.div
          className="bg-card border border-border rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Period Filter */}
            <select
                value={filters.period}
                onChange={(e) => updateFilters({ period: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Time</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>

              {/* Type Filter */}
            <select
                value={filters.type}
                onChange={(e) => updateFilters({ type: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="service">Service</option>
              <option value="doctor">Doctor</option>
              <option value="facility">Facility</option>
            </select>

              {/* Rating Filter */}
            <select
                value={filters.rating}
                onChange={(e) => updateFilters({ rating: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Ratings</option>
                <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
                <option value="4">4 Stars ⭐⭐⭐⭐</option>
                <option value="3">3 Stars ⭐⭐⭐</option>
                <option value="2">2 Stars ⭐⭐</option>
                <option value="1">1 Star ⭐</option>
              </select>

              {/* Response Status Filter */}
              <select
                value={filters.responseStatus}
                onChange={(e) =>
                  updateFilters({ responseStatus: e.target.value })
                }
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Response</option>
                <option value="responded">Responded</option>
            </select>
          </div>

            {/* Clear Filters */}
            {(filters.period !== "week" ||
              filters.type !== "all" ||
              filters.rating !== "all" ||
              filters.responseStatus !== "all") && (
              <button
                onClick={() =>
                  updateFilters({
                    period: "week",
                    type: "all",
                    rating: "all",
                    responseStatus: "all",
                  })
                }
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear Filters
              </button>
            )}
        </div>
        </motion.div>

      {/* Feedback List */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isEmpty ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Feedback Found
            </h3>
              <p className="text-muted-foreground mb-6">
                {filters.period !== "week" ||
                filters.type !== "all" ||
                filters.rating !== "all" ||
                filters.responseStatus !== "all"
                ? "Try adjusting your filters to see more results."
                  : "No feedback has been submitted yet. Patient feedback will appear here once submitted."}
            </p>
          </div>
        ) : (
            filteredFeedbacks.map((feedback, index) => (
              <motion.div
              key={feedback.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
              {/* Feedback Header */}
              <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                  {/* Patient Avatar */}
                  <div className="flex-shrink-0">
                    {feedback.is_anonymous ? (
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <UserX className="w-6 h-6 text-muted-foreground" />
                      </div>
                    ) : feedback.patient_image ? (
                      <img
                        src={feedback.patient_image}
                        alt={feedback.patient_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Feedback Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-3">
                        <span className="font-semibold text-foreground">
                          {feedback.is_anonymous
                            ? "Anonymous Patient"
                            : feedback.patient_name}
                        </span>

                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getFeedbackTypeColor(
                          feedback.feedback_type
                        )}`}
                      >
                        {getFeedbackTypeIcon(feedback.feedback_type)}
                        <span className="ml-1 capitalize">
                          {feedback.feedback_type}
                        </span>
                      </span>

                        {getUrgencyBadge(feedback)}

                        {feedback.response ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Responded
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-full">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </span>
                        )}

                        {feedback.is_public && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
                            <Eye className="w-3 h-3 mr-1" />
                            Public
                        </span>
                      )}
                    </div>

                      {/* Dual Ratings Display */}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        {/* Clinic Rating */}
                        {feedback.clinic_rating && (
                          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  Clinic
                                </span>
                        </div>
                        <span
                                className={`text-sm font-bold ${getRatingColor(
                                  feedback.clinic_rating
                          )}`}
                        >
                                {feedback.clinic_rating}/5
                        </span>
                            </div>
                            <div className="flex items-center">
                              {renderStars(feedback.clinic_rating, "small")}
                            </div>
                      </div>
                    )}

                        {/* Doctor Rating */}
                        {feedback.doctor_rating && feedback.doctor_name && (
                          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Stethoscope className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  Doctor
                                </span>
                              </div>
                              <span
                                className={`text-sm font-bold ${getRatingColor(
                                  feedback.doctor_rating
                                )}`}
                              >
                                {feedback.doctor_rating}/5
                              </span>
                            </div>
                            <div className="flex items-center">
                              {renderStars(feedback.doctor_rating, "small")}
                  </div>
                          </div>
                        )}
                </div>

                      {/* Doctor & Date Info */}
                      <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
                        {feedback.doctor_name && (
                          <div className="flex items-center">
                            <Stethoscope className="w-3 h-3 mr-1" />
                            {feedback.doctor_name}
                            {feedback.doctor_specialization && (
                              <span className="ml-1 text-xs">
                                ({feedback.doctor_specialization})
                    </span>
                  )}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </div>
                        {feedback.appointment_date && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Appointment:{" "}
                            {new Date(
                              feedback.appointment_date
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expand Button */}
                  <button
                    onClick={() =>
                      setExpandedFeedback(
                        expandedFeedback === feedback.id ? null : feedback.id
                      )
                    }
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    {expandedFeedback === feedback.id ? (
                        <ChevronUp className="w-5 h-5" />
                    ) : (
                        <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback Comment */}
                <div className="mb-4 pl-16">
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {feedback.comment}
                </p>
                  </div>
              </div>

              {/* Expanded Details */}
                <AnimatePresence>
              {expandedFeedback === feedback.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-16 mb-4"
                    >
                <div className="border-t border-border pt-4 space-y-3">
                        {feedback.services && (
                          <div className="text-sm">
                            <span className="font-medium text-foreground">
                              Services:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {feedback.services.join(", ")}
                            </span>
                    </div>
                  )}

                  {!feedback.is_anonymous && feedback.patient_email && (
                          <div className="text-sm">
                            <span className="font-medium text-foreground">
                              Patient Email:
                            </span>{" "}
                            <span className="text-muted-foreground">
                      {feedback.patient_email}
                            </span>
                          </div>
                        )}

                        {feedback.current_doctor_rating && (
                          <div className="text-sm">
                            <span className="font-medium text-foreground">
                              Doctor's Current Rating:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {feedback.current_doctor_rating} ⭐
                            </span>
                    </div>
                  )}
                </div>
                    </motion.div>
              )}
                </AnimatePresence>

              {/* Existing Response */}
              {feedback.response && (
                  <motion.div
                    className="pl-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Reply className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-primary">
                        Response from {feedback.responder_name || "Staff"}
                      </span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                feedback.responded_at
                              ).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(
                                feedback.responded_at
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                    </div>
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {feedback.response}
                  </p>
                </div>
                  </motion.div>
              )}

              {/* Reply Section */}
                {!feedback.response && canRespond && (
                  <div className="pl-16 pt-4 border-t border-border">
                  {replyingTo === feedback.id ? (
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                      >
                        <div className="relative">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your professional response... (minimum 10 characters)"
                            rows={4}
                            maxLength={1000}
                            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          />
                          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                            {replyText.length}/1000
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            💡 Be professional, empathetic, and constructive.
                            Patient will be notified.
                          </p>
                          <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplySubmit(feedback.id)}
                              disabled={
                                !replyText.trim() ||
                                replyText.trim().length < 10 ||
                                sendingReply
                              }
                          className="inline-flex items-center px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sendingReply ? (
                                <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                          ) : (
                                <>
                            <Send className="w-4 h-4 mr-2" />
                                  Send Response
                                </>
                          )}
                        </button>
                      </div>
                    </div>
                      </motion.div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(feedback.id)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors group"
                    >
                        <Reply className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Reply to Feedback</span>
                    </button>
                  )}
                </div>
              )}
              </motion.div>
            ))
          )}
        </motion.div>
          </div>
    </div>
  );
};

export default FeedbackManagement;
