import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Clock,
  Database,
  Key,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Mail,
  Monitor,
  Sun,
  Moon,
  Calendar,
  Layout,
  LogOut,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  Activity,
  FileText,
  Languages,
  Timer,
  HardDrive,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useTheme } from "@/core/contexts/ThemeProvider";

const ClinicSettings = () => {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Settings State
  const [settings, setSettings] = useState({
    // Profile Settings
    profile: {
      full_name: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      signature: "",
    },

    // Notification Preferences
    notifications: {
      email_notifications: true,
      push_notifications: true,
      appointment_reminders: true,
      marketing_emails: false,
      system_alerts: true,
      login_notifications: true,
    },

    // Display Preferences
    display: {
      theme: "system",
      language: "en",
      timezone: "Asia/Manila",
      date_format: "MM/DD/YYYY",
      time_format: "12h",
    },

    // Dashboard Preferences
    dashboard: {
      dashboard_layout: "default",
      items_per_page: 10,
      default_calendar_view: "week",
      auto_backup: true,
    },

    // Security Settings
    security: {
      two_factor_enabled: false,
      session_timeout: 480,
      data_retention_days: 365,
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  // Activity Log State
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Load user settings and profile
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual Supabase calls
        // Get current user
        // const { data: { user } } = await supabase.auth.getUser();

        // Get user profile
        // const { data: profile } = await supabase
        //   .from('user_profiles')
        //   .select('*')
        //   .eq('id', user.id)
        //   .single();

        // Get user settings
        // const { data: userSettings } = await supabase
        //   .from('user_settings')
        //   .select('*')
        //   .eq('user_id', user.id)
        //   .single();

        // If no settings exist, create default ones
        // if (!userSettings) {
        //   const { data: newSettings } = await supabase
        //     .from('user_settings')
        //     .insert({ user_id: user.id })
        //     .select()
        //     .single();
        // }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock data based on your schema
        setSettings({
          profile: {
            full_name: "Maria Santos",
            email: "maria.santos@brightsmile.ph",
            phone: "+639171234567",
            position: "Clinic Manager",
            department: "Administration",
            signature:
              "Best regards,\nMaria Santos\nClinic Manager\nBright Smile Dental Clinic",
          },
          notifications: {
            email_notifications: true,
            push_notifications: true,
            appointment_reminders: true,
            marketing_emails: false,
            system_alerts: true,
            login_notifications: true,
          },
          display: {
            theme: theme,
            language: "en",
            timezone: "Asia/Manila",
            date_format: "MM/DD/YYYY",
            time_format: "12h",
          },
          dashboard: {
            dashboard_layout: "default",
            items_per_page: 10,
            default_calendar_view: "week",
            auto_backup: true,
          },
          security: {
            two_factor_enabled: false,
            session_timeout: 480,
            data_retention_days: 365,
            current_password: "",
            new_password: "",
            confirm_password: "",
          },
        });
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [theme]);

  // Load activity log
  const loadActivityLog = async () => {
    setLoadingActivity(true);
    try {
      // TODO: Replace with actual Supabase call
      // const { data: activities } = await supabase
      //   .from('user_activity_log')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false })
      //   .limit(20);

      // Mock activity log
      const mockActivities = [
        {
          id: 1,
          activity_type: "login",
          description: "Logged in successfully",
          ip_address: "192.168.1.100",
          user_agent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
        {
          id: 2,
          activity_type: "settings_update",
          description: "Updated notification preferences",
          ip_address: "192.168.1.100",
          user_agent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        },
        {
          id: 3,
          activity_type: "password_change",
          description: "Password changed successfully",
          ip_address: "192.168.1.100",
          user_agent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          created_at: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // 1 week ago
        },
      ];

      setActivityLog(mockActivities);
    } catch (error) {
      console.error("Error loading activity log:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Save settings
  const handleSaveSettings = async (section) => {
    setSaving(true);
    try {
      // TODO: Replace with actual Supabase calls
      // const { data: { user } } = await supabase.auth.getUser();

      if (section === "profile") {
        // Update user profile
        // const { error: profileError } = await supabase
        //   .from('user_profiles')
        //   .update({
        //     full_name: settings.profile.full_name,
        //     phone: settings.profile.phone,
        //   })
        //   .eq('id', user.id);
        // Update signature in user_settings
        // const { error: settingsError } = await supabase
        //   .from('user_settings')
        //   .update({ signature: settings.profile.signature })
        //   .eq('user_id', user.id);
      }

      if (
        section === "notifications" ||
        section === "display" ||
        section === "dashboard"
      ) {
        const settingsToUpdate = {};

        if (section === "notifications") {
          Object.assign(settingsToUpdate, settings.notifications);
        } else if (section === "display") {
          Object.assign(settingsToUpdate, settings.display);
        } else if (section === "dashboard") {
          Object.assign(settingsToUpdate, settings.dashboard);
        }

        // const { error } = await supabase
        //   .from('user_settings')
        //   .update(settingsToUpdate)
        //   .eq('user_id', user.id);
      }

      if (section === "security" && settings.security.new_password) {
        // Update password using Supabase Auth
        // const { error } = await supabase.auth.updateUser({
        //   password: settings.security.new_password
        // });

        // Log activity
        // await supabase
        //   .from('user_activity_log')
        //   .insert({
        //     user_id: user.id,
        //     activity_type: 'password_change',
        //     description: 'Password changed successfully'
        //   });

        // Clear password fields
        setSettings((prev) => ({
          ...prev,
          security: {
            ...prev.security,
            current_password: "",
            new_password: "",
            confirm_password: "",
          },
        }));
      }

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSaveMessage(
        `${
          section.charAt(0).toUpperCase() + section.slice(1)
        } settings saved successfully!`
      );
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveMessage("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    try {
      // TODO: Replace with actual Supabase call
      // const { error } = await supabase.auth.resetPasswordForEmail(
      //   settings.profile.email,
      //   { redirectTo: `${window.location.origin}/reset-password` }
      // );

      setSaveMessage("Password reset email sent successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error sending password reset:", error);
    }
  };

  // Handle theme change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setSettings((prev) => ({
      ...prev,
      display: { ...prev.display, theme: newTheme },
    }));
  };

  // Get activity icon
  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case "login":
        return <LogOut className="w-4 h-4 text-green-500" />;
      case "logout":
        return <LogOut className="w-4 h-4 text-gray-500" />;
      case "password_change":
        return <Key className="w-4 h-4 text-blue-500" />;
      case "settings_update":
        return <SettingsIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Tab configuration
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "display", label: "Display", icon: Palette },
    { id: "dashboard", label: "Dashboard", icon: Layout },
    { id: "security", label: "Security", icon: Shield },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="lg:col-span-3 h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and security settings
          </p>
        </div>

        {saveMessage && (
          <div
            className={`flex items-center px-4 py-2 rounded-lg ${
              saveMessage.includes("Error")
                ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            }`}
          >
            {saveMessage.includes("Error") ? (
              <AlertCircle className="w-4 h-4 mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {saveMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-4">
            <nav className="space-y-2">
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
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl p-6">
            {/* Profile Settings */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Profile Information
                  </h2>
                  <button
                    onClick={() => handleSaveSettings("profile")}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={settings.profile.full_name}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            full_name: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={settings.profile.phone}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, phone: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      value={settings.profile.position}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Email Signature
                  </label>
                  <textarea
                    value={settings.profile.signature}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, signature: e.target.value },
                      }))
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder="Enter your email signature..."
                  />
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Notification Preferences
                  </h2>
                  <button
                    onClick={() => handleSaveSettings("notifications")}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="space-y-4">
                  {Object.entries({
                    email_notifications: {
                      icon: Mail,
                      label: "Email Notifications",
                      desc: "Receive notifications via email",
                    },
                    push_notifications: {
                      icon: Smartphone,
                      label: "Push Notifications",
                      desc: "Receive push notifications in browser",
                    },
                    appointment_reminders: {
                      icon: Calendar,
                      label: "Appointment Reminders",
                      desc: "Get reminded about upcoming appointments",
                    },
                    system_alerts: {
                      icon: AlertCircle,
                      label: "System Alerts",
                      desc: "Important system notifications and updates",
                    },
                    login_notifications: {
                      icon: Shield,
                      label: "Login Notifications",
                      desc: "Get notified when someone logs into your account",
                    },
                    marketing_emails: {
                      icon: Mail,
                      label: "Marketing Emails",
                      desc: "Receive promotional emails and updates",
                    },
                  }).map(([key, config]) => {
                    const IconComponent = config.icon;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent className="w-5 h-5 text-primary mt-0.5" />
                          <div>
                            <h3 className="font-medium text-card-foreground">
                              {config.label}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {config.desc}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications[key]}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  [key]: e.target.checked,
                                },
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Display Settings */}
            {activeTab === "display" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Display Preferences
                  </h2>
                  <button
                    onClick={() => handleSaveSettings("display")}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-3">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon },
                        { value: "system", label: "System", icon: Monitor },
                      ].map((themeOption) => {
                        const IconComponent = themeOption.icon;
                        return (
                          <button
                            key={themeOption.value}
                            onClick={() => handleThemeChange(themeOption.value)}
                            className={`flex flex-col items-center p-4 border rounded-lg transition-colors ${
                              settings.display.theme === themeOption.value
                                ? "border-primary bg-primary/10 text-primary"
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

                  {/* Other Display Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Language
                      </label>
                      <select
                        value={settings.display.language}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            display: {
                              ...prev.display,
                              language: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="en">English</option>
                        <option value="fil">Filipino</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Timezone
                      </label>
                      <select
                        value={settings.display.timezone}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            display: {
                              ...prev.display,
                              timezone: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="Asia/Manila">Philippines (GMT+8)</option>
                        <option value="Asia/Singapore">
                          Singapore (GMT+8)
                        </option>
                        <option value="UTC">UTC (GMT+0)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Date Format
                      </label>
                      <select
                        value={settings.display.date_format}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            display: {
                              ...prev.display,
                              date_format: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Time Format
                      </label>
                      <select
                        value={settings.display.time_format}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            display: {
                              ...prev.display,
                              time_format: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="12h">12 Hour</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Settings */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Dashboard Preferences
                  </h2>
                  <button
                    onClick={() => handleSaveSettings("dashboard")}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Dashboard Layout
                    </label>
                    <select
                      value={settings.dashboard.dashboard_layout}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          dashboard: {
                            ...prev.dashboard,
                            dashboard_layout: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="compact">Compact</option>
                      <option value="default">Default</option>
                      <option value="expanded">Expanded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Items Per Page
                    </label>
                    <select
                      value={settings.dashboard.items_per_page}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          dashboard: {
                            ...prev.dashboard,
                            items_per_page: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Default Calendar View
                    </label>
                    <select
                      value={settings.dashboard.default_calendar_view}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          dashboard: {
                            ...prev.dashboard,
                            default_calendar_view: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="day">Day View</option>
                      <option value="week">Week View</option>
                      <option value="month">Month View</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <h3 className="font-medium text-card-foreground">
                        Auto Backup
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically backup your data
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.dashboard.auto_backup}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            dashboard: {
                              ...prev.dashboard,
                              auto_backup: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Security Settings
                </h2>

                {/* Password Change */}
                <div className="p-6 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-card-foreground">
                        Change Password
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Update your account password
                      </p>
                    </div>
                    <button
                      onClick={handlePasswordReset}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      Send reset email instead
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={settings.security.current_password}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              security: {
                                ...prev.security,
                                current_password: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

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
                      onClick={() => handleSaveSettings("security")}
                      disabled={
                        !settings.security.current_password ||
                        !settings.security.new_password ||
                        settings.security.new_password !==
                          settings.security.confirm_password ||
                        saving
                      }
                      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {saving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-medium text-card-foreground">
                          Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.two_factor_enabled}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              two_factor_enabled: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Session Timeout (minutes)
                    </label>
                    <select
                      value={settings.security.session_timeout}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          security: {
                            ...prev.security,
                            session_timeout: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={240}>4 hours</option>
                      <option value={480}>8 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Data Retention Period (days)
                    </label>
                    <select
                      value={settings.security.data_retention_days}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          security: {
                            ...prev.security,
                            data_retention_days: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                      <option value={365}>1 year</option>
                      <option value={1095}>3 years</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Log */}
            {activeTab === "activity" && (
              <div className="space-y-6">
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
                        No Activity
                      </h3>
                      <p className="text-muted-foreground">
                        No recent activity to display
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
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-card-foreground">
                                {activity.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  activity.created_at
                                ).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(
                                  activity.created_at
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{activity.ip_address}</span>
                              <span>•</span>
                              <span className="truncate max-w-xs">
                                {activity.user_agent?.split(" ")[0]}
                              </span>
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
  );
};

export default ClinicSettings;
