import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  Award,
  Target,
  Activity,
  Star,
  UserCheck,
  BarChart3,
  PieChart,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/components/ui/chart";
import {
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { mockAnalyticsData } from "@/data/staff/mock-analytics";
import { mockBadges } from "@/data/staff/mock-badge";
import { mockLoyaltyDetails } from "@/data/staff/mock-loyalty";

const ClinicAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [showLoyaltyDetails, setShowLoyaltyDetails] = useState(false);
  const [loyaltyDetails, setLoyaltyDetails] = useState({
    loyal: [],
    regular: [],
    occasional: [],
    onetime: [],
  });

  // Chart configurations
  const chartConfig = {
    appointments: {
      label: "Appointments",
      color: "hsl(var(--chart-1))",
    },
    new_patients: {
      label: "New Patients",
      color: "hsl(var(--chart-2))",
    },
    revenue: {
      label: "Revenue (₱)",
      color: "hsl(var(--chart-3))",
    },
  };

  const loyaltyChartConfig = {
    loyal: {
      label: "Loyal Patients",
      color: "hsl(var(--chart-1))",
    },
    regular: {
      label: "Regular Patients",
      color: "hsl(var(--chart-2))",
    },
    occasional: {
      label: "Occasional Patients",
      color: "hsl(var(--chart-3))",
    },
    onetime: {
      label: "One-time Patients",
      color: "hsl(var(--chart-4))",
    },
  };

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual Supabase calls
        // const { data: growthData, error: growthError } = await supabase
        //   .rpc('clinic_growth');

        // const { data: badgesData, error: badgesError } = await supabase
        //   .from('clinic_badge_awards')
        //   .select(`
        //     *,
        //     badge:clinic_badges(*)
        //   `)
        //   .eq('clinic_id', currentClinicId)
        //   .eq('is_current', true);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setAnalytics(mockAnalyticsData);
        setBadges(mockBadges);
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeRange]);

  // Format number with Philippine Peso
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value >= 0 ? "+" : ""}${value}%`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Clinic Analytics
          </h1>
          <p className="text-muted-foreground">
            Performance insights and growth metrics
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Performance Score & Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Score */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-card-foreground">
              Clinic Performance Score
            </h3>
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-primary">
                {analytics.clinic_growth.clinic_performance_score}/100
              </span>
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-3 mb-4">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${analytics.clinic_growth.clinic_performance_score}%`,
              }}
            ></div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Completion Rate</span>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {analytics.clinic_growth.completion_rate}%
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Patient Growth</span>
              <p className="font-semibold text-blue-600 dark:text-blue-400">
                {formatPercentage(analytics.clinic_growth.patient_growth_rate)}
              </p>
            </div>
          </div>
        </div>

        {/* Earned Badges */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-500" />
            Earned Badges
          </h3>

          <div className="space-y-3">
            {badges.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No badges earned yet
              </p>
            ) : (
              badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badge.badge_color }}
                  >
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-card-foreground text-sm">
                      {badge.badge_name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {badge.badge_description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Earned: {new Date(badge.award_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Patients */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Patients
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {analytics.clinic_growth.total_patients}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-4 text-sm">
            {analytics.clinic_growth.patient_growth_rate >= 0 ? (
              <ChevronUp className="w-4 h-4 text-green-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`ml-1 font-medium ${
                analytics.clinic_growth.patient_growth_rate >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatPercentage(analytics.clinic_growth.patient_growth_rate)}
            </span>
            <span className="text-muted-foreground ml-1">vs last month</span>
          </div>
        </div>

        {/* New Patients (30d) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                New Patients (30d)
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {analytics.clinic_growth.patient_growth_30d}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
          <div className="flex items-center mt-4 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium ml-1">Growing</span>
          </div>
        </div>

        {/* Appointments (30d) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Appointments (30d)
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {analytics.clinic_growth.appointment_growth_30d}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
          <div className="flex items-center mt-4 text-sm">
            {analytics.clinic_growth.appointment_growth_rate >= 0 ? (
              <ChevronUp className="w-4 h-4 text-green-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`ml-1 font-medium ${
                analytics.clinic_growth.appointment_growth_rate >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatPercentage(
                analytics.clinic_growth.appointment_growth_rate
              )}
            </span>
            <span className="text-muted-foreground ml-1">vs last month</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Completion Rate
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {analytics.clinic_growth.completion_rate}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="flex items-center mt-4 text-sm">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-emerald-600 font-medium ml-1">Excellent</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trends */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Monthly Trends
          </h3>

          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={analytics.monthly_trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="appointments"
                stackId="1"
                stroke="var(--color-appointments)"
                fill="var(--color-appointments)"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="new_patients"
                stackId="2"
                stroke="var(--color-new_patients)"
                fill="var(--color-new_patients)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Patient Loyalty Distribution */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Patient Loyalty Distribution
            </h3>
            <button
              onClick={() => {
                setLoyaltyDetails(mockLoyaltyDetails); // In real app, fetch from Supabase
                setShowLoyaltyDetails(true);
              }}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              View Details
            </button>
          </div>

          <div className="space-y-4">
            {analytics.patient_loyalty.map((item, index) => {
              const colors = ["#457B9D", "#A8DADC", "#F1C0A8", "#1D3557"];
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colors[index] }}
                    ></div>
                    <span className="text-sm font-medium text-card-foreground">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-card-foreground">
                      {item.count}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {showLoyaltyDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Patient Loyalty Details
                </h2>
                <button
                  onClick={() => setShowLoyaltyDetails(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Loyal Patients */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center">
                      <div className="w-4 h-4 bg-[#457B9D] rounded mr-2"></div>
                      Loyal Patients (5+ visits)
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {loyaltyDetails.loyal.map((patient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-card-foreground">
                              {patient.patient_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last visit:{" "}
                              {new Date(
                                patient.last_visit
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#457B9D]">
                              {patient.visits} visits
                            </p>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                              <span className="text-xs">
                                {patient.avg_rating}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regular Patients */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center">
                      <div className="w-4 h-4 bg-[#A8DADC] rounded mr-2"></div>
                      Regular Patients (3-4 visits)
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {loyaltyDetails.regular.map((patient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-card-foreground">
                              {patient.patient_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last visit:{" "}
                              {new Date(
                                patient.last_visit
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#A8DADC]">
                              {patient.visits} visits
                            </p>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                              <span className="text-xs">
                                {patient.avg_rating}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Occasional Patients */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center">
                      <div className="w-4 h-4 bg-[#F1C0A8] rounded mr-2"></div>
                      Occasional Patients (2 visits)
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {loyaltyDetails.occasional.map((patient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-card-foreground">
                              {patient.patient_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last visit:{" "}
                              {new Date(
                                patient.last_visit
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#F1C0A8]">
                              {patient.visits} visits
                            </p>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                              <span className="text-xs">
                                {patient.avg_rating}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* One-time Patients */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center">
                      <div className="w-4 h-4 bg-[#1D3557] rounded mr-2"></div>
                      One-time Patients (1 visit)
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {loyaltyDetails.onetime.map((patient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-card-foreground">
                              {patient.patient_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last visit:{" "}
                              {new Date(
                                patient.last_visit
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#1D3557]">
                              {patient.visits} visit
                            </p>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                              <span className="text-xs">
                                {patient.avg_rating}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Doctor Performance & Service Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Doctor Performance */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-6">
            Doctor Performance
          </h3>

          <div className="space-y-4">
            {analytics.doctor_performance.map((doctor, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">
                    {doctor.doctor_name}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">
                      {doctor.avg_rating}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {doctor.specialization}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Appointments</span>
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      {doctor.appointments}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Completion Rate
                    </span>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {doctor.completion_rate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-6">
            Top Services
          </h3>

          <div className="space-y-4">
            {analytics.service_analytics.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-card-foreground">
                    {service.service}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {service.count} appointments
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(service.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicAnalytics;
