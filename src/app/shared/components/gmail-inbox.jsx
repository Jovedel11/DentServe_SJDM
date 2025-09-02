import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  MailOpen,
  User,
  Clock,
  Search,
  X,
  Star,
  StarOff,
  Phone,
  Reply,
  Archive,
  Trash2,
  Paperclip,
  ChevronLeft,
  MoreHorizontal,
  Send,
  AlertCircle,
} from "lucide-react";
import { IconMail, IconRefresh } from "@tabler/icons-react";

// ✅ INTEGRATION: Import hooks (you'll need to create these)
import { useStaffCommunications } from "@/core/hooks/useStaffCommunications"; // New hook needed
import { useAuth } from "@/auth/context/AuthProvider";

const GmailInboxModal = ({ onClose, showInboxModal }) => {
  const { user, profile, isStaff, canAccessApp } = useAuth();

  // ✅ HOOK INTEGRATION: Use real communication hook
  const {
    communications,
    loading,
    error,
    fetchCommunications,
    markAsRead,
    toggleStar,
    deleteCommunication,
    sendReply,
    refresh,
    loadMore,
    searchCommunications,
    stats,
  } = useStaffCommunications();

  // ✅ LOCAL STATE: Keep only UI-specific state
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // ✅ AUTHENTICATION: Check staff access
  useEffect(() => {
    if (!user || !canAccessApp || !isStaff()) {
      console.warn("Gmail Inbox: Access denied - not staff");
      return;
    }

    // Fetch communications on mount
    fetchCommunications({ refresh: true });
  }, [user, canAccessApp, isStaff, fetchCommunications]);

  // ✅ FILTERED DATA: Apply search filter
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return communications;
    return searchCommunications(searchQuery);
  }, [communications, searchQuery, searchCommunications]);

  // ✅ COMPUTED VALUES: Get stats from real data
  const unreadCount = stats?.unread || 0;
  const priorityEmails = filteredEmails.filter(
    (email) => email.priority === "high" && !email.is_read
  );

  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    setShowEmailDetail(true);

    if (!email.is_read) {
      try {
        await markAsRead(email.id);
      } catch (error) {
        console.error("Failed to mark email as read:", error);
      }
    }
  };

  const handleBackToList = () => {
    setShowEmailDetail(false);
    setSelectedEmail(null);
    setReplyText("");
  };

  const handleToggleStar = async (emailId, event) => {
    event.stopPropagation();
    try {
      await toggleStar(emailId);
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const handleDeleteEmail = async (emailId, event) => {
    event.stopPropagation();
    try {
      await deleteCommunication(emailId);
      if (selectedEmail?.id === emailId) {
        handleBackToList();
      }
    } catch (error) {
      console.error("Failed to delete email:", error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const result = await sendReply(selectedEmail.id, replyText.trim());
      if (result.success) {
        setReplyText("");
        // Show success message
        console.log("Reply sent successfully");
      } else {
        console.error("Failed to send reply:", result.error);
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setSendingReply(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error("Failed to refresh communications:", error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50/30 dark:bg-red-900/10";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10";
      default:
        return "border-l-green-500 bg-green-50/30 dark:bg-green-900/10";
    }
  };

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  // ✅ ACCESS CONTROL: Don't render for non-staff
  if (!user || !canAccessApp || !isStaff()) {
    return null;
  }

  return (
    <>
      {showInboxModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-fadeIn"
            onClick={handleModalClick}
          >
            {loading && communications.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                    <IconMail className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Loading patient messages...
                  </p>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                  <h3 className="text-lg font-medium text-foreground">
                    Failed to load communications
                  </h3>
                  <p className="text-muted-foreground">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="border-b border-border p-4 md:p-6 bg-muted/30 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {showEmailDetail && (
                        <button
                          onClick={handleBackToList}
                          className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconMail className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-foreground">
                            {showEmailDetail
                              ? "Message Details"
                              : "Patient Communications"}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {showEmailDetail
                              ? `From: ${
                                  selectedEmail?.from_user?.name || "Patient"
                                }`
                              : `${filteredEmails.length} messages • ${unreadCount} unread`}
                          </p>
                        </div>
                      </div>

                      {!showEmailDetail && unreadCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="bg-red-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                            {unreadCount} new
                          </span>
                          {priorityEmails.length > 0 && (
                            <span className="bg-yellow-500 text-yellow-900 text-xs font-medium px-3 py-1 rounded-full">
                              {priorityEmails.length} urgent
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!showEmailDetail && (
                        <button
                          onClick={handleRefresh}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <IconRefresh
                            className={`w-4 h-4 ${
                              loading ? "animate-spin" : ""
                            }`}
                          />
                          <span className="hidden sm:inline">Refresh</span>
                        </button>
                      )}
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Close Inbox"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  {/* Email List Panel */}
                  <div
                    className={`${
                      showEmailDetail ? "hidden lg:block lg:w-2/5" : "w-full"
                    } border-r border-border flex flex-col bg-muted/10`}
                  >
                    {/* Search Bar */}
                    <div className="p-4 border-b border-border">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search patient messages..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Email List */}
                    <div className="flex-1 overflow-y-auto">
                      {filteredEmails.length > 0 ? (
                        <div>
                          {filteredEmails.map((email) => (
                            <div
                              key={email.id}
                              onClick={() => handleEmailClick(email)}
                              className={`
                                p-4 hover:bg-muted/50 cursor-pointer transition-all duration-200 border-l-4
                                ${
                                  !email.is_read
                                    ? getPriorityColor(email.priority || "low")
                                    : "border-l-transparent"
                                }
                                ${
                                  selectedEmail?.id === email.id
                                    ? "bg-primary/10"
                                    : ""
                                }
                              `}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20">
                                    <User className="w-5 h-5 text-primary" />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`font-semibold text-sm truncate ${
                                          !email.is_read
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {email.from_user?.name || "Patient"}
                                      </span>
                                      {!email.is_read && (
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                                      )}
                                      {email.priority === "high" &&
                                        !email.is_read && (
                                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                            URGENT
                                          </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 ml-2">
                                      <button
                                        onClick={(e) =>
                                          handleToggleStar(email.id, e)
                                        }
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                      >
                                        {email.is_starred ? (
                                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                        ) : (
                                          <StarOff className="w-4 h-4 text-muted-foreground hover:text-yellow-500" />
                                        )}
                                      </button>
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {formatTime(email.created_at)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <p
                                      className={`text-sm truncate ${
                                        !email.is_read
                                          ? "font-semibold text-foreground"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {email.subject}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                      {email.message_body?.substring(0, 150)}...
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 mt-3">
                                    {email.attachments && (
                                      <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                                        <Paperclip className="w-3 h-3" />
                                        <span>Attachment</span>
                                      </div>
                                    )}
                                    {email.appointment && (
                                      <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                          {new Date(
                                            email.appointment.appointment_date
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}{" "}
                                          •{" "}
                                          {email.appointment.appointment_time?.slice(
                                            0,
                                            5
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                            <Mail className="w-10 h-10 text-muted-foreground/50" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {searchQuery
                              ? "No matching messages"
                              : "No messages yet"}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {searchQuery
                              ? "Try adjusting your search criteria"
                              : "Patient communications will appear here"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Detail Panel */}
                  {showEmailDetail && selectedEmail ? (
                    <div
                      className={`${
                        showEmailDetail ? "w-full lg:w-3/5" : "hidden"
                      } flex flex-col bg-background`}
                    >
                      {/* Email Header */}
                      <div className="border-b border-border p-4 md:p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground">
                                {selectedEmail.from_user?.name || "Patient"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {selectedEmail.from_user?.email}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Received:{" "}
                                {new Date(
                                  selectedEmail.created_at
                                ).toLocaleString("en-US", {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) =>
                                handleToggleStar(selectedEmail.id, e)
                              }
                              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                            >
                              {selectedEmail.is_starred ? (
                                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                              ) : (
                                <StarOff className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive className="w-5 h-5 text-muted-foreground" />
                            </button>
                            <button
                              onClick={(e) =>
                                handleDeleteEmail(selectedEmail.id, e)
                              }
                              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xl font-bold text-foreground mb-4">
                          {selectedEmail.subject}
                        </h4>

                        {selectedEmail.appointment && (
                          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                                Related Appointment
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-500">
                                {new Date(
                                  selectedEmail.appointment.appointment_date
                                ).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                })}{" "}
                                at{" "}
                                {selectedEmail.appointment.appointment_time?.slice(
                                  0,
                                  5
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Email Body */}
                      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed bg-muted/20 p-4 rounded-lg">
                            {selectedEmail.message_body}
                          </div>
                        </div>

                        {selectedEmail.attachments && (
                          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <Paperclip className="w-5 h-5 text-amber-600" />
                              <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                                Attachments
                              </span>
                            </div>
                            {/* Render attachments here based on your attachments structure */}
                          </div>
                        )}

                        {/* Reply Section */}
                        <div className="mt-6 border-t border-border pt-6">
                          <h5 className="font-semibold text-foreground mb-3">
                            Reply to Patient
                          </h5>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply here..."
                            rows={4}
                            className="w-full p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={handleSendReply}
                              disabled={!replyText.trim() || sendingReply}
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                              {sendingReply ? "Sending..." : "Send Reply"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Empty State for Desktop */
                    <div className="hidden lg:flex lg:w-3/5 items-center justify-center bg-background">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                          <MailOpen className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">
                          Select a message to read
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                          Choose a patient message from the list to view its
                          content and reply
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GmailInboxModal;
