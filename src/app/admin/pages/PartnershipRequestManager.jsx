import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import {
  Building2,
  Mail,
  Clock,
  Check,
  X,
  Eye,
  Filter,
  Search,
  AlertCircle,
  Plus,
  UserPlus,
} from "lucide-react";

import { authService } from "@/auth/hooks/authService";
import {
  notifyPartnershipApproved,
  notifyPartnershipRejected,
  staffInvitation,
} from "@/services/emailService";

const PartnershipRequestManager = () => {
  const [requests, setRequests] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDirectInviteModal, setShowDirectInviteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [error, setError] = useState("");

  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");

  // Direct invitation form state
  const [directInviteForm, setDirectInviteForm] = useState({
    email: "",
  });

  // Fetch partnership requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_partnership_requests", {
        p_status: filter === "all" ? null : filter,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;

      if (data?.success) {
        setRequests(data.data || []);
      } else {
        throw new Error(data?.error || "Failed to fetch requests");
      }
    } catch (error) {
      console.error("Error fetching partnership requests:", error);
      toast.error("Failed to load partnership requests");
    } finally {
      setLoading(false);
    }
  };

  // Fetch clinics for direct invitation
  const fetchClinics = async () => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setClinics(data || []);
    } catch (error) {
      console.error("Error fetching clinics:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchClinics();
  }, [filter]);

  // Handle approve request
  const handleApprove = async (requestId) => {
    try {
      setActionLoading(true);
      setError("");

      // Step 1: Approve partnership request
      const result = await authService.approvePartnershipRequestV2(
        requestId,
        adminNotes || null
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Step 2: Send approval email with invitation link
      const emailData = result.data?.email_data;

      if (emailData) {
        try {
          console.log("📧 Sending partnership approval email...", emailData);

          const emailResult = await notifyPartnershipApproved({
            clinic_name: emailData.clinic_name,
            email: emailData.email,
            staff_name: emailData.staff_name || emailData.first_name || "there",
            position: emailData.position || "Clinic Manager",
            invitation_id: emailData.invitation_id,
            invitation_token: emailData.invitation_token,
          });

          if (!emailResult.success) {
            throw new Error(emailResult.error || "Failed to send email");
          }

          console.log("✅ Approval email sent successfully:", emailResult);
          toast.success(
            "Partnership approved! Welcome email sent successfully."
          );
        } catch (emailError) {
          console.error("❌ Email sending failed:", emailError);

          // Fallback: Show link manually
          const invitationUrl = `${window.location.origin}/auth/staff-signup?invitation=${emailData.invitation_id}&token=${emailData.invitation_token}`;
          setInvitationLink(invitationUrl);
          setShowInvitationModal(true);
          await navigator.clipboard.writeText(invitationUrl);

          toast.warning(
            "Invitation created but email failed. Link copied to clipboard."
          );
        }
      }

      setShowModal(false);
      setAdminNotes("");
      setSelectedRequest(null);

      fetchRequests();
    } catch (err) {
      console.error("❌ Approval error:", err);
      toast.error(err.message || "Failed to approve request");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject request
  // Handle reject request
  const handleReject = async (requestId) => {
    try {
      setActionLoading(true);

      const { data, error } = await supabase.rpc("reject_partnership_request", {
        p_request_id: requestId,
        p_admin_notes: adminNotes,
      });

      if (error) throw error;

      if (data?.success) {
        // Send rejection email
        const emailData = data.email_data;

        if (emailData) {
          try {
            // ✅ FIXED: Use emailService helper instead of raw fetch
            console.log("📧 Sending partnership rejection email...", emailData);

            const emailResult = await notifyPartnershipRejected({
              clinic_name: emailData.clinic_name,
              email: emailData.email,
              staff_name: emailData.staff_name,
              admin_notes: emailData.admin_notes,
              rejected_at: emailData.rejected_at,
            });

            if (emailResult.success) {
              toast.success(
                "Partnership request rejected and notification sent"
              );
            } else {
              toast.success(
                "Partnership request rejected (email notification failed)"
              );
            }
          } catch (emailError) {
            console.error("❌ Email sending failed:", emailError);
            toast.success(
              "Partnership request rejected (email notification failed)"
            );
          }
        }

        fetchRequests();
        setShowModal(false);
        setAdminNotes("");
        setSelectedRequest(null);
      } else {
        throw new Error(data?.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      toast.error(error.message || "Failed to reject request");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle direct staff invitation
  // Handle direct staff invitation
  const handleDirectInvite = async (e) => {
    e.preventDefault();

    try {
      setActionLoading(true);

      // Step 1: Create staff invitation
      const { data, error } = await supabase.rpc(
        "create_direct_staff_invitation",
        {
          p_email: directInviteForm.email,
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to create invitation");
      }

      // Step 2: Send invitation email via backend
      const emailData = data.email_data;

      if (emailData) {
        try {
          // ✅ FIXED: Use emailService helper
          console.log("📧 Sending direct staff invitation email...", emailData);

          const emailResult = await staffInvitation({
            to_email: emailData.email,
            clinic_name: emailData.clinic_name,
            position: emailData.position,
            first_name: emailData.first_name || "Staff",
            last_name: emailData.last_name || "Member",
            invitation_id: emailData.invitation_id,
            invitation_token: emailData.invitation_token,
          });

          if (!emailResult.success) {
            throw new Error(emailResult.error || "Failed to send email");
          }

          console.log("✅ Staff invitation email sent:", emailResult);
          toast.success("Staff invitation sent successfully!");
        } catch (emailError) {
          console.error("❌ Email sending failed:", emailError);

          // Fallback: Show link manually
          const invitationUrl = `${window.location.origin}/auth/staff-signup?invitation=${emailData.invitation_id}&token=${emailData.invitation_token}`;
          setInvitationLink(invitationUrl);
          setShowInvitationModal(true);
          await navigator.clipboard.writeText(invitationUrl);

          toast.warning(
            "Invitation created but email failed. Link copied to clipboard."
          );
        }
      }

      // Close modal and reset form
      setShowDirectInviteModal(false);
      setDirectInviteForm({ email: "" });
    } catch (error) {
      console.error("❌ Error sending direct invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setActionLoading(false);
    }
  };
  // Filter requests based on search term
  const filteredRequests = requests.filter(
    (request) =>
      request.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Partnership Request Manager
          </h1>
          <p className="text-gray-600">
            Review and manage clinic partnership applications
          </p>
        </div>

        {/* Direct Invite Button */}
        <button
          onClick={() => setShowDirectInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Invite Staff Directly
        </button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Requests</option>
          </select>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by clinic name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No partnership requests found
          </h3>
          <p className="text-gray-500">
            {filter === "pending"
              ? "No pending requests at the moment."
              : `No ${filter} requests match your search.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 truncate">
                    {request.clinic_name}
                  </h3>
                </div>
                {getStatusBadge(request.status)}
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{request.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  <span className="font-medium">Reason: </span>
                  {request.reason}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedRequest.clinic_name}
                  </h2>
                  <div className="mt-2">
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Request Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{selectedRequest.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Partnership
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedRequest.reason}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submitted Date
                  </label>
                  <p className="text-gray-900">
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </p>
                </div>

                {selectedRequest.admin_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedRequest.admin_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Notes Input (for pending requests) */}
              {selectedRequest.status === "pending" && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any notes about this decision..."
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>

                {selectedRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve & Send Invitation
                    </button>

                    <button
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Reject Request
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Invite Modal */}
      {showDirectInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Send Direct Staff Invitation
                </h2>
                <button
                  onClick={() => setShowDirectInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleDirectInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Staff Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={directInviteForm.email}
                    onChange={(e) =>
                      setDirectInviteForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="staff@example.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Staff will be assigned to the first available clinic
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDirectInviteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showInvitationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Invitation Created!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please send this link to the staff member via email:
            </p>
            <div className="bg-gray-100 p-3 rounded mb-4 break-all">
              <code className="text-sm">{invitationLink}</code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(invitationLink);
                  toast.success("Link copied!");
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Copy Link
              </button>
              <button
                onClick={() => setShowInvitationModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnershipRequestManager;
