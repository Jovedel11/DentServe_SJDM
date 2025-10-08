import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  Building2,
  Award,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Heart,
  Shield,
  Star,
  Mail,
  BarChart3,
  PieChart,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import { useBadgeManagement } from "@/hooks/admin/useBadgeManagement";
import { useClinicManagement } from "@/hooks/admin/useClinicManagement";
import { supabase } from "@/lib/supabaseClient";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Hooks
  const {
    fetchSystemAnalytics,
    analytics,
    loading: analyticsLoading,
  } = useAdminAnalytics();

  const { users, fetchUsers, loading: usersLoading } = useUserManagement();

  const {
    badges,
    fetchBadgeAwards,
    loading: badgeLoading,
  } = useBadgeManagement();

  const {
    performance,
    getPerformanceRanking,
    loading: performanceLoading,
  } = useClinicManagement();

  // State
  const [partnershipRequests, setPartnershipRequests] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000
      );

      await Promise.all([
        fetchSystemAnalytics({
          dateFrom: thirtyDaysAgo.toISOString().split("T")[0],
          dateTo: today.toISOString().split("T")[0],
          includeTrends: true,
          includePerformance: true,
        }),
        fetchUsers({ userType: "patient", limit: 5 }),
        fetchBadgeAwards(),
        getPerformanceRanking(30, 5),
        fetchPartnershipRequests(),
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPartnershipRequests = async () => {
    try {
      const { data, error } = await supabase.rpc("get_partnership_requests", {
        p_status: "pending",
        p_limit: 5,
        p_offset: 0,
      });

      if (error) throw error;
      if (data?.success) {
        setPartnershipRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching partnership requests:", error);
    }
  };

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!analytics?.system_overview) {
      return {
        totalUsers: 0,
        totalPatients: 0,
        totalStaff: 0,
        totalClinics: 0,
        activeClinics: 0,
        totalAppointments: 0,
        newUsersThisPeriod: 0,
        avgRating: 0,
        pendingRequests: 0,
        totalBadges: 0,
      };
    }

    return {
      totalUsers: analytics.system_overview.users?.total || 0,
      totalPatients: analytics.system_overview.users?.by_role?.patients || 0,
      totalStaff: analytics.system_overview.users?.by_role?.staff || 0,
      totalClinics: analytics.system_overview.clinics?.total || 0,
      activeClinics: analytics.system_overview.clinics?.active || 0,
      totalAppointments: analytics.system_overview.appointments?.total || 0,
      newUsersThisPeriod: analytics.system_overview.users?.new_this_period || 0,
      avgRating: analytics.system_overview.clinics?.average_rating || 0,
      pendingRequests: partnershipRequests.length,
      totalBadges: badges.length,
    };
  }, [analytics, partnershipRequests, badges]);

  // Growth trend data for mini charts
  const growthTrendData = useMemo(() => {
    if (!analytics?.growth_analytics?.user_growth_trend) return [];

    return analytics.growth_analytics.user_growth_trend
      .slice(-7)
      .map((item) => ({
        date: new Date(item.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        total: item.total_new || 0,
        patients: item.new_patients || 0,
        staff: item.new_staff || 0,
      }));
  }, [analytics]);

  const loading =
    analyticsLoading || usersLoading || badgeLoading || performanceLoading;

  if (loading && !analytics) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={`p-4 ${isMobile ? "pb-20" : "lg:p-6"}`}>
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div
            className={`flex ${
              isMobile ? "flex-col gap-4" : "items-center justify-between"
            }`}
          >
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                Admin Dashboard
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                Welcome back! Here's your system overview
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
              {!isMobile && "Refresh Data"}
            </button>
          </div>

          {/* Key Metrics Grid */}
          <div
            className={`grid ${
              isMobile
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-4 lg:grid-cols-4"
            } gap-3 lg:gap-4`}
          >
            <MetricCard
              icon={Users}
              label="Total Users"
              value={metrics.totalUsers}
              trend={metrics.newUsersThisPeriod}
              trendLabel="new this month"
              color="blue"
              onClick={() => navigate("/admin/users-management")}
            />
            <MetricCard
              icon={Building2}
              label="Active Clinics"
              value={metrics.activeClinics}
              subtext={`of ${metrics.totalClinics} total`}
              color="purple"
              onClick={() => navigate("/admin/users-management/records")}
            />
            <MetricCard
              icon={Calendar}
              label="Appointments"
              value={metrics.totalAppointments}
              subtext="total bookings"
              color="green"
            />
            <MetricCard
              icon={Star}
              label="Avg Rating"
              value={Number(metrics.avgRating).toFixed(1)}
              subtext="clinic average"
              color="yellow"
            />
          </div>

          {/* Main Content Grid */}
          <div
            className={`grid ${
              isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
            } gap-6`}
          >
            {/* User Statistics - Takes 2 columns */}
            <div className={isMobile ? "" : "lg:col-span-2"}>
              <div className="bg-card rounded-lg border p-4 lg:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <div>
                    <h3 className="text-lg lg:text-xl font-semibold text-foreground flex items-center gap-2">
                      <Activity className="text-blue-600" size={20} />
                      User Growth Trends
                    </h3>
                    <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                      Last 7 days overview
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/user-records")}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View Details
                    <ArrowRight size={14} />
                  </button>
                </div>

                {growthTrendData.length > 0 ? (
                  <ChartContainer
                    config={{
                      patients: { label: "Patients", color: "#F472B6" },
                      staff: { label: "Staff", color: "#A78BFA" },
                    }}
                    className={isMobile ? "h-64" : "h-80"}
                  >
                    <AreaChart data={growthTrendData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="patients"
                        stackId="1"
                        stroke="var(--color-patients)"
                        fill="var(--color-patients)"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="staff"
                        stackId="1"
                        stroke="var(--color-staff)"
                        fill="var(--color-staff)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <EmptyState message="No growth data available" />
                )}

                {/* Quick Stats */}
                <div
                  className={`grid ${
                    isMobile ? "grid-cols-2" : "grid-cols-3"
                  } gap-3 mt-4 pt-4 border-t`}
                >
                  <QuickStat
                    icon={Heart}
                    label="Patients"
                    value={metrics.totalPatients}
                    color="pink"
                  />
                  <QuickStat
                    icon={Shield}
                    label="Staff"
                    value={metrics.totalStaff}
                    color="purple"
                  />
                  <QuickStat
                    icon={Award}
                    label="Badges"
                    value={metrics.totalBadges}
                    color="yellow"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions & Alerts */}
            <div className="space-y-6">
              {/* Partnership Requests Alert */}
              {partnershipRequests.length > 0 && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
                      <Mail className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground mb-1">
                        Pending Requests
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {partnershipRequests.length} partnership request
                        {partnershipRequests.length !== 1 ? "s" : ""} awaiting
                        review
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate("/admin/partnership-request-manager")
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Review Requests
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-card rounded-lg border p-4 shadow-sm">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="text-primary" size={18} />
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <ActionButton
                    icon={Users}
                    label="Manage Users"
                    onClick={() => navigate("/admin/users-management")}
                  />
                  <ActionButton
                    icon={BarChart3}
                    label="View Analytics"
                    onClick={() => navigate("/admin/users-management/records")}
                  />
                  <ActionButton
                    icon={Mail}
                    label="Partnership Requests"
                    onClick={() =>
                      navigate("/admin/partnership-request-manager")
                    }
                  />
                </div>
              </div>

              {/* System Health */}
              <div className="bg-card rounded-lg border p-4 shadow-sm">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Activity className="text-green-600" size={18} />
                  System Health
                </h4>
                <div className="space-y-3">
                  <HealthItem
                    label="User Database"
                    status="healthy"
                    value={`${metrics.totalUsers} users`}
                  />
                  <HealthItem
                    label="Active Clinics"
                    status="healthy"
                    value={`${metrics.activeClinics} active`}
                  />
                  <HealthItem
                    label="Badge System"
                    status="healthy"
                    value={`${metrics.totalBadges} awarded`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Clinics */}
          {performance && performance.length > 0 && (
            <div className="bg-card rounded-lg border p-4 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div>
                  <h3 className="text-lg lg:text-xl font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="text-blue-600" size={20} />
                    Top Performing Clinics
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                    Ranked by completion rate and total appointments
                  </p>
                </div>
                <button
                  onClick={() => navigate("/admin/user-records")}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View All
                  <ArrowRight size={14} />
                </button>
              </div>

              <div
                className={`grid ${
                  isMobile
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                } gap-4`}
              >
                {performance.slice(0, 3).map((clinic, index) => (
                  <ClinicCard
                    key={clinic.clinic_id}
                    clinic={clinic}
                    rank={index + 1}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

// Metric Card Component
const MetricCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  subtext,
  color,
  onClick,
}) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      ring: "ring-blue-200 dark:ring-blue-800",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
      ring: "ring-purple-200 dark:ring-purple-800",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-600 dark:text-green-400",
      ring: "ring-green-200 dark:ring-green-800",
    },
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-600 dark:text-yellow-400",
      ring: "ring-yellow-200 dark:ring-yellow-800",
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-lg p-4 hover:shadow-md transition-all ${
        onClick ? "cursor-pointer hover:ring-2 " + colors.ring : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon size={20} className={colors.text} />
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <TrendingUp size={12} />+{trend}
          </div>
        )}
      </div>
      <div className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
        {value}
      </div>
      <div className="text-xs text-muted-foreground font-medium">
        {trendLabel || subtext || label}
      </div>
    </div>
  );
};

// Quick Stat Component
const QuickStat = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    pink: "text-pink-600",
    purple: "text-purple-600",
    yellow: "text-yellow-600",
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
      <Icon size={18} className={colorClasses[color]} />
      <div>
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
};

// Action Button Component
const ActionButton = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/30 rounded-lg transition-colors group"
  >
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-primary" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
    <ArrowRight
      size={16}
      className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all"
    />
  </button>
);

// Health Item Component
const HealthItem = ({ label, status, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          status === "healthy" ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-sm text-foreground">{label}</span>
    </div>
    <span className="text-xs text-muted-foreground">{value}</span>
  </div>
);

// Clinic Card Component
const ClinicCard = ({ clinic, rank, isMobile }) => {
  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-orange-400 to-orange-600";
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600";
    }
  };

  return (
    <div className="p-4 bg-muted/20 rounded-lg border hover:shadow-md transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0 ${getRankStyle(
            rank
          )}`}
        >
          #{rank}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm truncate">
            {clinic.clinic_name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar size={12} />
            {clinic.total_appointments || 0} appointments
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Rating</span>
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-500 fill-yellow-500" />
            <span className="font-medium text-foreground">
              {Number(clinic.average_rating || 0).toFixed(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-medium text-foreground">
            {Number(clinic.completion_rate || 0).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              clinic.completion_rate >= 90
                ? "bg-gradient-to-r from-green-400 to-green-600"
                : "bg-gradient-to-r from-blue-400 to-blue-600"
            }`}
            style={{ width: `${clinic.completion_rate || 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="text-center py-8 text-muted-foreground">
    <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-background p-4 lg:p-6">
    <div className="max-w-[1600px] mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-muted rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-4 border">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-lg p-6 border h-96" />
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-4 border h-48" />
            <div className="bg-card rounded-lg p-4 border h-48" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
