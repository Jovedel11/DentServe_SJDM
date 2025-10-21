import React, { useState, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiUsers,
  FiDollarSign,
  FiSettings,
  FiPlus,
  FiSave,
  FiClock,
  FiLock,
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
  FiShield,
  FiTrash2,
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
import { useAuth } from "@/auth/context/AuthProvider";
import {
  validatePassword,
  validateConfirmPassword,
} from "@/utils/validation/auth-validation";
import ClinicSettings from "./ClinicSettings";

// ==================== SECURITY SETTINGS COMPONENT ====================
const SecuritySettings = ({ isStaff }) => {
  const { changePassword, deactivateAccount, signOut } = useAuth();

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Account deletion state
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteData, setDeleteData] = useState({
    password: "",
    reason: "",
    confirmText: "",
    permanentDelete: false,
  });
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Password strength indicator with memoization
  const getPasswordStrength = useCallback((password) => {
    if (!password) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[\W_]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: "Weak", color: "bg-red-500" };
    if (strength <= 4)
      return { strength, label: "Medium", color: "bg-yellow-500" };
    return { strength, label: "Strong", color: "bg-green-500" };
  }, []);

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwordData.newPassword),
    [passwordData.newPassword, getPasswordStrength]
  );

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordSuccess("");

    // Validate
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    const newPasswordValidation = validatePassword(passwordData.newPassword);
    if (!newPasswordValidation.isValid) {
      errors.newPassword = newPasswordValidation.error;
    }

    const confirmValidation = validateConfirmPassword(
      passwordData.newPassword,
      passwordData.confirmPassword
    );
    if (!confirmValidation.isValid) {
      errors.confirmPassword = confirmValidation.error;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword =
        "New password must be different from current password";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setChangingPassword(true);
      const result = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.success) {
        setPasswordSuccess(
          "Password changed successfully! You will be signed out in 2 seconds..."
        );
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          signOut();
        }, 2000);
      } else {
        setPasswordErrors({ submit: result.error });
      }
    } catch (error) {
      setPasswordErrors({ submit: error.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAccountDeactivation = async (e) => {
    e.preventDefault();
    setDeleteError("");

    // Validate
    if (!deleteData.password) {
      setDeleteError("Password is required to deactivate your account");
      return;
    }

    if (!deleteData.reason) {
      setDeleteError("Please tell us why you're leaving");
      return;
    }

    const confirmText = deleteData.permanentDelete
      ? "DELETE MY ACCOUNT"
      : "DEACTIVATE";
    if (deleteData.confirmText !== confirmText) {
      setDeleteError(`Please type "${confirmText}" to confirm`);
      return;
    }

    if (
      !window.confirm(
        deleteData.permanentDelete
          ? "⚠️ FINAL WARNING: This will PERMANENTLY delete all your data. This action CANNOT be undone. Are you absolutely sure?"
          : "Are you sure you want to deactivate your account? You can reactivate it later by contacting support."
      )
    ) {
      return;
    }

    try {
      setDeletingAccount(true);
      const result = await deactivateAccount(
        deleteData.password,
        deleteData.reason,
        deleteData.permanentDelete
      );

      if (result.success) {
        alert(result.message);
        window.location.href = "/";
      } else {
        setDeleteError(result.error);
      }
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeletingAccount(false);
    }
  };

  const resetPasswordSection = useCallback(() => {
    setShowPasswordSection(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setPasswordSuccess("");
  }, []);

  const resetDeleteSection = useCallback(() => {
    setShowDeleteSection(false);
    setDeleteData({
      password: "",
      reason: "",
      confirmText: "",
      permanentDelete: false,
    });
    setDeleteError("");
  }, []);

  return (
    <div className="space-y-6">
      {/* Change Password Section */}
      <ProfileCard title="Change Password" icon={FiLock} delay={0.2}>
        {!showPasswordSection ? (
          <div className="text-center py-8">
            <FiShield className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
            <p className="text-muted-foreground mb-4">
              Regularly changing your password helps keep your account secure
            </p>
            <button
              onClick={() => setShowPasswordSection(true)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Change Password
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordSuccess && (
              <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg text-green-800 dark:text-green-400">
                {passwordSuccess}
              </div>
            )}

            {passwordErrors.submit && (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg text-red-800 dark:text-red-400">
                {passwordErrors.submit}
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 pr-10 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your current password"
                  disabled={changingPassword}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      current: !prev.current,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 pr-10 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your new password"
                  disabled={changingPassword}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      new: !prev.new,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {passwordData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{
                          width: `${(passwordStrength.strength / 6) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must contain: 8+ characters, uppercase, lowercase,
                    number, and special character
                  </p>
                </div>
              )}
              {passwordErrors.newPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {passwordErrors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 pr-10 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm your new password"
                  disabled={changingPassword}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      confirm: !prev.confirm,
                    }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={changingPassword}
                className="flex-1 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? "Changing Password..." : "Change Password"}
              </button>
              <button
                type="button"
                onClick={resetPasswordSection}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                disabled={changingPassword}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ProfileCard>

      {/* Delete Account Section */}
      <ProfileCard title="Danger Zone" icon={FiAlertTriangle} delay={0.3}>
        {!showDeleteSection ? (
          <div className="text-center py-8">
            <FiAlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
            <p className="text-muted-foreground mb-2">
              <strong>Deactivate Account:</strong> Temporarily disable your
              account (can be reactivated)
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Delete Account:</strong> Permanently remove all your data
              (cannot be undone)
            </p>
            <button
              onClick={() => setShowDeleteSection(true)}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Manage Account Deletion
            </button>
          </div>
        ) : (
          <form onSubmit={handleAccountDeactivation} className="space-y-4">
            {deleteError && (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg text-red-800 dark:text-red-400">
                {deleteError}
              </div>
            )}

            {/* Deletion Type */}
            <div className="p-4 border-2 border-red-500 rounded-lg bg-red-50 dark:bg-red-900/10">
              <label className="flex items-start gap-3 cursor-pointer mb-3">
                <input
                  type="radio"
                  name="deleteType"
                  checked={!deleteData.permanentDelete}
                  onChange={() =>
                    setDeleteData((prev) => ({
                      ...prev,
                      permanentDelete: false,
                    }))
                  }
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold">
                    Deactivate Account (Recommended)
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Your account will be disabled but data preserved. Contact
                    support to reactivate.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="deleteType"
                  checked={deleteData.permanentDelete}
                  onChange={() =>
                    setDeleteData((prev) => ({
                      ...prev,
                      permanentDelete: true,
                    }))
                  }
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-red-600">
                    Permanently Delete Account
                  </div>
                  <div className="text-sm text-red-600">
                    ⚠️ All your data will be permanently deleted. This CANNOT be
                    undone!
                  </div>
                </div>
              </label>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Why are you leaving? *
              </label>
              <textarea
                value={deleteData.reason}
                onChange={(e) =>
                  setDeleteData((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Please tell us why you're deactivating your account..."
                rows={3}
                disabled={deletingAccount}
              />
            </div>

            {/* Password Confirmation */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm Your Password *
              </label>
              <div className="relative">
                <input
                  type={showDeletePassword ? "text" : "password"}
                  value={deleteData.password}
                  onChange={(e) =>
                    setDeleteData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 pr-10 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your password to confirm"
                  disabled={deletingAccount}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showDeletePassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Confirmation Text */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Type{" "}
                <span className="font-bold text-red-600">
                  {deleteData.permanentDelete
                    ? "DELETE MY ACCOUNT"
                    : "DEACTIVATE"}
                </span>{" "}
                to confirm *
              </label>
              <input
                type="text"
                value={deleteData.confirmText}
                onChange={(e) =>
                  setDeleteData((prev) => ({
                    ...prev,
                    confirmText: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-red-500 rounded-lg bg-input text-foreground focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={
                  deleteData.permanentDelete
                    ? "DELETE MY ACCOUNT"
                    : "DEACTIVATE"
                }
                disabled={deletingAccount}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={deletingAccount}
                className="flex-1 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {deletingAccount
                  ? "Processing..."
                  : deleteData.permanentDelete
                  ? "⚠️ Permanently Delete Account"
                  : "Deactivate Account"}
              </button>
              <button
                type="button"
                onClick={resetDeleteSection}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                disabled={deletingAccount}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </ProfileCard>
    </div>
  );
};

// ==================== CONSTANTS ====================
const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

const POSITION_OPTIONS = [
  { value: "Receptionist", label: "Receptionist" },
  { value: "Dental Assistant", label: "Dental Assistant" },
  { value: "Dental Hygienist", label: "Dental Hygienist" },
  { value: "Office Manager", label: "Office Manager" },
  { value: "Billing Specialist", label: "Billing Specialist" },
  { value: "Other", label: "Other" },
];

const DEPARTMENT_OPTIONS = [
  { value: "Front Office", label: "Front Office" },
  { value: "Clinical", label: "Clinical" },
  { value: "Administration", label: "Administration" },
  { value: "Management", label: "Management" },
];

const SERVICE_CATEGORY_OPTIONS = [
  { value: "General Dentistry", label: "General Dentistry" },
  { value: "Cosmetic Dentistry", label: "Cosmetic Dentistry" },
  { value: "Orthodontics", label: "Orthodontics" },
  { value: "Oral Surgery", label: "Oral Surgery" },
  { value: "Pediatric Dentistry", label: "Pediatric Dentistry" },
  { value: "Periodontics", label: "Periodontics" },
  { value: "Endodontics", label: "Endodontics" },
  { value: "Prosthodontics", label: "Prosthodontics" },
];

const SPECIALIZATION_OPTIONS = [
  { value: "General Dentistry", label: "General Dentistry" },
  { value: "Orthodontist", label: "Orthodontist" },
  { value: "Oral Surgeon", label: "Oral Surgeon" },
  { value: "Pediatric Dentist", label: "Pediatric Dentist" },
  { value: "Periodontist", label: "Periodontist" },
  { value: "Endodontist", label: "Endodontist" },
  { value: "Prosthodontist", label: "Prosthodontist" },
  { value: "Cosmetic Dentist", label: "Cosmetic Dentist" },
];

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const NAVIGATION_TABS = [
  { id: "profile", label: "My Profile", icon: FiUser },
  { id: "clinic", label: "Clinic Info", icon: FaBuilding },
  { id: "services", label: "Services", icon: FiDollarSign },
  { id: "doctors", label: "Doctors", icon: FiUsers },
  { id: "security", label: "Security", icon: FiLock },
];

// ==================== MAIN COMPONENT ====================
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

  // ==================== COMPUTED VALUES ====================
  const isDataLoading = useMemo(
    () =>
      loading ||
      profileData?._loading?.clinic ||
      profileData?._loading?.services ||
      profileData?._loading?.doctors,
    [loading, profileData]
  );

  // ==================== SERVICE HANDLERS ====================
  const handleAddService = useCallback(
    (e) => {
      e?.preventDefault();
      e?.stopPropagation();

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
      e?.preventDefault();
      e?.stopPropagation();

      console.log("🗑️ Removing service at index:", index);

      const currentServices = editedData?.services_data || [];
      const serviceToRemove = currentServices[index];

      if (
        serviceToRemove &&
        !serviceToRemove.id?.toString().startsWith("new_")
      ) {
        const updatedServices = currentServices.map((service, i) =>
          i === index ? { ...service, _action: "delete" } : service
        );
        handleInputChange("services_data", "", updatedServices);
      } else {
        const updatedServices = currentServices.filter((_, i) => i !== index);
        handleInputChange("services_data", "", updatedServices);
      }

      console.log("🗑️ Services after removal:", currentServices.length - 1);
    },
    [editedData?.services_data, handleInputChange]
  );

  // ==================== DOCTOR HANDLERS ====================
  // Around line 781-818, update handleAddDoctor
  const handleAddDoctor = useCallback(
    (e) => {
      e?.preventDefault();
      e?.stopPropagation();

      console.log("👨‍⚕️ Adding new doctor");

      const tempLicenseNumber = `TEMP-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;

      // ✅ FIX: Only include fields that exist in the doctors table
      const newDoctor = {
        id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        license_number: tempLicenseNumber,
        specialization: "General Dentistry",
        first_name: "New",
        last_name: "Doctor",
        education: "",
        experience_years: 0,
        bio: "",
        consultation_fee: 1500,
        is_available: true,
        image_url: "",
        languages_spoken: ["English", "Tagalog"],
        certifications: null,
        awards: [],
        schedule: null, // ✅ FIX: Add schedule field for clinic relationship
        _action: "create",
        // ❌ REMOVE: Don't include clinic-specific fields here
        // clinic_schedule, doctor_clinic_id, clinic_is_active
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
      e?.preventDefault();
      e?.stopPropagation();

      console.log("🗑️ Removing doctor at index:", index);

      const currentDoctors = editedData?.doctors_data || [];
      const doctorToRemove = currentDoctors[index];

      if (doctorToRemove && !doctorToRemove.id?.toString().startsWith("new_")) {
        const updatedDoctors = currentDoctors.map((doctor, i) =>
          i === index ? { ...doctor, _action: "delete" } : doctor
        );
        handleInputChange("doctors_data", "", updatedDoctors);
      } else {
        const updatedDoctors = currentDoctors.filter((_, i) => i !== index);
        handleInputChange("doctors_data", "", updatedDoctors);
      }

      console.log("🗑️ Doctors after removal:", currentDoctors.length - 1);
    },
    [editedData?.doctors_data, handleInputChange]
  );

  // ==================== OPERATING HOURS HANDLERS ====================
  const handleOperatingHoursChange = useCallback(
    (day, field, value) => {
      const sourceData = isEditing ? editedData : currentData;
      const currentHours = sourceData?.clinic_data?.operating_hours || {
        weekdays: {},
        weekends: {},
      };

      const isWeekend = day === "saturday" || day === "sunday";
      const group = isWeekend ? "weekends" : "weekdays";

      const currentDayData = currentHours[group]?.[day] || {
        start: "09:00",
        end: "17:00",
      };

      let updatedDayData;

      if (field === "isOpen") {
        updatedDayData = value ? currentDayData : null;
      } else {
        const dbField =
          field === "open" ? "start" : field === "close" ? "end" : field;
        updatedDayData = {
          ...currentDayData,
          [dbField]: value,
        };
      }

      const updatedHours = {
        ...currentHours,
        [group]: {
          ...currentHours[group],
          [day]: updatedDayData,
        },
      };

      if (updatedHours[group][day] === null) {
        delete updatedHours[group][day];
      }

      handleInputChange("clinic_data", "operating_hours", updatedHours);
    },
    [currentData, editedData, isEditing, handleInputChange]
  );

  const getOperatingHours = useCallback(
    (day) => {
      const sourceData = isEditing ? editedData : currentData;
      const operatingHours = sourceData?.clinic_data?.operating_hours;

      const isWeekend = day === "saturday" || day === "sunday";
      const group = isWeekend ? "weekends" : "weekdays";

      const hours = operatingHours?.[group]?.[day];

      return {
        isOpen: !!hours,
        open: hours?.start || "09:00",
        close: hours?.end || "17:00",
      };
    },
    [currentData, editedData, isEditing]
  );

  // ==================== RENDER CONDITIONS ====================
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
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {NAVIGATION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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
                <div className="flex-shrink-0">
                  <ProfileAvatar
                    imageUrl={currentData?.profile?.profile_image_url}
                    name={`${currentData?.profile?.first_name || ""} ${
                      currentData?.profile?.last_name || ""
                    }`.trim()}
                    onImageUpdate={handleImageUpdate}
                    size="xl"
                  />
                  <FileSizeWarning />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-foreground mb-2 truncate">
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

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="truncate">
                      <span className="font-medium">Email:</span>{" "}
                      {currentData?.email}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {currentData?.phone || "Not provided"}
                    </p>
                    <p>
                      <span className="font-medium">Department:</span>{" "}
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
                  options={GENDER_OPTIONS}
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
                  options={POSITION_OPTIONS}
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
                  options={DEPARTMENT_OPTIONS}
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

            {/* Operating Hours Section */}
            <ProfileCard
              title="Operating Hours"
              icon={FiClock}
              className="mb-6"
              delay={0.3}
            >
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
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
                                  className="px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                  className="px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                    onClick={handleAddService}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    disabled={saving}
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
                    className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow"
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
                            className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Service name *"
                          />
                        ) : (
                          service.name || "Unnamed Service"
                        )}
                      </h4>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveService(index, e)}
                          className="text-red-500 hover:text-red-700 transition-colors duration-200 ml-2 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={saving}
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          {SERVICE_CATEGORY_OPTIONS.map((cat) => (
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
                            className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
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
                    className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow"
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
                            editable={isEditing}
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
                                  className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                  className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                          onClick={(e) => handleRemoveDoctor(index, e)}
                          className="text-red-500 hover:text-red-700 transition-colors duration-200 ml-2 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          disabled={saving}
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          {SPECIALIZATION_OPTIONS.map((spec) => (
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            className="px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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
                          className="w-full px-2 py-1 border border-border rounded bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
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

        {activeSection === "security" && (
          <div className="mt-4">
            <ClinicSettings />
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffProfile;
