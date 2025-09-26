import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Star,
  Calendar,
  User,
  UserX,
  Reply,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Send,
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Users,
  Stethoscope,
  Building,
  Settings,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const FeedbackManagement = () => {
  const { user, profile, isStaff, isAdmin } = useAuth();

  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    avgRating: 0,
    responseRate: 0,
    byType: {},
    byRating: {},
  });

  // ✅ FIXED: Load feedback data from Supabase RPC using correct function
  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Use the correct RPC function that exists in database
      const { data, error } = await supabase.rpc("get_staff_feedback_list", {
        p_clinic_id: profile?.role_specific_data?.clinic_id || null,
        p_include_responses: true,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to fetch feedback");
      }

      const feedbackData = data.data.feedback_list || [];

      setFeedbacks(feedbackData);
      setFilteredFeedbacks(feedbackData);

      // ✅ FIXED: Calculate statistics using correct field names
      const totalFeedbacks = feedbackData.length;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const thisWeekFeedbacks = feedbackData.filter(
        (f) => new Date(f.created_at) >= weekAgo
      ).length;

      const ratingsSum = feedbackData.reduce(
        (sum, f) => sum + (f.rating || 0),
        0
      );
      const avgRating =
        ratingsSum / feedbackData.filter((f) => f.rating).length || 0;

      const respondedCount = feedbackData.filter((f) => f.response).length;
      const responseRate =
        totalFeedbacks > 0 ? (respondedCount / totalFeedbacks) * 100 : 0;

      const byType = feedbackData.reduce((acc, f) => {
        acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1;
        return acc;
      }, {});

      const byRating = feedbackData.reduce((acc, f) => {
        if (f.rating) {
          acc[f.rating] = (acc[f.rating] || 0) + 1;
        }
        return acc;
      }, {});

      setStats({
        total: totalFeedbacks,
        thisWeek: thisWeekFeedbacks,
        avgRating: Number(avgRating.toFixed(1)),
        responseRate: Number(responseRate.toFixed(1)),
        byType,
        byRating,
      });
    } catch (error) {
      console.error("Error loading feedback:", error);
      setFeedbacks([]);
      setFilteredFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  // Load feedback data on mount
  useEffect(() => {
    if ((isStaff || isAdmin) && user) {
      loadFeedbacks();
    }
  }, [isStaff, isAdmin, user]);

  // Filter feedbacks based on selected criteria
  useEffect(() => {
    let filtered = [...feedbacks];

    // Filter by period
    if (selectedPeriod !== "all") {
      const now = new Date();
      let startDate = new Date();

      switch (selectedPeriod) {
        case "day":
          startDate.setDate(now.getDate() - 1);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter((f) => new Date(f.created_at) >= startDate);
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((f) => f.feedback_type === selectedType);
    }

    // Filter by rating
    if (selectedRating !== "all") {
      filtered = filtered.filter((f) => f.rating === parseInt(selectedRating));
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (!f.is_anonymous &&
            f.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          f.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFeedbacks(filtered);
  }, [feedbacks, selectedPeriod, selectedType, selectedRating, searchTerm]);

  // ✅ FIXED: Handle reply submission using correct RPC function
  const handleReplySubmit = async (feedbackId) => {
    setSendingReply(true);
    try {
      const { data, error } = await supabase.rpc("respond_to_feedback", {
        p_feedback_id: feedbackId,
        p_response: replyText.trim(),
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to submit response");
      }

      // Update local state
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === feedbackId
            ? {
                ...f,
                response: replyText,
                responded_by: user.id,
                responded_at: new Date().toISOString(),
                responder_name: `${profile?.first_name} ${profile?.last_name}`,
              }
            : f
        )
      );

      setReplyingTo(null);
      setReplyText("");
      console.log("Reply sent successfully");
    } catch (error) {
      console.error("Error sending reply:", error);
      alert(error.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  // Get rating color
  const getRatingColor = (rating) => {
    if (rating >= 4) return "text-green-600 dark:text-green-400";
    if (rating >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get feedback type icon
  const getFeedbackTypeIcon = (type) => {
    switch (type) {
      case "doctor":
        return <Stethoscope className="w-4 h-4" />;
      case "service":
        return <Award className="w-4 h-4" />;
      case "facility":
        return <Building className="w-4 h-4" />;
      case "general":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Get feedback type color
  const getFeedbackTypeColor = (type) => {
    switch (type) {
      case "doctor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "service":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "facility":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "general":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  // ✅ ACCESS CONTROL
  if (!user || (!isStaff && !isAdmin)) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            Only staff and admin users can access feedback management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Feedback Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and respond to patient feedback about your clinic and
            services
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Feedback
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
            <span className="text-muted-foreground">
              {stats.thisWeek} this week
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Average Rating
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {stats.avgRating}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= stats.avgRating
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300 dark:text-gray-600"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Response Rate
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {stats.responseRate}%
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Reply className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.responseRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                This Week
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {stats.thisWeek}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CalendarIcon className="w-4 h-4 text-muted-foreground mr-2" />
            <span className="text-muted-foreground">New feedback</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Time</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="service">Service</option>
              <option value="doctor">Doctor</option>
              <option value="facility">Facility</option>
            </select>

            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              No feedback found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ||
              selectedType !== "all" ||
              selectedRating !== "all" ||
              selectedPeriod !== "all"
                ? "Try adjusting your filters to see more results."
                : "No feedback has been submitted yet."}
            </p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              {/* Feedback Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
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
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {feedback.is_anonymous ? (
                        <span className="font-medium text-card-foreground">
                          Anonymous Patient
                        </span>
                      ) : (
                        <span className="font-medium text-card-foreground">
                          {feedback.patient_name}
                        </span>
                      )}

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

                      {feedback.doctor_name && (
                        <span className="text-xs text-muted-foreground">
                          • {feedback.doctor_name}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {feedback.rating && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= feedback.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-sm font-medium ${getRatingColor(
                            feedback.rating
                          )}`}
                        >
                          {feedback.rating}/5
                        </span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">
                      {new Date(feedback.created_at).toLocaleDateString()} at{" "}
                      {new Date(feedback.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {feedback.is_public && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                      <Eye className="w-3 h-3 mr-1" />
                      Public
                    </span>
                  )}
                  {!feedback.is_public && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 rounded-full">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Private
                    </span>
                  )}

                  <button
                    onClick={() =>
                      setExpandedFeedback(
                        expandedFeedback === feedback.id ? null : feedback.id
                      )
                    }
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    {expandedFeedback === feedback.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback Comment */}
              <div className="mb-4">
                <p className="text-card-foreground leading-relaxed">
                  {feedback.comment}
                </p>
              </div>

              {/* Expanded Details */}
              {expandedFeedback === feedback.id && (
                <div className="border-t border-border pt-4 space-y-3">
                  {feedback.appointment_date && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Related Appointment:</span>{" "}
                      {new Date(feedback.appointment_date).toLocaleDateString()}
                    </div>
                  )}

                  {!feedback.is_anonymous && feedback.patient_email && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Contact:</span>{" "}
                      {feedback.patient_email}
                    </div>
                  )}
                </div>
              )}

              {/* Existing Response */}
              {feedback.response && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Reply className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        Response from {feedback.responder_name || "Staff"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(feedback.responded_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-card-foreground text-sm">
                    {feedback.response}
                  </p>
                </div>
              )}

              {/* Reply Section */}
              {!feedback.response && (
                <div className="mt-4 pt-4 border-t border-border">
                  {replyingTo === feedback.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your response..."
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplySubmit(feedback.id)}
                          disabled={!replyText.trim() || sendingReply}
                          className="inline-flex items-center px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sendingReply ? (
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {sendingReply ? "Sending..." : "Send Reply"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(feedback.id)}
                      className="inline-flex items-center px-4 py-2 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply to Feedback
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More Button (if needed) */}
      {filteredFeedbacks.length > 0 &&
        filteredFeedbacks.length < feedbacks.length && (
          <div className="text-center">
            <button
              onClick={loadFeedbacks}
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Load More Feedback
            </button>
          </div>
        )}
    </div>
  );
};

export default FeedbackManagement;
