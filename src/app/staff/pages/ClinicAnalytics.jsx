import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  Award,
  Activity,
  Star,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  RefreshCw,
  Crown,
  UserCog,
  BarChart3,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/core/components/ui/select";
import Skeleton from "@/core/components/Skeleton";
import EmptyState from "@/core/components/ui/empty-state";
import { useClinicAnalytics } from "@/hooks/analytics/useClinicAnalytics";
import { useAuth } from "@/auth/context/AuthProvider";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";

const ClinicAnalytics = () => {
  const isMobile = useIsMobile();
  const { profile } = useAuth();

  const {
    fetchClinicAnalytics,
    clinicInfo,
    periodAnalytics,
    patientInsights,
    recommendations,
    topDoctors,
    mostLoyalPatient,
    clinicBadges,
    loading: analyticsLoading,
    error: analyticsError,
  } = useClinicAnalytics();

  const [timeRange, setTimeRange] = useState("30");
  const [refreshing, setRefreshing] = useState(false);

  // Get clinic ID from profile
  const clinicId = useMemo(() => {
    return (
      profile?.role_specific_data?.clinic_id ||
      profile?.clinic_id ||
      profile?.staff_profile?.clinic_id
    );
  }, [profile]);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const today = new Date();
    const daysAgo = parseInt(timeRange);
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - daysAgo);

    return {
      from: fromDate.toISOString().split("T")[0],
      to: today.toISOString().split("T")[0],
    };
  }, [timeRange]);

  // Fetch analytics data
  const loadAnalytics = useCallback(
    async (showRefreshing = false) => {
      if (!clinicId) return;

      if (showRefreshing) setRefreshing(true);

      try {
        await fetchClinicAnalytics({
          clinicId,
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
          includeComparisons: false,
          includePatientInsights: true,
        });
      } finally {
        if (showRefreshing) setRefreshing(false);
      }
    },
    [clinicId, dateRange, fetchClinicAnalytics]
  );

  // Initial load
  useEffect(() => {
    if (clinicId) {
      loadAnalytics();
    }
  }, [clinicId, dateRange]);

  // Handle refresh
  const handleRefresh = () => {
    loadAnalytics(true);
  };

  // Calculate clinic activity status
  const activityStatus = useMemo(() => {
    if (!periodAnalytics?.appointments) return null;

    const daily_avg = periodAnalytics.appointments.daily_avg_appointments || 0;

    if (daily_avg >= 15)
      return {
        level: "high",
        label: "Highly Active",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
      };
    if (daily_avg >= 8)
      return {
        level: "medium",
        label: "Moderately Active",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
      };
    if (daily_avg >= 3)
      return {
        level: "low",
        label: "Low Activity",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      };
    return {
      level: "minimal",
      label: "Minimal Activity",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900/30",
    };
  }, [periodAnalytics]);

  // Calculate days since joining
  const daysSinceJoining = useMemo(() => {
    if (!clinicInfo?.created_at) return 0;
    const created = new Date(clinicInfo.created_at);
    const today = new Date();
    return Math.floor((today - created) / (1000 * 60 * 60 * 24));
  }, [clinicInfo]);

  // Get patient loyalty breakdown (3 categories)
  const patientLoyalty = useMemo(() => {
    if (!periodAnalytics?.patients) return [];

    const { unique_patients, returning_patients, recent_patients } =
      periodAnalytics.patients;
    const one_time = Math.max(0, unique_patients - returning_patients);

    return [
      {
        category: "Loyal Patients",
        count: returning_patients || 0,
        percentage:
          unique_patients > 0
            ? Math.round((returning_patients / unique_patients) * 100)
            : 0,
        color: "#457B9D",
        description: "Multiple return visits",
      },
      {
        category: "Regular Patients",
        count: recent_patients || 0,
        percentage:
          unique_patients > 0
            ? Math.round((recent_patients / unique_patients) * 100)
            : 0,
        color: "#A8DADC",
        description: "Recent active patients",
      },
      {
        category: "One-time Patients",
        count: one_time,
        percentage:
          unique_patients > 0
            ? Math.round((one_time / unique_patients) * 100)
            : 0,
        color: "#F1C0A8",
        description: "Single visit only",
      },
    ];
  }, [periodAnalytics]);

  // Get top services
  const topServices = useMemo(() => {
    if (!patientInsights?.popular_services) return [];
    return patientInsights.popular_services.slice(0, 5);
  }, [patientInsights]);

  // Loading state
  if (analyticsLoading && !clinicInfo) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="space-y-2">
          <Skeleton width="280px" height="36px" />
          <Skeleton width="450px" height="22px" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height="150px" borderRadius="12px" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height="350px" borderRadius="12px" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (analyticsError && !clinicInfo) {
    return (
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <EmptyState
          icon={AlertCircle}
          title="Unable to Load Analytics"
          description={
            analyticsError ||
            "An error occurred while loading clinic analytics. Please try again."
          }
          variant="card"
          action={
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // No clinic access
  if (!clinicId) {
    return (
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <EmptyState
          icon={Activity}
          title="No Clinic Access"
          description="You don't have access to any clinic. Please contact your administrator."
          variant="card"
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Clinic Analytics Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {clinicInfo?.name || "Your Clinic"} • Comprehensive performance
            insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Appointments */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Appointments
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {periodAnalytics?.appointments?.total || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {periodAnalytics?.appointments?.completed || 0}
                </span>
                <span className="text-muted-foreground text-xs">completed</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {periodAnalytics?.appointments?.completion_rate || 0}% success
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-300" />
        </Card>

        {/* Total Patients */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Patients
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {periodAnalytics?.patients?.unique_patients || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {periodAnalytics?.patients?.returning_patients || 0}
                </span>
                <span className="text-muted-foreground text-xs">returning</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {periodAnalytics?.patients?.retention_rate?.toFixed(1) || 0}%
                retention
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-300" />
        </Card>

        {/* Activity Level */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Daily Average
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {periodAnalytics?.appointments?.daily_avg_appointments?.toFixed(
                    1
                  ) || "0.0"}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  activityStatus?.bgColor || "bg-gray-100 dark:bg-gray-900/30"
                }`}
              >
                <Activity
                  className={`w-6 h-6 ${
                    activityStatus?.color || "text-gray-600"
                  }`}
                />
              </div>
            </div>
            <div className="mt-4">
              <Badge
                variant="outline"
                className={`${activityStatus?.color || ""} text-xs`}
              >
                {activityStatus?.label || "Unknown"} Clinic
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                appointments per day
              </p>
            </div>
          </CardContent>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
              activityStatus?.level === "high"
                ? "from-green-500 to-green-300"
                : activityStatus?.level === "medium"
                ? "from-blue-500 to-blue-300"
                : activityStatus?.level === "low"
                ? "from-yellow-500 to-yellow-300"
                : "from-gray-500 to-gray-300"
            }`}
          />
        </Card>

        {/* Clinic Rating */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Clinic Rating
                </p>
                <div className="flex items-center gap-2">
                  <Star className="w-8 h-8 text-yellow-500 fill-current" />
                  <p className="text-3xl font-bold text-foreground">
                    {clinicInfo?.rating?.toFixed(1) || "0.0"}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                {clinicInfo?.total_reviews || 0} patient reviews
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all"
                  style={{
                    width: `${((clinicInfo?.rating || 0) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-300" />
        </Card>
      </div>

      {/* Growth & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Clinic Growth */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Growth Metrics
            </CardTitle>
            <CardDescription>Your clinic's journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Days Active */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Days Active
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {daysSinceJoining}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  on the platform since{" "}
                  {clinicInfo?.created_at
                    ? new Date(clinicInfo.created_at).toLocaleDateString()
                    : "N/A"}
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/50 transition-all"
                    style={{
                      width: `${Math.min(
                        (daysSinceJoining / 365) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Staff & Doctors */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Doctors</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {clinicInfo?.total_doctors || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Staff</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {clinicInfo?.total_staff || 0}
                  </p>
                </div>
              </div>

              {/* Cancellation Rate */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Cancellation Rate
                  </span>
                  <span
                    className={`text-xl font-bold ${
                      (periodAnalytics?.appointments?.cancellation_rate || 0) >
                      15
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {periodAnalytics?.appointments?.cancellation_rate || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span className="text-muted-foreground">
                    {periodAnalytics?.appointments?.cancelled || 0} cancelled
                    appointments
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Loyalty Distribution */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Patient Loyalty
              </div>
              {mostLoyalPatient && (
                <Crown className="w-5 h-5 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>Patient engagement breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    width="100%"
                    height="70px"
                    borderRadius="8px"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Most Loyal Patient Highlight */}
                {mostLoyalPatient && (
                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-800/20 rounded-lg border-2 border-yellow-400 dark:border-yellow-700 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {mostLoyalPatient.profile_image_url ? (
                          <img
                            src={mostLoyalPatient.profile_image_url}
                            alt={mostLoyalPatient.patient_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-yellow-300 dark:bg-yellow-700 flex items-center justify-center border-2 border-yellow-400">
                            <Users className="w-6 h-6 text-yellow-700 dark:text-yellow-200" />
                          </div>
                        )}
                        <Crown className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 drop-shadow-md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-foreground truncate">
                            {mostLoyalPatient.patient_name}
                          </h4>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-yellow-500 text-white"
                          >
                            Most Loyal
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {mostLoyalPatient.appointment_count} appointments
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loyalty Categories */}
                {patientLoyalty.length > 0 ? (
                  <div className="space-y-4">
                    {patientLoyalty.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium text-foreground">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {item.count}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              ({item.percentage}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 relative overflow-hidden">
                          <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No patient data available
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earned Badges */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-yellow-500" />
              Earned Badges
            </CardTitle>
            <CardDescription>Recognition & achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    width="100%"
                    height="70px"
                    borderRadius="8px"
                  />
                ))}
              </div>
            ) : clinicBadges.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No badges yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep providing excellent service to earn badges
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {clinicBadges.map((award, index) => (
                  <div
                    key={award.id}
                    className="flex items-start gap-3 p-3 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg hover:from-muted/70 hover:to-muted/50 transition-all cursor-pointer border border-border"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                      style={{
                        backgroundColor:
                          award.clinic_badges?.badge_color || "#457B9D",
                      }}
                    >
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-card-foreground truncate">
                          {award.clinic_badges?.badge_name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {award.clinic_badges?.badge_description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(award.award_date), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Services & Doctors Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top Services */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="w-5 h-5 text-primary" />
              Top Services
            </CardTitle>
            <CardDescription>
              Most popular services by appointment volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <div className="space-y-3">
                {topServices.map((service, index) => {
                  const maxAppointments = topServices[0]?.appointments || 1;
                  const percentage =
                    (service.appointments / maxAppointments) * 100;

                  return (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-r from-muted/50 to-muted/20 rounded-lg border border-border hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <span className="text-sm font-bold text-primary">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              {service.service_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {service.appointments} bookings
                            </p>
                          </div>
                        </div>
                        {service.avg_price && (
                          <div className="text-right ml-3">
                            <p className="text-sm font-bold text-green-600 dark:text-green-400">
                              ₱{service.avg_price.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              avg price
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-3">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Stethoscope className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No service data yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Service data will appear once appointments are completed
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Doctors */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCog className="w-5 h-5 text-primary" />
              Top Doctors
            </CardTitle>
            <CardDescription>
              Most selected doctors by patient preference
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    width="100%"
                    height="80px"
                    borderRadius="8px"
                  />
                ))}
              </div>
            ) : topDoctors.length > 0 ? (
              <div className="space-y-3">
                {topDoctors.map((doctor, index) => {
                  const maxAppointments = topDoctors[0]?.appointment_count || 1;
                  const percentage =
                    (doctor.appointment_count / maxAppointments) * 100;

                  return (
                    <div
                      key={doctor.doctor_id}
                      className={`p-4 rounded-lg border transition-all ${
                        index === 0
                          ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30"
                          : "bg-gradient-to-r from-muted/50 to-muted/20 border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="relative flex-shrink-0">
                          {doctor.image_url ? (
                            <img
                              src={doctor.image_url}
                              alt={doctor.doctor_name}
                              className={`w-12 h-12 rounded-full object-cover ${
                                index === 0
                                  ? "border-2 border-primary"
                                  : "border border-border"
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                index === 0
                                  ? "bg-primary/20 border-2 border-primary"
                                  : "bg-muted border border-border"
                              }`}
                            >
                              <UserCog
                                className={`w-6 h-6 ${
                                  index === 0
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          )}
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Star className="w-3 h-3 text-white fill-current" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              Dr. {doctor.doctor_name}
                            </h4>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Top
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {doctor.specialization}
                          </p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {doctor.appointment_count} completed appointments
                            </p>
                          </div>
                        </div>
                        <div
                          className={`text-right ${
                            index === 0 ? "text-primary" : "text-foreground"
                          }`}
                        >
                          <p className="text-2xl font-bold">#{index + 1}</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            index === 0
                              ? "bg-gradient-to-r from-primary to-primary/50"
                              : "bg-gradient-to-r from-primary/70 to-primary/30"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCog className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No doctor data yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Doctor performance data will appear once appointments are
                  completed
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Recommendations & Insights
            </CardTitle>
            <CardDescription>
              AI-powered suggestions to improve clinic performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all"
                >
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicAnalytics;
