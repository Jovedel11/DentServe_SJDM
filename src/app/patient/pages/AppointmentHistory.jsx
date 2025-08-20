import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
  FiFileText,
  FiDownload,
  FiSearch,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiTrendingUp,
  FiActivity,
  FiHeart,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { LuPill } from "react-icons/lu";
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/**
 * Appointment History page component - shows complete appointment history with analytics
 */
const AppointmentHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock Analytics Data - This would come from your Supabase functions
  const analyticsData = {
    healthScore: 85,
    improvementTrend: 12, // +12% improvement
    totalAppointments: 24,
    completedTreatments: 18,
    consistencyRating: "Excellent",
    lastVisit: "2024-01-15",
    nextRecommendedVisit: "2024-02-15",
    completedAppointments: 18,
    cancelledAppointments: 4,
    noShowAppointments: 2,
    upcomingAppointments: 3,
    favoriteClinic: {
      name: "Downtown Dental Center",
      id: "clinic_001",
      visits: 15,
    },
  };

  // Mock Chart Data
  const healthTrendData = [
    { month: "Oct 2023", healthScore: 72, visits: 2 },
    { month: "Nov 2023", healthScore: 75, visits: 2 },
    { month: "Dec 2023", healthScore: 78, visits: 1 },
    { month: "Jan 2024", healthScore: 82, visits: 3 },
    { month: "Feb 2024", healthScore: 85, visits: 2 },
    { month: "Mar 2024", healthScore: 88, visits: 2 },
  ];

  const appointmentTypeData = [
    { name: "Completed", value: 18, color: "hsl(var(--chart-1))" },
    { name: "Cancelled", value: 4, color: "hsl(var(--chart-2))" },
    { name: "No Show", value: 2, color: "hsl(var(--chart-3))" },
  ];

  const monthlyTrendsData = [
    { month: "Oct", completed: 2, cancelled: 1, noShow: 0 },
    { month: "Nov", completed: 2, cancelled: 0, noShow: 1 },
    { month: "Dec", completed: 1, cancelled: 1, noShow: 0 },
    { month: "Jan", completed: 3, cancelled: 0, noShow: 0 },
    { month: "Feb", completed: 2, cancelled: 1, noShow: 1 },
    { month: "Mar", completed: 2, cancelled: 1, noShow: 0 },
  ];

  // Mock Appointment History Data
  const appointmentHistory = [
    {
      id: "apt_001",
      date: "2024-01-15",
      time: "10:00 AM",
      status: "completed",
      type: "Regular Checkup",
      doctor: "Dr. Sarah Martinez",
      clinic: "Downtown Dental Center",
      duration: "45 minutes",
      cancelledBy: null,
      cancellationReason: null,
      treatments: [
        { name: "Dental Cleaning", completed: true },
        { name: "Fluoride Treatment", completed: true },
        { name: "Oral Examination", completed: true },
      ],
      prescriptions: [
        {
          name: "Fluoride Toothpaste",
          dosage: "Twice daily",
          duration: "30 days",
        },
      ],
      notes: "Patient shows excellent oral hygiene. Next visit in 6 months.",
      cost: 150.0,
    },
    {
      id: "apt_002",
      date: "2023-12-20",
      time: "2:30 PM",
      status: "cancelled",
      type: "Root Canal - Follow up",
      doctor: "Dr. Michael Johnson",
      clinic: "Uptown Medical Center",
      duration: "60 minutes",
      cancelledBy: "patient",
      cancellationReason: "Personal emergency - rescheduled for next week",
      treatments: [
        { name: "Root Canal Follow-up", completed: false },
        { name: "X-Ray", completed: false },
      ],
      prescriptions: [],
      notes: "Patient called 2 hours before appointment to cancel.",
      cost: 0,
    },
    {
      id: "apt_003",
      date: "2023-12-05",
      time: "9:00 AM",
      status: "completed",
      type: "Root Canal Treatment",
      doctor: "Dr. Michael Johnson",
      clinic: "Uptown Medical Center",
      duration: "90 minutes",
      cancelledBy: null,
      cancellationReason: null,
      treatments: [
        { name: "Root Canal Procedure", completed: true },
        { name: "Temporary Filling", completed: true },
        { name: "Pain Management", completed: true },
      ],
      prescriptions: [
        {
          name: "Ibuprofen 400mg",
          dosage: "Every 6 hours",
          duration: "5 days",
        },
        {
          name: "Amoxicillin 500mg",
          dosage: "Every 8 hours",
          duration: "7 days",
        },
      ],
      notes:
        "Procedure completed successfully. Follow-up scheduled in 2 weeks.",
      cost: 800.0,
    },
    {
      id: "apt_004",
      date: "2023-11-18",
      time: "11:30 AM",
      status: "no-show",
      type: "Dental Cleaning",
      doctor: "Dr. Sarah Martinez",
      clinic: "Downtown Dental Center",
      duration: "45 minutes",
      cancelledBy: "system",
      cancellationReason: "Patient did not show up and did not cancel",
      treatments: [
        { name: "Dental Cleaning", completed: false },
        { name: "Oral Examination", completed: false },
      ],
      prescriptions: [],
      notes: "Patient did not show up. No prior communication received.",
      cost: 0,
    },
    {
      id: "apt_005",
      date: "2023-11-01",
      time: "3:00 PM",
      status: "completed",
      type: "Teeth Whitening",
      doctor: "Dr. Emily Davis",
      clinic: "Smile Bright Clinic",
      duration: "60 minutes",
      cancelledBy: null,
      cancellationReason: null,
      treatments: [
        { name: "Professional Teeth Whitening", completed: true },
        { name: "Dental Photography", completed: true },
      ],
      prescriptions: [
        {
          name: "Whitening Toothpaste",
          dosage: "Twice daily",
          duration: "14 days",
        },
      ],
      notes: "Excellent results achieved. Patient very satisfied.",
      cost: 300.0,
    },
  ];

  // Chart configuration for shadcn/ui charts
  const chartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-1))",
    },
    cancelled: {
      label: "Cancelled",
      color: "hsl(var(--chart-2))",
    },
    noShow: {
      label: "No Show",
      color: "hsl(var(--chart-3))",
    },
    healthScore: {
      label: "Health Score",
      color: "hsl(var(--chart-4))",
    },
    visits: {
      label: "Visits",
      color: "hsl(var(--chart-5))",
    },
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800";
      case "cancelled":
        return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800";
      case "no-show":
        return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <FiCheck className="w-4 h-4" />;
      case "cancelled":
        return <FiX className="w-4 h-4" />;
      case "no-show":
        return <FiAlertCircle className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  const filteredAppointments = appointmentHistory.filter((appointment) => {
    const matchesSearch =
      searchQuery === "" ||
      appointment.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.clinic.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || appointment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDownloadReport = () => {
    // This would generate and download a PDF/CSV report
    console.log("Downloading appointment history report...");
    alert("Report download started! (This is a mock implementation)");
  };

  const toggleAppointmentDetails = (appointmentId) => {
    setExpandedAppointment(
      expandedAppointment === appointmentId ? null : appointmentId
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-muted rounded"></div>
              <div className="h-80 bg-muted rounded"></div>
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-start gap-6 mb-6 md:flex-row flex-col">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Appointment History
              </h1>
              <p className="text-muted-foreground">
                Complete overview of your dental appointments and health
                progress
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </motion.div>

        {/* Analytics Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Health Score Card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                <FiHeart className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <FiTrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">
                  +{analyticsData.improvementTrend}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {analyticsData.healthScore}
              </h3>
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className="text-xs text-muted-foreground">
                {analyticsData.consistencyRating} consistency
              </p>
            </div>
          </div>

          {/* Total Appointments */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {analyticsData.totalAppointments}
              </h3>
              <p className="text-sm text-muted-foreground">
                Total Appointments
              </p>
              <p className="text-xs text-muted-foreground">
                {analyticsData.completedAppointments} completed
              </p>
            </div>
          </div>

          {/* Completed Treatments */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                <FiActivity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {analyticsData.completedTreatments}
              </h3>
              <p className="text-sm text-muted-foreground">
                Treatments Completed
              </p>
              <p className="text-xs text-muted-foreground">Across all visits</p>
            </div>
          </div>

          {/* Favorite Clinic */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20">
                <FiMapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {analyticsData.favoriteClinic.name}
              </h3>
              <p className="text-sm text-muted-foreground">Favorite Clinic</p>
              <p className="text-xs text-muted-foreground">
                {analyticsData.favoriteClinic.visits} visits
              </p>
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Health Score Trend */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Health Score Progress
              </h3>
              <p className="text-sm text-muted-foreground">
                Your dental health improvement over time
              </p>
            </div>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={healthTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="healthScore"
                  stroke="var(--color-healthScore)"
                  strokeWidth={3}
                  dot={{
                    fill: "var(--color-healthScore)",
                    strokeWidth: 2,
                    r: 4,
                  }}
                />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Appointment Status Breakdown */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Appointment Status
              </h3>
              <p className="text-sm text-muted-foreground">
                Breakdown of your appointment history
              </p>
            </div>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={appointmentTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {appointmentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>
        </motion.div>

        {/* Monthly Trends Chart */}
        <motion.div
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Monthly Appointment Trends
            </h3>
            <p className="text-sm text-muted-foreground">
              Compare last 3 months vs previous 3 months
            </p>
          </div>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <BarChart data={monthlyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                name="Completed"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="cancelled"
                fill="var(--color-cancelled)"
                name="Cancelled"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="noShow"
                fill="var(--color-noShow)"
                name="No Show"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          className="bg-card border border-border rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search appointments, doctors, or clinics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input bg-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
          </div>

          {/* Appointment List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Appointment History ({filteredAppointments.length} records)
            </h3>

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <FiCalendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">
                  No appointments found
                </h4>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              filteredAppointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  className="border border-border rounded-lg overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Appointment Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => toggleAppointmentDetails(appointment.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {getStatusIcon(appointment.status)}
                          {appointment.status.charAt(0).toUpperCase() +
                            appointment.status.slice(1)}
                        </div>

                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            {appointment.type}
                          </h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {new Date(appointment.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiClock className="w-3 h-3" />
                              {appointment.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {appointment.doctor}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiMapPin className="w-3 h-3" />
                              {appointment.clinic}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {appointment.cost > 0 && (
                          <span className="text-sm font-medium text-foreground">
                            ${appointment.cost.toFixed(2)}
                          </span>
                        )}
                        {expandedAppointment === appointment.id ? (
                          <FiChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <FiChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAppointment === appointment.id && (
                    <motion.div
                      className="border-t border-border bg-muted/20 p-6"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Treatments */}
                        <div>
                          <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <FiActivity className="w-4 h-4" />
                            Treatments
                          </h5>
                          <div className="space-y-2">
                            {appointment.treatments.map((treatment, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-sm"
                              >
                                {treatment.completed ? (
                                  <FiCheck className="w-3 h-3 text-green-600" />
                                ) : (
                                  <FiX className="w-3 h-3 text-red-600" />
                                )}
                                <span
                                  className={
                                    treatment.completed
                                      ? "text-foreground"
                                      : "text-muted-foreground line-through"
                                  }
                                >
                                  {treatment.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Prescriptions */}
                        <div>
                          <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <LuPill className="w-4 h-4" />
                            Prescriptions
                          </h5>
                          {appointment.prescriptions.length > 0 ? (
                            <div className="space-y-2">
                              {appointment.prescriptions.map(
                                (prescription, idx) => (
                                  <div key={idx} className="text-sm">
                                    <div className="font-medium text-foreground">
                                      {prescription.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {prescription.dosage} •{" "}
                                      {prescription.duration}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No prescriptions
                            </p>
                          )}
                        </div>

                        {/* Notes & Details */}
                        <div>
                          <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <FiFileText className="w-4 h-4" />
                            Details
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Duration:{" "}
                              </span>
                              <span className="text-foreground">
                                {appointment.duration}
                              </span>
                            </div>
                            {appointment.cancelledBy && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">
                                    Cancelled by:{" "}
                                  </span>
                                  <span className="text-foreground capitalize">
                                    {appointment.cancelledBy}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Reason:{" "}
                                  </span>
                                  <span className="text-foreground">
                                    {appointment.cancellationReason}
                                  </span>
                                </div>
                              </>
                            )}
                            {appointment.notes && (
                              <div>
                                <span className="text-muted-foreground">
                                  Notes:{" "}
                                </span>
                                <p className="text-foreground mt-1">
                                  {appointment.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AppointmentHistory;
