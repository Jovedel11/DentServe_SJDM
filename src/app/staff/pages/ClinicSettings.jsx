import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Shield,
  Palette,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Mail,
  Monitor,
  Sun,
  Moon,
  Activity,
  LogOut,
  RefreshCw,
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/core/contexts/ThemeProvider";
import { useAuth } from "@/auth/context/AuthProvider";
import { useIsMobile } from "@/core/hooks/use-mobile";

const ClinicSettings = () => {
  const { theme, setTheme } = useTheme();
  const { user, updatePassword: authUpdatePassword } = useAuth();
  const isMobile = useIsMobile();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    notifications: {
      email_enabled: true,
    },
    security: {
      new_password: "",
      confirm_password: "",
    },
  });

  // Activity Log State
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Load notification settings
  useEffect(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem(`staff_settings_${user?.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          notifications: parsed.notifications || prev.notifications,
        }));
      } catch (e) {
        console.error("Error parsing saved settings:", e);
      }
    }
  }, [user]);

  // Load activity log
  const loadActivityLog = async () => {
    setLoadingActivity(true);
    try {
      // Fetch recent login activity from Supabase auth.audit_log_entries if available
      // For now, show recent sessions
      const mockActivities = [
        {
          id: 1,
          activity_type: "login",
          description: "Logged in successfully",
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          activity_type: "password_change",
          description: "Password changed",
          created_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ];

      setActivityLog(mockActivities);
    } catch (error) {
      console.error("❌ Error loading activity log:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Handle theme change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  // Save notification settings
  const handleSaveNotifications = async () => {
    setSaving(true);
    setError(null);

    try {
      // Save to localStorage
      const settingsToSave = {
        notifications: settings.notifications,
      };
      localStorage.setItem(
        `staff_settings_${user.id}`,
        JSON.stringify(settingsToSave)
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error saving settings:", error);
      setError(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    const { new_password, confirm_password } = settings.security;

    if (!new_password || !confirm_password) {
      setError("Please fill in all password fields");
      return;
    }

    if (new_password !== confirm_password) {
      setError("Passwords don't match!");
      return;
    }

    if (new_password.length < 6) {
      setError("Password must be at least 6 characters long!");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result = await authUpdatePassword(new_password);

      if (!result.success) {
        throw new Error(result.error || "Failed to update password");
      }

      setSettings((prev) => ({
        ...prev,
        security: {
          new_password: "",
          confirm_password: "",
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

  // Get activity icon
  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case "login":
        return <LogOut className="w-4 h-4 text-green-500" />;
      case "password_change":
        return <Key className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Tab configuration
  const tabs = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className={`min-h-screen ${isMobile ? "p-4" : "p-6"} bg-background`}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="p-4 bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-700 rounded-xl flex items-center gap-3 text-green-800 dark:text-green-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Settings saved successfully!</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              className="p-4 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-700 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1
            className={`${
              isMobile ? "text-2xl" : "text-3xl"
            } font-bold text-foreground`}
          >
            Security
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage your preferences and account security
          </p>
        </motion.div>

        <div
          className={`grid grid-cols-1 ${
            isMobile ? "gap-6" : "lg:grid-cols-4 gap-8"
          }`}
        >
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-3 md:p-4">
              <nav
                className={`${
                  isMobile ? "grid grid-cols-2 gap-2" : "space-y-2"
                }`}
              >
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id === "activity") {
                          loadActivityLog();
                        }
                      }}
                      className={`w-full flex items-center ${
                        isMobile ? "flex-col" : "flex-row"
                      } ${
                        isMobile ? "p-3" : "px-3 py-2"
                      } text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <IconComponent
                        className={`w-4 h-4 ${isMobile ? "mb-1" : "mr-3"}`}
                      />
                      <span className={isMobile ? "text-xs" : ""}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Appearance Settings */}
              {activeTab === "appearance" && (
                <div className="p-4 md:p-6 space-y-6">
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Appearance
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-3">
                        Theme
                      </label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose your preferred color theme for the interface
                      </p>
                      <div
                        className={`grid ${
                          isMobile ? "grid-cols-3" : "grid-cols-3"
                        } gap-3`}
                      >
                        {[
                          { value: "light", label: "Light", icon: Sun },
                          { value: "dark", label: "Dark", icon: Moon },
                          { value: "system", label: "System", icon: Monitor },
                        ].map((themeOption) => {
                          const IconComponent = themeOption.icon;
                          return (
                            <button
                              key={themeOption.value}
                              onClick={() =>
                                handleThemeChange(themeOption.value)
                              }
                              className={`flex flex-col items-center p-4 border-2 rounded-xl transition-all ${
                                theme === themeOption.value
                                  ? "border-primary bg-primary/10 text-primary shadow-md"
                                  : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <IconComponent className="w-6 h-6 mb-2" />
                              <span className="text-sm font-medium">
                                {themeOption.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === "security" && (
                <div className="p-4 md:p-6 space-y-6">
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Security
                  </h2>

                  <div className="p-4 md:p-6 border border-border rounded-lg bg-muted/20">
                    <div className="mb-4">
                      <h3 className="font-medium text-card-foreground mb-1">
                        Change Password
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Update your account password for better security
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={settings.security.new_password}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                security: {
                                  ...prev.security,
                                  new_password: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Enter new password (min 6 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={settings.security.confirm_password}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                security: {
                                  ...prev.security,
                                  confirm_password: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handlePasswordUpdate}
                        disabled={
                          !settings.security.new_password ||
                          settings.security.new_password !==
                            settings.security.confirm_password ||
                          saving
                        }
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="w-4 h-4 mr-2" />
                        )}
                        {saving ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Log */}
              {activeTab === "activity" && (
                <div className="p-4 md:p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-card-foreground">
                      Recent Activity
                    </h2>
                    <button
                      onClick={loadActivityLog}
                      disabled={loadingActivity}
                      className="inline-flex items-center px-4 py-2 text-sm bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${
                          loadingActivity ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </button>
                  </div>

                  <div className="space-y-3">
                    {loadingActivity ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="animate-pulse p-4 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-muted rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                                <div className="h-3 bg-muted rounded w-1/4"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activityLog.length === 0 ? (
                      <div className="text-center py-12">
                        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-card-foreground mb-2">
                          No Activity Yet
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Your recent account activity will appear here
                        </p>
                      </div>
                    ) : (
                      activityLog.map((activity) => (
                        <div
                          key={activity.id}
                          className="p-4 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <p className="text-sm font-medium text-card-foreground">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    activity.created_at
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicSettings;
