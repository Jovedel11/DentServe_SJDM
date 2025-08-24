import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  Shield,
  Heart,
  MapPin,
  Mail,
  Phone,
  Eye,
  Ban,
  AlertTriangle,
  Award,
  Building2,
  CheckCircle,
  Activity,
} from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendType, setSuspendType] = useState("suspend"); // 'suspend' or 'ban'

  // Mock data based on your actual table structure
  const mockUsers = [
    {
      id: "1",
      user_id: "auth_001",
      user_type: "patient",
      first_name: "Sarah",
      last_name: "Johnson",
      date_of_birth: "1985-06-15",
      gender: "female",
      profile_image_url:
        "https://images.unsplash.com/photo-1494790108755-2616b612b647?w=150",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      status: "active",
      created_at: "2024-06-15T10:30:00Z",
      updated_at: "2024-08-20T14:22:00Z",
      last_login: "2024-08-21T14:22:00Z",
      // Patient specific data
      patient_profile: {
        emergency_contact_name: "John Johnson",
        emergency_contact_phone: "+1 (555) 123-4568",
        insurance_provider: "HealthFirst Insurance",
        medical_conditions: ["Hypertension"],
        allergies: ["Penicillin"],
        email_notifications: true,
        sms_notifications: false,
        preferred_location: "New York, NY",
      },
      // Activity metrics
      total_appointments: 12,
      completed_appointments: 10,
      cancelled_appointments: 2,
      last_appointment: "2024-08-18T09:00:00Z",
      next_appointment: "2024-08-25T14:30:00Z",
    },
    {
      id: "2",
      user_id: "auth_002",
      user_type: "staff",
      first_name: "Dr. Michael",
      last_name: "Chen",
      date_of_birth: "1980-03-22",
      gender: "male",
      profile_image_url:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150",
      email: "dr.michael.chen@dentalcare.com",
      phone: "+1 (555) 234-5678",
      status: "active",
      created_at: "2024-05-20T09:15:00Z",
      updated_at: "2024-08-21T16:10:00Z",
      last_login: "2024-08-21T16:10:00Z",
      // Staff specific data
      staff_profile: {
        clinic_id: "clinic_001",
        clinic_name: "Westside Dental Group",
        employee_id: "WDG-001",
        position: "Lead Dentist",
        hire_date: "2024-05-20",
        department: "General Dentistry",
        permissions: {
          manage_doctors: true,
          view_analytics: true,
          manage_appointments: true,
        },
        is_active: true,
      },
      // Clinic badges
      clinic_badges: [
        {
          badge_name: "Outstanding",
          badge_color: "#FFD700",
          badge_icon_url: "🏆",
        },
        {
          badge_name: "High Volume",
          badge_color: "#4CAF50",
          badge_icon_url: "📈",
        },
      ],
      total_patients_managed: 156,
      appointments_this_month: 45,
    },
    {
      id: "3",
      user_id: "auth_003",
      user_type: "patient",
      first_name: "Emily",
      last_name: "Rodriguez",
      date_of_birth: "1992-11-08",
      gender: "female",
      profile_image_url:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      email: "emily.rodriguez@email.com",
      phone: "+1 (555) 345-6789",
      status: "inactive",
      created_at: "2024-07-10T14:20:00Z",
      updated_at: "2024-08-05T11:30:00Z",
      last_login: "2024-08-05T11:30:00Z",
      patient_profile: {
        emergency_contact_name: "Maria Rodriguez",
        emergency_contact_phone: "+1 (555) 345-6790",
        insurance_provider: "Blue Cross",
        medical_conditions: [],
        allergies: ["Latex"],
        email_notifications: true,
        sms_notifications: true,
        preferred_location: "Chicago, IL",
      },
      total_appointments: 3,
      completed_appointments: 2,
      cancelled_appointments: 1,
      last_appointment: "2024-07-25T10:00:00Z",
      next_appointment: null,
    },
    {
      id: "4",
      user_id: "auth_004",
      user_type: "staff",
      first_name: "Lisa",
      last_name: "Thompson",
      date_of_birth: "1988-09-12",
      gender: "female",
      profile_image_url:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
      email: "lisa.thompson@smartdental.com",
      phone: "+1 (555) 456-7890",
      status: "active",
      created_at: "2024-04-08T11:45:00Z",
      updated_at: "2024-08-21T15:45:00Z",
      last_login: "2024-08-21T15:45:00Z",
      staff_profile: {
        clinic_id: "clinic_002",
        clinic_name: "Sunny Dental Clinic",
        employee_id: "SDC-005",
        position: "Clinic Administrator",
        hire_date: "2024-04-08",
        department: "Administration",
        permissions: {
          manage_doctors: false,
          view_analytics: true,
          manage_appointments: true,
        },
        is_active: true,
      },
      clinic_badges: [
        {
          badge_name: "Always Active",
          badge_color: "#2196F3",
          badge_icon_url: "⚡",
        },
        {
          badge_name: "Excellent Rating",
          badge_color: "#E91E63",
          badge_icon_url: "⭐",
        },
      ],
      total_patients_managed: 89,
      appointments_this_month: 32,
    },
    {
      id: "5",
      user_id: "auth_005",
      user_type: "patient",
      first_name: "James",
      last_name: "Wilson",
      date_of_birth: "1975-04-30",
      gender: "male",
      profile_image_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      email: "james.wilson@email.com",
      phone: "+1 (555) 567-8901",
      status: "suspended",
      created_at: "2024-03-22T16:10:00Z",
      updated_at: "2024-08-10T09:20:00Z",
      last_login: "2024-08-10T09:20:00Z",
      patient_profile: {
        emergency_contact_name: "Patricia Wilson",
        emergency_contact_phone: "+1 (555) 567-8902",
        insurance_provider: "Aetna",
        medical_conditions: ["Diabetes Type 2"],
        allergies: [],
        email_notifications: false,
        sms_notifications: true,
        preferred_location: "Houston, TX",
      },
      total_appointments: 5,
      completed_appointments: 3,
      cancelled_appointments: 2,
      last_appointment: "2024-07-15T13:00:00Z",
      next_appointment: null,
      suspension_reason: "Multiple no-shows without notice",
    },
  ];

  // Initialize with mock data and calculate stats
  useEffect(() => {
    setTimeout(() => {
      setUsers(mockUsers);
      calculateStats(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  const calculateStats = (userData) => {
    const stats = {
      total: userData.length,
      active: userData.filter((u) => u.status === "active").length,
      inactive: userData.filter((u) => u.status === "inactive").length,
      suspended: userData.filter((u) => u.status === "suspended").length,
      banned: userData.filter((u) => u.status === "banned").length,
      patients: userData.filter((u) => u.user_type === "patient").length,
      staff: userData.filter((u) => u.user_type === "staff").length,
      clinics_with_badges: userData.filter(
        (u) =>
          u.user_type === "staff" &&
          u.clinic_badges &&
          u.clinic_badges.length > 0
      ).length,
    };
    setStats(stats);
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.staff_profile?.clinic_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesType =
      selectedType === "all" || user.user_type === selectedType;
    const matchesStatus =
      selectedStatus === "all" || user.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Handle user status update
  const handleStatusUpdate = async (userId, newStatus, reason = "") => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                status: newStatus,
                updated_at: new Date().toISOString(),
                suspension_reason: reason || user.suspension_reason,
              }
            : user
        )
      );

      calculateStats(users);
      setShowSuspendModal(false);
      setSuspendReason("");
      setSelectedUser(null);

      // Show success notification
      console.log(`User ${newStatus} successfully`);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800";
      case "inactive":
        return "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800";
      case "suspended":
        return "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800";
      case "banned":
        return "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800";
    }
  };

  // Format last login time
  const formatLastLogin = (timestamp) => {
    if (!timestamp) return "Never";
    const now = new Date();
    const lastLogin = new Date(timestamp);
    const diffMs = now - lastLogin;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastLogin.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-4 border">
                  <div className="h-6 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-lg border p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              User Management
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage all platform users - patients and staff members
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Total
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {stats.total}
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="text-green-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Active
                </span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="text-gray-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Inactive
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {stats.inactive}
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-orange-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Suspended
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.suspended}
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="text-red-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Banned
                </span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats.banned || 0}
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="text-pink-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Patients
                </span>
              </div>
              <div className="text-2xl font-bold text-pink-600">
                {stats.patients}
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-purple-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Staff
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.staff}
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Award className="text-yellow-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Badged
                </span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.clinics_with_badges}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search users, clinics..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="patient">Patients</option>
                  <option value="staff">Staff</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Filter size={16} />
                Advanced Filters
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-card border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Registration Period
                    </label>
                    <select className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent">
                      <option>All Time</option>
                      <option>Last 30 days</option>
                      <option>Last 3 months</option>
                      <option>Last 6 months</option>
                      <option>This year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Activity Level
                    </label>
                    <select className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent">
                      <option>All Activity</option>
                      <option>Very Active</option>
                      <option>Moderately Active</option>
                      <option>Low Activity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Clinic Badges
                    </label>
                    <select className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent">
                      <option>All Clinics</option>
                      <option>With Badges</option>
                      <option>Outstanding</option>
                      <option>Always Active</option>
                      <option>High Volume</option>
                      <option>Excellent Rating</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Users List */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground">
                      User
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Type & Status
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Contact Info
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Activity
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Details
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      index={index}
                      getStatusColor={getStatusColor}
                      formatLastLogin={formatLastLogin}
                      onSuspend={(user) => {
                        setSelectedUser(user);
                        setSuspendType("suspend");
                        setShowSuspendModal(true);
                      }}
                      onBan={(user) => {
                        setSelectedUser(user);
                        setSuspendType("ban");
                        setShowSuspendModal(true);
                      }}
                      onActivate={(user) =>
                        handleStatusUpdate(user.id, "active")
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users
                  className="mx-auto text-muted-foreground mb-4"
                  size={48}
                />
                <div className="text-muted-foreground text-lg">
                  No users found
                </div>
                <p className="text-muted-foreground mt-2">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {stats.total} users
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors">
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded">
                  1
                </span>
                <button className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend/Ban Modal */}
      {showSuspendModal && selectedUser && (
        <SuspendModal
          user={selectedUser}
          type={suspendType}
          reason={suspendReason}
          setReason={setSuspendReason}
          onConfirm={(reason) =>
            handleStatusUpdate(
              selectedUser.id,
              suspendType === "suspend" ? "suspended" : "banned",
              reason
            )
          }
          onClose={() => {
            setShowSuspendModal(false);
            setSelectedUser(null);
            setSuspendReason("");
          }}
        />
      )}
    </div>
  );
};

// User Row Component
const UserRow = ({
  user,
  index,
  getStatusColor,
  formatLastLogin,
  onSuspend,
  onBan,
  onActivate,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <tr
        className={`border-b hover:bg-muted/30 transition-colors ${
          index % 2 === 0 ? "bg-background" : "bg-muted/10"
        }`}
      >
        {/* User Info */}
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={user.profile_image_url}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-12 h-12 rounded-full object-cover border-2 border-border"
              />
              {user.status === "active" && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            <div>
              <div className="font-semibold text-foreground text-base">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <div className="text-xs text-muted-foreground">
                ID: {user.id.substring(0, 8)}...
              </div>
            </div>
          </div>
        </td>

        {/* Type & Status */}
        <td className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {user.user_type === "staff" ? (
                <Shield className="text-purple-600" size={16} />
              ) : (
                <Heart className="text-pink-600" size={16} />
              )}
              <span className="text-sm font-medium capitalize">
                {user.user_type}
              </span>
            </div>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                user.status
              )}`}
            >
              {user.status}
            </span>
            {user.suspension_reason && (
              <div className="text-xs text-red-600 font-medium">
                {user.suspension_reason}
              </div>
            )}
          </div>
        </td>

        {/* Contact Info */}
        <td className="p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Mail size={12} className="text-muted-foreground" />
              <span className="font-mono text-xs">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={12} className="text-muted-foreground" />
              <span className="font-mono text-xs">{user.phone}</span>
            </div>
            {user.user_type === "patient" &&
              user.patient_profile?.preferred_location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={12} />
                  <span className="text-xs">
                    {user.patient_profile.preferred_location}
                  </span>
                </div>
              )}
          </div>
        </td>

        {/* Activity */}
        <td className="p-4">
          <div className="space-y-1">
            <div className="text-sm text-foreground font-medium">
              {formatLastLogin(user.last_login)}
            </div>
            <div className="text-xs text-muted-foreground">
              Joined {new Date(user.created_at).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Age:{" "}
              {new Date().getFullYear() -
                new Date(user.date_of_birth).getFullYear()}
            </div>
          </div>
        </td>

        {/* Details */}
        <td className="p-4">
          {user.user_type === "patient" ? (
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {user.total_appointments} appointments
              </div>
              <div className="text-xs text-muted-foreground">
                {user.completed_appointments} completed
              </div>
              {user.patient_profile?.insurance_provider && (
                <div className="text-xs text-blue-600">
                  {user.patient_profile.insurance_provider}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 size={14} className="text-blue-600" />
                {user.staff_profile?.clinic_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {user.staff_profile?.position}
              </div>
              <div className="text-xs text-muted-foreground">
                {user.total_patients_managed} patients
              </div>
              {/* Clinic Badges */}
              {user.clinic_badges && user.clinic_badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {user.clinic_badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: badge.badge_color + "20",
                        color: badge.badge_color,
                      }}
                    >
                      <span>{badge.badge_icon_url}</span>
                      {badge.badge_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </td>

        {/* Actions */}
        <td className="p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              title="View Details"
            >
              <Eye size={16} />
            </button>

            {user.status === "active" && (
              <>
                <button
                  onClick={() => onSuspend(user)}
                  className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                  title="Suspend User"
                >
                  <AlertTriangle size={16} />
                </button>
                <button
                  onClick={() => onBan(user)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Ban User"
                >
                  <Ban size={16} />
                </button>
              </>
            )}

            {(user.status === "suspended" ||
              user.status === "banned" ||
              user.status === "inactive") && (
              <button
                onClick={() => onActivate(user)}
                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Activate User"
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expandable Details */}
      {showDetails && (
        <tr>
          <td colSpan="6" className="p-0">
            <div className="bg-muted/20 p-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Basic Information */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Eye size={16} />
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Email:</span> {user.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {user.phone}
                    </div>
                    <div>
                      <span className="font-medium">Date of Birth:</span>{" "}
                      {new Date(user.date_of_birth).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Gender:</span> {user.gender}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(
                          user.status
                        )}`}
                      >
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role-specific Information */}
                {user.user_type === "patient" ? (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Heart size={16} />
                      Patient Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Emergency Contact:</span>{" "}
                        {user.patient_profile?.emergency_contact_name}
                      </div>
                      <div>
                        <span className="font-medium">Emergency Phone:</span>{" "}
                        {user.patient_profile?.emergency_contact_phone}
                      </div>
                      <div>
                        <span className="font-medium">Insurance:</span>{" "}
                        {user.patient_profile?.insurance_provider || "None"}
                      </div>
                      <div>
                        <span className="font-medium">
                          Email Notifications:
                        </span>{" "}
                        {user.patient_profile?.email_notifications
                          ? "Yes"
                          : "No"}
                      </div>
                      <div>
                        <span className="font-medium">SMS Notifications:</span>{" "}
                        {user.patient_profile?.sms_notifications ? "Yes" : "No"}
                      </div>
                      {user.patient_profile?.medical_conditions?.length > 0 && (
                        <div>
                          <span className="font-medium">Conditions:</span>{" "}
                          {user.patient_profile.medical_conditions.join(", ")}
                        </div>
                      )}
                      {user.patient_profile?.allergies?.length > 0 && (
                        <div>
                          <span className="font-medium">Allergies:</span>{" "}
                          {user.patient_profile.allergies.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Shield size={16} />
                      Staff Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Clinic:</span>{" "}
                        {user.staff_profile?.clinic_name}
                      </div>
                      <div>
                        <span className="font-medium">Employee ID:</span>{" "}
                        {user.staff_profile?.employee_id}
                      </div>
                      <div>
                        <span className="font-medium">Position:</span>{" "}
                        {user.staff_profile?.position}
                      </div>
                      <div>
                        <span className="font-medium">Department:</span>{" "}
                        {user.staff_profile?.department}
                      </div>
                      <div>
                        <span className="font-medium">Hire Date:</span>{" "}
                        {new Date(
                          user.staff_profile?.hire_date
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Active Staff:</span>{" "}
                        {user.staff_profile?.is_active ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity & Metrics */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Activity size={16} />
                    Activity & Metrics
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Last Login:</span>{" "}
                      {formatLastLogin(user.last_login)}
                    </div>
                    <div>
                      <span className="font-medium">Account Created:</span>{" "}
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span>{" "}
                      {new Date(user.updated_at).toLocaleDateString()}
                    </div>

                    {user.user_type === "patient" ? (
                      <>
                        <div>
                          <span className="font-medium">
                            Total Appointments:
                          </span>{" "}
                          {user.total_appointments}
                        </div>
                        <div>
                          <span className="font-medium">Completed:</span>{" "}
                          {user.completed_appointments}
                        </div>
                        <div>
                          <span className="font-medium">Cancelled:</span>{" "}
                          {user.cancelled_appointments}
                        </div>
                        {user.next_appointment && (
                          <div>
                            <span className="font-medium">
                              Next Appointment:
                            </span>{" "}
                            {new Date(
                              user.next_appointment
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="font-medium">Patients Managed:</span>{" "}
                          {user.total_patients_managed}
                        </div>
                        <div>
                          <span className="font-medium">This Month:</span>{" "}
                          {user.appointments_this_month}
                        </div>
                        {user.clinic_badges &&
                          user.clinic_badges.length > 0 && (
                            <div>
                              <span className="font-medium">
                                Clinic Badges:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.clinic_badges.map((badge, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                    style={{
                                      backgroundColor: badge.badge_color + "20",
                                      color: badge.badge_color,
                                    }}
                                  >
                                    <span>{badge.badge_icon_url}</span>
                                    {badge.badge_name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// Suspend/Ban Modal Component
const SuspendModal = ({
  user,
  type,
  reason,
  setReason,
  onConfirm,
  onClose,
}) => {
  const isban = type === "ban";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {isban ? (
              <Ban className="text-red-600" size={24} />
            ) : (
              <AlertTriangle className="text-orange-600" size={24} />
            )}
            <h2 className="text-xl font-semibold text-foreground">
              {isban ? "Ban User" : "Suspend User"}
            </h2>
          </div>

          {/* User Info */}
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src={user.profile_image_url}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <div className="font-medium text-foreground">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div
            className={`mb-4 p-3 rounded-lg border-l-4 ${
              isban
                ? "bg-red-50 border-red-500 dark:bg-red-900/20"
                : "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
            }`}
          >
            <p
              className={`text-sm ${
                isban
                  ? "text-red-800 dark:text-red-200"
                  : "text-orange-800 dark:text-orange-200"
              }`}
            >
              {isban
                ? "Banning will permanently restrict this user from accessing the platform. This action can be reversed by reactivating the account."
                : "Suspending will temporarily restrict this user from accessing the platform. This action can be reversed at any time."}
            </p>
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason for {isban ? "ban" : "suspension"} *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              rows={3}
              placeholder={`Please provide a reason for ${
                isban ? "banning" : "suspending"
              } this user...`}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={!reason.trim()}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity disabled:opacity-50 ${
                isban
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {isban ? "Ban User" : "Suspend User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
