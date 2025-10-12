import React, { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiUsers,
  FiDollarSign,
  FiSettings,
  FiPlus,
  FiTrash2,
  FiSave,
  FiClock,
} from "react-icons/fi";

import { useProfileManager } from "@/app/shared/hook/useProfileManager";
import { ProfileHeader } from "@/app/shared/profile/profile-header";
import { ProfileCard } from "@/app/shared/profile/profile-card";
import { ProfileField } from "@/app/shared/profile/profile-field";
import { ProfileAvatar } from "@/app/shared/profile/profile-avatar";
import { ClinicAvatar } from "@/app/shared/profile/clinic-avatar";
import { DoctorAvatar } from "@/app/shared/profile/doctor-avatar";
import { AlertMessage } from "@/core/components/ui/alert-message";
import { FileSizeWarning } from "@/utils/file-size-warning";
import Loader from "@/core/components/Loader";
import { FaBuilding } from "react-icons/fa";

const StaffProfile = () => {
  const {
    profileData,
    currentData,
    editedData,
    profileCompletion,
    isEditing,
    saving,
    refreshing,
    loading,
    error,
    success,
    handleRefresh,
    handleInputChange,
    handleArrayUpdate,
    handleSave,
    handleEditToggle,
    handleImageUpdate,
    handleClinicImageUpdate,
    handleDoctorImageUpdate,
    services,
    doctors,
    clinicId,
  } = useProfileManager({
    enableClinicManagement: true,
    enableServiceManagement: true,
    enableDoctorManagement: true,
  });

  const [activeSection, setActiveSection] = useState("profile");

  const isDataLoading =
    loading ||
    profileData?._loading?.clinic ||
    profileData?._loading?.services ||
    profileData?._loading?.doctors;

  // Gender options
  const genderOptions = [
    { value: "M", label: "Male" },
    { value: "F", label: "Female" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  // Position options
  const positionOptions = [
    { value: "Receptionist", label: "Receptionist" },
    { value: "Dental Assistant", label: "Dental Assistant" },
    { value: "Dental Hygienist", label: "Dental Hygienist" },
    { value: "Office Manager", label: "Office Manager" },
    { value: "Billing Specialist", label: "Billing Specialist" },
    { value: "Other", label: "Other" },
  ];

  // Department options
  const departmentOptions = [
    { value: "Front Office", label: "Front Office" },
    { value: "Clinical", label: "Clinical" },
    { value: "Administration", label: "Administration" },
    { value: "Management", label: "Management" },
  ];

  // Service category options
  const serviceCategoryOptions = [
    { value: "General Dentistry", label: "General Dentistry" },
    { value: "Cosmetic Dentistry", label: "Cosmetic Dentistry" },
    { value: "Orthodontics", label: "Orthodontics" },
    { value: "Oral Surgery", label: "Oral Surgery" },
    { value: "Pediatric Dentistry", label: "Pediatric Dentistry" },
    { value: "Periodontics", label: "Periodontics" },
    { value: "Endodontics", label: "Endodontics" },
    { value: "Prosthodontics", label: "Prosthodontics" },
  ];

  // Doctor specialization options
  const specializationOptions = [
    { value: "General Dentistry", label: "General Dentistry" },
    { value: "Orthodontist", label: "Orthodontist" },
    { value: "Oral Surgeon", label: "Oral Surgeon" },
    { value: "Pediatric Dentist", label: "Pediatric Dentist" },
    { value: "Periodontist", label: "Periodontist" },
    { value: "Endodontist", label: "Endodontist" },
    { value: "Prosthodontist", label: "Prosthodontist" },
    { value: "Cosmetic Dentist", label: "Cosmetic Dentist" },
  ];

  // Days of the week
  const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  // 🔥 **FIXED: Service operations with useCallback to prevent re-renders**
  const handleAddService = useCallback(
    (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      console.log("🔧 Adding new service");

      const newService = {
        id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: "",
        description: "",
        category: "General Dentistry",
        duration_minutes: 60,
        min_price: 1000,
        max_price: 2000,
        is_active: true,
        requires_multiple_visits: false,
        typical_visit_count: 1,
        requires_consultation: true,
        priority: 10,
        _action: "create",
      };

      const currentServices = editedData?.services_data || [];
      const updatedServices = [...currentServices, newService];

      console.log("🔧 Updated services:", updatedServices.length);
      handleInputChange("services_data", "", updatedServices);
    },
    [editedData?.services_data, handleInputChange]
  );

  const handleRemoveService = useCallback(
    (index, e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      console.log("🗑️ Removing service at index:", index);

      const currentServices = editedData?.services_data || [];
      const serviceToRemove = currentServices[index];

      // If it's an existing service (has a real ID), mark for deletion
      if (
        serviceToRemove &&
        !serviceToRemove.id?.toString().startsWith("new_")
      ) {
        const updatedServices = currentServices.map((service, i) =>
          i === index ? { ...service, _action: "delete" } : service
        );
        handleInputChange("services_data", "", updatedServices);
      } else {
        // If it's a new service, just remove it from the array
        const updatedServices = currentServices.filter((_, i) => i !== index);
        handleInputChange("services_data", "", updatedServices);
      }

      console.log("🗑️ Services after removal:", currentServices.length - 1);
    },
    [editedData?.services_data, handleInputChange]
  );

  // 🔥 **FIXED: Doctor operations with proper event handling**
  const handleAddDoctor = useCallback(
    (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      console.log("👨‍⚕️ Adding new doctor");

      // ✅ Generate a temporary license number
      const tempLicenseNumber = `TEMP-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;

      const newDoctor = {
        id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        license_number: tempLicenseNumber, // ✅ FIX: Use temp license instead of empty string
        specialization: "General Dentistry",
        first_name: "",
        last_name: "",
        education: "",
        experience_years: 0,
        bio: "",
        consultation_fee: 1500,
        is_available: true,
        image_url: "",
        languages_spoken: ["English", "Tagalog"],
        certifications: null,
        awards: [],
        _action: "create",
      };

      const currentDoctors = editedData?.doctors_data || [];
      const updatedDoctors = [...currentDoctors, newDoctor];

      console.log("👨‍⚕️ Updated doctors:", updatedDoctors.length);
      handleInputChange("doctors_data", "", updatedDoctors);
    },
    [editedData?.doctors_data, handleInputChange]
  );

  const handleRemoveDoctor = useCallback(
    (index, e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      console.log("🗑️ Removing doctor at index:", index);

      const currentDoctors = editedData?.doctors_data || [];
      const doctorToRemove = currentDoctors[index];

      // If it's an existing doctor (has a real ID), mark for deletion
      if (doctorToRemove && !doctorToRemove.id?.toString().startsWith("new_")) {
        const updatedDoctors = currentDoctors.map((doctor, i) =>
          i === index ? { ...doctor, _action: "delete" } : doctor
        );
        handleInputChange("doctors_data", "", updatedDoctors);
      } else {
        // If it's a new doctor, just remove it from the array
        const updatedDoctors = currentDoctors.filter((_, i) => i !== index);
        handleInputChange("doctors_data", "", updatedDoctors);
      }

      console.log("🗑️ Doctors after removal:", currentDoctors.length - 1);
    },
    [editedData?.doctors_data, handleInputChange]
  );

  // 🔥 **NEW: Operating Hours Handlers**
  const handleOperatingHoursChange = useCallback(
    (day, field, value) => {
      const currentHours = currentData?.clinic_data?.operating_hours || {};

      const updatedHours = {
        ...currentHours,
        [day]: {
          ...(currentHours[day] || {}),
          [field]: value,
        },
      };

      handleInputChange("clinic_data", "operating_hours", updatedHours);
    },
    [currentData?.clinic_data?.operating_hours, handleInputChange]
  );

  const getOperatingHours = (day) => {
    const hours = currentData?.clinic_data?.operating_hours?.[day];
    return {
      isOpen: hours?.isOpen ?? true,
      open: hours?.open || "09:00",
      close: hours?.close || "17:00",
    };
  };

  if (loading) {
    return <Loader message="Loading staff profile... Please wait a moment" />;
  }

  if (isDataLoading && activeSection !== "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Loader message={`Loading ${activeSection} data... Please wait`} />
      </div>
    );
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
      <div className="max-w-7xl mx-auto">
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
          title="Staff Profile & Clinic Management"
          subtitle="Manage your profile, clinic information, services, and doctors"
          isEditing={isEditing}
          onEdit={handleEditToggle}
          onSave={handleSave}
          onCancel={handleEditToggle}
          onRefresh={handleRefresh}
          saving={saving}
          refreshing={refreshing}
          completion={profileCompletion}
        />

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "profile", label: "My Profile", icon: FiUser },
                { id: "clinic", label: "Clinic Info", icon: FaBuilding },
                { id: "services", label: "Services", icon: FiDollarSign },
                { id: "doctors", label: "Doctors", icon: FiUsers },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeSection === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Profile Section */}
        {activeSection === "profile" && (
          <>
            {/* Profile Overview */}
            <ProfileCard className="mb-8" delay={0.2}>
              <div className="flex items-start gap-6 mb-6 md:flex-row flex-col md:items-start items-center md:text-left text-center">
                <ProfileAvatar
                  imageUrl={currentData?.profile?.profile_image_url}
                  name={`${currentData?.profile?.first_name} ${currentData?.profile?.last_name}`}
                  onImageUpdate={handleImageUpdate}
                  size="xl"
                />
                <FileSizeWarning />

                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {currentData?.profile?.first_name &&
                    currentData?.profile?.last_name
                      ? `${currentData.profile.first_name} ${currentData.profile.last_name}`
                      : "Complete your profile"}
                  </h2>

                  <div className="flex items-center gap-2 mb-4">
                    <FiSettings className="text-primary text-lg" />
                    <span className="text-primary font-medium">
                      {currentData?.role_specific_data?.position ||
                        "Staff Member"}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>Email: {currentData?.email}</p>
                    <p>Phone: {currentData?.phone || "Not provided"}</p>
                    <p>
                      Department:{" "}
                      {currentData?.role_specific_data?.department ||
                        "Not specified"}
                    </p>
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
                    handleInputChange(
                      "profile",
                      "date_of_birth",
                      e.target.value
                    )
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

                <ProfileField
                  label="Position"
                  type="select"
                  value={currentData?.role_specific_data?.position}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange(
                      "role_specific_data",
                      "position",
                      e.target.value
                    )
                  }
                  options={positionOptions}
                  placeholder="Select Position"
                />

                <ProfileField
                  label="Department"
                  type="select"
                  value={currentData?.role_specific_data?.department}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange(
                      "role_specific_data",
                      "department",
                      e.target.value
                    )
                  }
                  options={departmentOptions}
                  placeholder="Select Department"
                />
              </div>
            </ProfileCard>
          </>
        )}

        {/* Clinic Section */}
        {activeSection === "clinic" && (
          <>
            <ProfileCard
              title="Clinic Information"
              icon={FaBuilding}
              className="mb-6"
              delay={0.2}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileField
                  label="Clinic Name"
                  value={currentData?.clinic_data?.name}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange("clinic_data", "name", e.target.value)
                  }
                  placeholder="Enter clinic name"
                  required
                />

                {/* Clinic Image Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-muted-foreground">
                    Clinic Image
                  </label>
                  <ClinicAvatar
                    clinicId={clinicId}
                    imageUrl={currentData?.clinic_data?.image_url}
                    clinicName={currentData?.clinic_data?.name}
                    onImageUpdate={handleClinicImageUpdate}
                    size="xxl"
                    editable={true}
                  />
                  <FileSizeWarning />
                </div>

                <ProfileField
                  label="Phone"
                  value={currentData?.clinic_data?.phone}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange("clinic_data", "phone", e.target.value)
                  }
                  placeholder="Enter clinic phone"
                />

                <ProfileField
                  label="Email"
                  type="email"
                  value={currentData?.clinic_data?.email}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange("clinic_data", "email", e.target.value)
                  }
                  placeholder="Enter clinic email"
                />

                <ProfileField
                  label="Website"
                  value={currentData?.clinic_data?.website_url}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange(
                      "clinic_data",
                      "website_url",
                      e.target.value
                    )
                  }
                  placeholder="Enter website URL"
                />

                <ProfileField
                  label="Zip Code"
                  value={currentData?.clinic_data?.zip_code}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange("clinic_data", "zip_code", e.target.value)
                  }
                  placeholder="Enter zip code"
                />

                <div className="md:col-span-2">
                  <ProfileField
                    label="Address"
                    value={currentData?.clinic_data?.address}
                    isEditing={isEditing}
                    onChange={(e) =>
                      handleInputChange(
                        "clinic_data",
                        "address",
                        e.target.value
                      )
                    }
                    placeholder="Enter clinic address"
                    required
                  />
                </div>

                <ProfileField
                  label="City"
                  value={currentData?.clinic_data?.city}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange("clinic_data", "city", e.target.value)
                  }
                  placeholder="Enter city"
                />

                <ProfileField
                  label="Province"
                  value={currentData?.clinic_data?.province}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange("clinic_data", "province", e.target.value)
                  }
                  placeholder="Enter province"
                />

                <div className="md:col-span-2">
                  <ProfileField
                    label="Description"
                    type="textarea"
                    value={currentData?.clinic_data?.description}
                    isEditing={isEditing}
                    onChange={(e) =>
                      handleInputChange(
                        "clinic_data",
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Enter clinic description"
                    rows={4}
                  />
                </div>

                <ProfileField
                  label="Appointment Limit Per Patient"
                  type="number"
                  value={
                    currentData?.clinic_data?.appointment_limit_per_patient
                  }
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange(
                      "clinic_data",
                      "appointment_limit_per_patient",
                      parseInt(e.target.value) || 1
                    )
                  }
                  placeholder="Enter limit"
                  min="1"
                />

                <ProfileField
                  label="Cancellation Policy (Hours)"
                  type="number"
                  value={currentData?.clinic_data?.cancellation_policy_hours}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange(
                      "clinic_data",
                      "cancellation_policy_hours",
                      parseInt(e.target.value) || 24
                    )
                  }
                  placeholder="Hours before appointment"
                  min="1"
                />
              </div>
            </ProfileCard>

            {/* 🔥 **NEW: Operating Hours Section** */}
            <ProfileCard
              title="Operating Hours"
              icon={FiClock}
              className="mb-6"
              delay={0.3}
            >
              <div className="space-y-4">
                {daysOfWeek.map((day) => {
                  const hours = getOperatingHours(day.key);
                  return (
                    <div
                      key={day.key}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-border rounded-lg bg-muted/30"
                    >
                      <div className="md:w-32 font-medium text-foreground">
                        {day.label}
                      </div>

                      {isEditing ? (
                        <>
                          <label className="flex items-center gap-2 min-w-[100px]">
                            <input
                              type="checkbox"
                              checked={hours.isOpen}
                              onChange={(e) =>
                                handleOperatingHoursChange(
                                  day.key,
                                  "isOpen",
                                  e.target.checked
                                )
                              }
                              className="rounded border-border"
                            />
                            <span className="text-sm">Open</span>
                          </label>

                          {hours.isOpen && (
                            <>
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground min-w-[50px]">
                                  From:
                                </label>
                                <input
                                  type="time"
                                  value={hours.open}
                                  onChange={(e) =>
                                    handleOperatingHoursChange(
                                      day.key,
                                      "open",
                                      e.target.value
                                    )
                                  }
                                  className="px-3 py-2 border border-border rounded-lg bg-input text-foreground"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground min-w-[50px]">
                                  To:
                                </label>
                                <input
                                  type="time"
                                  value={hours.close}
                                  onChange={(e) =>
                                    handleOperatingHoursChange(
                                      day.key,
                                      "close",
                                      e.target.value
                                    )
                                  }
                                  className="px-3 py-2 border border-border rounded-lg bg-input text-foreground"
                                />
                              </div>
                            </>
                          )}

                          {!hours.isOpen && (
                            <span className="text-sm text-muted-foreground italic">
                              Closed
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          {hours.isOpen ? (
                            <span className="text-sm text-foreground">
                              {hours.open} - {hours.close}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              Closed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!isEditing && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Click "Edit Profile" to modify operating hours
                  </p>
                )}
              </div>
            </ProfileCard>
          </>
        )}

        {/* Services Section */}
        {activeSection === "services" && (
          <ProfileCard
            title="Services Management"
            icon={FiDollarSign}
            className="mb-6"
            delay={0.2}
          >
            <div className="space-y-6">
              {isEditing && (
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    Manage Services
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddService();
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                    disabled={saving}
                    style={{ pointerEvents: saving ? "none" : "auto" }}
                  >
                    <FiPlus className="w-4 h-4" />
                    <span className="font-medium">Add Service</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(isEditing
                  ? editedData?.services_data?.filter(
                      (service) => service._action !== "delete"
                    )
                  : services || currentData?.services_data || []
                ).map((service, index) => (
                  <div
                    key={service.id || `service-${index}`}
                    className="p-4 border border-border rounded-lg bg-card"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-foreground flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={service.name || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "services_data",
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                            placeholder="Service name *"
                          />
                        ) : (
                          service.name || "Unnamed Service"
                        )}
                      </h4>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveService(index, e);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors duration-200 ml-2 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                          disabled={saving}
                          style={{ pointerEvents: saving ? "none" : "auto" }}
                          title="Remove Service"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={service.description || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "services_data",
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                          placeholder="Service description"
                          rows={2}
                        />

                        <select
                          value={service.category || "General Dentistry"}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "services_data",
                              index,
                              "category",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                        >
                          {serviceCategoryOptions.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={service.min_price || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "services_data",
                                index,
                                "min_price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="px-2 py-1 border border-border rounded bg-input text-foreground"
                            placeholder="Min Price"
                            min="0"
                          />
                          <input
                            type="number"
                            value={service.max_price || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "services_data",
                                index,
                                "max_price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="px-2 py-1 border border-border rounded bg-input text-foreground"
                            placeholder="Max Price"
                            min="0"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={service.duration_minutes || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "services_data",
                                index,
                                "duration_minutes",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="px-2 py-1 border border-border rounded bg-input text-foreground"
                            placeholder="Duration (mins)"
                            min="1"
                          />
                          <input
                            type="number"
                            value={service.typical_visit_count || 1}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "services_data",
                                index,
                                "typical_visit_count",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="px-2 py-1 border border-border rounded bg-input text-foreground"
                            placeholder="Visit Count"
                            min="1"
                          />
                        </div>

                        <input
                          type="number"
                          value={service.priority || 10}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "services_data",
                              index,
                              "priority",
                              parseInt(e.target.value) || 10
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                          placeholder="Priority (1-100)"
                          min="1"
                          max="100"
                        />

                        <div className="flex flex-col gap-2 pt-2 border-t border-border">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={service.is_active !== false}
                              onChange={(e) =>
                                handleArrayUpdate(
                                  "services_data",
                                  index,
                                  "is_active",
                                  e.target.checked
                                )
                              }
                              className="rounded border-border"
                            />
                            <span className="text-foreground">Active</span>
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={service.requires_consultation !== false}
                              onChange={(e) =>
                                handleArrayUpdate(
                                  "services_data",
                                  index,
                                  "requires_consultation",
                                  e.target.checked
                                )
                              }
                              className="rounded border-border"
                            />
                            <span className="text-foreground">
                              Requires Consultation
                            </span>
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                service.requires_multiple_visits || false
                              }
                              onChange={(e) =>
                                handleArrayUpdate(
                                  "services_data",
                                  index,
                                  "requires_multiple_visits",
                                  e.target.checked
                                )
                              }
                              className="rounded border-border"
                            />
                            <span className="text-foreground">
                              Requires Multiple Visits
                            </span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">
                          {service.description || "No description"}
                        </p>
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Category:
                            </span>
                            <span className="font-medium">
                              {service.category || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Duration:
                            </span>
                            <span className="font-medium">
                              {service.duration_minutes} mins
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Typical Visits:
                            </span>
                            <span className="font-medium">
                              {service.typical_visit_count || 1}
                            </span>
                          </div>
                          {service.requires_consultation && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              ✓ Consultation Required
                            </div>
                          )}
                          {service.requires_multiple_visits && (
                            <div className="text-xs text-orange-600 dark:text-orange-400">
                              ✓ Multiple Visits
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                          <span className="text-sm font-medium">
                            ₱{service.min_price?.toLocaleString()} - ₱
                            {service.max_price?.toLocaleString()}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              service.is_active
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {service.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {!isEditing && (!services || services.length === 0) && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <FiDollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>
                    No services found. Click "Edit Profile" to add services.
                  </p>
                </div>
              )}
            </div>
          </ProfileCard>
        )}

        {/* Doctors Section */}
        {activeSection === "doctors" && (
          <ProfileCard
            title="Doctors Management"
            icon={FiUsers}
            className="mb-6"
            delay={0.2}
          >
            <div className="space-y-6">
              {isEditing && (
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Manage Doctors</h3>
                  <button
                    type="button"
                    onClick={handleAddDoctor}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
                    disabled={saving}
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Doctor
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(isEditing
                  ? editedData?.doctors_data?.filter(
                      (doctor) => doctor._action !== "delete"
                    )
                  : doctors || currentData?.doctors_data || []
                ).map((doctor, index) => (
                  <div
                    key={doctor.id || `doctor-${index}`}
                    className="p-4 border border-border rounded-lg bg-card"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Doctor Image Upload */}
                        <div className="flex-shrink-0">
                          <DoctorAvatar
                            doctorId={doctor.id}
                            imageUrl={doctor.image_url}
                            doctorName={`${doctor.first_name} ${doctor.last_name}`}
                            onImageUpdate={(newImageUrl) =>
                              handleDoctorImageUpdate(doctor.id, newImageUrl)
                            }
                            size="lg"
                            editable={true}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">
                            {isEditing ? (
                              <div className="grid grid-cols-1 gap-2">
                                <input
                                  type="text"
                                  value={doctor.first_name || ""}
                                  onChange={(e) =>
                                    handleArrayUpdate(
                                      "doctors_data",
                                      index,
                                      "first_name",
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 border border-border rounded bg-input text-foreground"
                                  placeholder="First name *"
                                />
                                <input
                                  type="text"
                                  value={doctor.last_name || ""}
                                  onChange={(e) =>
                                    handleArrayUpdate(
                                      "doctors_data",
                                      index,
                                      "last_name",
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 border border-border rounded bg-input text-foreground"
                                  placeholder="Last name *"
                                />
                              </div>
                            ) : (
                              `Dr. ${doctor.first_name} ${doctor.last_name}` ||
                              "Unnamed Doctor"
                            )}
                          </h4>
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveDoctor(index, e);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors duration-200 ml-2 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex-shrink-0"
                          disabled={saving}
                          style={{ pointerEvents: saving ? "none" : "auto" }}
                          title="Remove Doctor"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <select
                          value={doctor.specialization || "General Dentistry"}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "doctors_data",
                              index,
                              "specialization",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                        >
                          {specializationOptions.map((spec) => (
                            <option key={spec.value} value={spec.value}>
                              {spec.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={doctor.license_number || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "doctors_data",
                              index,
                              "license_number",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                          placeholder="License Number *"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={doctor.experience_years || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "doctors_data",
                                index,
                                "experience_years",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="px-2 py-1 border border-border rounded bg-input text-foreground"
                            placeholder="Years of Experience"
                            min="0"
                          />
                          <input
                            type="number"
                            value={doctor.consultation_fee || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "doctors_data",
                                index,
                                "consultation_fee",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="px-2 py-1 border border-border rounded bg-input text-foreground"
                            placeholder="Consultation Fee"
                            min="0"
                          />
                        </div>

                        <input
                          type="text"
                          value={doctor.education || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "doctors_data",
                              index,
                              "education",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                          placeholder="Education (e.g., DMD, University)"
                        />

                        <input
                          type="text"
                          value={
                            Array.isArray(doctor.languages_spoken)
                              ? doctor.languages_spoken.join(", ")
                              : doctor.languages_spoken || "English, Tagalog"
                          }
                          onChange={(e) => {
                            const languages = e.target.value
                              .split(",")
                              .map((lang) => lang.trim())
                              .filter(Boolean);
                            handleArrayUpdate(
                              "doctors_data",
                              index,
                              "languages_spoken",
                              languages
                            );
                          }}
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                          placeholder="Languages (comma-separated)"
                        />

                        <textarea
                          value={doctor.bio || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "doctors_data",
                              index,
                              "bio",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground"
                          placeholder="Doctor biography"
                          rows={3}
                        />

                        <label className="flex items-center gap-2 text-sm pt-2 border-t border-border">
                          <input
                            type="checkbox"
                            checked={doctor.is_available !== false}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "doctors_data",
                                index,
                                "is_available",
                                e.target.checked
                              )
                            }
                            className="rounded border-border"
                          />
                          <span className="text-foreground">
                            Available for Appointments
                          </span>
                        </label>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-primary font-medium mb-1">
                          {doctor.specialization || "No specialization"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          License: {doctor.license_number || "Not provided"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {doctor.experience_years || 0} years experience
                        </p>
                        {doctor.education && (
                          <p className="text-xs text-muted-foreground mb-1">
                            🎓 {doctor.education}
                          </p>
                        )}
                        {doctor.languages_spoken &&
                          Array.isArray(doctor.languages_spoken) &&
                          doctor.languages_spoken.length > 0 && (
                            <p className="text-xs text-muted-foreground mb-2">
                              🗣️ {doctor.languages_spoken.join(", ")}
                            </p>
                          )}
                        {doctor.bio && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {doctor.bio}
                          </p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                          <span className="text-sm font-medium">
                            ₱
                            {doctor.consultation_fee?.toLocaleString() || "N/A"}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              doctor.is_available
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {doctor.is_available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {!isEditing && (!doctors || doctors.length === 0) && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No doctors found. Click "Edit Profile" to add doctors.</p>
                </div>
              )}
            </div>
          </ProfileCard>
        )}
      </div>
    </div>
  );
};

export default StaffProfile;
