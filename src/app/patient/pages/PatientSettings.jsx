import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiMail,
  FiMessageSquare,
} from "react-icons/fi";
import { useTheme } from "@/core/contexts/ThemeProvider";
import Loader from "@/core/components/Loader";
/**
 * Enhanced Settings Component with Supabase Integration
 */
const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("general");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Mock data aligned with database schema
  const [settings, setSettings] = useState({
    general: {
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12",
      theme: theme,
    },
    notifications: {
      appointmentReminders: true, // Always enabled for safety
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

  const [notificationStats, setNotificationStats] = useState({
    totalNotifications: 45,
    unreadCount: 3,
    emailsSent: 28,
    smsSent: 17,
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
      badge:
        notificationStats.unreadCount > 0
          ? notificationStats.unreadCount
          : null,
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

  // Load settings on mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock loading delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real implementation:
      // 1. Load patient_profile settings
      // 2. Load notification preferences from notifications table
      // 3. Load theme and display preferences

      /* Real Supabase calls would be:
      const { data: profileData, error: profileError } = await supabase
        .from('patient_profiles')
        .select('email_notifications, sms_notifications, push_notifications, promotional_emails, marketing_emails, share_data_with_partners, login_alerts, date_format, time_format, theme_preference')
        .eq('user_profile_id', userProfileId)
        .single();

      const { data: notificationStats, error: statsError } = await supabase
        .from('notifications')
        .select('id, is_read, sent_via')
        .eq('user_id', userId);
      */

      // Mock data update
      setSettings((prev) => ({
        ...prev,
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
      }));
    } catch (error) {
      console.error("Error loading settings:", error);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

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
      setSaving(true);
      setError(null);

      // Mock save delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real implementation:
      // 1. Update patient_profiles table
      // 2. Update user preferences
      // 3. Update notification delivery preferences

      /* Real Supabase calls would be:
      const { error } = await supabase
        .from('patient_profiles')
        .update({
          email_notifications: settings.notifications.treatmentUpdates,
          sms_notifications: settings.notifications.smsNotifications,
          push_notifications: settings.notifications.pushNotifications,
          promotional_emails: settings.notifications.promotionalEmails,
          marketing_emails: settings.privacy.allowMarketingEmails,
          share_data_with_partners: settings.privacy.shareDataWithPartners,
          login_alerts: settings.security.loginAlerts,
          date_format: settings.general.dateFormat,
          time_format: settings.general.timeFormat,
          theme_preference: settings.general.theme,
          updated_at: new Date().toISOString()
        })
        .eq('user_profile_id', userProfileId);
      */

      console.log("Saving settings:", settings);
      setHasUnsavedChanges(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (
      window.confirm("Are you sure you want to reset all settings to default?")
    ) {
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
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      console.log("Exporting user data...");

      // In real implementation:
      // Call Supabase function to export all user data
      /* 
      const { data, error } = await supabase.rpc('export_user_data');
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dental-care-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }
      */

      // Mock success
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("Failed to export data");
    } finally {
      setLoading(false);
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
        // This would call Supabase auth.admin.deleteUser() and cascade delete all related data
      } catch (error) {
        console.error("Error deleting account:", error);
        setError("Failed to delete account");
      }
    }
  };

  const handlePasswordUpdate = async () => {
    if (settings.security.newPassword !== settings.security.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (settings.security.newPassword.length < 6) {
      setError("Password must be at least 6 characters long!");
      return;
    }

    try {
      setSaving(true);
      console.log("Updating password...");

      // Real implementation would use:
      // const { error } = await supabase.auth.updateUser({
      //   password: settings.security.newPassword
      // });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSettings((prev) => ({
        ...prev,
        security: {
          ...prev.security,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
      }));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating password:", error);
      setError("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Display & Format
        </h4>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-center">
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
            className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-sm min-w-[160px] transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 md:min-w-[160px] w-full"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (EU Format)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
          </select>
        </div>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-center">
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
            className="px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-sm min-w-[160px] transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 md:min-w-[160px] w-full"
          >
            <option value="12">12-hour (2:30 PM)</option>
            <option value="24">24-hour (14:30)</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Appearance
        </h4>
        <div className="flex justify-between items-start gap-4 py-5 md:flex-row flex-col md:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Theme
            </label>
            <span className="text-sm text-muted-foreground">
              Choose your preferred color theme
            </span>
          </div>
          <div className="flex gap-2 md:w-auto w-full">
            <button
              onClick={() => handleThemeChange("light")}
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all duration-300 md:flex-initial flex-1 justify-center ${
                theme === "light"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-card-foreground border-input hover:border-border hover:shadow-sm"
              }`}
            >
              <FiSun className="text-base" />
              <span>Light</span>
            </button>
            <button
              onClick={() => handleThemeChange("dark")}
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all duration-300 md:flex-initial flex-1 justify-center ${
                theme === "dark"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-card-foreground border-input hover:border-border hover:shadow-sm"
              }`}
            >
              <FiMoon className="text-base" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => handleThemeChange("system")}
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all duration-300 md:flex-initial flex-1 justify-center ${
                theme === "system"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-card-foreground border-input hover:border-border hover:shadow-sm"
              }`}
            >
              <FiSettings className="text-base" />
              <span>Auto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-8">
      {/* Notification Stats */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {notificationStats.totalNotifications}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Notifications
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {notificationStats.emailsSent}
            </div>
            <div className="text-sm text-muted-foreground">Emails Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {notificationStats.smsSent}
            </div>
            <div className="text-sm text-muted-foreground">SMS Sent</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Medical Notifications
        </h4>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-start">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
              <FiBell className="text-primary text-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                Appointment Reminders
              </label>
              <span className="text-sm text-muted-foreground leading-relaxed">
                Get reminded about upcoming appointments via email and SMS. This
                setting is always enabled for your safety and cannot be
                disabled.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-xl whitespace-nowrap">
            <FiCheckCircle className="text-base" />
            <span>Always Enabled</span>
          </div>
        </div>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
              <FiMail className="text-accent text-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                Treatment Updates
              </label>
              <span className="text-sm text-muted-foreground">
                Updates about your ongoing treatments and care plans
              </span>
            </div>
          </div>
          <label className="relative inline-block w-14 h-8 flex-shrink-0">
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
                  ? "bg-primary shadow-md"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${
                  settings.notifications.treatmentUpdates
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Communication Methods
        </h4>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 dark:bg-blue-950">
              <FiMessageSquare className="text-blue-600 text-lg dark:text-blue-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                SMS Notifications
              </label>
              <span className="text-sm text-muted-foreground">
                Receive text messages for important updates
              </span>
            </div>
          </div>
          <label className="relative inline-block w-14 h-8 flex-shrink-0">
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
                  ? "bg-primary shadow-md"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${
                  settings.notifications.smsNotifications
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 dark:bg-green-950">
              <FiBell className="text-green-600 text-lg dark:text-green-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                Push Notifications
              </label>
              <span className="text-sm text-muted-foreground">
                Browser notifications when you're online
              </span>
            </div>
          </div>
          <label className="relative inline-block w-14 h-8 flex-shrink-0">
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
                  ? "bg-primary shadow-md"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${
                  settings.notifications.pushNotifications
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>

        <div className="flex justify-between items-start gap-4 py-5 md:flex-row flex-col md:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 dark:bg-amber-950">
              <FiMail className="text-amber-600 text-lg dark:text-amber-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                Promotional Emails
              </label>
              <span className="text-sm text-muted-foreground">
                Special offers, health tips, and newsletter content
              </span>
            </div>
          </div>
          <label className="relative inline-block w-14 h-8 flex-shrink-0">
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
                  ? "bg-primary shadow-md"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${
                  settings.notifications.promotionalEmails
                    ? "translate-x-6"
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
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Marketing & Communications
        </h4>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 dark:bg-purple-950">
              <FiMail className="text-purple-600 text-lg dark:text-purple-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                Marketing Emails
              </label>
              <span className="text-sm text-muted-foreground leading-relaxed">
                Allow us to send you marketing emails about our services and
                special promotions
              </span>
            </div>
          </div>
          <label className="relative inline-block w-14 h-8 flex-shrink-0">
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
                  ? "bg-primary shadow-md"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${
                  settings.privacy.allowMarketingEmails
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Data Management
        </h4>
        <div className="p-6 border border-border rounded-xl bg-muted/20">
          <button
            onClick={handleExportData}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {loading ? (
              <FiLoader className="text-base animate-spin" />
            ) : (
              <FiDownload className="text-base" />
            )}
            <span>{loading ? "Exporting..." : "Export My Data"}</span>
          </button>
          <p className="text-sm text-muted-foreground m-0 leading-relaxed">
            Download a copy of all your personal data, medical records, and
            appointment history in a portable JSON format.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Password & Authentication
        </h4>

        <div className="bg-muted/20 rounded-xl p-6 space-y-6">
          <div className="space-y-3">
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
                className="w-full px-4 py-3 pr-12 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors duration-300"
              >
                {showCurrentPassword ? (
                  <FiEyeOff className="text-lg" />
                ) : (
                  <FiEye className="text-lg" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
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
                className="w-full px-4 py-3 pr-12 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors duration-300"
              >
                {showPassword ? (
                  <FiEyeOff className="text-lg" />
                ) : (
                  <FiEye className="text-lg" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
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
              className="w-full px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="Confirm new password"
            />
          </div>

          <button
            onClick={handlePasswordUpdate}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <FiLoader className="text-base animate-spin" />
            ) : (
              <FiLock className="text-base" />
            )}
            <span>{saving ? "Updating..." : "Update Password"}</span>
          </button>
        </div>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50 md:flex-row flex-col md:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 dark:bg-orange-950">
              <FiShield className="text-orange-600 text-lg dark:text-orange-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                Login Alerts
              </label>
              <span className="text-sm text-muted-foreground">
                Get notified via email when someone logs into your account
              </span>
            </div>
          </div>
          <label className="relative inline-block w-14 h-8 flex-shrink-0">
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
                  ? "bg-primary shadow-md"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${
                  settings.security.loginAlerts
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              ></span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Danger Zone
        </h4>
        <div className="border-2 border-red-200 rounded-xl p-6 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white border-2 border-red-600 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-red-700 hover:border-red-700 hover:shadow-md mb-3"
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

  if (loading) {
    return <Loader message={"Loading settings..."} />;
  }

  return (
    <div className="min-h-screen p-6 bg-background md:p-6 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FiCheckCircle className="text-xl flex-shrink-0" />
              <span className="font-medium">
                Settings updated successfully!
              </span>
            </motion.div>
          )}

          {error && (
            <motion.div
              className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 text-red-800 dark:bg-red-950 dark:border-red-700 dark:text-red-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FiAlertCircle className="text-xl flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

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
                Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your account preferences and security settings
              </p>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-start gap-3 md:w-auto w-full">
                <button
                  onClick={handleResetSettings}
                  className="flex items-center gap-2 px-6 py-3 bg-card text-card-foreground border-2 border-border rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:border-muted-foreground hover:bg-muted hover:shadow-sm md:flex-initial flex-1"
                >
                  <FiRotateCcw className="text-base" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:border-primary/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed md:flex-initial flex-1"
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
          {hasUnsavedChanges && (
            <motion.div
              className="mt-6 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-center dark:bg-amber-950 dark:border-amber-700"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                You have unsaved changes
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Settings Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <motion.div
            className="lg:col-span-3 lg:sticky lg:top-6 lg:h-fit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <nav className="bg-card border border-border rounded-2xl p-2 shadow-sm">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {settingSections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <motion.button
                      key={section.id}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl bg-none border-none cursor-pointer transition-all duration-300 text-left relative lg:flex-row flex-col lg:items-start items-center lg:text-left text-center lg:gap-4 gap-2 ${
                        activeSection === section.id
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-card-foreground hover:bg-muted/50"
                      }`}
                      onClick={() => setActiveSection(section.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <Icon
                        className={`text-xl flex-shrink-0 transition-colors duration-300 ${
                          activeSection === section.id ? "text-primary" : ""
                        }`}
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-base font-medium leading-tight">
                          {section.label}
                        </span>
                        <span className="text-xs opacity-80 leading-tight lg:block hidden">
                          {section.description}
                        </span>
                      </div>
                      {section.badge && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {section.badge}
                        </div>
                      )}
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
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-6 bg-muted/20 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">
                  {settingSections.find((s) => s.id === activeSection)?.label}
                </h2>
              </div>
              <div className="p-6">{renderSettingsContent()}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
