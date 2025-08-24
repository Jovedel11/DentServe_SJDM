import React, { useState, useEffect } from "react";
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
  PieChart,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  Eye,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  X,
  Trophy,
  Medal,
  Zap,
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
  ResponsiveContainer,
  Pie,
} from "recharts";

const UserRecords = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30"); // days
  const [patientData, setPatientData] = useState({
    chartData: [],
    activeList: [],
    inactiveList: [],
    metrics: {},
  });
  const [staffData, setStaffData] = useState({
    chartData: [],
    clinicRanking: [],
    badgeData: [],
    metrics: {},
  });
  const [systemMetrics, setSystemMetrics] = useState({});
  const [showPatientList, setShowPatientList] = useState("active");
  const [showStaffDetails, setShowStaffDetails] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [availableBadges, setAvailableBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState("");
  const [badgeNotes, setBadgeNotes] = useState("");
  const [awardingBadge, setAwardingBadge] = useState(false);

  // Chart configurations
  const patientChartConfig = {
    newPatients: {
      label: "New Patients",
      color: "hsl(var(--dental-teal))",
    },
    activePatients: {
      label: "Active Patients",
      color: "hsl(var(--dental-accent))",
    },
    appointments: {
      label: "Appointments",
      color: "hsl(var(--dental-coral))",
    },
  };

  const staffChartConfig = {
    totalStaff: {
      label: "Total Staff",
      color: "hsl(var(--dental-navy))",
    },
    activeStaff: {
      label: "Active Staff",
      color: "hsl(var(--dental-teal))",
    },
    clinicsActive: {
      label: "Active Clinics",
      color: "hsl(var(--dental-accent))",
    },
  };

  // Mock data based on your database functions
  const mockPatientChartData = [
    { month: "Jan", newPatients: 45, activePatients: 320, appointments: 89 },
    { month: "Feb", newPatients: 52, activePatients: 340, appointments: 102 },
    { month: "Mar", newPatients: 38, activePatients: 355, appointments: 95 },
    { month: "Apr", newPatients: 61, activePatients: 380, appointments: 118 },
    { month: "May", newPatients: 49, activePatients: 395, appointments: 108 },
    { month: "Jun", newPatients: 67, activePatients: 420, appointments: 142 },
    { month: "Jul", newPatients: 71, activePatients: 445, appointments: 156 },
    { month: "Aug", newPatients: 58, activePatients: 465, appointments: 134 },
  ];

  const mockStaffChartData = [
    { month: "Jan", totalStaff: 28, activeStaff: 25, clinicsActive: 8 },
    { month: "Feb", totalStaff: 30, activeStaff: 27, clinicsActive: 9 },
    { month: "Mar", totalStaff: 29, activeStaff: 26, clinicsActive: 8 },
    { month: "Apr", totalStaff: 33, activeStaff: 30, clinicsActive: 10 },
    { month: "May", totalStaff: 35, activeStaff: 32, clinicsActive: 11 },
    { month: "Jun", totalStaff: 38, activeStaff: 35, clinicsActive: 12 },
    { month: "Jul", totalStaff: 41, activeStaff: 38, clinicsActive: 13 },
    { month: "Aug", totalStaff: 43, activeStaff: 40, clinicsActive: 14 },
  ];

  const mockActivePatients = [
    {
      id: "1",
      name: "Sarah Johnson",
      joinDate: "2024-06-15",
      lastAppointment: "2024-08-18",
      totalAppointments: 12,
      appointmentsThisMonth: 3,
      status: "very_active",
    },
    {
      id: "2",
      name: "Michael Chen",
      joinDate: "2024-03-22",
      lastAppointment: "2024-08-20",
      totalAppointments: 8,
      appointmentsThisMonth: 2,
      status: "active",
    },
    {
      id: "3",
      name: "Lisa Rodriguez",
      joinDate: "2024-07-10",
      lastAppointment: "2024-08-19",
      totalAppointments: 4,
      appointmentsThisMonth: 2,
      status: "active",
    },
    {
      id: "4",
      name: "James Wilson",
      joinDate: "2024-05-08",
      lastAppointment: "2024-08-17",
      totalAppointments: 6,
      appointmentsThisMonth: 1,
      status: "moderately_active",
    },
    {
      id: "5",
      name: "Emma Davis",
      joinDate: "2024-04-12",
      lastAppointment: "2024-08-21",
      totalAppointments: 9,
      appointmentsThisMonth: 3,
      status: "very_active",
    },
  ];

  const mockInactivePatients = [
    {
      id: "6",
      name: "Robert Smith",
      joinDate: "2024-02-18",
      lastAppointment: "2024-06-15",
      totalAppointments: 3,
      appointmentsThisMonth: 0,
      status: "inactive",
      daysSinceLastAppointment: 67,
    },
    {
      id: "7",
      name: "Maria Garcia",
      joinDate: "2024-01-25",
      lastAppointment: "2024-07-02",
      totalAppointments: 5,
      appointmentsThisMonth: 0,
      status: "inactive",
      daysSinceLastAppointment: 50,
    },
    {
      id: "8",
      name: "David Brown",
      joinDate: "2024-03-10",
      lastAppointment: "2024-06-28",
      totalAppointments: 2,
      appointmentsThisMonth: 0,
      status: "inactive",
      daysSinceLastAppointment: 54,
    },
  ];

  const mockClinicRanking = [
    {
      id: "1",
      name: "Westside Dental Group",
      totalAppointments: 156,
      completedAppointments: 142,
      completionRate: 91.03,
      rating: 4.9,
      totalReviews: 89,
      badges: [
        { name: "Outstanding", color: "#FFD700", icon: "🏆" },
        { name: "High Volume", color: "#4CAF50", icon: "📈" },
        { name: "Excellent Rating", color: "#E91E63", icon: "⭐" },
      ],
      rank: 1,
      staffCount: 8,
      activeStaff: 7,
      growthRate: 15.2,
      monthlyTrend: "up",
    },
    {
      id: "2",
      name: "Downtown Dental Care",
      totalAppointments: 134,
      completedAppointments: 125,
      completionRate: 93.28,
      rating: 4.8,
      totalReviews: 76,
      badges: [
        { name: "Always Active", color: "#2196F3", icon: "⚡" },
        { name: "Excellent Rating", color: "#E91E63", icon: "⭐" },
      ],
      rank: 2,
      staffCount: 6,
      activeStaff: 6,
      growthRate: 12.8,
      monthlyTrend: "up",
    },
    {
      id: "3",
      name: "Sunny Dental Clinic",
      totalAppointments: 89,
      completedAppointments: 82,
      completionRate: 92.13,
      rating: 4.7,
      totalReviews: 54,
      badges: [{ name: "Always Active", color: "#2196F3", icon: "⚡" }],
      rank: 3,
      staffCount: 4,
      activeStaff: 4,
      growthRate: 8.5,
      monthlyTrend: "stable",
    },
    {
      id: "4",
      name: "Central Dental Hub",
      totalAppointments: 67,
      completedAppointments: 60,
      completionRate: 89.55,
      rating: 4.5,
      totalReviews: 42,
      badges: [],
      rank: 4,
      staffCount: 5,
      activeStaff: 3,
      growthRate: -2.1,
      monthlyTrend: "down",
    },
    {
      id: "5",
      name: "Family Dental Practice",
      totalAppointments: 45,
      completedAppointments: 41,
      completionRate: 91.11,
      rating: 4.6,
      totalReviews: 28,
      badges: [],
      rank: 5,
      staffCount: 3,
      activeStaff: 3,
      growthRate: 5.3,
      monthlyTrend: "up",
    },
  ];

  const mockBadgeData = [
    { name: "Outstanding", count: 1, color: "#FFD700" },
    { name: "High Volume", count: 1, color: "#4CAF50" },
    { name: "Excellent Rating", count: 2, color: "#E91E63" },
    { name: "Always Active", count: 2, color: "#2196F3" },
  ];

  const mockAvailableBadges = [
    {
      id: "1",
      name: "Outstanding",
      color: "#FFD700",
      icon: "🏆",
      description: "Perfect 5.0 rating",
    },
    {
      id: "2",
      name: "High Volume",
      color: "#4CAF50",
      icon: "📈",
      description: "100+ appointments/month",
    },
    {
      id: "3",
      name: "Excellent Rating",
      color: "#E91E63",
      icon: "⭐",
      description: "4.5+ average rating",
    },
    {
      id: "4",
      name: "Always Active",
      color: "#2196F3",
      icon: "⚡",
      description: "Active within last 8 days",
    },
  ];

  // Initialize data
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Simulate API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Set patient data
      setPatientData({
        chartData: mockPatientChartData,
        activeList: mockActivePatients,
        inactiveList: mockInactivePatients,
        metrics: {
          totalPatients: 465,
          newThisMonth: 58,
          activeThisMonth: 134,
          growthRate: 12.5,
          appointmentRate: 78.3,
        },
      });

      // Set staff data
      setStaffData({
        chartData: mockStaffChartData,
        clinicRanking: mockClinicRanking,
        badgeData: mockBadgeData,
        metrics: {
          totalStaff: 43,
          activeStaff: 40,
          totalClinics: 14,
          activeClinics: 14,
          avgStaffPerClinic: 3.1,
        },
      });

      // Set system metrics
      setSystemMetrics({
        platformGrowthRate: 15.7,
        avgClinicRating: 4.7,
        totalAppointmentsPeriod: 567,
        totalFeedbackCount: 234,
      });

      setAvailableBadges(mockAvailableBadges);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle badge award
  const handleAwardBadge = async () => {
    if (!selectedBadge || !selectedClinic) return;

    try {
      setAwardingBadge(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update clinic badges locally
      setStaffData((prev) => ({
        ...prev,
        clinicRanking: prev.clinicRanking.map((clinic) =>
          clinic.id === selectedClinic.id
            ? {
                ...clinic,
                badges: [
                  ...clinic.badges,
                  availableBadges.find((b) => b.id === selectedBadge),
                ],
              }
            : clinic
        ),
      }));

      // Update badge data
      setStaffData((prev) => ({
        ...prev,
        badgeData: prev.badgeData.map((badge) =>
          badge.name ===
          availableBadges.find((b) => b.id === selectedBadge)?.name
            ? { ...badge, count: badge.count + 1 }
            : badge
        ),
      }));

      // Close modal
      setShowBadgeModal(false);
      setSelectedClinic(null);
      setSelectedBadge("");
      setBadgeNotes("");

      // Show success notification (you can implement this)
      console.log("Badge awarded successfully!");
    } catch (error) {
      console.error("Error awarding badge:", error);
    } finally {
      setAwardingBadge(false);
    }
  };

  // Get activity status color
  const getActivityColor = (status) => {
    switch (status) {
      case "very_active":
        return "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800";
      case "active":
        return "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800";
      case "moderately_active":
        return "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "inactive":
        return "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800";
    }
  };

  // Get trend icon and color
  const getTrendDisplay = (trend, growthRate) => {
    switch (trend) {
      case "up":
        return (
          <div className="flex items-center gap-1 text-green-600">
            <ArrowUp size={12} />
            <span className="text-xs font-medium">+{growthRate}%</span>
          </div>
        );
      case "down":
        return (
          <div className="flex items-center gap-1 text-red-600">
            <ArrowDown size={12} />
            <span className="text-xs font-medium">{growthRate}%</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-gray-600">
            <div className="w-3 h-0.5 bg-gray-400"></div>
            <span className="text-xs font-medium">{growthRate}%</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-6 border">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-6 border h-96"></div>
              <div className="bg-card rounded-lg p-6 border h-96"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                User Records & Analytics
              </h1>
              <p className="text-muted-foreground">
                Track patient growth, staff performance, and clinic badge
                achievements
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* System Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-green-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Platform Growth
                </span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                +{systemMetrics.platformGrowthRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                vs previous period
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Star className="text-yellow-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Avg Rating
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMetrics.avgClinicRating}
              </div>
              <div className="text-xs text-muted-foreground">
                across all clinics
              </div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Appointments
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMetrics.totalAppointmentsPeriod}
              </div>
              <div className="text-xs text-muted-foreground">this period</div>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="text-purple-600" size={16} />
                <span className="text-sm font-medium text-muted-foreground">
                  Feedback
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMetrics.totalFeedbackCount}
              </div>
              <div className="text-xs text-muted-foreground">
                reviews received
              </div>
            </div>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Patient Analytics Chart */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Heart className="text-pink-600" size={20} />
                    Patient Growth & Activity
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    New registrations and appointment activity
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {patientData.metrics.totalPatients}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Patients
                  </div>
                </div>
              </div>

              <ChartContainer config={patientChartConfig} className="h-80">
                <AreaChart data={patientData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="newPatients"
                    stackId="1"
                    stroke="var(--color-newPatients)"
                    fill="var(--color-newPatients)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="appointments"
                    stackId="2"
                    stroke="var(--color-appointments)"
                    fill="var(--color-appointments)"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>

              {/* Patient Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {patientData.metrics.newThisMonth}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    New This Month
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {patientData.metrics.activeThisMonth}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active This Month
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    +{patientData.metrics.growthRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Growth Rate
                  </div>
                </div>
              </div>
            </div>

            {/* Staff & Clinic Performance Chart */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Shield className="text-purple-600" size={20} />
                    Staff & Clinic Performance
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Staff activity and clinic badge achievements
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {staffData.metrics.totalStaff}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Staff
                  </div>
                </div>
              </div>

              <ChartContainer config={staffChartConfig} className="h-80">
                <LineChart data={staffData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="totalStaff"
                    stroke="var(--color-totalStaff)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeStaff"
                    stroke="var(--color-activeStaff)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clinicsActive"
                    stroke="var(--color-clinicsActive)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>

              {/* Staff Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {staffData.metrics.activeStaff}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active Staff
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {staffData.metrics.activeClinics}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active Clinics
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {staffData.metrics.avgStaffPerClinic}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg Staff/Clinic
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Activity Lists */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="text-blue-600" size={20} />
                Patient Activity Overview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPatientList("active")}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    showPatientList === "active"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active Patients ({patientData.activeList.length})
                </button>
                <button
                  onClick={() => setShowPatientList("inactive")}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    showPatientList === "inactive"
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inactive Patients ({patientData.inactiveList.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-foreground">
                      Patient
                    </th>
                    <th className="text-left p-3 font-medium text-foreground">
                      Join Date
                    </th>
                    <th className="text-left p-3 font-medium text-foreground">
                      Last Activity
                    </th>
                    <th className="text-left p-3 font-medium text-foreground">
                      Total Appointments
                    </th>
                    <th className="text-left p-3 font-medium text-foreground">
                      This Month
                    </th>
                    <th className="text-left p-3 font-medium text-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(showPatientList === "active"
                    ? patientData.activeList
                    : patientData.inactiveList
                  ).map((patient, index) => (
                    <tr
                      key={patient.id}
                      className={`border-b hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/10"
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {patient.name}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(patient.joinDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {patient.lastAppointment
                          ? new Date(
                              patient.lastAppointment
                            ).toLocaleDateString()
                          : "Never"}
                        {patient.daysSinceLastAppointment && (
                          <div className="text-xs text-red-600">
                            {patient.daysSinceLastAppointment} days ago
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-sm font-medium text-foreground">
                        {patient.totalAppointments}
                      </td>
                      <td className="p-3 text-sm font-medium text-foreground">
                        {patient.appointmentsThisMonth}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getActivityColor(
                            patient.status
                          )}`}
                        >
                          {patient.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinic Performance & Badge System */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Clinic Ranking */}
            <div className="xl:col-span-2 bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="text-blue-600" size={20} />
                  Clinic Performance Ranking & Growth
                </h3>
                <button
                  onClick={() => setShowStaffDetails(!showStaffDetails)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:opacity-90 transition-opacity"
                >
                  <Eye size={14} />
                  {showStaffDetails ? "Hide" : "Show"} Staff Details
                </button>
              </div>

              <div className="space-y-4">
                {staffData.clinicRanking.map((clinic) => (
                  <div
                    key={clinic.id}
                    className="p-5 bg-muted/20 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              clinic.rank === 1
                                ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
                                : clinic.rank === 2
                                ? "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
                                : clinic.rank === 3
                                ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white"
                                : "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
                            }`}
                          >
                            #{clinic.rank}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground text-lg">
                              {clinic.name}
                            </h4>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground mt-1">
                              <span className="font-medium">
                                {clinic.totalAppointments} appointments
                              </span>
                              <span className="font-medium">
                                {clinic.completionRate}% completion
                              </span>
                              <span className="flex items-center gap-1">
                                <Star size={12} className="text-yellow-500" />
                                <span className="font-medium">
                                  {clinic.rating}
                                </span>{" "}
                                ({clinic.totalReviews} reviews)
                              </span>
                              {getTrendDisplay(
                                clinic.monthlyTrend,
                                clinic.growthRate
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedClinic(clinic);
                              setShowBadgeModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                          >
                            <Award size={16} />
                            Award Badge
                          </button>
                        </div>

                        {/* Badges */}
                        {clinic.badges.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {clinic.badges.map((badge, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: badge.color + "20",
                                  borderColor: badge.color + "40",
                                  color: badge.color,
                                }}
                              >
                                <span className="text-sm">{badge.icon}</span>
                                {badge.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Staff Details */}
                        {showStaffDetails && (
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                            <div>
                              <span className="font-medium">Staff: </span>
                              <span className="text-foreground">
                                {clinic.activeStaff}/{clinic.staffCount} active
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Growth: </span>
                              <span
                                className={
                                  clinic.growthRate > 0
                                    ? "text-green-600"
                                    : clinic.growthRate < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }
                              >
                                {clinic.growthRate > 0 ? "+" : ""}
                                {clinic.growthRate}% this month
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-xl font-bold text-foreground">
                          {clinic.completionRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Success Rate
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            clinic.completionRate >= 95
                              ? "bg-gradient-to-r from-green-400 to-green-600"
                              : clinic.completionRate >= 90
                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                              : clinic.completionRate >= 80
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                              : "bg-gradient-to-r from-red-400 to-red-600"
                          }`}
                          style={{ width: `${clinic.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Badge Distribution */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
                <Award className="text-yellow-600" size={20} />
                Badge Distribution
              </h3>

              <div className="space-y-4 mb-6">
                {staffData.badgeData.map((badge) => (
                  <div
                    key={badge.name}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: badge.color }}
                      ></div>
                      <span className="text-sm font-medium text-foreground">
                        {badge.name}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {badge.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-64">
                <ChartContainer config={{}} className="h-full">
                  <RechartsPieChart>
                    <Pie
                      data={staffData.badgeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {staffData.badgeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPieChart>
                </ChartContainer>
              </div>

              <div className="mt-6 pt-4 border-t text-center">
                <div className="text-3xl font-bold text-foreground">
                  {staffData.badgeData.reduce(
                    (sum, badge) => sum + badge.count,
                    0
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Badges Awarded
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badge Award Modal */}
      {showBadgeModal && selectedClinic && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <Award className="text-yellow-600" size={24} />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Award Badge
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedClinic.name}
                  </p>
                </div>
              </div>

              {/* Badge Selection */}
              <div className="space-y-4 mb-6">
                <label className="block text-sm font-medium text-foreground">
                  Select Badge
                </label>
                <div className="space-y-2">
                  {availableBadges.map((badge) => (
                    <label
                      key={badge.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedBadge === badge.id
                          ? "border-primary bg-primary/5"
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
                      />
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: badge.color }}
                      />
                      <div>
                        <div className="font-medium text-foreground">
                          {badge.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {badge.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-foreground">
                  Award Notes (Optional)
                </label>
                <textarea
                  value={badgeNotes}
                  onChange={(e) => setBadgeNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                  rows={3}
                  placeholder="Add any notes about this badge award..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBadgeModal(false);
                    setSelectedClinic(null);
                    setSelectedBadge("");
                    setBadgeNotes("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  disabled={awardingBadge}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAwardBadge}
                  disabled={!selectedBadge || awardingBadge}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {awardingBadge ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
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
      )}
    </div>
  );
};

export default UserRecords;
