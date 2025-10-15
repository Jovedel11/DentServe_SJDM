import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Shield,
  Heart,
  Mail,
  Phone,
  Eye,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Send,
  X,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Key,
} from "lucide-react";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/context/AuthProvider";
import { authService } from "@/auth/hooks/authService";

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState("patients");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [performingAction, setPerformingAction] = useState(false);

  const isMobile = useIsMobile();
  const { isAdmin } = useAuth();
  const { users, loading, error, fetchUsers } = useUserManagement();

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, activeTab, searchTerm]);

  const loadUsers = async () => {
    await fetchUsers({
      userType: activeTab === "patients" ? "patient" : "staff",
      searchTerm: searchTerm || null,
      limit: 100,
      offset: 0,
    });
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      if (selectedStatus === "all") return true;
      if (selectedStatus === "active") return user.is_active;
      if (selectedStatus === "inactive") return !user.is_active;
      return true;
    });
  }, [users, selectedStatus]);

  const stats = useMemo(() => {
    if (!filteredUsers.length) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        totalAppointments: 0,
        avgAppointments: 0,
      };
    }

    const totalAppointments = filteredUsers.reduce(
      (sum, u) => sum + (u.role_data?.total_appointments || 0),
      0
    );

    return {
      total: filteredUsers.length,
      active: filteredUsers.filter((u) => u.is_active).length,
      inactive: filteredUsers.filter((u) => !u.is_active).length,
      totalAppointments,
      avgAppointments:
        filteredUsers.length > 0
          ? Math.round(totalAppointments / filteredUsers.length)
          : 0,
    };
  }, [filteredUsers]);

  const handleUserAction = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setShowActionModal(true);
    setNotificationMessage("");
  };

  const executeUserAction = async () => {
    if (!selectedUser) return;
    setPerformingAction(true);

    try {
      switch (actionType) {
        case "activate":
          await toggleUserStatus(selectedUser.id, true);
          break;
        case "deactivate":
          await toggleUserStatus(selectedUser.id, false);
          break;
        case "notify":
          await sendNotification(selectedUser.id);
          break;
        case "changePassword":
          const result = await authService.adminChangeUserPassword(
            selectedUser.id,
            notificationMessage // ✅ Use the password from modal, not hardcoded
          );
          if (!result.success) {
            throw new Error(result.error);
          }
          alert(`Password changed successfully for ${result.userEmail}`);
          break;
      }

      await loadUsers();
      setShowActionModal(false);
      setSelectedUser(null);
      setNotificationMessage("");
    } catch (err) {
      console.error("Action error:", err);
      alert(err.message || "Failed to perform action");
    } finally {
      setPerformingAction(false);
    }
  };

  const toggleUserStatus = async (userId, makeActive) => {
    const { data, error } = await supabase.rpc("admin_toggle_user_status", {
      p_user_id: userId,
      p_is_active: makeActive,
    });

    if (error) throw new Error(error.message);
    if (!data?.success)
      throw new Error(data?.error || "Failed to update user status");
  };

  const sendNotification = async (userId) => {
    if (!notificationMessage.trim()) {
      throw new Error("Notification message is required");
    }

    const { data, error } = await supabase.rpc("admin_send_notification", {
      p_user_id: userId,
      p_message: notificationMessage,
      p_title: "Admin Notification",
    });

    if (error) throw new Error(error.message);
    if (!data?.success)
      throw new Error(data?.error || "Failed to send notification");
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              User Management
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Manage and monitor all platform users
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle size={20} />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-border">
            <TabButton
              active={activeTab === "patients"}
              onClick={() => setActiveTab("patients")}
              icon={Heart}
              label="Patients"
              count={activeTab === "patients" ? stats.total : null}
            />
            <TabButton
              active={activeTab === "staff"}
              onClick={() => setActiveTab("staff")}
              icon={Shield}
              label="Staff Members"
              count={activeTab === "staff" ? stats.total : null}
            />
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
            <StatsCard
              icon={Users}
              label="Total Users"
              value={stats.total}
              color="blue"
            />
            <StatsCard
              icon={UserCheck}
              label="Active"
              value={stats.active}
              color="green"
            />
            <StatsCard
              icon={UserX}
              label="Inactive"
              value={stats.inactive}
              color="gray"
            />
            <StatsCard
              icon={Calendar}
              label="Total Appointments"
              value={stats.totalAppointments}
              color="orange"
            />
            <StatsCard
              icon={Calendar}
              label="Avg per User"
              value={stats.avgAppointments}
              color="pink"
            />
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-6 bg-card border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <button
                onClick={loadUsers}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm min-w-[120px]"
              >
                <RefreshCcw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Users List */}
          {loading && filteredUsers.length === 0 ? (
            <LoadingSkeleton />
          ) : filteredUsers.length === 0 ? (
            <EmptyState activeTab={activeTab} />
          ) : (
            <div className="space-y-4">
              {activeTab === "patients" ? (
                <PatientsTable
                  users={filteredUsers}
                  onAction={handleUserAction}
                  formatDate={formatDate}
                  isMobile={isMobile}
                />
              ) : (
                <StaffTable
                  users={filteredUsers}
                  onAction={handleUserAction}
                  formatDate={formatDate}
                  isMobile={isMobile}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedUser && (
        <ActionModal
          user={selectedUser}
          actionType={actionType}
          notificationMessage={notificationMessage}
          setNotificationMessage={setNotificationMessage}
          onConfirm={executeUserAction}
          onClose={() => {
            setShowActionModal(false);
            setSelectedUser(null);
            setNotificationMessage("");
          }}
          performing={performingAction}
        />
      )}
    </div>
  );
};

// Tab Button Component
const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
    {count !== null && (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    gray: "text-gray-600 bg-gray-50 dark:bg-gray-900/20",
    orange: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    pink: "text-pink-600 bg-pink-50 dark:bg-pink-900/20",
  };

  return (
    <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} className={colorClasses[color].split(" ")[0]} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
    </div>
  );
};

// Patients Table Component
const PatientsTable = ({ users, onAction, formatDate, isMobile }) => {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {users.map((user) => (
          <PatientCard
            key={user.id}
            user={user}
            onAction={onAction}
            formatDate={formatDate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Patient
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Contact
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Appointments
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Status
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <PatientRow
                key={user.id}
                user={user}
                index={index}
                onAction={onAction}
                formatDate={formatDate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Patient Row Component
const PatientRow = ({ user, index, onAction, formatDate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`border-b hover:bg-muted/30 transition-colors ${
          index % 2 === 0 ? "bg-background" : "bg-muted/10"
        }`}
      >
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-semibold shadow-sm">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              {user.is_active && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {user.full_name || `${user.first_name} ${user.last_name}`}
              </div>
              <div className="text-xs text-muted-foreground">
                Joined {formatDate(user.created_at)}
              </div>
            </div>
          </div>
        </td>

        <td className="p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Mail size={12} className="text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone size={12} className="text-muted-foreground" />
                <span className="text-foreground">{user.phone}</span>
              </div>
            )}
          </div>
        </td>

        <td className="p-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {user.role_data?.total_appointments || 0}
            </div>
            {user.role_data?.last_appointment && (
              <div className="text-xs text-muted-foreground">
                Last: {formatDate(user.role_data.last_appointment)}
              </div>
            )}
          </div>
        </td>

        <td className="p-4">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              user.is_active
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            }`}
          >
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </td>

        <td className="p-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="Toggle Details"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {user.is_active ? (
              <>
                <button
                  onClick={() => onAction(user, "deactivate")}
                  className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                  title="Deactivate"
                >
                  <UserX size={16} />
                </button>
                <button
                  onClick={() => onAction(user, "notify")}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title="Send Notification"
                >
                  <Send size={16} />
                </button>
                <button
                  onClick={() => onAction(user, "changePassword")}
                  className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                  title="Change Password"
                >
                  <Key size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => onAction(user, "activate")}
                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Activate"
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan="5" className="p-4 bg-muted/20 border-b">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <DetailItem
                label="Email Verified"
                value={user.email_verified ? "Yes" : "No"}
              />
              <DetailItem
                label="Phone Verified"
                value={user.phone_verified ? "Yes" : "No"}
              />
              <DetailItem
                label="Account Created"
                value={formatDate(user.created_at)}
              />
              <DetailItem
                label="Last Updated"
                value={formatDate(user.updated_at)}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// Staff Table Component
const StaffTable = ({ users, onAction, formatDate, isMobile }) => {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {users.map((user) => (
          <StaffCard
            key={user.id}
            user={user}
            onAction={onAction}
            formatDate={formatDate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Staff Member
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Clinic & Position
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Contact
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Appointments
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Status
              </th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <StaffRow
                key={user.id}
                user={user}
                index={index}
                onAction={onAction}
                formatDate={formatDate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Staff Row Component
const StaffRow = ({ user, index, onAction, formatDate }) => {
  const [expanded, setExpanded] = useState(false);
  const staffActive = user.role_data?.is_active ?? true;

  return (
    <>
      <tr
        className={`border-b hover:bg-muted/30 transition-colors ${
          index % 2 === 0 ? "bg-background" : "bg-muted/10"
        }`}
      >
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold shadow-sm">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              {user.is_active && staffActive && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {user.full_name || `${user.first_name} ${user.last_name}`}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Shield size={12} />
                <span>Staff Member</span>
              </div>
            </div>
          </div>
        </td>

        <td className="p-4">
          <div className="space-y-1">
            {user.role_data?.clinic_name ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 size={14} className="text-primary" />
                  {user.role_data.clinic_name}
                </div>
                {user.role_data.position && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase size={12} />
                    {user.role_data.position}
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                No clinic assigned
              </span>
            )}
          </div>
        </td>

        <td className="p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Mail size={12} className="text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone size={12} className="text-muted-foreground" />
                <span className="text-foreground">{user.phone}</span>
              </div>
            )}
          </div>
        </td>

        {/* ✅ APPOINTMENTS COLUMN - Shows clinic appointments */}
        <td className="p-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {user.role_data?.total_appointments || 0}
            </div>
            <div className="flex gap-2 text-xs">
              {user.role_data?.pending_appointments > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                  {user.role_data.pending_appointments} pending
                </span>
              )}
              {user.role_data?.completed_appointments > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                  {user.role_data.completed_appointments} done
                </span>
              )}
            </div>
          </div>
        </td>

        <td className="p-4">
          <div className="space-y-1">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                user.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
              }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
            {!staffActive && user.is_active && (
              <div className="text-xs text-orange-600">Staff Inactive</div>
            )}
          </div>
        </td>

        <td className="p-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="Toggle Details"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {user.is_active ? (
              <>
                <button
                  onClick={() => onAction(user, "deactivate")}
                  className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                  title="Deactivate"
                >
                  <UserX size={16} />
                </button>
                <button
                  onClick={() => onAction(user, "notify")}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title="Send Notification"
                >
                  <Send size={16} />
                </button>
                <button
                  onClick={() => onAction(user, "changePassword")}
                  className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                  title="Change Password"
                >
                  <Key size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => onAction(user, "activate")}
                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Activate"
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan="6" className="p-4 bg-muted/20 border-b">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <DetailItem
                label="Email Verified"
                value={user.email_verified ? "Yes" : "No"}
              />
              <DetailItem
                label="Phone Verified"
                value={user.phone_verified ? "Yes" : "No"}
              />
              <DetailItem
                label="Staff Status"
                value={staffActive ? "Active" : "Inactive"}
              />
              <DetailItem label="Joined" value={formatDate(user.created_at)} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// Mobile Card Components
const PatientCard = ({ user, onAction, formatDate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-semibold shadow-sm">
              {user.first_name?.[0]}
              {user.last_name?.[0]}
            </div>
            {user.is_active && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">
              {user.full_name || `${user.first_name} ${user.last_name}`}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
            user.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {user.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Appointments:</span>
          <span className="font-bold text-lg">
            {user.role_data?.total_appointments || 0}
          </span>
        </div>
        {user.role_data?.last_appointment && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last Visit:</span>
            <span className="font-medium">
              {formatDate(user.role_data.last_appointment)}
            </span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="pt-3 border-t mb-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email Verified:</span>
            <span>{user.email_verified ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone:</span>
            <span>{user.phone || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Joined:</span>
            <span>{formatDate(user.created_at)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-muted rounded hover:bg-muted/80"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Less" : "More"}
        </button>

        {user.is_active ? (
          <>
            <button
              onClick={() => onAction(user, "deactivate")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-orange-50 text-orange-700 rounded"
            >
              <UserX size={14} />
              Deactivate
            </button>
            <button
              onClick={() => onAction(user, "notify")}
              className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded"
            >
              <Send size={14} />
            </button>
            <button
              onClick={() => onAction(user, "changePassword")}
              className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded"
              title="Change Password"
            >
              <Key size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => onAction(user, "activate")}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-green-50 text-green-700 rounded"
          >
            <CheckCircle size={14} />
            Activate
          </button>
        )}
      </div>
    </div>
  );
};

const StaffCard = ({ user, onAction, formatDate }) => {
  const [expanded, setExpanded] = useState(false);
  const staffActive = user.role_data?.is_active ?? true;

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold shadow-sm">
              {user.first_name?.[0]}
              {user.last_name?.[0]}
            </div>
            {user.is_active && staffActive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">
              {user.full_name || `${user.first_name} ${user.last_name}`}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Shield size={10} />
              <span>Staff</span>
            </div>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
            user.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {user.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        {user.role_data?.clinic_name && (
          <div className="flex items-center gap-2 text-xs">
            <Building2 size={12} className="text-primary" />
            <span className="font-medium">{user.role_data.clinic_name}</span>
          </div>
        )}
        {user.role_data?.position && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Briefcase size={12} />
            <span>{user.role_data.position}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Clinic Appointments:</span>
          <span className="font-bold text-lg">
            {user.role_data?.total_appointments || 0}
          </span>
        </div>
        {(user.role_data?.pending_appointments > 0 ||
          user.role_data?.completed_appointments > 0) && (
          <div className="flex gap-2 flex-wrap">
            {user.role_data?.pending_appointments > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                {user.role_data.pending_appointments} pending
              </span>
            )}
            {user.role_data?.completed_appointments > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                {user.role_data.completed_appointments} done
              </span>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="pt-3 border-t mb-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Staff Status:</span>
            <span>{staffActive ? "Active" : "Inactive"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone:</span>
            <span>{user.phone || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Joined:</span>
            <span>{formatDate(user.created_at)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-muted rounded hover:bg-muted/80"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Less" : "More"}
        </button>

        {user.is_active ? (
          <>
            <button
              onClick={() => onAction(user, "deactivate")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-orange-50 text-orange-700 rounded"
            >
              <UserX size={14} />
              Deactivate
            </button>
            <button
              onClick={() => onAction(user, "notify")}
              className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded"
            >
              <Send size={14} />
            </button>
            <button
              onClick={() => onAction(user, "changePassword")}
              className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded"
              title="Change Password"
            >
              <Key size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => onAction(user, "activate")}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-green-50 text-green-700 rounded"
          >
            <CheckCircle size={14} />
            Activate
          </button>
        )}
      </div>
    </div>
  );
};

// Detail Item Component
const DetailItem = ({ label, value }) => (
  <div>
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className="font-medium text-foreground">{value}</div>
  </div>
);

// Action Modal Component
const ActionModal = ({
  user,
  actionType,
  notificationMessage,
  setNotificationMessage,
  onConfirm,
  onClose,
  performing,
}) => {
  const config = {
    activate: {
      title: "Activate User",
      icon: CheckCircle,
      color: "green",
      message: "This will restore the user's access to the platform.",
    },
    deactivate: {
      title: "Deactivate User",
      icon: UserX,
      color: "orange",
      message:
        "This will prevent the user from accessing the platform. Can be reversed anytime.",
    },
    notify: {
      title: "Send Notification",
      icon: Send,
      color: "blue",
      message: "Send a notification message to this user.",
    },
    // ADD THIS
    changePassword: {
      title: "Change User Password",
      icon: Key,
      color: "purple",
      message:
        "Set a new password for this user. They will need to use this new password to sign in.",
    },
  }[actionType];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Icon size={24} className={`text-${config.color}-600`} />
              <h2 className="text-xl font-semibold">{config.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="font-medium">
              {user.full_name || `${user.first_name} ${user.last_name}`}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {config.message}
            </p>
          </div>

          {actionType === "notify" && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Message *
              </label>
              <textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm"
                rows={4}
                placeholder="Enter notification message..."
                required
              />
            </div>
          )}

          {/* ADD THIS SECTION */}
          {actionType === "changePassword" && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                New Password *
              </label>
              <input
                type="password"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm"
                placeholder="Enter new password (min 8 characters)"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Password must contain: 8+ characters, uppercase, lowercase,
                number, and special character
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={performing}
              className="flex-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={
                performing ||
                (actionType === "notify" && !notificationMessage.trim()) ||
                (actionType === "changePassword" &&
                  notificationMessage.length < 8) // ADD THIS
              }
              className={`flex-1 px-4 py-2 text-sm text-white rounded-lg bg-${config.color}-600 hover:bg-${config.color}-700 disabled:opacity-50`}
            >
              {performing ? "Processing..." : config.title}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Empty State
const EmptyState = ({ activeTab }) => (
  <div className="text-center py-12 bg-card rounded-lg border">
    <Users className="mx-auto text-muted-foreground mb-4" size={48} />
    <div className="text-lg font-semibold text-foreground mb-2">
      No {activeTab} found
    </div>
    <p className="text-sm text-muted-foreground">
      Try adjusting your search criteria
    </p>
  </div>
);

export default UserManagement;
