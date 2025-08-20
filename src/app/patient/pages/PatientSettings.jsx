import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiSettings,
  FiBell,
  FiShield,
  FiMoon,
  FiSun,
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiRotateCcw,
  FiTrash2,
  FiDownload,
} from "react-icons/fi";
import { useTheme } from "@/core/contexts/ThemeProvider";

/**
 * Settings page component - allows patients to manage their account settings and preferences
 */
const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("general");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [settings, setSettings] = useState({
    general: {
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12",
      theme: theme,
    },
    notifications: {
      appointmentReminders: true, // Always enabled
      treatmentUpdates: true,
      smsNotifications: true,
      pushNotifications: true,
      promotionalEmails: false,
    },
    privacy: {
      allowMarketingEmails: false,
      shareDataWithPartners: false,
    },
    security: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      loginAlerts: true,
    },
  });

  const settingSections = [
    {
      id: "general",
      label: "General",
      icon: FiSettings,
      description: "Date format and appearance settings",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: FiBell,
      description: "Manage your notification preferences",
    },
    {
      id: "privacy",
      label: "Privacy",
      icon: FiShield,
      description: "Control your data privacy settings",
    },
    {
      id: "security",
      label: "Security",
      icon: FiLock,
      description: "Password and account security",
    },
  ];

  const handleSettingChange = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    handleSettingChange("general", "theme", newTheme);
  };

  const handleSaveSettings = async () => {
    try {
      // Here you would call your Supabase update function
      console.log("Saving settings:", settings);
      setHasUnsavedChanges(false);
      // Show success toast/notification
    } catch (error) {
      console.error("Error saving settings:", error);
      // Show error toast/notification
    }
  };

  const handleResetSettings = () => {
    if (
      window.confirm("Are you sure you want to reset all settings to default?")
    ) {
      // Reset to default values
      setSettings({
        general: {
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12",
          theme: "system",
        },
        notifications: {
          appointmentReminders: true,
          treatmentUpdates: true,
          smsNotifications: true,
          pushNotifications: true,
          promotionalEmails: false,
        },
        privacy: {
          allowMarketingEmails: false,
          shareDataWithPartners: false,
        },
        security: {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          loginAlerts: true,
        },
      });
      setHasUnsavedChanges(false);
      console.log("Settings reset to default");
    }
  };

  const handleExportData = async () => {
    try {
      console.log("Exporting user data...");
      // This would call Supabase to export user data
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete your account? This action cannot be undone."
      )
    ) {
      try {
        console.log("Account deletion requested");
        // This would call Supabase to delete the account
      } catch (error) {
        console.error("Error deleting account:", error);
      }
    }
  };

  const handlePasswordUpdate = async () => {
    if (settings.security.newPassword !== settings.security.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (settings.security.newPassword.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    try {
      console.log("Updating password...");
      // This would call Supabase auth.updateUser()
      setSettings((prev) => ({
        ...prev,
        security: {
          ...prev.security,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
      }));
    } catch (error) {
      console.error("Error updating password:", error);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Display & Format
        </h4>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Date Format
            </label>
            <span className="text-sm text-muted-foreground">
              How dates are displayed throughout the app
            </span>
          </div>
          <select
            value={settings.general.dateFormat}
            onChange={(e) =>
              handleSettingChange("general", "dateFormat", e.target.value)
            }
            className="px-3 py-2 border-2 border-input bg-input text-foreground rounded-lg text-sm min-w-[150px] transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 md:min-w-[150px] w-full"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (EU Format)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
          </select>
        </div>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Time Format
            </label>
            <span className="text-sm text-muted-foreground">
              12-hour or 24-hour time display
            </span>
          </div>
          <select
            value={settings.general.timeFormat}
            onChange={(e) =>
              handleSettingChange("general", "timeFormat", e.target.value)
            }
            className="px-3 py-2 border-2 border-input bg-input text-foreground rounded-lg text-sm min-w-[150px] transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 md:min-w-[150px] w-full"
          >
            <option value="12">12-hour (2:30 PM)</option>
            <option value="24">24-hour (14:30)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Appearance
        </h4>
        <div className="flex justify-between items-start gap-4 py-4 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Theme
            </label>
            <span className="text-sm text-muted-foreground">
              Choose your preferred color theme
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange("light")}
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                theme === "light"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground border-input hover:border-border"
              }`}
            >
              <FiSun className="text-base" />
              <span>Light</span>
            </button>
            <button
              onClick={() => handleThemeChange("dark")}
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                theme === "dark"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground border-input hover:border-border"
              }`}
            >
              <FiMoon className="text-base" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => handleThemeChange("system")}
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                theme === "system"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground border-input hover:border-border"
              }`}
            >
              <FiSettings className="text-base" />
              <span>System</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Medical Notifications
        </h4>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-start">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Appointment Reminders
            </label>
            <span className="text-sm text-muted-foreground">
              Get reminded about upcoming appointments (Always enabled for your
              safety)
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-3 py-2 rounded-lg">
            <span>Always Enabled</span>
          </div>
        </div>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Treatment Updates
            </label>
            <span className="text-sm text-muted-foreground">
              Updates about your ongoing treatments and care plans
            </span>
          </div>
          <label className="relative inline-block w-12 h-7 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.notifications.treatmentUpdates}
              onChange={(e) =>
                handleSettingChange(
                  "notifications",
                  "treatmentUpdates",
                  e.target.checked
                )
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.notifications.treatmentUpdates
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-5 h-5 rounded-full transition-all duration-300 ${
                  settings.notifications.treatmentUpdates
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Communication Methods
        </h4>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              SMS Notifications
            </label>
            <span className="text-sm text-muted-foreground">
              Receive text messages for important updates
            </span>
          </div>
          <label className="relative inline-block w-12 h-7 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.notifications.smsNotifications}
              onChange={(e) =>
                handleSettingChange(
                  "notifications",
                  "smsNotifications",
                  e.target.checked
                )
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.notifications.smsNotifications
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-5 h-5 rounded-full transition-all duration-300 ${
                  settings.notifications.smsNotifications
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Push Notifications
            </label>
            <span className="text-sm text-muted-foreground">
              Browser notifications when you're online
            </span>
          </div>
          <label className="relative inline-block w-12 h-7 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.notifications.pushNotifications}
              onChange={(e) =>
                handleSettingChange(
                  "notifications",
                  "pushNotifications",
                  e.target.checked
                )
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.notifications.pushNotifications
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-5 h-5 rounded-full transition-all duration-300 ${
                  settings.notifications.pushNotifications
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>

        <div className="flex justify-between items-start gap-4 py-4 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Promotional Emails
            </label>
            <span className="text-sm text-muted-foreground">
              Special offers, health tips, and newsletter content
            </span>
          </div>
          <label className="relative inline-block w-12 h-7 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.notifications.promotionalEmails}
              onChange={(e) =>
                handleSettingChange(
                  "notifications",
                  "promotionalEmails",
                  e.target.checked
                )
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.notifications.promotionalEmails
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-5 h-5 rounded-full transition-all duration-300 ${
                  settings.notifications.promotionalEmails
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Marketing & Communications
        </h4>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Marketing Emails
            </label>
            <span className="text-sm text-muted-foreground">
              Allow us to send you marketing emails about our services
            </span>
          </div>
          <label className="relative inline-block w-12 h-7 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.privacy.allowMarketingEmails}
              onChange={(e) =>
                handleSettingChange(
                  "privacy",
                  "allowMarketingEmails",
                  e.target.checked
                )
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.privacy.allowMarketingEmails
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-5 h-5 rounded-full transition-all duration-300 ${
                  settings.privacy.allowMarketingEmails
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>

        <div className="flex justify-between items-start gap-4 py-4 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Share Data with Partners
            </label>
            <span className="text-sm text-muted-foreground">
              Allow sharing of anonymized data with trusted healthcare partners
            </span>
          </div>
          <label className="relative inline-block w-12 h-7 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.privacy.shareDataWithPartners}
              onChange={(e) =>
                handleSettingChange(
                  "privacy",
                  "shareDataWithPartners",
                  e.target.checked
                )
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.privacy.shareDataWithPartners
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-5 h-5 rounded-full transition-all duration-300 ${
                  settings.privacy.shareDataWithPartners
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Data Management
        </h4>
        <div className="p-4 border border-border rounded-lg bg-muted/30">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90 mb-2"
          >
            <FiDownload className="text-base" />
            <span>Export My Data</span>
          </button>
          <p className="text-sm text-muted-foreground m-0 leading-relaxed">
            Download a copy of all your personal data, medical records, and
            appointment history in a portable format.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Password & Authentication
        </h4>

        <div className="bg-muted/30 rounded-lg p-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={settings.security.currentPassword}
                onChange={(e) =>
                  handleSettingChange(
                    "security",
                    "currentPassword",
                    e.target.value
                  )
                }
                className="w-full px-3 py-3 pr-12 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors duration-300"
              >
                {showCurrentPassword ? (
                  <FiEyeOff className="text-lg" />
                ) : (
                  <FiEye className="text-lg" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={settings.security.newPassword}
                onChange={(e) =>
                  handleSettingChange("security", "newPassword", e.target.value)
                }
                className="w-full px-3 py-3 pr-12 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors duration-300"
              >
                {showPassword ? (
                  <FiEyeOff className="text-lg" />
                ) : (
                  <FiEye className="text-lg" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground/80">
              Confirm New Password
            </label>
            <input
              type="password"
              value={settings.security.confirmPassword}
              onChange={(e) =>
                handleSettingChange(
                  "security",
                  "confirmPassword",
                  e.target.value
                )
              }
              className="w-full px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
              placeholder="Confirm new password"
            />
          </div>

          <button
            onClick={handlePasswordUpdate}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90"
          >
            <FiLock className="text-base" />
            <span>Update Password</span>
          </button>
        </div>

        <div className="flex justify-between items-start gap-4 py-4 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Login Alerts
            </label>
            <span className="text-sm text-muted-foreground">
              Get notified via email when someone logs into your account
            </span>
          </div>
          <label className="relative inline-block w-12 h-7 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.security.loginAlerts}
              onChange={(e) =>
                handleSettingChange("security", "loginAlerts", e.target.checked)
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.security.loginAlerts
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-5 h-5 rounded-full transition-all duration-300 ${
                  settings.security.loginAlerts
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground pb-3 border-b border-border">
          Danger Zone
        </h4>
        <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white border-2 border-red-600 rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-red-700 hover:border-red-700 mb-2"
          >
            <FiTrash2 className="text-base" />
            <span>Delete Account</span>
          </button>
          <p className="text-sm text-muted-foreground m-0 leading-relaxed">
            Permanently delete your account and all associated data including
            medical records, appointment history, and personal information. This
            action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings();
      case "notifications":
        return renderNotificationSettings();
      case "privacy":
        return renderPrivacySettings();
      case "security":
        return renderSecuritySettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background md:p-6 p-4">
      <div className="max-w-7xl mx-auto">
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
                Settings
              </h1>
              <p className="text-muted-foreground md:text-base text-sm">
                Manage your account preferences and security settings
              </p>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-start gap-3 md:flex-row flex-row md:w-auto w-full">
                <button
                  onClick={handleResetSettings}
                  className="flex items-center gap-2 px-5 py-3 bg-card text-card-foreground border-2 border-border rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:border-muted-foreground hover:bg-muted md:flex-1 flex-1"
                >
                  <FiRotateCcw className="text-base" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90 md:flex-1 flex-1"
                >
                  <FiSave className="text-base" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
          {hasUnsavedChanges && (
            <div className="mt-4 px-4 py-3 bg-amber-100 border border-amber-300 rounded-lg text-center dark:bg-amber-950 dark:border-amber-700">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                You have unsaved changes
              </span>
            </div>
          )}
        </motion.div>

        {/* Settings Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 gap-4">
          {/* Sidebar */}
          <motion.div
            className="lg:col-span-3 lg:sticky lg:top-6 lg:h-fit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <nav className="bg-card border border-border rounded-2xl p-2 shadow-md">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
                {settingSections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <motion.button
                      key={section.id}
                      className={`w-full flex items-start gap-4 p-4 rounded-lg bg-none border-none cursor-pointer transition-all duration-300 text-left lg:flex-row flex-col lg:items-start items-center lg:text-left text-center lg:gap-4 gap-2 lg:p-4 p-3 ${
                        activeSection === section.id
                          ? "bg-primary/10 text-primary"
                          : "text-card-foreground hover:bg-muted/50"
                      }`}
                      onClick={() => setActiveSection(section.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <Icon
                        className={`text-xl flex-shrink-0 transition-colors duration-300 lg:text-xl text-2xl ${
                          activeSection === section.id ? "text-primary" : ""
                        }`}
                      />
                      <div className="flex flex-col gap-1 min-w-0 lg:gap-1 gap-1">
                        <span className="text-base font-medium leading-tight lg:text-base text-sm">
                          {section.label}
                        </span>
                        <span className="text-xs opacity-80 leading-tight lg:block hidden">
                          {section.description}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </nav>
          </motion.div>

          {/* Main Content */}
          <motion.div
            className="lg:col-span-9"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            key={activeSection}
          >
            <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
              <div className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4">
                <h2 className="text-xl font-semibold text-foreground md:text-xl text-lg">
                  {settingSections.find((s) => s.id === activeSection)?.label}
                </h2>
              </div>
              <div className="p-6 md:p-6 p-4">{renderSettingsContent()}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
