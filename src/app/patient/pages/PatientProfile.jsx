import React from "react";
import { AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiClock,
  FiHeart,
  FiShield,
  FiBell,
} from "react-icons/fi";

import { useProfileManager } from "@/app/shared/hook/useProfileManager";
import { ProfileHeader } from "@/app/shared/profile/profile-header";
import { ProfileCard } from "@/app/shared/profile/profile-card";
import { ProfileField } from "@/app/shared/profile/profile-field";
import { ProfileAvatar } from "@/app/shared/profile/profile-avatar";
import { ProfileStats } from "@/app/shared/profile/profile-stats";
import { AlertMessage } from "@/core/components/ui/alert-message";
import Loader from "@/core/components/Loader";

const PatientProfile = () => {
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

  // Stats data
  const statsData = [
    {
      icon: FiCalendar,
      label: "Total Appointments",
      value: profileData?.statistics?.total_appointments?.toString() || "0",
      color: "primary",
    },
    {
      icon: FiClock,
      label: "Upcoming Appointments",
      value: profileData?.statistics?.upcoming_appointments?.toString() || "0",
      color: "success",
    },
    {
      icon: FiHeart,
      label: "Treatments Completed",
      value: profileData?.statistics?.completed_appointments?.toString() || "0",
      color: "warning",
    },
  ];

  // Gender options
  const genderOptions = [
    { value: "M", label: "Male" },
    { value: "F", label: "Female" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  if (loading) {
    return <Loader message="Loading your profile... Please wait a moment" />;
  }

  if (!profileData && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Profile Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            We couldn't load your profile data. Please try refreshing the page.
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl transition-all duration-300 hover:bg-primary/90"
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh Profile"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-background rounded-2xl">
      <div className="max-w-6xl mx-auto">
        {/* Success/Error Messages - FIXED */}
        <AnimatePresence mode="wait">
          {success && (
            <AlertMessage
              key="success-message"
              type="success"
              message={success}
              id="success"
            />
          )}
          {error && (
            <AlertMessage
              key="error-message"
              type="error"
              message={error}
              id="error"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <ProfileHeader
          title="My Profile"
          subtitle="Manage your personal information and preferences"
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
          <div className="flex items-start gap-6 mb-8 md:flex-row flex-col md:items-start items-center md:text-left text-center">
            <ProfileAvatar
              imageUrl={currentData?.profile?.profile_image_url}
              name={`${currentData?.profile?.first_name} ${currentData?.profile?.last_name}`}
              onImageUpdate={handleImageUpdate}
              size="xl"
            />

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {currentData?.profile?.first_name &&
                currentData?.profile?.last_name
                  ? `${currentData.profile.first_name} ${currentData.profile.last_name}`
                  : "Complete your profile"}
              </h2>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                  <FiMail className="text-primary text-base flex-shrink-0" />
                  <span className="text-sm md:text-base">
                    {currentData?.email || "No email provided"}
                  </span>
                  {currentData?.email_verified && (
                    <div className="w-2 h-2 bg-success rounded-full" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                  <FiPhone className="text-primary text-base flex-shrink-0" />
                  <span className="text-sm md:text-base">
                    {currentData?.phone || "No phone provided"}
                  </span>
                  {currentData?.phone_verified && (
                    <div className="w-2 h-2 bg-success rounded-full" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <ProfileStats stats={statsData} />
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
              options={genderOptions}
              placeholder="Select Gender"
            />
          </div>

          {/* Emergency Contact */}
          <div className="mt-8 pt-6 border-t border-border">
            <h4 className="text-lg font-semibold text-foreground mb-4">
              Emergency Contact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileField
                label="Contact Name"
                value={currentData?.role_specific_data?.emergency_contact_name}
                isEditing={isEditing}
                onChange={(e) =>
                  handleInputChange(
                    "role_specific_data",
                    "emergency_contact_name",
                    e.target.value
                  )
                }
                placeholder="Enter emergency contact name"
              />

              <ProfileField
                label="Contact Phone"
                type="tel"
                value={currentData?.role_specific_data?.emergency_contact_phone}
                isEditing={isEditing}
                onChange={(e) =>
                  handleInputChange(
                    "role_specific_data",
                    "emergency_contact_phone",
                    e.target.value
                  )
                }
                placeholder="Enter emergency contact phone"
              />
            </div>
          </div>
        </ProfileCard>

        {/* Medical Information - Fixed array display */}
        <ProfileCard
          title="Medical Information"
          icon={FiShield}
          className="mb-6"
          delay={0.5}
        >
          <div className="grid grid-cols-1 gap-6">
            <ProfileField
              label="Medical Conditions"
              type="textarea"
              value={
                Array.isArray(
                  currentData?.role_specific_data?.medical_conditions
                )
                  ? currentData.role_specific_data.medical_conditions.join(", ")
                  : currentData?.role_specific_data?.medical_conditions || ""
              }
              isEditing={isEditing}
              onChange={(e) =>
                handleInputChange(
                  "role_specific_data",
                  "medical_conditions",
                  e.target.value
                )
              }
              placeholder="Enter medical conditions, separated by commas..."
              rows={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileField
                label="Allergies"
                value={
                  Array.isArray(currentData?.role_specific_data?.allergies)
                    ? currentData.role_specific_data.allergies.join(", ")
                    : currentData?.role_specific_data?.allergies || ""
                }
                isEditing={isEditing}
                onChange={(e) =>
                  handleInputChange(
                    "role_specific_data",
                    "allergies",
                    e.target.value
                  )
                }
                placeholder="Enter allergies, separated by commas"
              />

              <ProfileField
                label="Insurance Provider"
                value={currentData?.role_specific_data?.insurance_provider}
                isEditing={isEditing}
                onChange={(e) =>
                  handleInputChange(
                    "role_specific_data",
                    "insurance_provider",
                    e.target.value
                  )
                }
                placeholder="Enter your insurance provider"
              />
            </div>
          </div>
        </ProfileCard>

        {/* Notification Preferences */}
        <ProfileCard title="Notification Preferences" icon={FiBell} delay={0.6}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiMail className="text-primary text-lg" />
                <div>
                  <h4 className="font-medium text-foreground">
                    Email Notifications
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about appointments and health records via
                    email
                  </p>
                </div>
              </div>
              {isEditing ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      currentData?.role_specific_data?.email_notifications ??
                      true
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
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  {currentData?.role_specific_data?.email_notifications
                    ? "Enabled"
                    : "Disabled"}
                </span>
              )}
            </div>
          </div>
        </ProfileCard>
      </div>
    </div>
  );
};

export default PatientProfile;
