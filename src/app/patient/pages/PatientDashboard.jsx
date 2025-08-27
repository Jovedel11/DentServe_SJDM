import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  Star,
  CheckCircle2,
  Stethoscope,
  Activity,
  BarChart3,
  ArrowRight,
  Search,
  Navigation,
  Phone,
  Calendar as CalendarIcon,
  TrendingUp,
  Award,
  Shield,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  format,
  isToday,
  isTomorrow,
  differenceInDays,
  parseISO,
} from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/core/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "@/auth/context/AuthProvider";

/**
 * Enhanced Professional Patient Dashboard
 */
const PatientDashboard = () => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State management for different data sections
  const [userProfile, setUserProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [healthAnalytics, setHealthAnalytics] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [appointmentTrends, setAppointmentTrends] = useState([]);

  // Load all dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // In real implementation, these would be actual Supabase calls:
      /*
      const [analyticsResult, healthResult, profileResult, appointmentsResult] = await Promise.all([
        supabase.rpc('get_patient_analytics'),
        supabase.rpc('get_patient_health_analytics'),
        supabase.from('user_profiles').select('first_name, last_name, profile_image_url').single(),
        supabase.from('appointments')
          .select(`
            *,
            clinics(name, address, phone),
            doctors(user_profiles(first_name, last_name, profile_image_url))
          `)
          .eq('patient_id', userId)
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(5)
      ]);
      */

      // Mock loading delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock data setup
      const mockUserProfile = {
        first_name: profile?.profile?.first_name,
        last_name: profile?.profile?.last_name,
        profile_image_url: profile?.profile?.profile_image_url,
      };

      const mockAnalytics = {
        total_appointments: 24,
        completed_appointments: 20,
        cancelled_appointments: 2,
        no_show_appointments: 1,
        upcoming_appointments: 1,
        favorite_clinic: {
          clinic_id: "clinic_1",
          clinic_name: "SmileCare Dental Center",
        },
        last_appointment: "2024-01-15",
        health_score: 83,
      };

      const mockHealthAnalytics = {
        health_score: 83,
        improvement_trend: 1.5,
        total_appointments: 24,
        completed_treatments: 20,
        consistency_rating: 85,
        last_visit: "2024-01-15",
        next_recommended_visit: "2024-07-15",
      };

      const mockUpcomingAppointments = [
        {
          id: "1",
          appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          appointment_time: "14:00:00",
          status: "confirmed",
          service: "Dental Cleaning",
          clinics: {
            name: "SmileCare Dental Center",
            address: "123 Katipunan Ave, Quezon City",
            phone: "+63 917 123 4567",
          },
          doctors: {
            user_profiles: {
              first_name: "Dr. Maria",
              last_name: "Santos",
              profile_image_url:
                "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
            },
          },
        },
        {
          id: "2",
          appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          appointment_time: "10:30:00",
          status: "pending",
          service: "Braces Adjustment",
          clinics: {
            name: "Cruz Orthodontic Center",
            address: "789 Ayala Ave, Makati City",
            phone: "+63 917 987 6543",
          },
          doctors: {
            user_profiles: {
              first_name: "Dr. Roberto",
              last_name: "Cruz",
              profile_image_url:
                "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
            },
          },
        },
      ];

      const mockTrendsData = [
        {
          month: "Oct",
          appointments: 3,
          completed: 3,
          cancelled: 0,
          health_score: 78,
        },
        {
          month: "Nov",
          appointments: 4,
          completed: 3,
          cancelled: 1,
          health_score: 80,
        },
        {
          month: "Dec",
          appointments: 5,
          completed: 4,
          cancelled: 1,
          health_score: 82,
        },
        {
          month: "Jan",
          appointments: 6,
          completed: 5,
          cancelled: 1,
          health_score: 83,
        },
        {
          month: "Feb",
          appointments: 4,
          completed: 4,
          cancelled: 0,
          health_score: 85,
        },
        {
          month: "Mar",
          appointments: 2,
          completed: 1,
          cancelled: 0,
          health_score: 83,
        },
      ];

      const mockRecentActivity = [
        {
          id: "1",
          type: "appointment_confirmed",
          title: "Appointment Confirmed",
          description:
            "Your appointment with Dr. Maria Santos has been confirmed for tomorrow",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          icon: CheckCircle2,
          color: "text-success",
          priority: "high",
        },
        {
          id: "2",
          type: "health_improvement",
          title: "Health Score Improved",
          description: "Your dental health score increased to 83% (+2 points)",
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          icon: TrendingUp,
          color: "text-success",
          priority: "medium",
        },
        {
          id: "3",
          type: "review_submitted",
          title: "Review Submitted",
          description: "Thank you for rating Dr. Michael Tan - 5 stars",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          icon: Star,
          color: "text-warning",
          priority: "low",
        },
      ];

      // Set state
      setUserProfile(mockUserProfile);
      setAnalytics(mockAnalytics);
      setHealthAnalytics(mockHealthAnalytics);
      setUpcomingAppointments(mockUpcomingAppointments);
      setAppointmentTrends(mockTrendsData);
      setRecentActivity(mockRecentActivity);
      setPendingReviews([
        {
          id: "1",
          appointment_id: "appt_1",
          doctor_name: "Dr. Jennifer Lim",
          doctor_image:
            "https://images.unsplash.com/photo-1594824797384-5ee1ec5d9e3b?w=400&h=400&fit=crop&crop=face",
          clinic_name: "Advanced Oral Surgery Center",
          service: "Tooth Extraction",
          appointment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError(
        "Failed to load dashboard data. Please try refreshing the page."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Utility functions
  const getAppointmentTimeLabel = (date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    const days = differenceInDays(date, new Date());
    if (days <= 7) return `In ${days} days`;
    return format(date, "MMM dd");
  };

  const getHealthScoreColor = (score) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getTrendIcon = (trend) => {
    return trend > 1 ? TrendingUp : trend < 1 ? TrendingUp : Activity;
  };

  // Quick action handlers
  const handleBookAppointment = () => {
    window.location.href = "/patient/book-appointment";
  };

  const handleViewAppointments = () => {
    window.location.href = "/patient/appointments";
  };

  const handleFindDentist = () => {
    window.location.href = "/patient/dentists";
  };

  const handleFindClinics = () => {
    window.location.href = "/patient/clinics";
  };

  const handleSubmitReview = (appointmentId) => {
    window.location.href = `/patient/appointments/${appointmentId}/review`;
  };

  // Chart configurations
  const chartConfig = {
    appointments: {
      label: "Total Appointments",
      color: "hsl(var(--primary))",
    },
    completed: {
      label: "Completed",
      color: "hsl(var(--success))",
    },
    cancelled: {
      label: "Cancelled",
      color: "hsl(var(--destructive))",
    },
    health_score: {
      label: "Health Score",
      color: "hsl(var(--accent))",
    },
  };

  const statusChartData = [
    {
      name: "Completed",
      value: analytics?.completed_appointments || 0,
      color: "hsl(var(--success))",
    },
    {
      name: "Upcoming",
      value: analytics?.upcoming_appointments || 0,
      color: "hsl(var(--info))",
    },
    {
      name: "Cancelled",
      value: analytics?.cancelled_appointments || 0,
      color: "hsl(var(--destructive))",
    },
    {
      name: "No Show",
      value: analytics?.no_show_appointments || 0,
      color: "hsl(var(--warning))",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          {/* Enhanced Loading Animation */}
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Loading your dashboard...
              </h2>
              <p className="text-muted-foreground">
                Gathering your latest health insights
              </p>
            </div>
          </div>

          {/* Loading Skeleton */}
          <div className="space-y-8 animate-pulse">
            <div className="h-8 bg-muted rounded-lg w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-2xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-96 bg-muted rounded-2xl"></div>
              <div className="h-96 bg-muted rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-destructive/20 rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-3xl"></div>
          <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8">
            <div className="flex items-center justify-between md:flex-row flex-col md:text-left text-center gap-6">
              <div className="flex items-center gap-6 md:flex-row flex-col">
                {userProfile?.profile_image_url && (
                  <div className="relative">
                    <img
                      src={userProfile.profile_image_url}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border-4 border-primary/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-2 border-background flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {getGreeting()}, {userProfile?.first_name || "Welcome back"}
                    ! 👋
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Here's your personalized dental health overview
                  </p>
                </div>
              </div>

              {/* Health Score Badge */}
              {healthAnalytics?.health_score && (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Health Score
                      </span>
                    </div>
                    <div
                      className={`text-2xl font-bold ${getHealthScoreColor(
                        healthAnalytics.health_score
                      )}`}
                    >
                      {healthAnalytics.health_score}%
                    </div>
                  </div>
                  {healthAnalytics.improvement_trend > 1 && (
                    <div className="flex items-center gap-1 text-success">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Improving</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Total Appointments */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Total
                </div>
                <div className="text-sm text-muted-foreground">All Time</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {analytics?.total_appointments || 0}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Appointments
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-muted-foreground">
                  {analytics?.completed_appointments || 0} completed
                </span>
              </div>
            </div>
          </div>

          {/* Health Score */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-success/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-success/10 rounded-xl group-hover:bg-success/20 transition-colors">
                <Activity className="h-6 w-6 text-success" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Health
                </div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            </div>
            <div className="space-y-1">
              <div
                className={`text-3xl font-bold ${getHealthScoreColor(
                  healthAnalytics?.health_score || 0
                )}`}
              >
                {healthAnalytics?.health_score || 0}%
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Health Score
              </div>
              {healthAnalytics?.improvement_trend > 1 && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                  <span>
                    +
                    {((healthAnalytics.improvement_trend - 1) * 100).toFixed(0)}
                    % trend
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-info/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-info/10 rounded-xl group-hover:bg-info/20 transition-colors">
                <Clock className="h-6 w-6 text-info" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Next
                </div>
                <div className="text-sm text-muted-foreground">Visit</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {analytics?.upcoming_appointments || 0}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Scheduled
              </div>
              {healthAnalytics?.next_recommended_visit && (
                <div className="text-xs text-muted-foreground">
                  Next recommended:{" "}
                  {format(
                    parseISO(healthAnalytics.next_recommended_visit),
                    "MMM dd"
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Consistency Rating */}
          <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-warning/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-warning/10 rounded-xl group-hover:bg-warning/20 transition-colors">
                <Award className="h-6 w-6 text-warning" />
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Care
                </div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-foreground">
                {healthAnalytics?.consistency_rating || 0}%
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Consistency
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Great routine!</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Quick Actions
              </h2>
              <p className="text-sm text-muted-foreground">
                Everything you need at your fingertips
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={handleBookAppointment}
              className="group relative p-6 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl hover:from-primary/10 hover:to-primary/20 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Book Appointment
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Schedule your next visit
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            </button>

            <button
              onClick={handleFindDentist}
              className="group relative p-6 bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-2xl hover:from-success/10 hover:to-success/20 hover:border-success/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-success/10 rounded-xl group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                  <Stethoscope className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Find Specialists
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Browse expert dentists
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-success" />
              </div>
            </button>

            <button
              onClick={handleFindClinics}
              className="group relative p-6 bg-gradient-to-br from-info/5 to-info/10 border border-info/20 rounded-2xl hover:from-info/10 hover:to-info/20 hover:border-info/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-info/10 rounded-xl group-hover:bg-info/20 group-hover:scale-110 transition-all duration-300">
                  <Search className="h-6 w-6 text-info" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Find Clinics
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Discover nearby centers
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-info" />
              </div>
            </button>

            <button
              onClick={() =>
                (window.location.href = "/patient/health-insights")
              }
              className="group relative p-6 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl hover:from-accent/10 hover:to-accent/20 hover:border-accent/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-accent/10 rounded-xl group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Health Insights
                  </div>
                  <div className="text-sm text-muted-foreground">
                    View detailed analytics
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-accent" />
              </div>
            </button>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Appointments - Enhanced */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Upcoming Appointments
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your scheduled dental visits
                  </p>
                </div>
                <button
                  onClick={handleViewAppointments}
                  className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Schedule your next dental visit to maintain optimal oral
                      health.
                    </p>
                    <button
                      onClick={handleBookAppointment}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                ) : (
                  upcomingAppointments.map((appointment, index) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={
                              appointment.doctors.user_profiles
                                .profile_image_url
                            }
                            alt={`${appointment.doctors.user_profiles.first_name} ${appointment.doctors.user_profiles.last_name}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-border group-hover:border-primary/30 transition-colors"
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground">
                              {appointment.doctors.user_profiles.first_name}{" "}
                              {appointment.doctors.user_profiles.last_name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  appointment.status === "confirmed"
                                    ? "bg-success/10 text-success border border-success/20"
                                    : "bg-warning/10 text-warning border border-warning/20"
                                }`}
                              >
                                {appointment.status.charAt(0).toUpperCase() +
                                  appointment.status.slice(1)}
                              </span>
                              <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium">
                                {getAppointmentTimeLabel(
                                  appointment.appointment_date
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="font-medium text-foreground">
                                {appointment.service}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">
                                {appointment.clinics.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(
                                    appointment.appointment_date,
                                    "MMM dd, yyyy"
                                  )}{" "}
                                  at{" "}
                                  {format(
                                    new Date(
                                      `2000-01-01T${appointment.appointment_time}`
                                    ),
                                    "h:mm a"
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{appointment.clinics.address}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                window.open(
                                  `tel:${appointment.clinics.phone}`,
                                  "_self"
                                )
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors text-sm font-medium"
                            >
                              <Phone className="h-4 w-4" />
                              Call Clinic
                            </button>
                            <button
                              onClick={() =>
                                window.open(
                                  `https://maps.google.com/?q=${encodeURIComponent(
                                    appointment.clinics.address
                                  )}`,
                                  "_blank"
                                )
                              }
                              className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-xl hover:bg-muted/50 transition-colors text-sm font-medium"
                            >
                              <Navigation className="h-4 w-4" />
                              Get Directions
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Enhanced Analytics Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Health & Appointment Trends
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Your dental health journey over the past 6 months
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>

                <ChartContainer config={chartConfig} className="h-[350px]">
                  <BarChart data={appointmentTrends}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="completed"
                      stackId="appointments"
                      fill="var(--color-completed)"
                      radius={[0, 0, 0, 0]}
                      name="Completed"
                    />
                    <Bar
                      dataKey="cancelled"
                      stackId="appointments"
                      fill="var(--color-cancelled)"
                      radius={[4, 4, 0, 0]}
                      name="Cancelled"
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Health Score Progress */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-gradient-to-br from-success/5 via-primary/5 to-accent/5 border border-success/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/20 rounded-xl">
                      <Activity className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Health Progress
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your wellness journey
                      </p>
                    </div>
                  </div>
                  {healthAnalytics?.improvement_trend > 1 && (
                    <div className="flex items-center gap-1 text-success">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Trending up</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold mb-1 ${getHealthScoreColor(
                        healthAnalytics?.health_score || 0
                      )}`}
                    >
                      {healthAnalytics?.health_score || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Overall Health Score
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted/50 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-success to-primary h-3 rounded-full transition-all duration-1000"
                      style={{
                        width: `${healthAnalytics?.health_score || 0}%`,
                      }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {healthAnalytics?.completed_treatments || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Treatments
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {healthAnalytics?.consistency_rating || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Consistency
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Pending Reviews */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Pending Reviews
                </h2>
                {pendingReviews.length > 0 && (
                  <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full border border-warning/20">
                    {pendingReviews.length} pending
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {pendingReviews.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">
                      All caught up!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No pending reviews at the moment.
                    </p>
                  </div>
                ) : (
                  pendingReviews.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:border-warning/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={review.doctor_image}
                          alt={review.doctor_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground text-sm">
                            {review.doctor_name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {review.clinic_name}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm font-medium text-foreground">
                            {review.service}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(review.appointment_date, "MMM dd, yyyy")}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          handleSubmitReview(review.appointment_id)
                        }
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Write Review
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Recent Activity - Enhanced */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Recent Activity
                </h2>
                <button className="text-xs text-primary hover:text-primary/80 font-medium">
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`group relative flex items-start gap-3 p-3 bg-card border rounded-xl transition-all duration-300 ${
                        activity.priority === "high"
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:border-primary/20 hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          activity.priority === "high"
                            ? "bg-primary/20"
                            : "bg-muted/50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(activity.timestamp, "MMM dd, h:mm a")}
                        </p>
                      </div>
                      {activity.priority === "high" && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Favorite Clinic - Enhanced */}
            {analytics?.favorite_clinic && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="bg-gradient-to-br from-accent/5 via-primary/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-accent/20 rounded-xl">
                      <Heart className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Favorite Clinic
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your most visited location
                      </p>
                    </div>
                  </div>

                  <div className="text-center space-y-3">
                    <h4 className="font-semibold text-foreground text-lg">
                      {analytics.favorite_clinic.clinic_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      You've built a great relationship here
                    </p>
                    <button
                      onClick={() =>
                        (window.location.href = `/patient/clinics/${analytics.favorite_clinic.clinic_id}`)
                      }
                      className="w-full px-4 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      View Clinic Details
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
