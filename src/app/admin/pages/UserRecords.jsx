import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  TrendingUp,
  Calendar,
  Activity,
  Award,
  Building2,
  Heart,
  Shield,
  Star,
  BarChart3,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown,
  Trophy,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Trash2,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/core/components/ui/chart";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Pie,
} from "recharts";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import { useBadgeManagement } from "@/hooks/admin/useBadgeManagement";
import { useClinicManagement } from "@/hooks/admin/useClinicManagement";
import { supabase } from "@/lib/supabaseClient";

const UserRecords = () => {
  const isMobile = useIsMobile();

  // Hooks
  const {
    fetchSystemAnalytics,
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAdminAnalytics();

  const { users, fetchUsers, loading: usersLoading } = useUserManagement();

  const {
    badges,
    evaluationResults,
    fetchBadgeAwards,
    evaluateBadges,
    awardBadge,
    removeBadge,
    loading: badgeLoading,
    error: badgeError,
  } = useBadgeManagement();

  const {
    performance,
    getPerformanceRanking,
    loading: clinicLoading,
    error: clinicError,
  } = useClinicManagement();

  // State
  const [dateRange, setDateRange] = useState(30);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [availableBadges, setAvailableBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState("");
  const [badgeReason, setBadgeReason] = useState("");
  const [awardingBadge, setAwardingBadge] = useState(false);
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [showBadgeManagementModal, setShowBadgeManagementModal] =
    useState(false);
  const [badgeToRemove, setBadgeToRemove] = useState(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removingBadge, setRemovingBadge] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAllData();
    loadBadges();
  }, [dateRange]);

  const loadAllData = async () => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - dateRange);

    await Promise.all([
      fetchSystemAnalytics({
        dateFrom: fromDate.toISOString().split("T")[0],
        dateTo: new Date().toISOString().split("T")[0],
        includeTrends: true,
        includePerformance: true,
      }),
      getPerformanceRanking(dateRange, 10),
      fetchBadgeAwards(),
    ]);
  };

  const loadBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("clinic_badges")
        .select("*")
        .eq("is_active", true)
        .order("badge_name");

      if (!error && data) {
        setAvailableBadges(data);
      }
    } catch (err) {
      console.error("Error loading badges:", err);
    }
  };

  // Evaluate badges for all clinics
  const handleEvaluateBadges = async () => {
    try {
      setEvaluating(true);
      const result = await evaluateBadges({
        clinicId: null,
        evaluationPeriodDays: dateRange,
        autoAward: false,
      });

      if (result.success) {
        setShowQualificationModal(true);
      }
    } catch (err) {
      console.error("Badge evaluation error:", err);
    } finally {
      setEvaluating(false);
    }
  };

  // Award badge to clinic
  const handleAwardBadge = async () => {
    if (!selectedBadge || !selectedClinic) return;

    try {
      setAwardingBadge(true);
      const result = await awardBadge(
        selectedClinic.clinic_id,
        selectedBadge,
        badgeReason || null
      );

      if (result.success) {
        await Promise.all([
          fetchBadgeAwards(),
          getPerformanceRanking(dateRange, 10),
        ]);

        setShowBadgeModal(false);
        setSelectedClinic(null);
        setSelectedBadge("");
        setBadgeReason("");
      }
    } catch (err) {
      console.error("Award badge error:", err);
    } finally {
      setAwardingBadge(false);
    }
  };

  // Remove badge from clinic
  const handleRemoveBadge = async () => {
    if (!badgeToRemove) return;

    try {
      setRemovingBadge(true);
      const result = await removeBadge(badgeToRemove.id, removalReason || null);

      if (result.success) {
        await fetchBadgeAwards();
        setBadgeToRemove(null);
        setRemovalReason("");
        setShowBadgeManagementModal(false);
      }
    } catch (err) {
      console.error("Remove badge error:", err);
    } finally {
      setRemovingBadge(false);
    }
  };

  // Process analytics data for charts
  const patientGrowthData = useMemo(() => {
    if (!analytics?.growth_analytics?.user_growth_trend) return [];

    return analytics.growth_analytics.user_growth_trend.map((item) => ({
      period: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      newPatients: item.new_patients || 0,
      totalNew: item.total_new || 0,
    }));
  }, [analytics]);

  const staffGrowthData = useMemo(() => {
    if (!analytics?.growth_analytics?.user_growth_trend) return [];

    return analytics.growth_analytics.user_growth_trend.map((item) => ({
      period: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      newStaff: item.new_staff || 0,
      totalNew: item.total_new || 0,
    }));
  }, [analytics]);

  // Badge distribution data
  const badgeDistribution = useMemo(() => {
    if (!badges || badges.length === 0) return [];

    const distribution = {};
    badges.forEach((award) => {
      const badgeName = award.badge?.badge_name || "Unknown";
      const badgeColor = award.badge?.badge_color || "#666666";

      if (!distribution[badgeName]) {
        distribution[badgeName] = {
          name: badgeName,
          count: 0,
          color: badgeColor,
        };
      }
      distribution[badgeName].count++;
    });

    return Object.values(distribution);
  }, [badges]);

  // System metrics with correct paths
  const systemMetrics = useMemo(() => {
    if (!analytics?.system_overview)
      return {
        totalUsers: 0,
        totalPatients: 0,
        totalStaff: 0,
        totalClinics: 0,
        activeClinics: 0,
        totalAppointments: 0,
        avgClinicRating: 0,
        newUsersPeriod: 0,
      };

    return {
      totalUsers: analytics.system_overview.users?.total || 0,
      totalPatients: analytics.system_overview.users?.by_role?.patients || 0,
      totalStaff: analytics.system_overview.users?.by_role?.staff || 0,
      totalClinics: analytics.system_overview.clinics?.total || 0,
      activeClinics: analytics.system_overview.clinics?.active || 0,
      totalAppointments: analytics.system_overview.appointments?.total || 0,
      avgClinicRating: analytics.system_overview.clinics?.average_rating || 0,
      newUsersPeriod: analytics.system_overview.users?.new_this_period || 0,
    };
  }, [analytics]);

  // Chart configurations
  const patientChartConfig = {
    newPatients: { label: "New Patients", color: "hsl(168, 76%, 42%)" },
    totalNew: { label: "Total New Users", color: "hsl(210, 100%, 56%)" },
  };

  const staffChartConfig = {
    newStaff: { label: "New Staff", color: "hsl(262, 52%, 47%)" },
    totalNew: { label: "Total New Users", color: "hsl(221, 83%, 53%)" },
  };

  const loading =
    analyticsLoading || usersLoading || badgeLoading || clinicLoading;

  if (loading && !analytics) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={`p-4 ${isMobile ? "pb-20" : "lg:p-6"}`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div
            className={`flex ${
              isMobile ? "flex-col gap-4" : "items-center justify-between"
            }`}
          >
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                User Records & Analytics
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                Comprehensive patient growth, staff performance, and clinic
                badge achievements
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <button
                onClick={loadAllData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Error Display */}
          {(analyticsError || badgeError || clinicError) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle
                  className="text-red-600 dark:text-red-400"
                  size={20}
                />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {analyticsError || badgeError || clinicError}
                </p>
              </div>
            </div>
          )}

          {/* System Overview Metrics */}
          <div
            className={`grid ${
              isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
            } gap-3 lg:gap-4`}
          >
            <MetricCard
              icon={Users}
              iconColor="text-blue-600"
              label="Total Users"
              value={systemMetrics.totalUsers}
              subtext={`${systemMetrics.newUsersPeriod} new`}
            />
            <MetricCard
              icon={Heart}
              iconColor="text-pink-600"
              label="Patients"
              value={systemMetrics.totalPatients}
              subtext="registered"
            />
            <MetricCard
              icon={Building2}
              iconColor="text-purple-600"
              label="Active Clinics"
              value={systemMetrics.activeClinics}
              subtext={`of ${systemMetrics.totalClinics}`}
            />
            <MetricCard
              icon={Star}
              iconColor="text-yellow-600"
              label="Avg Rating"
              value={Number(systemMetrics.avgClinicRating).toFixed(1)}
              subtext="clinic average"
            />
          </div>

          {/* Growth Charts */}
          <div
            className={`grid ${
              isMobile ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"
            } gap-6`}
          >
            {/* Patient Growth Chart */}
            <div className="bg-card rounded-lg border p-3 md:p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 md:mb-4 lg:mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base lg:text-lg font-semibold text-foreground flex items-center gap-2 truncate">
                    <Heart
                      className="text-pink-600 flex-shrink-0"
                      size={isMobile ? 16 : 20}
                    />
                    <span className="truncate">Patient Growth Trends</span>
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground mt-1 truncate">
                    New patient registrations over time
                  </p>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {systemMetrics.totalPatients}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Total
                  </div>
                </div>
              </div>

              {patientGrowthData.length > 0 ? (
                <ChartContainer
                  config={patientChartConfig}
                  className={
                    isMobile ? "h-48 w-full" : "h-64 md:h-72 lg:h-80 w-full"
                  }
                >
                  <AreaChart
                    data={patientGrowthData}
                    margin={
                      isMobile
                        ? { top: 5, right: 5, left: -20, bottom: 5 }
                        : { top: 10, right: 10, left: 0, bottom: 10 }
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 60 : 30}
                      tickMargin={isMobile ? 5 : 10}
                    />
                    <YAxis
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={isMobile ? 35 : 50}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ strokeDasharray: "3 3" }}
                    />
                    {!isMobile && (
                      <ChartLegend content={<ChartLegendContent />} />
                    )}
                    <Area
                      type="monotone"
                      dataKey="newPatients"
                      stackId="1"
                      stroke="var(--color-newPatients)"
                      fill="var(--color-newPatients)"
                      fillOpacity={0.6}
                      strokeWidth={isMobile ? 1.5 : 2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <EmptyChart message="No patient growth data available" />
              )}
            </div>

            {/* Staff Growth Chart */}
            <div className="bg-card rounded-lg border p-3 md:p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 md:mb-4 lg:mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base lg:text-lg font-semibold text-foreground flex items-center gap-2 truncate">
                    <Shield
                      className="text-purple-600 flex-shrink-0"
                      size={isMobile ? 16 : 20}
                    />
                    <span className="truncate">Staff Growth Trends</span>
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground mt-1 truncate">
                    New staff registrations over time
                  </p>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {systemMetrics.totalStaff}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Total
                  </div>
                </div>
              </div>

              {staffGrowthData.length > 0 ? (
                <ChartContainer
                  config={staffChartConfig}
                  className={
                    isMobile ? "h-48 w-full" : "h-64 md:h-72 lg:h-80 w-full"
                  }
                >
                  <LineChart
                    data={staffGrowthData}
                    margin={
                      isMobile
                        ? { top: 5, right: 5, left: -20, bottom: 5 }
                        : { top: 10, right: 10, left: 0, bottom: 10 }
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 60 : 30}
                      tickMargin={isMobile ? 5 : 10}
                    />
                    <YAxis
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={isMobile ? 35 : 50}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ strokeDasharray: "3 3" }}
                    />
                    {!isMobile && (
                      <ChartLegend content={<ChartLegendContent />} />
                    )}
                    <Line
                      type="monotone"
                      dataKey="newStaff"
                      stroke="var(--color-newStaff)"
                      strokeWidth={isMobile ? 2 : 3}
                      dot={{ r: isMobile ? 2 : 4 }}
                      activeDot={{ r: isMobile ? 4 : 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <EmptyChart message="No staff growth data available" />
              )}
            </div>
          </div>

          {/* Clinic Performance & Badge System */}
          <div
            className={`grid ${
              isMobile ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"
            } gap-6`}
          >
            {/* Clinic Rankings */}
            <div
              className={`${
                isMobile ? "" : "xl:col-span-2"
              } bg-card rounded-lg border p-4 lg:p-6 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-base lg:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2
                    className="text-blue-600"
                    size={isMobile ? 18 : 20}
                  />
                  Clinic Performance Rankings
                </h3>
                <button
                  onClick={handleEvaluateBadges}
                  disabled={evaluating}
                  className="flex items-center gap-2 px-3 py-2 text-xs lg:text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {evaluating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Award size={14} />
                      Evaluate Badges
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3 lg:space-y-4">
                {performance && performance.length > 0 ? (
                  performance.map((clinic, index) => (
                    <ClinicRankCard
                      key={clinic.clinic_id}
                      clinic={clinic}
                      rank={index + 1}
                      onAwardBadge={(clinic) => {
                        setSelectedClinic(clinic);
                        setShowBadgeModal(true);
                      }}
                      isMobile={isMobile}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={Building2}
                    message="No clinic performance data available"
                  />
                )}
              </div>
            </div>

            {/* Badge Distribution */}
            <div className="bg-card rounded-lg border p-4 lg:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-base lg:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Award
                    className="text-yellow-600"
                    size={isMobile ? 18 : 20}
                  />
                  Badge Distribution
                </h3>
                {badges.length > 0 && (
                  <button
                    onClick={() => setShowBadgeManagementModal(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs lg:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"
                  >
                    <Eye size={14} />
                    Manage
                  </button>
                )}
              </div>

              {badgeDistribution.length > 0 ? (
                <>
                  <div className="space-y-2 mb-3 md:mb-4 lg:mb-6 max-h-[200px] md:max-h-none overflow-y-auto">
                    {badgeDistribution.map((badge) => (
                      <div
                        key={badge.name}
                        className="flex items-center justify-between p-2 lg:p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 lg:w-4 lg:h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: badge.color }}
                          />
                          <span className="text-xs lg:text-sm font-medium text-foreground truncate">
                            {badge.name}
                          </span>
                        </div>
                        <span className="text-sm lg:text-base font-bold text-foreground ml-2 flex-shrink-0">
                          {badge.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className={isMobile ? "h-36" : "h-44 md:h-48"}>
                    <ChartContainer config={{}} className="h-full w-full">
                      <RechartsPieChart>
                        <Pie
                          data={badgeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 30 : 40}
                          outerRadius={isMobile ? 50 : 70}
                          paddingAngle={isMobile ? 3 : 5}
                          dataKey="count"
                          label={!isMobile}
                          labelLine={!isMobile}
                        >
                          {badgeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPieChart>
                    </ChartContainer>
                  </div>

                  <div className="mt-3 md:mt-4 lg:mt-6 pt-3 md:pt-4 border-t text-center">
                    <div className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                      {badgeDistribution.reduce(
                        (sum, badge) => sum + badge.count,
                        0
                      )}
                    </div>
                    <div className="text-xs lg:text-sm text-muted-foreground">
                      Total Badges Awarded
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState icon={Award} message="No badges awarded yet" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badge Award Modal */}
      {showBadgeModal && selectedClinic && (
        <BadgeAwardModal
          clinic={selectedClinic}
          availableBadges={availableBadges}
          selectedBadge={selectedBadge}
          setSelectedBadge={setSelectedBadge}
          badgeReason={badgeReason}
          setBadgeReason={setBadgeReason}
          onAward={handleAwardBadge}
          onClose={() => {
            setShowBadgeModal(false);
            setSelectedClinic(null);
            setSelectedBadge("");
            setBadgeReason("");
          }}
          awarding={awardingBadge}
          isMobile={isMobile}
        />
      )}

      {/* Badge Qualification Modal */}
      {showQualificationModal && evaluationResults && (
        <BadgeQualificationModal
          results={evaluationResults}
          onClose={() => setShowQualificationModal(false)}
          isMobile={isMobile}
        />
      )}

      {/* Badge Management Modal */}
      {showBadgeManagementModal && !badgeToRemove && (
        <BadgeManagementModal
          badges={badges}
          onRemove={(badge) => setBadgeToRemove(badge)}
          onClose={() => setShowBadgeManagementModal(false)}
          isMobile={isMobile}
        />
      )}

      {/* Badge Removal Confirmation Modal */}
      {badgeToRemove && (
        <RemoveBadgeModal
          badge={badgeToRemove}
          removalReason={removalReason}
          setRemovalReason={setRemovalReason}
          onConfirm={handleRemoveBadge}
          onClose={() => {
            setBadgeToRemove(null);
            setRemovalReason("");
          }}
          removing={removingBadge}
          isMobile={isMobile}
        />
      )}
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

// Metric Card Component
const MetricCard = ({ icon: Icon, iconColor, label, value, subtext }) => (
  <div className="bg-card p-3 lg:p-4 rounded-lg border hover:shadow-md transition-shadow">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={iconColor} size={16} />
      <span className="text-xs lg:text-sm font-medium text-muted-foreground truncate">
        {label}
      </span>
    </div>
    <div className="text-xl lg:text-2xl font-bold text-foreground">{value}</div>
    {subtext && (
      <div className="text-xs text-muted-foreground truncate">{subtext}</div>
    )}
  </div>
);

// Clinic Rank Card Component
const ClinicRankCard = ({ clinic, rank, onAwardBadge, isMobile }) => {
  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600 text-white";
    }
  };

  return (
    <div className="p-3 lg:p-4 bg-muted/20 rounded-lg border hover:shadow-md transition-all">
      <div
        className={`flex ${
          isMobile ? "flex-col gap-3" : "items-start justify-between"
        }`}
      >
        <div className="flex-1 w-full">
          <div
            className={`flex items-center gap-3 mb-3 ${
              isMobile ? "flex-wrap" : ""
            }`}
          >
            <div
              className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md ${getRankStyle(
                rank
              )}`}
            >
              #{rank}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm lg:text-base truncate">
                {clinic.clinic_name}
              </h4>
              <div
                className={`flex ${
                  isMobile ? "flex-col gap-1" : "items-center gap-4"
                } text-xs lg:text-sm text-muted-foreground mt-1`}
              >
                <span className="font-medium">
                  {clinic.total_appointments || 0} appointments
                </span>
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-500 flex-shrink-0" />
                  <span className="font-medium">
                    {Number(clinic.average_rating || 0).toFixed(1)}
                  </span>
                  <span className="text-xs">({clinic.total_reviews || 0})</span>
                </span>
              </div>
            </div>

            {!isMobile && (
              <button
                onClick={() => onAwardBadge(clinic)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm shadow-sm"
              >
                <Award size={16} />
                Award
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Completion Rate</span>
              <span className="font-bold text-foreground">
                {Number(clinic.completion_rate || 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  clinic.completion_rate >= 95
                    ? "bg-gradient-to-r from-green-400 to-green-600"
                    : clinic.completion_rate >= 90
                    ? "bg-gradient-to-r from-blue-400 to-blue-600"
                    : clinic.completion_rate >= 80
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                    : "bg-gradient-to-r from-red-400 to-red-600"
                }`}
                style={{ width: `${clinic.completion_rate || 0}%` }}
              />
            </div>
          </div>

          {isMobile && (
            <button
              onClick={() => onAwardBadge(clinic)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              <Award size={16} />
              Award Badge
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Badge Award Modal Component
const BadgeAwardModal = ({
  clinic,
  availableBadges,
  selectedBadge,
  setSelectedBadge,
  badgeReason,
  setBadgeReason,
  onAward,
  onClose,
  awarding,
  isMobile,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div
      className={`bg-card rounded-lg shadow-xl ${
        isMobile ? "w-full max-w-sm" : "max-w-md"
      } w-full max-h-[90vh] overflow-y-auto`}
    >
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3">
            <Award className="text-yellow-600" size={isMobile ? 20 : 24} />
            <div>
              <h2 className="text-lg lg:text-xl font-semibold text-foreground">
                Award Badge
              </h2>
              <p className="text-xs lg:text-sm text-muted-foreground truncate">
                {clinic.clinic_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={awarding}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6">
          <label className="block text-sm font-medium text-foreground">
            Select Badge
          </label>
          <div className="space-y-2">
            {availableBadges.map((badge) => (
              <label
                key={badge.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedBadge === badge.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="badge"
                  value={badge.id}
                  checked={selectedBadge === badge.id}
                  onChange={(e) => setSelectedBadge(e.target.value)}
                  className="w-4 h-4"
                  disabled={awarding}
                />
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: badge.badge_color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">
                    {badge.badge_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {badge.badge_description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-4 lg:mb-6">
          <label className="block text-sm font-medium text-foreground">
            Award Reason (Optional)
          </label>
          <textarea
            value={badgeReason}
            onChange={(e) => setBadgeReason(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm resize-none"
            rows={3}
            placeholder="Add reason for awarding this badge..."
            disabled={awarding}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            disabled={awarding}
          >
            Cancel
          </button>
          <button
            onClick={onAward}
            disabled={!selectedBadge || awarding}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm shadow-sm"
          >
            {awarding ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Awarding...
              </>
            ) : (
              <>
                <Trophy size={16} />
                Award Badge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Badge Qualification Modal Component
const BadgeQualificationModal = ({ results, onClose, isMobile }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div
      className={`bg-card rounded-lg shadow-xl ${
        isMobile ? "w-full max-w-sm" : "max-w-2xl"
      } w-full max-h-[90vh] overflow-y-auto`}
    >
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-600" size={isMobile ? 20 : 24} />
            <div>
              <h2 className="text-lg lg:text-xl font-semibold text-foreground">
                Badge Qualification Results
              </h2>
              <p className="text-xs lg:text-sm text-muted-foreground">
                Clinics that qualify for badges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {results.summary && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xl lg:text-2xl font-bold text-blue-600">
                {results.summary.clinics_evaluated || 0}
              </div>
              <div className="text-xs text-muted-foreground">Evaluated</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xl lg:text-2xl font-bold text-green-600">
                {results.summary.badges_qualified || 0}
              </div>
              <div className="text-xs text-muted-foreground">Qualified</div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-xl lg:text-2xl font-bold text-purple-600">
                {results.summary.badges_awarded || 0}
              </div>
              <div className="text-xs text-muted-foreground">Awarded</div>
            </div>
          </div>
        )}

        <div className="space-y-3 lg:space-y-4">
          {results.data && results.data.length > 0 ? (
            results.data.map((item, index) => (
              <div
                key={index}
                className="p-3 lg:p-4 bg-muted/20 rounded-lg border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">
                      {item.clinic_name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Badge: {item.badge_name}
                    </p>
                  </div>
                  {item.qualified ? (
                    <CheckCircle
                      className="text-green-600 flex-shrink-0"
                      size={20}
                    />
                  ) : (
                    <XCircle className="text-red-600 flex-shrink-0" size={20} />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.qualification_reason || "No details provided"}
                </div>
                {item.metrics && (
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.metrics).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}: </span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyState icon={Info} message="No qualification data available" />
          )}
        </div>

        <div className="mt-4 lg:mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Badge Management Modal
const BadgeManagementModal = ({ badges, onRemove, onClose, isMobile }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div
      className={`bg-card rounded-lg shadow-xl ${
        isMobile ? "w-full max-w-sm" : "max-w-2xl"
      } w-full max-h-[90vh] overflow-y-auto`}
    >
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3">
            <Award className="text-yellow-600" size={isMobile ? 20 : 24} />
            <div>
              <h2 className="text-lg lg:text-xl font-semibold text-foreground">
                Manage Awarded Badges
              </h2>
              <p className="text-xs lg:text-sm text-muted-foreground">
                {badges.length} badge{badges.length !== 1 ? "s" : ""} currently
                active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {badges.map((award) => (
            <div
              key={award.id}
              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: award.badge?.badge_color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">
                    {award.clinic?.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {award.badge?.badge_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Awarded:{" "}
                    {new Date(award.award_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemove(award)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                {!isMobile && "Remove"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 lg:mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Remove Badge Confirmation Modal
const RemoveBadgeModal = ({
  badge,
  removalReason,
  setRemovalReason,
  onConfirm,
  onClose,
  removing,
  isMobile,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
    <div
      className={`bg-card rounded-lg shadow-xl ${
        isMobile ? "w-full max-w-sm" : "max-w-md"
      } w-full`}
    >
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Trash2 className="text-red-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Remove Badge
            </h2>
            <p className="text-xs text-muted-foreground">
              This action will mark the badge as inactive
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: badge.badge?.badge_color }}
            />
            <span className="text-sm font-medium text-foreground">
              {badge.badge?.badge_name}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {badge.clinic?.name}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Removal Reason (Optional)
          </label>
          <textarea
            value={removalReason}
            onChange={(e) => setRemovalReason(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm resize-none"
            rows={3}
            placeholder="Why are you removing this badge?"
            disabled={removing}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            disabled={removing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={removing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
          >
            {removing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Remove Badge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Empty Chart Component
const EmptyChart = ({ message }) => (
  <div className="h-64 lg:h-80 flex items-center justify-center text-muted-foreground">
    <div className="text-center">
      <Info className="mx-auto mb-2" size={48} opacity={0.3} />
      <p className="text-sm">{message}</p>
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-8 text-muted-foreground">
    <Icon size={48} className="mx-auto mb-4 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-background p-4 lg:p-6">
    <div className="max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-4 border">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg p-6 border h-96" />
          <div className="bg-card rounded-lg p-6 border h-96" />
        </div>
      </div>
    </div>
  </div>
);

export default UserRecords;
