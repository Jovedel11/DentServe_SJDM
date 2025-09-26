import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiUsers,
  FiDollarSign,
  FiSettings,
  FiPlus,
  FiTrash2,
  FiSave,
} from "react-icons/fi";

import { useProfileManager } from "@/app/shared/hook/useProfileManager";
import { ProfileHeader } from "@/app/shared/profile/profile-header";
import { ProfileCard } from "@/app/shared/profile/profile-card";
import { ProfileField } from "@/app/shared/profile/profile-field";
import { ProfileAvatar } from "@/app/shared/profile/profile-avatar";
import { AlertMessage } from "@/core/components/ui/alert-message";
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
    handleClinicUpdate,
    handleServicesUpdate,
    handleDoctorsUpdate,
    services,
    doctors,
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

  // Handle clinic save
  const handleClinicSave = async () => {
    const clinicData = editedData?.clinic_data || {};
    const result = await handleClinicUpdate(clinicData);
    return result;
  };

  // Handle service operations
  const handleAddService = () => {
    const newService = {
      id: "new", // Temporary ID for new services
      name: "New Service",
      description: "Service description",
      category: "General",
      duration_minutes: 60,
      min_price: 1000,
      max_price: 2000,
      is_active: true,
    };

    const currentServices = editedData?.services_data || [];
    const updatedServices = [...currentServices, newService];
    handleInputChange("services_data", "", updatedServices);
  };

  const handleRemoveService = (index) => {
    const currentServices = editedData?.services_data || [];
    const updatedServices = currentServices.filter((_, i) => i !== index);
    handleInputChange("services_data", "", updatedServices);
  };

  const handleServiceSave = async () => {
    const servicesData = editedData?.services_data || [];
    const result = await handleServicesUpdate(servicesData);
    return result;
  };

  // Handle doctor operations
  const handleAddDoctor = () => {
    const newDoctor = {
      id: "new", // Temporary ID for new doctors
      license_number: "",
      specialization: "",
      first_name: "",
      last_name: "",
      education: "",
      experience_years: 0,
      bio: "",
      consultation_fee: 1500,
      is_available: true,
      image_url: "",
    };

    const currentDoctors = editedData?.doctors_data || [];
    const updatedDoctors = [...currentDoctors, newDoctor];
    handleInputChange("doctors_data", "", updatedDoctors);
  };

  const handleRemoveDoctor = (index) => {
    const currentDoctors = editedData?.doctors_data || [];
    const updatedDoctors = currentDoctors.filter((_, i) => i !== index);
    handleInputChange("doctors_data", "", updatedDoctors);
  };

  const handleDoctorSave = async () => {
    const doctorsData = editedData?.doctors_data || [];
    const result = await handleDoctorsUpdate(doctorsData);
    return result;
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
              </div>
            </ProfileCard>

            {/* Staff Information */}
            <ProfileCard
              title="Staff Information"
              icon={FiSettings}
              delay={0.5}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <ProfileCard
            title="Clinic Information"
            icon={FaBuilding}
            className="mb-6"
            editMode={isEditing}
            onEdit={handleEditToggle}
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
              />

              {/* ✅ FIXED: Corrected ProfileAvatar usage */}
              <ProfileAvatar
                imageUrl={currentData?.clinic_data?.image_url}
                name={currentData?.clinic_data?.name || "Clinic"}
                onImageUpdate={(newUrl) =>
                  handleInputChange("clinic_data", "image_url", newUrl)
                }
                size="lg"
              />

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

              <div className="md:col-span-2">
                <ProfileField
                  label="Address"
                  value={currentData?.clinic_data?.address}
                  isEditing={isEditing}
                  onChange={(e) =>
                    handleInputChange("clinic_data", "address", e.target.value)
                  }
                  placeholder="Enter clinic address"
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
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleClinicSave}
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  <FiSave className="w-4 h-4 mr-2 inline" />
                  {saving ? "Saving..." : "Save Clinic Info"}
                </button>
              </div>
            )}
          </ProfileCard>
        )}

        {/* Services Section */}
        {activeSection === "services" && (
          <ProfileCard
            title="Services Management"
            icon={FiDollarSign}
            className="mb-6"
            editMode={isEditing}
            onEdit={handleEditToggle}
            delay={0.2}
          >
            <div className="space-y-6">
              {isEditing && (
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Manage Services</h3>
                  <button
                    onClick={handleAddService}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <FiPlus className="w-4 h-4 mr-2 inline" />
                    Add Service
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(isEditing
                  ? editedData?.services_data
                  : services || currentData?.services_data || []
                ).map((service, index) => (
                  <div
                    key={service.id || index}
                    className="p-4 border border-border rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-foreground">
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
                            className="w-full px-2 py-1 border border-border rounded"
                            placeholder="Service name"
                          />
                        ) : (
                          service.name || "Unnamed Service"
                        )}
                      </h4>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveService(index)}
                          className="text-red-500 hover:text-red-700"
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
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="Service description"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={service.min_price || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "services_data",
                                index,
                                "min_price",
                                parseFloat(e.target.value)
                              )
                            }
                            className="px-2 py-1 border border-border rounded"
                            placeholder="Min Price"
                          />
                          <input
                            type="number"
                            value={service.max_price || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "services_data",
                                index,
                                "max_price",
                                parseFloat(e.target.value)
                              )
                            }
                            className="px-2 py-1 border border-border rounded"
                            placeholder="Max Price"
                          />
                        </div>
                        <input
                          type="text"
                          value={service.category || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "services_data",
                              index,
                              "category",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="Category"
                        />
                        <input
                          type="number"
                          value={service.duration_minutes || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "services_data",
                              index,
                              "duration_minutes",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="Duration (minutes)"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">
                          {service.description || "No description"}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            ₱{service.min_price?.toLocaleString()} - ₱
                            {service.max_price?.toLocaleString()}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              service.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
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
                  <p>No services found. Click "Edit" to add services.</p>
                </div>
              )}

              {isEditing && (
                <div className="flex justify-end">
                  <button
                    onClick={handleServiceSave}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <FiSave className="w-4 h-4 mr-2 inline" />
                    {saving ? "Saving..." : "Save Services"}
                  </button>
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
            editMode={isEditing}
            onEdit={handleEditToggle}
            delay={0.2}
          >
            <div className="space-y-6">
              {isEditing && (
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Manage Doctors</h3>
                  <button
                    onClick={handleAddDoctor}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <FiPlus className="w-4 h-4 mr-2 inline" />
                    Add Doctor
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(isEditing
                  ? editedData?.doctors_data
                  : doctors || currentData?.doctors_data || []
                ).map((doctor, index) => (
                  <div
                    key={doctor.id || index}
                    className="p-4 border border-border rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-foreground">
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-2">
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
                              className="px-2 py-1 border border-border rounded"
                              placeholder="First name"
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
                              className="px-2 py-1 border border-border rounded"
                              placeholder="Last name"
                            />
                          </div>
                        ) : (
                          `Dr. ${doctor.first_name} ${doctor.last_name}` ||
                          "Unnamed Doctor"
                        )}
                      </h4>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveDoctor(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={doctor.specialization || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "doctors_data",
                              index,
                              "specialization",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="Specialization"
                        />
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
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="License Number"
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
                                parseInt(e.target.value)
                              )
                            }
                            className="px-2 py-1 border border-border rounded"
                            placeholder="Years of Experience"
                          />
                          <input
                            type="number"
                            value={doctor.consultation_fee || ""}
                            onChange={(e) =>
                              handleArrayUpdate(
                                "doctors_data",
                                index,
                                "consultation_fee",
                                parseFloat(e.target.value)
                              )
                            }
                            className="px-2 py-1 border border-border rounded"
                            placeholder="Consultation Fee"
                          />
                        </div>
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
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="Doctor bio"
                          rows={3}
                        />
                        <input
                          type="url"
                          value={doctor.image_url || ""}
                          onChange={(e) =>
                            handleArrayUpdate(
                              "doctors_data",
                              index,
                              "image_url",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="Doctor image URL"
                        />
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
                          className="w-full px-2 py-1 border border-border rounded"
                          placeholder="Education"
                        />
                      </div>
                    ) : (
                      <>
                        {doctor.image_url && (
                          <div className="mb-3">
                            <img
                              src={doctor.image_url}
                              alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                              className="w-16 h-16 rounded-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <p className="text-sm text-primary font-medium mb-1">
                          {doctor.specialization || "No specialization"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          License: {doctor.license_number || "Not provided"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {doctor.experience_years || 0} years experience
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            ₱
                            {doctor.consultation_fee?.toLocaleString() || "N/A"}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              doctor.is_available
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
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

              {isEditing && (
                <div className="flex justify-end">
                  <button
                    onClick={handleDoctorSave}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <FiSave className="w-4 h-4 mr-2 inline" />
                    {saving ? "Saving..." : "Save Doctors"}
                  </button>
                </div>
              )}
            </div>

            {!isEditing && (!doctors || doctors.length === 0) && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <p>No doctors found. Click "Edit" to add doctors.</p>
              </div>
            )}
          </ProfileCard>
        )}
      </div>
    </div>
  );
};

export default StaffProfile;
