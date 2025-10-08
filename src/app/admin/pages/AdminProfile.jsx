import React from "react";
import { AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

import { useProfileManager } from "@/app/shared/hook/useProfileManager";
import { ProfileHeader } from "@/app/shared/profile/profile-header";
import { ProfileCard } from "@/app/shared/profile/profile-card";
import { ProfileField } from "@/app/shared/profile/profile-field";
import { AlertMessage } from "@/core/components/ui/alert-message";
import { useIsMobile } from "@/core/hooks/use-mobile";
import Loader from "@/core/components/Loader";

const AdminProfile = () => {
  const isMobile = useIsMobile();

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
  } = useProfileManager();

  if (loading) {
    return <Loader message="Loading admin profile..." />;
  }

  if (!profileData && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Admin Profile Not Found
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Unable to load your admin profile. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const firstName = currentData?.profile?.first_name || "";
    const lastName = currentData?.profile?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "A";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`p-4 ${isMobile ? "pb-20" : "md:p-6 lg:p-8"}`}>
        <div className="max-w-4xl mx-auto">
          {/* Success/Error Messages */}
          <AnimatePresence>
            <AlertMessage type="success" message={success} />
            <AlertMessage type="error" message={error} />
          </AnimatePresence>

          {/* Header */}
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div
              className={`flex ${
                isMobile ? "flex-col gap-4" : "items-center justify-between"
              }`}
            >
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                  Admin Profile
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Manage your administrative account settings
                </p>
              </div>

              <div
                className={`flex items-center gap-2 ${
                  isMobile ? "justify-end" : ""
                } flex-shrink-0`}
              >
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  <Shield
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {!isMobile && "Refresh"}
                </button>

                {!isEditing ? (
                  <button
                    onClick={() => {
                      console.log("Edit Profile clicked");
                      handleEditToggle();
                    }}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        console.log("Cancel clicked");
                        handleEditToggle();
                      }}
                      disabled={saving}
                      className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        console.log("Save Changes clicked");
                        console.log("Current data:", currentData);
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave();
                      }}
                      disabled={saving}
                      type="button"
                      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Profile Completion Progress */}
            {profileCompletion < 100 && (
              <div className="mt-4 p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info
                    className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs md:text-sm font-medium text-blue-900 dark:text-blue-100">
                        Profile Completion
                      </span>
                      <span className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400">
                        {profileCompletion}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Overview Card */}
          <div className="bg-card border rounded-lg p-4 md:p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow mb-6 md:mb-8">
            <div
              className={`flex ${
                isMobile ? "flex-col items-center text-center" : "items-center"
              } gap-4 md:gap-6`}
            >
              {/* Avatar with Initials */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground">
                    {getInitials()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 bg-green-500 rounded-full border-2 md:border-4 border-card flex items-center justify-center">
                  <Shield size={isMobile ? 12 : 14} className="text-white" />
                </div>
              </div>

              {/* User Info */}
              <div className={`flex-1 min-w-0 ${isMobile ? "" : "text-left"}`}>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1 md:mb-2 truncate">
                  {currentData?.profile?.first_name &&
                  currentData?.profile?.last_name
                    ? `${currentData.profile.first_name} ${currentData.profile.last_name}`
                    : "Complete your profile"}
                </h2>

                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-1">
                  <Shield size={14} className="flex-shrink-0" />
                  <span className="font-medium">System Administrator</span>
                </div>

                <div className="space-y-1 mt-2 md:mt-3">
                  <div
                    className={`flex items-center gap-2 text-xs md:text-sm ${
                      isMobile ? "justify-center" : ""
                    }`}
                  >
                    <Mail
                      size={14}
                      className="text-muted-foreground flex-shrink-0"
                    />
                    <span className="text-foreground truncate">
                      {currentData?.email}
                    </span>
                    {currentData?.email_verified && (
                      <CheckCircle
                        size={14}
                        className="text-green-600 flex-shrink-0"
                      />
                    )}
                  </div>

                  {currentData?.phone && (
                    <div
                      className={`flex items-center gap-2 text-xs md:text-sm ${
                        isMobile ? "justify-center" : ""
                      }`}
                    >
                      <Phone
                        size={14}
                        className="text-muted-foreground flex-shrink-0"
                      />
                      <span className="text-foreground">
                        {currentData.phone}
                      </span>
                      {currentData?.phone_verified && (
                        <CheckCircle
                          size={14}
                          className="text-green-600 flex-shrink-0"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Account Status Badge */}
              <div className={`${isMobile ? "w-full mt-2" : ""}`}>
                <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs md:text-sm font-medium text-green-700 dark:text-green-400 whitespace-nowrap">
                    Active Account
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <ProfileCard
            title="Personal Information"
            icon={User}
            className="mb-6"
            delay={0.2}
          >
            <div
              className={`grid ${
                isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              } gap-4 md:gap-6`}
            >
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
                placeholder="+63 XXX XXX XXXX"
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

          {/* Account Security Info */}
          <div className="bg-muted/30 border border-dashed rounded-lg p-4 md:p-6">
            <div className="flex items-start gap-3">
              <Shield className="text-primary flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">
                  Account Security
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-3">
                  Your account has administrator privileges. Keep your
                  information up to date.
                </p>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border rounded text-xs">
                    <CheckCircle size={12} className="text-green-600" />
                    <span>Email Verified</span>
                  </div>
                  {currentData?.phone_verified && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border rounded text-xs">
                      <CheckCircle size={12} className="text-green-600" />
                      <span>Phone Verified</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border rounded text-xs">
                    <Shield size={12} className="text-primary" />
                    <span>Admin Access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
