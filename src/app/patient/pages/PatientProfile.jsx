import React, { useState, useEffect } from "react";
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
  FiMapPin,
  FiUsers,
} from "react-icons/fi";

import { useProfileManager } from "@/app/shared/hook/useProfileManager";
import { ProfileHeader } from "@/app/shared/profile/profile-header";
import { ProfileCard } from "@/app/shared/profile/profile-card";
import { ProfileField } from "@/app/shared/profile/profile-field";
import { ProfileAvatar } from "@/app/shared/profile/profile-avatar";
import { ProfileStats } from "@/app/shared/profile/profile-stats";
import { AlertMessage } from "@/core/components/ui/alert-message";
import { FileSizeWarning } from "@/utils/file-size-warning";
import Loader from "@/core/components/Loader";
import { supabase } from "@/lib/supabaseClient";

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

  // ✅ NEW: State for doctors and location
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctors, setSelectedDoctors] = useState([]);

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

  // ✅ Fetch available doctors
  useEffect(() => {
    if (profileData) {
      fetchAvailableDoctors();

      // Initialize selected doctors from profile data
      if (profileData?.role_specific_data?.preferred_doctors) {
        setSelectedDoctors(profileData.role_specific_data.preferred_doctors);
      }
    }
  }, [profileData]);

  const fetchAvailableDoctors = async () => {
    try {
      setLoadingDoctors(true);

      // Query doctors directly with RLS (patients can view available doctors)
      const { data, error } = await supabase
        .from("doctors")
        .select(
          `
          id,
          first_name,
          last_name,
          specialization,
          rating,
          total_reviews,
          image_url,
          consultation_fee
        `
        )
        .eq("is_available", true)
        .order("rating", { ascending: false })
        .order("first_name", { ascending: true });

      if (error) throw error;

      setAvailableDoctors(data || []);
    } catch (error) {
      console.error("❌ Error fetching doctors:", error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // ✅ Handle doctor selection
  const handleDoctorToggle = (doctorId) => {
    setSelectedDoctors((prev) => {
      const newSelection = prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId];

      // Update currentData to sync with form
      handleInputChange(
        "role_specific_data",
        "preferred_doctors",
        newSelection
      );
      return newSelection;
    });
  };

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
        {/* Success/Error Messages */}
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
            <FileSizeWarning />

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

        {/* Medical Information */}
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

        {/* ✅ NEW: Preferred Doctors */}
        <ProfileCard
          title="Preferred Doctors"
          icon={FiUsers}
          className="mb-6"
          delay={0.6}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select doctors you prefer to consult with. This helps us
              prioritize your preferred doctors when booking appointments.
            </p>

            {loadingDoctors ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                {availableDoctors.map((doctor) => {
                  const isSelected = selectedDoctors.includes(doctor.id);
                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => handleDoctorToggle(doctor.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      {doctor.image_url ? (
                        <img
                          src={doctor.image_url}
                          alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <FiUsers className="text-primary text-xl" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-foreground truncate">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </h5>
                        <p className="text-sm text-muted-foreground truncate">
                          {doctor.specialization}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <FiHeart className="text-yellow-500 text-xs" />
                            <span className="text-xs font-medium">
                              {doctor.rating?.toFixed(1) || "N/A"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({doctor.total_reviews || 0} reviews)
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-primary-foreground"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDoctors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedDoctors.map((doctorId) => {
                      const doctor = availableDoctors.find(
                        (d) => d.id === doctorId
                      );
                      if (!doctor) return null;
                      return (
                        <div
                          key={doctor.id}
                          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20"
                        >
                          {doctor.image_url ? (
                            <img
                              src={doctor.image_url}
                              alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <FiUsers className="text-primary text-xl" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-foreground truncate">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </h5>
                            <p className="text-sm text-muted-foreground truncate">
                              {doctor.specialization}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <FiHeart className="text-yellow-500 text-xs" />
                                <span className="text-xs font-medium">
                                  {doctor.rating?.toFixed(1) || "N/A"}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ({doctor.total_reviews || 0} reviews)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 bg-muted/20 rounded-xl border border-border">
                    <FiUsers className="text-4xl text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No preferred doctors selected. Click edit to choose your
                      preferred doctors.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ProfileCard>

        {/* Notification Preferences */}
        <ProfileCard title="Notification Preferences" icon={FiBell} delay={0.8}>
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
