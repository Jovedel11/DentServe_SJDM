import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiCamera,
  FiEdit3,
  FiSave,
  FiX,
  FiClock,
  FiHeart,
  FiShield,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiStar,
  FiMapPin,
  FiBell,
  FiRefreshCw,
  FiInfo,
} from "react-icons/fi";
import { useAuth } from "@/auth/context/AuthProvider";
import ProfileUpload from "@/core/components/image/ProfileUpload";
import Loader from "@/core/components/Loader";

const PatientProfile = () => {
  const {
    profile,
    handleRefreshProfile,
    updateProfile,
    user,
    loading: authLoading,
    error: authError,
  } = useAuth();

  // Component state
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [editedData, setEditedData] = useState(null);

  // Memoized profile data with fallbacks
  const profileData = useMemo(() => {
    if (!profile) return null;

    return {
      // User basic info
      user_id: profile.user_id,
      email: profile.email || "",
      phone: profile.phone || "",
      email_verified: profile.email_verified || false,
      phone_verified: profile.phone_verified || false,

      // Profile info
      profile: {
        first_name: profile.profile?.first_name || "",
        last_name: profile.profile?.last_name || "",
        full_name: profile.profile?.full_name || "",
        date_of_birth: profile.profile?.date_of_birth || "",
        gender: profile.profile?.gender || "",
        profile_image_url: profile.profile?.profile_image_url || "",
      },

      // Role specific data
      role_specific_data: {
        emergency_contact_name:
          profile.role_specific_data?.emergency_contact_name || "",
        emergency_contact_phone:
          profile.role_specific_data?.emergency_contact_phone || "",
        insurance_provider:
          profile.role_specific_data?.insurance_provider || "",
        medical_conditions:
          profile.role_specific_data?.medical_conditions || [],
        allergies: profile.role_specific_data?.allergies || [],
        preferred_doctors: profile.role_specific_data?.preferred_doctors || [],
        email_notifications:
          profile.role_specific_data?.email_notifications ?? true,
        sms_notifications:
          profile.role_specific_data?.sms_notifications ?? true,
        profile_completion: profile.role_specific_data?.profile_completion || 0,
      },

      // Statistics
      statistics: {
        total_appointments: profile.statistics?.total_appointments || 0,
        completed_appointments: profile.statistics?.completed_appointments || 0,
        upcoming_appointments: profile.statistics?.upcoming_appointments || 0,
        last_appointment: profile.statistics?.last_appointment || null,
      },
    };
  }, [profile]);

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    if (!profileData) return 0;

    const fields = [
      profileData.profile.first_name,
      profileData.profile.last_name,
      profileData.profile.date_of_birth,
      profileData.profile.gender,
      profileData.phone,
      profileData.role_specific_data.emergency_contact_name,
      profileData.role_specific_data.emergency_contact_phone,
    ];

    const completed = fields.filter(
      (field) => field && field.trim() !== ""
    ).length;
    return Math.round((completed / fields.length) * 100);
  }, [profileData]);

  // Initialize edited data when profile changes
  useEffect(() => {
    if (profileData) {
      setEditedData(JSON.parse(JSON.stringify(profileData)));
    }
  }, [profileData]);

  // Handle profile refresh
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      await handleRefreshProfile();
    } catch (error) {
      console.error("Error refreshing profile:", error);
      setError("Failed to refresh profile data");
    } finally {
      setRefreshing(false);
    }
  }, [handleRefreshProfile]);

  // Handle save with proper error handling
  const handleSave = useCallback(async () => {
    if (!editedData || !user?.id) {
      setError("Invalid data or user not found");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare profile data for update
      const profileUpdateData = {
        first_name: editedData.profile.first_name.trim(),
        last_name: editedData.profile.last_name.trim(),
        date_of_birth: editedData.profile.date_of_birth || null,
        gender: editedData.profile.gender || null,
      };

      // Prepare role-specific data for update
      const roleSpecificUpdateData = {
        emergency_contact_name:
          editedData.role_specific_data.emergency_contact_name.trim(),
        emergency_contact_phone:
          editedData.role_specific_data.emergency_contact_phone.trim(),
        insurance_provider:
          editedData.role_specific_data.insurance_provider.trim(),
        medical_conditions: Array.isArray(
          editedData.role_specific_data.medical_conditions
        )
          ? editedData.role_specific_data.medical_conditions
          : editedData.role_specific_data.medical_conditions
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
        allergies: Array.isArray(editedData.role_specific_data.allergies)
          ? editedData.role_specific_data.allergies
          : editedData.role_specific_data.allergies
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
        email_notifications: editedData.role_specific_data.email_notifications,
        sms_notifications: editedData.role_specific_data.sms_notifications,
      };

      // Include phone if it's different
      if (editedData.phone !== profileData.phone) {
        profileUpdateData.phone = editedData.phone.trim();
      }

      const result = await updateProfile(
        profileUpdateData,
        roleSpecificUpdateData
      );

      if (result.success) {
        setSuccess("Profile updated successfully!");
        setIsEditing(false);

        // Auto-clear success message
        setTimeout(() => setSuccess(""), 4000);

        // Refresh profile data
        await handleRefreshProfile();
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, [editedData, user?.id, updateProfile, handleRefreshProfile, profileData]);

  // Handle edit toggle
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Reset edited data to original when canceling
      setEditedData(JSON.parse(JSON.stringify(profileData)));
    }
    setIsEditing(!isEditing);
    setError(null);
    setSuccess("");
  }, [isEditing, profileData]);

  // Handle input changes with proper data structure
  const handleInputChange = useCallback((section, field, value) => {
    setEditedData((prev) => {
      const updated = { ...prev };

      if (section === "root") {
        updated[field] = value;
      } else if (field.includes(".")) {
        const [parentField, childField] = field.split(".");
        if (!updated[section][parentField]) {
          updated[section][parentField] = {};
        }
        updated[section][parentField][childField] = value;
      } else {
        updated[section][field] = value;
      }

      return updated;
    });
  }, []);

  // Handle image update
  const handleImageUpdate = useCallback(
    async (newImageUrl) => {
      try {
        const result = await updateProfile(
          { profile_image_url: newImageUrl },
          {},
          user?.id
        );

        if (result.success) {
          await handleRefreshProfile();
        } else {
          setError(result.error || "Failed to update profile image");
        }
      } catch (error) {
        console.error("Error updating profile image:", error);
        setError("Failed to update profile image");
      }
    },
    [updateProfile, user?.id, handleRefreshProfile]
  );

  // Statistics data with proper fallbacks
  const statsData = useMemo(
    () => [
      {
        icon: FiCalendar,
        label: "Total Appointments",
        value: profileData?.statistics?.total_appointments?.toString() || "0",
        color: "primary",
      },
      {
        icon: FiClock,
        label: "Upcoming Appointments",
        value:
          profileData?.statistics?.upcoming_appointments?.toString() || "0",
        color: "success",
      },
      {
        icon: FiHeart,
        label: "Treatments Completed",
        value:
          profileData?.statistics?.completed_appointments?.toString() || "0",
        color: "warning",
      },
    ],
    [profileData]
  );

  // Style helper functions
  const getStatCardClasses = useCallback((color) => {
    const baseClasses =
      "flex items-start gap-4 p-4 rounded-xl border-2 border-transparent transition-all duration-300 hover:-translate-y-0.5 md:flex-row flex-col md:items-start items-center text-center md:text-left";

    switch (color) {
      case "primary":
        return `${baseClasses} bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950 dark:to-blue-900 dark:border-blue-700`;
      case "success":
        return `${baseClasses} bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950 dark:to-green-900 dark:border-green-700`;
      case "warning":
        return `${baseClasses} bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950 dark:to-amber-900 dark:border-amber-700`;
      default:
        return baseClasses;
    }
  }, []);

  const getStatIconClasses = useCallback((color) => {
    const baseClasses =
      "w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0";

    switch (color) {
      case "primary":
        return `${baseClasses} bg-blue-600`;
      case "success":
        return `${baseClasses} bg-green-600`;
      case "warning":
        return `${baseClasses} bg-amber-600`;
      default:
        return `${baseClasses} bg-blue-600`;
    }
  }, []);

  // Loading states
  const isLoading = authLoading || localLoading || !profileData;
  const currentData = isEditing ? editedData : profileData;

  // Show loader if still loading
  if (isLoading) {
    return <Loader message="Loading your profile... Please wait a moment" />;
  }

  // Show error if no profile data
  if (!profileData && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <FiAlertCircle className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Profile Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            We couldn't load your profile data. Please try refreshing the page.
          </p>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl mx-auto transition-all duration-300 hover:bg-primary/90"
            disabled={refreshing}
          >
            <FiRefreshCw
              className={`text-lg ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh Profile"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl">
      <div className="max-w-6xl mx-auto">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FiCheckCircle className="text-xl flex-shrink-0" />
              <span className="font-medium">{success}</span>
            </motion.div>
          )}

          {(error || authError) && (
            <motion.div
              className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 text-red-800 dark:bg-red-950 dark:border-red-700 dark:text-red-200"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FiAlertCircle className="text-xl flex-shrink-0" />
              <span className="font-medium">{error || authError}</span>
              <button
                onClick={() => {
                  setError(null);
                }}
                className="ml-auto p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded"
              >
                <FiX className="text-lg" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-start gap-6 md:flex-row flex-col">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                My Profile
              </h1>
              <p className="text-muted-foreground mb-4">
                Manage your personal information and preferences
              </p>

              {/* Profile Completion */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {profileCompletion}% Complete
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 md:w-auto w-full">
              <button
                onClick={handleRefresh}
                disabled={refreshing || saving}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw
                  className={`text-base ${refreshing ? "animate-spin" : ""}`}
                />
              </button>

              {!isEditing ? (
                <button
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white border-2 border-blue-600 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:border-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed md:flex-initial flex-1"
                  onClick={handleEditToggle}
                  disabled={saving}
                >
                  <FiEdit3 className="text-base" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-start gap-3 md:w-auto w-full">
                  <button
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed md:flex-initial flex-1"
                    onClick={handleEditToggle}
                    disabled={saving}
                  >
                    <FiX className="text-base" />
                    <span>Cancel</span>
                  </button>
                  <button
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white border-2 border-green-600 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-green-700 hover:border-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed md:flex-initial flex-1"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <FiLoader className="text-base animate-spin" />
                    ) : (
                      <FiSave className="text-base" />
                    )}
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile Overview */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
            <div className="flex items-start gap-6 mb-8 md:flex-row flex-col md:items-start items-center md:text-left text-center">
              <div className="relative flex-shrink-0">
                <ProfileUpload
                  currentImageUrl={currentData?.profile?.profile_image_url}
                  onImageUpdate={handleImageUpdate}
                  variant="avatar"
                  size="lg"
                  showFileInfo={false}
                  showGuidelines={false}
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-600 text-white border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
                  <FiCamera className="text-sm" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {currentData?.profile?.first_name &&
                  currentData?.profile?.last_name
                    ? `${currentData.profile.first_name} ${currentData.profile.last_name}`
                    : "Complete your profile"}
                </h2>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                    <FiMail className="text-blue-600 text-base flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {currentData?.email || "No email provided"}
                    </span>
                    {currentData?.email_verified && (
                      <FiCheckCircle className="text-green-500 text-sm" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                    <FiPhone className="text-blue-600 text-base flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {currentData?.phone || "No phone provided"}
                    </span>
                    {currentData?.phone_verified && (
                      <FiCheckCircle className="text-green-500 text-sm" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statsData.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    className={getStatCardClasses(stat.color)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <div className={getStatIconClasses(stat.color)}>
                      <Icon className="text-xl" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Profile Sections */}
        <div className="flex flex-col gap-6">
          {/* Personal Information */}
          <motion.div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <FiUser className="text-blue-600 text-xl flex-shrink-0" />
                Personal Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentData?.profile?.first_name || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "profile",
                          "first_name",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Enter your first name"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData?.profile?.first_name || "Not provided"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentData?.profile?.last_name || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "profile",
                          "last_name",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Enter your last name"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData?.profile?.last_name || "Not provided"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px] opacity-60 flex-1">
                      {currentData?.email || "Not provided"}
                    </span>
                    {currentData?.email_verified && (
                      <FiCheckCircle className="text-green-500 text-lg" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    (Email is managed by your account settings)
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={currentData?.phone || ""}
                      onChange={(e) =>
                        handleInputChange("root", "phone", e.target.value)
                      }
                      className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px] flex-1">
                        {currentData?.phone || "Not provided"}
                      </span>
                      {currentData?.phone_verified && (
                        <FiCheckCircle className="text-green-500 text-lg" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date of Birth
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={currentData?.profile?.date_of_birth || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "profile",
                          "date_of_birth",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData?.profile?.date_of_birth
                        ? new Date(
                            currentData.profile.date_of_birth
                          ).toLocaleDateString()
                        : "Not provided"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      value={currentData?.profile?.gender || ""}
                      onChange={(e) =>
                        handleInputChange("profile", "gender", e.target.value)
                      }
                      className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">
                        Prefer not to say
                      </option>
                    </select>
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData?.profile?.gender || "Not provided"}
                    </span>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-foreground mb-4">
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Contact Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={
                          currentData?.role_specific_data
                            ?.emergency_contact_name || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "role_specific_data",
                            "emergency_contact_name",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Enter emergency contact name"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData?.role_specific_data
                          ?.emergency_contact_name || "Not provided"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Contact Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={
                          currentData?.role_specific_data
                            ?.emergency_contact_phone || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "role_specific_data",
                            "emergency_contact_phone",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Enter emergency contact phone"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData?.role_specific_data
                          ?.emergency_contact_phone || "Not provided"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Medical Information */}
          <motion.div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <FiShield className="text-blue-600 text-xl flex-shrink-0" />
                Medical Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Medical Conditions
                  </label>
                  {isEditing ? (
                    <textarea
                      value={
                        Array.isArray(
                          currentData?.role_specific_data?.medical_conditions
                        )
                          ? currentData.role_specific_data.medical_conditions.join(
                              ", "
                            )
                          : currentData?.role_specific_data
                              ?.medical_conditions || ""
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "role_specific_data",
                          "medical_conditions",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-vertical min-h-[100px]"
                      rows="4"
                      placeholder="Enter medical conditions, separated by commas..."
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-start min-h-[48px]">
                      {Array.isArray(
                        currentData?.role_specific_data?.medical_conditions
                      )
                        ? currentData.role_specific_data.medical_conditions.join(
                            ", "
                          ) || "No medical conditions reported"
                        : currentData?.role_specific_data?.medical_conditions ||
                          "No medical conditions reported"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Allergies
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={
                          Array.isArray(
                            currentData?.role_specific_data?.allergies
                          )
                            ? currentData.role_specific_data.allergies.join(
                                ", "
                              )
                            : currentData?.role_specific_data?.allergies || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "role_specific_data",
                            "allergies",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Enter allergies, separated by commas"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {Array.isArray(
                          currentData?.role_specific_data?.allergies
                        )
                          ? currentData.role_specific_data.allergies.join(
                              ", "
                            ) || "None reported"
                          : currentData?.role_specific_data?.allergies ||
                            "None reported"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Insurance Provider
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={
                          currentData?.role_specific_data?.insurance_provider ||
                          ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "role_specific_data",
                            "insurance_provider",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Enter your insurance provider"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData?.role_specific_data?.insurance_provider ||
                          "Not provided"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Notification Preferences */}
          <motion.div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <FiBell className="text-blue-600 text-xl flex-shrink-0" />
                Notification Preferences
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FiMail className="text-blue-600 text-lg" />
                    <div>
                      <h4 className="font-medium text-foreground">
                        Email Notifications
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about appointments and health records
                        via email
                      </p>
                    </div>
                  </div>
                  {isEditing ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          currentData?.role_specific_data
                            ?.email_notifications ?? true
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "role_specific_data",
                            "email_notifications",
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {currentData?.role_specific_data?.email_notifications
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FiPhone className="text-blue-600 text-lg" />
                    <div>
                      <h4 className="font-medium text-foreground">
                        SMS Notifications
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Receive appointment reminders and updates via SMS
                      </p>
                    </div>
                  </div>
                  {isEditing ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          currentData?.role_specific_data?.sms_notifications ??
                          true
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "role_specific_data",
                            "sms_notifications",
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {currentData?.role_specific_data?.sms_notifications
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
