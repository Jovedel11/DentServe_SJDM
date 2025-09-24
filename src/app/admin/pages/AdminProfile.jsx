import React from "react";
import { AnimatePresence } from "framer-motion";
import { FiUser, FiShield, FiSettings } from "react-icons/fi";

import { useProfileManager } from "@/app/shared/hook/useProfileManager";
import { ProfileHeader } from "@/app/shared/profile/profile-header";
import { ProfileCard } from "@/app/shared/profile/profile-card";
import { ProfileField } from "@/app/shared/profile/profile-field";
import { ProfileAvatar } from "@/app/shared/profile/profile-avatar";
import { AlertMessage } from "@/core/components/ui/alert-message";
import Loader from "@/core/components/Loader";

const AdminProfile = () => {
  const {
    profileData,
    currentData,
    profileCompletion,
    isEditing,
    saving,
    refreshing,
    loading,
    error,
    success,
    handleRefresh,
    handleInputChange,
    handleSave,
    handleEditToggle,
    handleImageUpdate,
  } = useProfileManager();

  // Access level options
  const accessLevelOptions = [
    { value: 1, label: "Level 1 - Basic Admin" },
    { value: 2, label: "Level 2 - Advanced Admin" },
    { value: 3, label: "Level 3 - Super Admin" },
  ];

  if (loading) {
    return <Loader message="Loading admin profile..." />;
  }

  if (!profileData && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Admin Profile Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            Unable to load your admin profile. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-background rounded-2xl">
      <div className="max-w-4xl mx-auto">
        {/* Success/Error Messages */}
        <AnimatePresence>
          <AlertMessage type="success" message={success} />
          <AlertMessage type="error" message={error} />
        </AnimatePresence>

        {/* Header */}
        <ProfileHeader
          title="Admin Profile"
          subtitle="Manage your administrative account settings"
          isEditing={isEditing}
          onEdit={handleEditToggle}
          onSave={handleSave}
          onCancel={handleEditToggle}
          onRefresh={handleRefresh}
          saving={saving}
          refreshing={refreshing}
          completion={profileCompletion}
        />

        {/* Profile Overview */}
        <ProfileCard className="mb-8" delay={0.2}>
          <div className="flex items-start gap-6 mb-6 md:flex-row flex-col md:items-start items-center md:text-left text-center">
            <ProfileAvatar
              imageUrl={currentData?.profile?.profile_image_url}
              name={`${currentData?.profile?.first_name} ${currentData?.profile?.last_name}`}
              onImageUpdate={handleImageUpdate}
              size="xl"
            />

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {currentData?.profile?.first_name &&
                currentData?.profile?.last_name
                  ? `${currentData.profile.first_name} ${currentData.profile.last_name}`
                  : "Complete your profile"}
              </h2>

              <div className="flex items-center gap-2 mb-4">
                <FiShield className="text-primary text-lg" />
                <span className="text-primary font-medium">
                  Access Level{" "}
                  {currentData?.role_specific_data?.access_level || 1}
                </span>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Email: {currentData?.email}</p>
                <p>Phone: {currentData?.phone || "Not provided"}</p>
              </div>
            </div>
          </div>
        </ProfileCard>

        {/* Personal Information */}
        <ProfileCard
          title="Personal Information"
          icon={FiUser}
          className="mb-6"
          delay={0.4}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileField
              label="First Name"
              value={currentData?.profile?.first_name}
              isEditing={isEditing}
              onChange={(e) =>
                handleInputChange("profile", "first_name", e.target.value)
              }
              placeholder="Enter your first name"
              required
            />

            <ProfileField
              label="Last Name"
              value={currentData?.profile?.last_name}
              isEditing={isEditing}
              onChange={(e) =>
                handleInputChange("profile", "last_name", e.target.value)
              }
              placeholder="Enter your last name"
              required
            />

            <ProfileField
              label="Email Address"
              value={currentData?.email}
              verified={currentData?.email_verified}
              disabled
            />

            <ProfileField
              label="Phone Number"
              type="tel"
              value={currentData?.phone}
              isEditing={isEditing}
              onChange={(e) =>
                handleInputChange("root", "phone", e.target.value)
              }
              placeholder="Enter your phone number"
              verified={currentData?.phone_verified}
            />

            <ProfileField
              label="Date of Birth"
              type="date"
              value={currentData?.profile?.date_of_birth}
              isEditing={isEditing}
              onChange={(e) =>
                handleInputChange("profile", "date_of_birth", e.target.value)
              }
            />

            <ProfileField
              label="Gender"
              type="select"
              value={currentData?.profile?.gender}
              isEditing={isEditing}
              onChange={(e) =>
                handleInputChange("profile", "gender", e.target.value)
              }
              options={[
                { value: "M", label: "Male" },
                { value: "F", label: "Female" },
                { value: "Other", label: "Other" },
                { value: "Prefer not to say", label: "Prefer not to say" },
              ]}
              placeholder="Select Gender"
            />
          </div>
        </ProfileCard>

        {/* Administrative Settings */}
        <ProfileCard
          title="Administrative Settings"
          icon={FiSettings}
          delay={0.5}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileField
              label="Access Level"
              type="select"
              value={currentData?.role_specific_data?.access_level}
              options={accessLevelOptions}
              disabled // Admin cannot change their own access level
            />

            <ProfileField
              label="Department"
              value={currentData?.role_specific_data?.department}
              isEditing={isEditing}
              onChange={(e) =>
                handleInputChange(
                  "role_specific_data",
                  "department",
                  e.target.value
                )
              }
              placeholder="Enter your department"
            />
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Current Permissions
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentData?.role_specific_data?.permissions &&
                Object.entries(currentData.role_specific_data.permissions).map(
                  ([key, value]) =>
                    value && (
                      <span
                        key={key}
                        className="inline-flex items-center px-3 py-1 text-xs bg-primary/10 text-primary rounded-full border border-primary/20"
                      >
                        {key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    )
                )}
            </div>
          </div>
        </ProfileCard>
      </div>
    </div>
  );
};

export default AdminProfile;
