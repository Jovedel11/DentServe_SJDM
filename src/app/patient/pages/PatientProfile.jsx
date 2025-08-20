import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiCamera,
  FiEdit3,
  FiSave,
  FiX,
  FiClock,
  FiHeart,
  FiShield,
  FiAward,
} from "react-icons/fi";

/**
 * Profile page component - allows patients to view and edit their profile information
 */
const PatientProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    personalInfo: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@email.com",
      phone: "+1 (555) 123-4567",
      dateOfBirth: "1990-05-15",
      gender: "Male",
      profileImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
      emergencyContact: {
        name: "Jane Doe",
        phone: "+1 (555) 987-6543",
      },
    },
    medicalInfo: {
      medicalHistory: "Regular checkups, no major issues",
      conditions: ["Hypertension"],
      allergies: ["Penicillin", "Latex"],
      currentMedications: ["Aspirin 81mg daily"],
      insuranceProvider: "Health Insurance Co.",
    },
    preferences: {
      preferredLocation: "Downtown Clinic",
      preferredDoctor: "Dr. Martinez",
    },
  });

  const [editedData, setEditedData] = useState(profileData);

  // Mock stats data
  const statsData = [
    {
      icon: FiCalendar,
      label: "Total Appointments",
      value: "24",
      color: "primary",
    },
    {
      icon: FiClock,
      label: "Years as Patient",
      value: "3",
      color: "success",
    },
    {
      icon: FiHeart,
      label: "Treatments Completed",
      value: "8",
      color: "warning",
    },
  ];

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedData(profileData); // Reset to original data if canceling
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      // Here you would call your Supabase update function
      console.log("Updating profile:", editedData);
      setProfileData(editedData);
      setIsEditing(false);
      // Show success toast/notification
    } catch (error) {
      console.error("Error updating profile:", error);
      // Show error toast/notification
    }
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

  const currentData = isEditing ? editedData : profileData;

  const getStatCardClasses = (color) => {
    const baseClasses =
      "flex items-start gap-4 p-4 rounded-lg border-2 border-transparent transition-all duration-300 hover:-translate-y-0.5 md:flex-row flex-col md:items-start items-center text-center md:text-left";

    switch (color) {
      case "primary":
        return `${baseClasses} bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30`;
      case "success":
        return `${baseClasses} bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950 dark:to-green-900 dark:border-green-700`;
      case "warning":
        return `${baseClasses} bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950 dark:to-amber-900 dark:border-amber-700`;
      case "dental":
        return `${baseClasses} bg-gradient-to-br from-accent/10 to-accent/20 border-accent/30`;
      default:
        return baseClasses;
    }
  };

  const getStatIconClasses = (color) => {
    const baseClasses =
      "w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0 md:w-12 md:h-12 w-10 h-10";

    switch (color) {
      case "primary":
        return `${baseClasses} bg-primary`;
      case "success":
        return `${baseClasses} bg-green-600`;
      case "warning":
        return `${baseClasses} bg-amber-600`;
      case "dental":
        return `${baseClasses} bg-accent`;
      default:
        return `${baseClasses} bg-primary`;
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background md:p-6 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8 md:mb-8 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-start gap-6 md:flex-row flex-col md:items-start items-start md:gap-6 gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2 font-sans md:text-3xl text-2xl">
                My Profile
              </h1>
              <p className="text-muted-foreground md:text-base text-sm">
                Manage your personal information and preferences
              </p>
            </div>
            <div className="flex items-start gap-3 md:flex-row flex-row md:w-auto w-full">
              {!isEditing ? (
                <button
                  className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90 md:flex-1 flex-1"
                  onClick={handleEditToggle}
                >
                  <FiEdit3 className="text-base" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-start gap-3 md:flex-row flex-row md:w-auto w-full">
                  <button
                    className="flex items-center gap-2 px-5 py-3 bg-card text-card-foreground border-2 border-border rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:border-muted-foreground hover:bg-muted md:flex-1 flex-1"
                    onClick={handleEditToggle}
                  >
                    <FiX className="text-base" />
                    <span>Cancel</span>
                  </button>
                  <button
                    className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white border-2 border-green-600 rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-green-700 hover:border-green-700 md:flex-1 flex-1"
                    onClick={handleSave}
                  >
                    <FiSave className="text-base" />
                    <span>Save Changes</span>
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
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg md:p-8 p-6">
            <div className="flex items-start gap-6 mb-8 md:flex-row flex-col md:items-start items-center md:text-left text-center md:gap-6 gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 md:w-32 md:h-32 w-28 h-28 md:border-4 border-3">
                  <img
                    src={currentData.personalInfo.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground border-3 border-card flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:scale-105 md:w-10 md:h-10 w-8 h-8 md:border-3 border-2">
                  <FiCamera className="text-base md:text-base text-sm" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-foreground mb-4 md:text-2xl text-xl">
                  {currentData.personalInfo.firstName}{" "}
                  {currentData.personalInfo.lastName}
                </h2>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                    <FiMail className="text-primary text-base flex-shrink-0" />
                    <span className="md:text-base text-sm">
                      {currentData.personalInfo.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground md:justify-start justify-center">
                    <FiPhone className="text-primary text-base flex-shrink-0" />
                    <span className="md:text-base text-sm">
                      {currentData.personalInfo.phone}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4 gap-3">
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
                      <Icon className="md:text-xl text-lg" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-bold text-foreground md:text-2xl text-xl">
                        {stat.value}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground md:text-sm text-xs">
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
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground md:text-xl text-lg">
                <FiUser className="text-primary text-xl flex-shrink-0" />
                Personal Information
              </h3>
            </div>
            <div className="p-6 md:p-6 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-5 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentData.personalInfo.firstName}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "firstName",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData.personalInfo.firstName}
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
                      value={currentData.personalInfo.lastName}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "lastName",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData.personalInfo.lastName}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={currentData.personalInfo.email}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "email",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData.personalInfo.email}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={currentData.personalInfo.phone}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "phone",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData.personalInfo.phone}
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
                      value={currentData.personalInfo.dateOfBirth}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "dateOfBirth",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {new Date(
                        currentData.personalInfo.dateOfBirth
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      value={currentData.personalInfo.gender}
                      onChange={(e) =>
                        handleInputChange(
                          "personalInfo",
                          "gender",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
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
                      {currentData.personalInfo.gender}
                    </span>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-lg font-semibold text-foreground mb-4">
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-5 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Contact Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.personalInfo.emergencyContact.name}
                        onChange={(e) =>
                          handleInputChange(
                            "personalInfo",
                            "emergencyContact.name",
                            e.target.value
                          )
                        }
                        className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData.personalInfo.emergencyContact.name}
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
                        value={currentData.personalInfo.emergencyContact.phone}
                        onChange={(e) =>
                          handleInputChange(
                            "personalInfo",
                            "emergencyContact.phone",
                            e.target.value
                          )
                        }
                        className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData.personalInfo.emergencyContact.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Medical Information */}
          <motion.div
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground md:text-xl text-lg">
                <FiShield className="text-primary text-xl flex-shrink-0" />
                Medical Information
              </h3>
            </div>
            <div className="p-6 md:p-6 p-4">
              <div className="grid grid-cols-1 gap-5 md:gap-5 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Medical History
                  </label>
                  {isEditing ? (
                    <textarea
                      value={currentData.medicalInfo.medicalHistory}
                      onChange={(e) =>
                        handleInputChange(
                          "medicalInfo",
                          "medicalHistory",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 resize-vertical min-h-[80px]"
                      rows="3"
                      placeholder="Describe your medical history..."
                    />
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-start min-h-[48px]">
                      {currentData.medicalInfo.medicalHistory ||
                        "No medical history provided"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-5 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Medical Conditions
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.medicalInfo.conditions.join(", ")}
                        onChange={(e) =>
                          handleArrayChange(
                            "medicalInfo",
                            "conditions",
                            e.target.value
                          )
                        }
                        className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                        placeholder="Separate multiple conditions with commas"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData.medicalInfo.conditions.length > 0
                          ? currentData.medicalInfo.conditions.join(", ")
                          : "None reported"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Allergies
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.medicalInfo.allergies.join(", ")}
                        onChange={(e) =>
                          handleArrayChange(
                            "medicalInfo",
                            "allergies",
                            e.target.value
                          )
                        }
                        className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                        placeholder="Separate multiple allergies with commas"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData.medicalInfo.allergies.length > 0
                          ? currentData.medicalInfo.allergies.join(", ")
                          : "None reported"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Current Medications
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.medicalInfo.currentMedications.join(
                          ", "
                        )}
                        onChange={(e) =>
                          handleArrayChange(
                            "medicalInfo",
                            "currentMedications",
                            e.target.value
                          )
                        }
                        className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                        placeholder="Separate multiple medications with commas"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData.medicalInfo.currentMedications.length > 0
                          ? currentData.medicalInfo.currentMedications.join(
                              ", "
                            )
                          : "None reported"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground/80">
                      Insurance Provider
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentData.medicalInfo.insuranceProvider}
                        onChange={(e) =>
                          handleInputChange(
                            "medicalInfo",
                            "insuranceProvider",
                            e.target.value
                          )
                        }
                        className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                      />
                    ) : (
                      <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                        {currentData.medicalInfo.insuranceProvider}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Preferences */}
          <motion.div
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-foreground md:text-xl text-lg">
                <FiHeart className="text-primary text-xl flex-shrink-0" />
                Preferences & Settings
              </h3>
            </div>
            <div className="p-6 md:p-6 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-5 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Preferred Location
                  </label>
                  {isEditing ? (
                    <select
                      value={currentData.preferences.preferredLocation}
                      onChange={(e) =>
                        handleInputChange(
                          "preferences",
                          "preferredLocation",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    >
                      <option value="">No preference</option>
                      <option value="Downtown Clinic">Downtown Clinic</option>
                      <option value="Uptown Medical Center">
                        Uptown Medical Center
                      </option>
                      <option value="Westside Dental">Westside Dental</option>
                      <option value="Eastside Health Hub">
                        Eastside Health Hub
                      </option>
                    </select>
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData.preferences.preferredLocation ||
                        "No preference"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground/80">
                    Preferred Doctor
                  </label>
                  {isEditing ? (
                    <select
                      value={currentData.preferences.preferredDoctor}
                      onChange={(e) =>
                        handleInputChange(
                          "preferences",
                          "preferredDoctor",
                          e.target.value
                        )
                      }
                      className="px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    >
                      <option value="">No preference</option>
                      <option value="Dr. Martinez">Dr. Martinez</option>
                      <option value="Dr. Smith">Dr. Smith</option>
                      <option value="Dr. Johnson">Dr. Johnson</option>
                      <option value="Dr. Brown">Dr. Brown</option>
                      <option value="Dr. Wilson">Dr. Wilson</option>
                    </select>
                  ) : (
                    <span className="py-3 text-base text-foreground flex items-center min-h-[48px]">
                      {currentData.preferences.preferredDoctor ||
                        "No preference"}
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
