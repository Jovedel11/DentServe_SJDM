import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useStaffCommunications } from "@/core/hooks/useStaffCommunications";

const GmailInboxModal = ({ onClose, showInboxModal }) => {
  const { user, profile, isStaff, isAdmin } = useAuth();

  // ✅ REAL HOOK INTEGRATION
  const {
    communications,
    loading,
    error,
    stats,
    fetchCommunications,
    markAsRead,
    toggleStar,
    deleteCommunication,
    sendReply,
    refresh,
    searchCommunications,
  } = useStaffCommunications();

  // ✅ LOCAL STATE
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // ✅ ACCESS CONTROL
  if (!user || (!isStaff && !isAdmin)) {
    return null;
  }

  // ✅ FILTERED DATA
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return communications;
    return searchCommunications(searchQuery);
  }, [communications, searchQuery, searchCommunications]);

  // ✅ COMPUTED VALUES
  const unreadCount = stats?.unread || 0;
  const priorityEmails = filteredEmails.filter(
    (email) => email.priority === "high" && !email.is_read
  );

  // ✅ EVENT HANDLERS
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
        return "border-l-red-500 bg-red-50";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50";
      default:
        return "border-l-green-500 bg-green-50";
    }
  };

  if (!showInboxModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {loading && communications.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading patient messages...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium mb-2">
                Failed to load communications
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="border-b p-4 bg-gray-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showEmailDetail && (
                    <button
                      onClick={handleBackToList}
                      className="p-2 hover:bg-gray-200 rounded lg:hidden"
                    >
                      ←
                    </button>
                  )}
                  <div>
                    <h2 className="text-xl font-bold">
                      {showEmailDetail
                        ? "Message Details"
                        : "Patient Communications"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {showEmailDetail
                        ? `From: ${selectedEmail?.from_user?.name || "Patient"}`
                        : `${filteredEmails.length} messages • ${unreadCount} unread`}
                    </p>
                  </div>

                  {!showEmailDetail && unreadCount > 0 && (
                    <div className="flex gap-2">
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadCount} new
                      </span>
                      {priorityEmails.length > 0 && (
                        <span className="bg-yellow-500 text-yellow-900 text-xs px-2 py-1 rounded-full">
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
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      {loading ? "Refreshing..." : "Refresh"}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-red-100 text-red-600 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Email List Panel */}
              <div
                className={`${
                  showEmailDetail ? "hidden lg:block lg:w-2/5" : "w-full"
                } border-r flex flex-col bg-gray-50`}
              >
                {/* Search Bar */}
                <div className="p-4 border-b">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search patient messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      🔍
                    </span>
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
                            p-4 hover:bg-gray-100 cursor-pointer border-l-4 transition-colors
                            ${
                              !email.is_read
                                ? getPriorityColor(email.priority || "low")
                                : "border-l-transparent"
                            }
                            ${
                              selectedEmail?.id === email.id
                                ? "bg-blue-100"
                                : ""
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              👤
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-semibold text-sm truncate ${
                                      !email.is_read
                                        ? "text-gray-900"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {email.from_user?.name || "Patient"}
                                  </span>
                                  {!email.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  )}
                                  {email.priority === "high" &&
                                    !email.is_read && (
                                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                        URGENT
                                      </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) =>
                                      handleToggleStar(email.id, e)
                                    }
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    {email.is_starred ? "⭐" : "☆"}
                                  </button>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(email.created_at)}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <p
                                  className={`text-sm truncate ${
                                    !email.is_read
                                      ? "font-semibold"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {email.subject}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                  {email.message_body?.substring(0, 150)}...
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mt-2">
                                {email.attachments && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    📎 Attachment
                                  </span>
                                )}
                                {email.appointment && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    🕐{" "}
                                    {new Date(
                                      email.appointment.appointment_date
                                    ).toLocaleDateString()}
                                    •{" "}
                                    {email.appointment.appointment_time?.slice(
                                      0,
                                      5
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <div className="text-4xl mb-4">📧</div>
                      <h3 className="text-lg font-semibold mb-2">
                        {searchQuery
                          ? "No matching messages"
                          : "No messages yet"}
                      </h3>
                      <p className="text-gray-600 text-sm text-center">
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
                <div className="w-full lg:w-3/5 flex flex-col bg-white">
                  {/* Email Header */}
                  <div className="border-b p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          👤
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">
                            {selectedEmail.from_user?.name || "Patient"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {selectedEmail.from_user?.email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Received:{" "}
                            {new Date(
                              selectedEmail.created_at
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleToggleStar(selectedEmail.id, e)}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          {selectedEmail.is_starred ? "⭐" : "☆"}
                        </button>
                        <button
                          onClick={(e) =>
                            handleDeleteEmail(selectedEmail.id, e)
                          }
                          className="p-2 hover:bg-gray-100 rounded text-red-600"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xl font-bold mb-4">
                      {selectedEmail.subject}
                    </h4>

                    {selectedEmail.appointment && (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border">
                        <span className="text-blue-600">🕐</span>
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Related Appointment
                          </p>
                          <p className="text-xs text-blue-600">
                            {new Date(
                              selectedEmail.appointment.appointment_date
                            ).toLocaleDateString()}
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
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg mb-6">
                      {selectedEmail.message_body}
                    </div>

                    {selectedEmail.attachments && (
                      <div className="mb-6 p-4 bg-yellow-50 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span>📎</span>
                          <span className="text-sm font-semibold text-yellow-800">
                            Attachments
                          </span>
                        </div>
                        {/* Render attachments here */}
                      </div>
                    )}

                    {/* Reply Section */}
                    <div className="border-t pt-6">
                      <h5 className="font-semibold mb-3">Reply to Patient</h5>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        rows={4}
                        className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sendingReply}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          {sendingReply ? "Sending..." : "Send Reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex lg:w-3/5 items-center justify-center bg-white">
                  <div className="text-center">
                    <div className="text-6xl mb-6">📧</div>
                    <h3 className="text-xl font-semibold mb-3">
                      Select a message to read
                    </h3>
                    <p className="text-gray-600 text-sm max-w-sm">
                      Choose a patient message from the list to view its content
                      and reply
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GmailInboxModal;
