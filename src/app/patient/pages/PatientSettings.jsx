import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSettings,
  FiBell,
  FiMoon,
  FiSun,
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiMail,
  FiDownload,
  FiTrash2,
  FiShield,
} from "react-icons/fi";
import { useTheme } from "@/core/contexts/ThemeProvider";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import Loader from "@/core/components/Loader";

/**
 * ✅ Production-Ready Patient Settings Component
 * - Uses AuthProvider methods where available
 * - Direct Supabase queries for notification preferences (RPC doesn't support them)
 * - Aligned with database schema
 */
const PatientSettings = () => {
  const { theme, setTheme } = useTheme();
  const { user, profile, updatePassword: authUpdatePassword } = useAuth();
  const [activeSection, setActiveSection] = useState("notifications");
  const [showPassword, setShowPassword] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
    },
    appearance: {
      theme: theme,
    },
    security: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const settingSections = [
    {
      id: "notifications",
      label: "Notifications",
      icon: FiBell,
      description: "Email notification preferences",
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: FiMoon,
      description: "Theme and display settings",
    },
    {
      id: "security",
      label: "Security",
      icon: FiLock,
      description: "Password and account security",
    },
    {
      id: "privacy",
      label: "Privacy & Data",
      icon: FiShield,
      description: "Data export and account deletion",
    },
  ];

  // ✅ Load notification settings from context or database
  useEffect(() => {
    if (profile?.patient_profile) {
      // Load from context if available
      setSettings((prev) => ({
        ...prev,
        notifications: {
          emailNotifications:
            profile.patient_profile.email_notifications ?? true,
        },
      }));
      setLoading(false);
    } else if (user && profile) {
      loadNotificationSettings();
    }
  }, [user, profile]);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Fetch notification settings directly (RPC doesn't return these)
      const { data: patientData, error: patientError } = await supabase
        .from("patient_profiles")
        .select("email_notifications")
        .eq("user_profile_id", profile?.profile?.id)
        .single();

      if (patientError) throw patientError;

      setSettings((prev) => ({
        ...prev,
        notifications: {
          emailNotifications: patientData.email_notifications ?? true,
        },
      }));
    } catch (error) {
      console.error("❌ Error loading settings:", error);
      setError("Failed to load notification settings.");
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
    handleSettingChange("appearance", "theme", newTheme);
    // Theme is saved to localStorage by ThemeProvider
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      // ✅ Update notification preferences directly
      // (update_patient_profile RPC doesn't support email_notifications)
      const { error: updateError } = await supabase
        .from("patient_profiles")
        .update({
          email_notifications: settings.notifications.emailNotifications,
          updated_at: new Date().toISOString(),
        })
        .eq("user_profile_id", profile.id);

      if (updateError) throw updateError;

      setHasUnsavedChanges(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error saving settings:", error);
      setError(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    const { newPassword, confirmPassword } = settings.security;

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long!");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // ✅ Use AuthProvider's updatePassword method
      const result = await authUpdatePassword(newPassword);

      if (!result.success) {
        throw new Error(result.error || "Failed to update password");
      }

      setSettings((prev) => ({
        ...prev,
        security: {
          newPassword: "",
          confirmPassword: "",
        },
      }));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error updating password:", error);
      setError(error.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Get user ID from context
      const userId = profile.user_id;

      // Fetch all user data
      const [profileRes, patientRes, appointmentsRes, feedbackRes] =
        await Promise.all([
          supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", userId)
            .single(),
          supabase
            .from("patient_profiles")
            .select("*")
            .eq("user_profile_id", profile.id)
            .single(),
          supabase.from("appointments").select("*").eq("patient_id", userId),
          supabase.from("feedback").select("*").eq("patient_id", userId),
        ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        export_format: "DentServe Patient Data Export (GDPR Compliant)",
        user_info: {
          email: user.email,
          user_id: userId,
        },
        profile: profileRes.data,
        patient_profile: patientRes.data,
        appointments: appointmentsRes.data || [],
        feedback: feedbackRes.data || [],
      };

      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dentserve-data-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error exporting data:", error);
      setError("Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete your account and all data.\n\n" +
        "This includes:\n" +
        "- Profile information\n" +
        "- Appointment history\n" +
        "- Medical records\n" +
        "- Feedback history\n\n" +
        "This action CANNOT be undone.\n\n" +
        "Are you absolutely sure?"
    );

    if (!confirmed) return;

    const doubleConfirm = window.prompt('Type "DELETE MY ACCOUNT" to confirm:');

    if (doubleConfirm !== "DELETE MY ACCOUNT") {
      setError("Account deletion cancelled");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Note: Account deletion requires admin API (not available in free plan)
      // Sign out and direct to support
      await supabase.auth.signOut();
      alert(
        "To complete account deletion, please contact support:\nsupport@dentserve.com"
      );
      window.location.href = "/";
    } catch (error) {
      console.error("❌ Error deleting account:", error);
      setError("Please contact support for account deletion assistance.");
      setLoading(false);
    }
  };

  const renderNotificationSettings = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Email Notifications
        </h4>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>📧 Note:</strong> Appointment reminders are always sent via
            email to ensure you don't miss your dental appointments.
          </p>
        </div>

        <div className="flex justify-between items-start gap-4 py-5 border-b border-border/50">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
              <FiMail className="text-primary text-lg" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium text-foreground">
                Email Notifications
              </label>
              <span className="text-sm text-muted-foreground leading-relaxed">
                Receive email notifications about appointments, treatments, and
                important updates. Appointment reminders are always sent for
                safety.
              </span>
            </div>
          </div>
          <label className="relative inline-block w-14 h-8 flex-shrink-0">
            <input
              type="checkbox"
              checked={settings.notifications.emailNotifications}
              onChange={(e) =>
                handleSettingChange(
                  "notifications",
                  "emailNotifications",
                  e.target.checked
                )
              }
              className="opacity-0 w-0 h-0"
            />
            <span
              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                settings.notifications.emailNotifications
                  ? "bg-primary shadow-md"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-1 bottom-1 bg-white w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${
                  settings.notifications.emailNotifications
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

  const renderAppearanceSettings = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Theme Preference
        </h4>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium text-foreground">
              Color Theme
            </label>
            <span className="text-sm text-muted-foreground">
              Choose your preferred color theme. Saved locally in your browser.
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleThemeChange("light")}
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all duration-300 ${
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
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all duration-300 ${
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
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                theme === "system"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-card-foreground border-input hover:border-border hover:shadow-sm"
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

  const renderSecuritySettings = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Change Password
        </h4>

        <div className="bg-muted/20 rounded-xl p-6 space-y-6">
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
                className="w-full px-4 py-3 pr-12 border-2 border-input bg-input text-foreground rounded-xl transition-all focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="Enter new password (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
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
              className="w-full px-4 py-3 border-2 border-input bg-input text-foreground rounded-xl transition-all focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="Confirm new password"
            />
          </div>

          <button
            onClick={handlePasswordUpdate}
            disabled={saving || !settings.security.newPassword}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiLock />}
            <span>{saving ? "Updating..." : "Update Password"}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Data Management
        </h4>
        <div className="p-6 border border-border rounded-xl bg-muted/20">
          <button
            onClick={handleExportData}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiDownload />}
            <span>{loading ? "Exporting..." : "Export My Data"}</span>
          </button>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Download all your personal data, medical records, appointment
            history, and feedback in JSON format (GDPR compliance).
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-lg font-semibold text-foreground pb-4 border-b border-border">
          Danger Zone
        </h4>
        <div className="border-2 border-red-200 dark:border-red-800 rounded-xl p-6 bg-red-50 dark:bg-red-950/20">
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium transition-all hover:bg-red-700 mb-3"
          >
            <FiTrash2 />
            <span>Delete Account</span>
          </button>
          <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">
            <strong>Warning:</strong> Permanently delete your account and all
            data. This action cannot be undone. You will need to contact support
            to complete this process.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeSection) {
      case "notifications":
        return renderNotificationSettings();
      case "appearance":
        return renderAppearanceSettings();
      case "security":
        return renderSecuritySettings();
      case "privacy":
        return renderPrivacySettings();
      default:
        return renderNotificationSettings();
    }
  };

  if (loading) {
    return <Loader message="Loading settings..." />;
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="mb-6 p-4 bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-700 rounded-xl flex items-center gap-3 text-green-800 dark:text-green-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FiCheckCircle className="text-xl flex-shrink-0" />
              <span className="font-medium">Settings saved successfully!</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              className="mb-6 p-4 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-700 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-200"
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
        >
          <div className="flex justify-between items-start gap-6 flex-col md:flex-row">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your preferences and account security
              </p>
            </div>
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            )}
          </div>
          {hasUnsavedChanges && (
            <motion.div
              className="mt-6 px-4 py-3 bg-amber-50 dark:bg-amber-950 border-2 border-amber-200 dark:border-amber-700 rounded-xl text-center"
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
            className="lg:col-span-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <nav className="bg-card border border-border rounded-2xl p-2 shadow-sm">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {settingSections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <motion.button
                      key={section.id}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all text-left ${
                        activeSection === section.id
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-card-foreground hover:bg-muted/50"
                      }`}
                      onClick={() => setActiveSection(section.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Icon className="text-xl flex-shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-base font-medium">
                          {section.label}
                        </span>
                        <span className="text-xs opacity-80 hidden lg:block">
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

export default PatientSettings;
