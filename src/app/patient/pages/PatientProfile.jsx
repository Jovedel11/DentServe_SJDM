import React, { useState, useEffect } from "react";
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
} from "react-icons/fi";
import { useAuth } from "@/auth/context/AuthProvider";
import ProfileUpload from "@/app/shared/components/profile-upload";
// import WelcomeToast from "../components/welcome-toast";
import Loader from "@/core/components/Loader";

const PatientProfile = () => {
  const { profile, handleRefreshProfile, updateProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  // const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  // const [availableClinics, setAvailableClinics] = useState([]);
  // const [availableDoctors, setAvailableDoctors] = useState([]);
  const [profileData, setProfileData] = useState({});
  const [editedData, setEditedData] = useState({});

  // Load initial data
  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    if (profileData) setEditedData(profileData);
  }, [profileData]);

  // Check if user is new and show welcome toast
  // useEffect(() => {
  //   const checkNewUser = () => {
  //     const hasCompletedProfile =
  //       profileData.personalInfo.firstName &&
  //       profileData.personalInfo.lastName &&
  //       profileData.personalInfo.phone;

  // if (!hasCompletedProfile) {
  //   setShowWelcomeToast(true);
  // }
  //   };

  //   if (!loading) {
  //     checkNewUser();
  //   }
  // }, [loading, profileData]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      setProfileData(profile);
      // setAvailableClinics([
      //   {
      //     id: "clinic-uuid-1",
      //     name: "Downtown Dental Care",
      //     address: "123 Ayala Avenue, Makati City",
      //     city: "Makati",
      //     phone: "+63 2 8123 4567",
      //   },
      //   {
      //     id: "clinic-uuid-2",
      //     name: "Uptown Medical Center",
      //     address: "456 EDSA, Quezon City",
      //     city: "Quezon City",
      //     phone: "+63 2 8234 5678",
      //   },
      //   {
      //     id: "clinic-uuid-3",
      //     name: "Westside Dental Clinic",
      //     address: "789 Roxas Blvd, Manila",
      //     city: "Manila",
      //     phone: "+63 2 8345 6789",
      //   },
      // ]);

      // setAvailableDoctors([
      //   {
      //     id: "doctor-uuid-1",
      //     first_name: "Dr. Maria",
      //     last_name: "Santos",
      //     specialization: "General Dentistry",
      //     consultation_fee: 1500.0,
      //     profile_image_url:
      //       "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&h=120&fit=crop&crop=face",
      //     rating: 4.8,
      //   },
      //   {
      //     id: "doctor-uuid-2",
      //     first_name: "Dr. Jose",
      //     last_name: "Garcia",
      //     specialization: "Orthodontics",
      //     consultation_fee: 2000.0,
      //     profile_image_url:
      //       "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&fit=crop&crop=face",
      //     rating: 4.9,
      //   },
      //   {
      //     id: "doctor-uuid-3",
      //     first_name: "Dr. Anna",
      //     last_name: "Cruz",
      //     specialization: "Oral Surgery",
      //     consultation_fee: 2500.0,
      //     profile_image_url:
      //       "https://images.unsplash.com/photo-1594824475325-87b7c6c10b46?w=120&h=120&fit=crop&crop=face",
      //     rating: 4.7,
      //   },
      // ]);
    } catch (error) {
      console.error("Error loading profile:", error);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Mock save delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real implementation:
      // 1. Update user_profiles table
      // 2. Update or insert patient_profiles table
      // 3. Handle preferred_doctors array update

      setProfileData(editedData);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedData(profileData);
    }
    setIsEditing(!isEditing);
    setError(null);
  };

  const handleInputChange = (section, field, value) => {
    if (field.includes(".")) {
      const [parentField, childField] = field.split(".");
      setEditedData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [parentField]: {
            ...prev[section][parentField],
            [childField]: value,
          },
        },
      }));
    } else {
      setEditedData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    }
  };

  const handleArrayChange = (section, field, value) => {
    const array = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    setEditedData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: array,
      },
    }));
  };

  const handleMultiSelectChange = (section, field, selectedIds) => {
    setEditedData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: selectedIds,
      },
    }));
  };

  const currentData = isEditing ? editedData : profileData;

  const statsData = [
    {
      icon: FiCalendar,
      label: "Total Appointments",
      value: currentData?.statistics?.total_appointments.toString(),
      color: "primary",
    },
    {
      icon: FiClock,
      label: "Upcoming Appointments",
      value: currentData?.statistics?.upcoming_appointments.toString(),
      color: "success",
    },
    {
      icon: FiHeart,
      label: "Treatments Completed",
      value: currentData?.statistics?.completed_appointments.toString(),
      color: "warning",
    },
  ];

  const getStatCardClasses = (color) => {
    const baseClasses =
      "flex items-start gap-4 p-4 rounded-xl border-2 border-transparent transition-all duration-300 hover:-translate-y-0.5 md:flex-row flex-col md:items-start items-center text-center md:text-left";

    switch (color) {
      case "primary":
        return `${baseClasses} bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30`;
      case "success":
        return `${baseClasses} bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950 dark:to-green-900 dark:border-green-700`;
      case "warning":
        return `${baseClasses} bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950 dark:to-amber-900 dark:border-amber-700`;
      default:
        return baseClasses;
    }
  };

  const getStatIconClasses = (color) => {
    const baseClasses =
      "w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0";

    switch (color) {
      case "primary":
        return `${baseClasses} bg-primary`;
      case "success":
        return `${baseClasses} bg-green-600`;
      case "warning":
        return `${baseClasses} bg-amber-600`;
      default:
        return `${baseClasses} bg-primary`;
    }
  };

  // const getSelectedClinicName = () => {
  //   const clinic = availableClinics.find(
  //     (c) => c.id === currentData.preferences.preferredClinicId
  //   );
  //   return clinic ? clinic.name : "No preference";
  // };

  // const getSelectedDoctorNames = () => {
  //   const selectedDoctors = availableDoctors.filter((d) =>
  //     currentData.preferences.preferredDoctorIds.includes(d.id)
  //   );
  //   return selectedDoctors.length > 0
  //     ? selectedDoctors.map((d) => `${d.first_name} ${d.last_name}`).join(", ")
  //     : "No preference";
  // };

  if (loading) {
    return <Loader message={"Loading your profile... Please wait a moment"} />;
  }

  return (
    <div className="min-h-screen p-6 bg-background md:p-6 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Toast */}
        {/* <WelcomeToast
          isVisible={showWelcomeToast}
          onClose={() => setShowWelcomeToast(false)}
        /> */}

        {/* Success/Error Messages */}
        {success && (
          <motion.div
            className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FiCheckCircle className="text-xl flex-shrink-0" />
            <span className="font-medium">Profile updated successfully!</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 text-red-800 dark:bg-red-950 dark:border-red-700 dark:text-red-200"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FiAlertCircle className="text-xl flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-start gap-6 md:flex-row flex-col">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2 font-sans">
                My Profile
              </h1>
              <p className="text-muted-foreground">
                Manage your personal information and preferences
              </p>
            </div>
            <div className="flex items-start gap-3 md:w-auto w-full">
              {!isEditing ? (
                <button
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed md:flex-initial flex-1"
                  onClick={handleEditToggle}
                  disabled={saving}
                >
                  <FiEdit3 className="text-base" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-start gap-3 md:w-auto w-full">
                  <button
                    className="flex items-center gap-2 px-6 py-3 bg-card text-card-foreground border-2 border-border rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:border-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed md:flex-initial flex-1"
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
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="flex items-start gap-6 mb-8 md:flex-row flex-col md:items-start items-center md:text-left text-center">
              <div className="relative flex-shrink-0">
                <ProfileUpload
                  currentImageUrl={currentData?.profile?.profile_image_url}
                  onImageUpdate={async (newImageUrl) => {
                    //using hook
                    const result = await updateProfile(
                      { profile_image_url: newImageUrl },
                      {},
                      user?.id
                    );
                    if (result.success) {
                      setProfileData((prev) => ({
                        ...prev,
                        profile: {
                          ...prev.profile,
                          profile_image_url: newImageUrl,
                        },
                      }));
                    } else {
                      setError(
                        result.error || "Failed to update profile image"
                      );
                    }
                  }}
                ></ProfileUpload>
                <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground border-4 border-card flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:scale-105 shadow-lg">
                  <FiCamera className="text-base" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {currentData.profile.first_name &&
                  currentData.profile.last_name
                    ? `${currentData.profile.first_name} ${currentData.profile.last_name}`
                    : "Complete your profile"}
                </h2>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                    <FiMail className="text-primary text-base flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {currentData?.email || "No email provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                    <FiPhone className="text-primary text-base flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {currentData?.phone || "No phone provided"}
                    </span>
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
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="px-6 py-6 bg-muted/30 border-b border-border">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <FiUser className="text-primary text-xl flex-shrink-0" />
                Personal Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentData.profile.first_name}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "firstName",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Enter your first name"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData.profile.first_name || "Not provided"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentData?.profile?.last_name}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "lastName",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Enter your last name"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData?.profile?.last_name || "Not provided"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Email Address
                  </label>
                  <span className="py-3 text-base text-foreground flex items-center min-h-[48px] opacity-60">
                    {currentData?.email || "Not provided"}
                    <span className="ml-2 text-xs text-muted-foreground">
                      (managed by account)
                    </span>
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={currentData?.phone}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "phone",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData?.phone || "Not provided"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Date of Birth
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={currentData?.profile?.date_of_birth}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "dateOfBirth",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData?.profile?.date_of_birth
                        ? new Date(
                            currentData?.profile?.date_of_birth
                          ).toLocaleDateString()
                        : "Not provided"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      value={currentData?.profile?.gender}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "gender",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
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
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-lg font-semibold text-foreground mb-4">
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Contact Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={
                          currentData?.role_specific_data
                            ?.emergency_contact_name
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "personalInfo",
                            "emergencyContact.name",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
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
                    <label className="text-sm font-semibold text-foreground/80">
                      Contact Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={
                          currentData?.role_specific_data
                            ?.emergency_contact_phone
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "personalInfo",
                            "emergencyContact.phone",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
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
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="px-6 py-6 bg-muted/30 border-b border-border">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <FiShield className="text-primary text-xl flex-shrink-0" />
                Medical Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Medical Conditions
                  </label>
                  {isEditing ? (
                    <textarea
                      value={
                        currentData?.role_specific_data?.medical_conditions
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "medicalInfo",
                          "medicalHistory",
                          e.target.value
                        )
                      }
                      className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-vertical min-h-[100px]"
                      rows="4"
                      placeholder="Describe your medical history..."
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-start min-h-[48px]">
                      {currentData?.role_specific_data?.medical_conditions ||
                        "No medical history provided"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Allergies
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData?.role_specific_data?.allergies.join(
                          ", "
                        )}
                        onChange={(e) =>
                          handleArrayChange(
                            "medicalInfo",
                            "allergies",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        placeholder="Separate multiple allergies with commas"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData?.role_specific_data?.allergies.length > 0
                          ? currentData?.role_specific_data?.allergies.join(
                              ", "
                            )
                          : "None reported"}
                      </span>
                    )}
                  </div> */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Insurance Provider
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={
                          currentData?.role_specific_data?.insurance_provider
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "medicalInfo",
                            "insuranceProvider",
                            e.target.value
                          )
                        }
                        className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
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

          {/* Preferences & Settings */}
          <motion.div
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="px-6 py-6 bg-muted/30 border-b border-border">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <FiHeart className="text-primary text-xl flex-shrink-0" />
                Preferences & Settings
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Appointment Preferences */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">
                    Appointment Preferences
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground/80">
                        Preferred Clinic
                      </label>
                      {isEditing ? (
                        <select
                          value={currentData.preferences.preferredClinicId}
                          onChange={(e) =>
                            handleInputChange(
                              "preferences",
                              "preferredClinicId",
                              e.target.value
                            )
                          }
                          className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        >
                          <option value="">No preference</option>
                          {availableClinics.map((clinic) => (
                            <option key={clinic.id} value={clinic.id}>
                              {clinic.name} - {clinic.city}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                          {getSelectedClinicName()}
                        </span>
                      )}
                    </div> */}
                    {/* <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground/80">
                        Preferred Doctors
                      </label>
                      {isEditing ? (
                        <div className="space-y-2">
                          {availableDoctors.map((doctor) => (
                            <label
                              key={doctor.id}
                              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                checked={currentData.preferences.preferredDoctorIds.includes(
                                  doctor.id
                                )}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  const currentIds =
                                    currentData.preferences.preferredDoctorIds;
                                  const newIds = isChecked
                                    ? [...currentIds, doctor.id]
                                    : currentIds.filter(
                                        (id) => id !== doctor.id
                                      );
                                  handleMultiSelectChange(
                                    "preferences",
                                    "preferredDoctorIds",
                                    newIds
                                  );
                                }}
                                className="w-4 h-4 text-primary bg-input border-2 border-border rounded focus:ring-primary/10 focus:ring-4"
                              />
                              <div className="flex items-center gap-2">
                                <img
                                  src={doctor.profile_image_url}
                                  alt={`${doctor.first_name} ${doctor.last_name}`}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                                <span className="text-sm font-medium">
                                  {doctor.first_name} {doctor.last_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {doctor.specialization}
                                </span>
                                <div className="flex items-center gap-1">
                                  <FiStar className="w-3 h-3 text-amber-400 fill-current" />
                                  <span className="text-xs text-muted-foreground">
                                    {doctor.rating}
                                  </span>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                          {getSelectedDoctorNames()}
                        </span>
                      )}
                    </div> */}
                  </div>
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
