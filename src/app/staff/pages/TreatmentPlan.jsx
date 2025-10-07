import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Heart,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  Edit,
  Pause,
  PlayCircle,
  Ban,
  TrendingUp,
  ClipboardList,
  FileText,
  Info,
  AlertTriangle,
  ArrowLeft,
  Save,
  X,
  Mail,
  Phone,
  Stethoscope,
  Users,
  Target,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Pill,
  Scissors,
  Sparkles,
  RefreshCw,
  Shield,
  AlertOctagon,
} from "lucide-react";

// UI Components
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/text-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/core/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/core/components/ui/alert";
import { Label } from "@/core/components/ui/label";
import { Separator } from "@/core/components/ui/separator";
import { Progress } from "@/core/components/ui/progress";
import { ScrollArea } from "@/core/components/ui/scroll-area";

// Hooks
import { useTreatmentPlans } from "@/hooks/appointment/useTreatmentPlans";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// Treatment Categories with Icons & Colors
const TREATMENT_CATEGORIES = [
  {
    value: "orthodontics",
    label: "Orthodontics",
    description: "Braces, Aligners",
    icon: Sparkles,
    color: "bg-purple-500",
  },
  {
    value: "implants",
    label: "Dental Implants",
    description: "Tooth Replacement",
    icon: Stethoscope,
    color: "bg-blue-500",
  },
  {
    value: "root_canal",
    label: "Root Canal",
    description: "Endodontic Therapy",
    icon: Activity,
    color: "bg-red-500",
  },
  {
    value: "periodontics",
    label: "Periodontal Care",
    description: "Gum Treatment",
    icon: Heart,
    color: "bg-pink-500",
  },
  {
    value: "prosthodontics",
    label: "Prosthodontics",
    description: "Crowns, Bridges",
    icon: Target,
    color: "bg-amber-500",
  },
  {
    value: "cosmetic",
    label: "Cosmetic Dentistry",
    description: "Aesthetic Enhancement",
    icon: Sparkles,
    color: "bg-cyan-500",
  },
  {
    value: "oral_surgery",
    label: "Oral Surgery",
    description: "Surgical Procedures",
    icon: Scissors,
    color: "bg-orange-500",
  },
  {
    value: "preventive",
    label: "Preventive Care",
    description: "Maintenance Program",
    icon: Shield,
    color: "bg-green-500",
  },
  {
    value: "restorative",
    label: "Restorative",
    description: "Fillings, Repairs",
    icon: Pill,
    color: "bg-indigo-500",
  },
  {
    value: "other",
    label: "Other Treatment",
    description: "Specialized Care",
    icon: ClipboardList,
    color: "bg-gray-500",
  },
];

const TreatmentPlans = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isStaff, isAdmin, profile } = useAuth();

  // Treatment Plans Hook
  const {
    loading,
    error,
    ongoingTreatments,
    summary,
    getOngoingTreatments,
    getTreatmentPlanDetails,
    updateTreatmentPlanStatus,
    createTreatmentPlan: createPlan,
    getAppointmentsAwaitingTreatmentPlans,
    clearError,
  } = useTreatmentPlans();

  // State Management
  const [activeTab, setActiveTab] = useState("pending"); // ✅ START WITH PENDING
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState({
    status: "",
    notes: "",
  });
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  // Create Treatment Form State
  const [createFormData, setCreateFormData] = useState({
    treatmentName: "",
    treatmentCategory: "",
    description: "",
    totalVisitsPlanned: "",
    followUpIntervalDays: "30",
  });
  const [formErrors, setFormErrors] = useState({});

  // Toast Notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      4000
    );
  };

  const loadPendingAppointments = async () => {
    setLoadingPending(true);
    const result = await getAppointmentsAwaitingTreatmentPlans();
    setLoadingPending(false);

    if (result.success) {
      setPendingAppointments(result.appointments);
    } else {
      showToast(result.error || "Failed to load pending appointments", "error");
    }
  };

  useEffect(() => {
    if ((isStaff || isAdmin) && profile?.clinic_id) {
      loadPendingAppointments();
      loadAllTreatments();
    }
  }, [isStaff, isAdmin, profile?.clinic_id]);

  // Handle navigation from ManageAppointments
  useEffect(() => {
    if (location.state?.fromAppointment) {
      const { appointment } = location.state;
      setSelectedAppointment(appointment);
      setShowCreateModal(true);
      setActiveTab("pending");
      // Clear state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load ALL treatments
  const loadAllTreatments = async () => {
    await getOngoingTreatments(null, true);
  };

  // Filter Treatments by Tab
  const filteredTreatments = useMemo(() => {
    let filtered = ongoingTreatments || [];

    // Filter by status (tab)
    if (activeTab === "active") {
      filtered = filtered.filter((t) => t.status === "active");
    } else if (activeTab === "paused") {
      filtered = filtered.filter((t) => t.status === "paused");
    } else if (activeTab === "completed") {
      filtered = filtered.filter((t) => t.status === "completed");
    } else if (activeTab === "overdue") {
      filtered = filtered.filter((t) => t.timeline?.is_overdue);
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (t) => t.treatment_category === categoryFilter
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.treatment_name?.toLowerCase().includes(query) ||
          t.clinic?.name?.toLowerCase().includes(query) ||
          t.patient_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [ongoingTreatments, activeTab, categoryFilter, searchQuery]);

  // ✅ Filter Pending Appointments
  const filteredPendingAppointments = useMemo(() => {
    if (!searchQuery) return pendingAppointments;

    const query = searchQuery.toLowerCase();
    return pendingAppointments.filter(
      (apt) =>
        apt.patient_name?.toLowerCase().includes(query) ||
        apt.patient_email?.toLowerCase().includes(query) ||
        apt.services.some((s) => s.name?.toLowerCase().includes(query))
    );
  }, [pendingAppointments, searchQuery]);

  // Handle View Details
  const handleViewDetails = async (treatmentId) => {
    const result = await getTreatmentPlanDetails(treatmentId);
    if (result.success) {
      setSelectedTreatment(result.plan);
      setShowDetailsModal(true);
    } else {
      showToast(result.error || "Failed to load treatment details", "error");
    }
  };

  // Handle Status Update
  const handleStatusUpdate = async () => {
    if (!selectedTreatment || !statusUpdateData.status) return;

    const result = await updateTreatmentPlanStatus(
      selectedTreatment.id,
      statusUpdateData.status,
      statusUpdateData.notes || null
    );

    if (result.success) {
      showToast(
        `Treatment plan ${statusUpdateData.status} successfully`,
        "success"
      );
      setShowStatusUpdateModal(false);
      setStatusUpdateData({ status: "", notes: "" });
      setShowDetailsModal(false);
      await loadAllTreatments();
    } else {
      showToast(result.error || "Failed to update status", "error");
    }
  };

  // ✅ Handle Create Treatment Plan (from appointment)
  const handleCreateTreatment = async () => {
    if (!selectedAppointment) {
      showToast("No appointment selected", "error");
      return;
    }

    // Validation
    const errors = {};
    if (!createFormData.treatmentName.trim())
      errors.treatmentName = "Treatment name is required";
    if (!createFormData.treatmentCategory)
      errors.category = "Category is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("Please fix the form errors", "error");
      return;
    }

    const treatmentData = {
      patientId: selectedAppointment.patient_id,
      clinicId: profile?.clinic_id,
      treatmentName: createFormData.treatmentName,
      description: createFormData.description || null,
      treatmentCategory: createFormData.treatmentCategory,
      totalVisitsPlanned: createFormData.totalVisitsPlanned
        ? parseInt(createFormData.totalVisitsPlanned)
        : null,
      followUpIntervalDays: parseInt(createFormData.followUpIntervalDays),
      initialAppointmentId: selectedAppointment.id,
    };

    const result = await createPlan(treatmentData);

    if (result.success) {
      showToast("✅ Treatment plan created successfully!", "success");
      setShowCreateModal(false);
      resetCreateForm();
      setSelectedAppointment(null);
      await loadAllTreatments();
      await loadPendingAppointments(); // ✅ REFRESH PENDING LIST
    } else {
      showToast(result.error || "Failed to create treatment plan", "error");
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      treatmentName: "",
      treatmentCategory: "",
      description: "",
      totalVisitsPlanned: "",
      followUpIntervalDays: "30",
    });
    setFormErrors({});
  };

  // Get category info
  const getCategoryInfo = (categoryValue) => {
    return (
      TREATMENT_CATEGORIES.find((c) => c.value === categoryValue) ||
      TREATMENT_CATEGORIES[9]
    );
  };

  // ✅ Pending Appointment Card (new design!)
  const PendingAppointmentCard = ({ appointment }) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const daysAgo = Math.floor(
      (new Date() - appointmentDate) / (1000 * 60 * 60 * 24)
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.01 }}
      >
        <Card className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-orange-500 bg-orange-50/30">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="warning"
                      className="bg-orange-500 text-white"
                    >
                      <AlertOctagon className="w-3 h-3 mr-1" />
                      Awaiting Treatment Plan
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {daysAgo} day{daysAgo !== 1 ? "s" : ""} ago
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    {appointment.patient_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {appointment.patient_email}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Appointment Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{appointmentDate.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{appointment.appointment_time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <Stethoscope className="w-4 h-4" />
                  <span className="font-medium">{appointment.doctor_name}</span>
                </div>
              </div>

              {/* Services */}
              {appointment.services.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Services Completed:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {appointment.services.map((service, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Symptoms/Notes */}
              {appointment.symptoms && (
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">
                    Patient Concerns:
                  </p>
                  <p className="text-sm line-clamp-2">{appointment.symptoms}</p>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={() => {
                  setSelectedAppointment(appointment);
                  setShowCreateModal(true);
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Treatment Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Progress Ring Component
  const ProgressRing = ({ progress, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted opacity-20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-500 ${
              progress >= 75
                ? "text-green-500"
                : progress >= 50
                ? "text-blue-500"
                : progress >= 25
                ? "text-yellow-500"
                : "text-orange-500"
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{Math.round(progress)}%</span>
          <span className="text-xs text-muted-foreground">Complete</span>
        </div>
      </div>
    );
  };

  // Treatment Card Component
  const TreatmentCard = ({ treatment }) => {
    const category = getCategoryInfo(treatment.treatment_category);
    const IconComponent = category.icon;
    const progress = treatment.progress?.percentage || 0;
    const isOverdue = treatment.timeline?.is_overdue;
    const visitsCompleted = treatment.progress?.visits_completed || 0;
    const totalVisits = treatment.progress?.total_visits_planned || 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className="group"
      >
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg border-l-4 ${
            isOverdue
              ? "border-l-red-500"
              : category.color.replace("bg-", "border-l-")
          }`}
        >
          <CardContent className="p-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <ProgressRing progress={progress} size={100} strokeWidth={6} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`p-1.5 rounded-lg ${category.color} text-white`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-lg truncate">
                        {treatment.treatment_name}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.label}
                    </p>
                  </div>

                  {isOverdue && (
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span className="font-medium">
                      {treatment.patient_name || "Patient"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Started{" "}
                      {new Date(
                        treatment.timeline?.start_date
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Visits</p>
                    <p className="text-sm font-semibold">
                      {visitsCompleted} / {totalVisits || "∞"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Visit</p>
                    <p className="text-sm font-semibold">
                      {treatment.timeline?.days_since_last_visit
                        ? `${treatment.timeline.days_since_last_visit}d ago`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Visit</p>
                    <p className="text-sm font-semibold">
                      {treatment.next_appointment?.date
                        ? new Date(
                            treatment.next_appointment.date
                          ).toLocaleDateString()
                        : "Not scheduled"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(treatment.id)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  {treatment.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTreatment(treatment);
                        setStatusUpdateData({ status: "paused", notes: "" });
                        setShowStatusUpdateModal(true);
                      }}
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  {treatment.status === "paused" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTreatment(treatment);
                        setStatusUpdateData({ status: "active", notes: "" });
                        setShowStatusUpdateModal(true);
                      }}
                    >
                      <PlayCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Security Check
  if (!isStaff && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <div>
              <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                This page is restricted to staff members only.
              </p>
            </div>
            <Button onClick={() => navigate("/")}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <Alert variant={toast.type === "error" ? "destructive" : "default"}>
              {toast.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Heart className="w-8 h-8 text-primary" />
              Treatment Plans
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage patient treatment plans, track progress, and create new
              plans
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                loadAllTreatments();
                loadPendingAppointments();
              }}
              disabled={loading || loadingPending}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  loading || loadingPending ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Awaiting Plan Creation
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {pendingAppointments.length}
                  </p>
                </div>
                <AlertOctagon className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold">
                    {summary?.total_active || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {summary?.overdue_count || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">
                    {Math.round(summary?.completion_avg || 0)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient name or treatment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {activeTab !== "pending" && (
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-full md:w-[250px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {TREATMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                <span>Pending ({pendingAppointments.length})</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active (
              {ongoingTreatments?.filter((t) => t.status === "active").length ||
                0}
              )
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({summary?.overdue_count || 0})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Paused (
              {ongoingTreatments?.filter((t) => t.status === "paused").length ||
                0}
              )
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed (
              {ongoingTreatments?.filter((t) => t.status === "completed")
                .length || 0}
              )
            </TabsTrigger>
          </TabsList>

          {/* Content */}
          <div className="mt-6">
            {/* PENDING TAB */}
            {activeTab === "pending" && (
              <>
                {loadingPending && (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                {!loadingPending &&
                  filteredPendingAppointments.length === 0 && (
                    <Card>
                      <CardContent className="pt-6 text-center py-12">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">
                          All caught up!
                        </p>
                        <p className="text-muted-foreground">
                          No completed appointments waiting for treatment plans
                        </p>
                      </CardContent>
                    </Card>
                  )}

                {!loadingPending && filteredPendingAppointments.length > 0 && (
                  <>
                    <Alert className="mb-4">
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        These completed appointments don't have treatment plans
                        yet. Click "Create Treatment Plan" to set up a treatment
                        journey for the patient.
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredPendingAppointments.map((apt) => (
                        <PendingAppointmentCard
                          key={apt.id}
                          appointment={apt}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* OTHER TABS */}
            {activeTab !== "pending" && (
              <>
                {loading && (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                {!loading && filteredTreatments.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center py-12">
                      <ClipboardList className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">
                        No treatment plans found
                      </p>
                      <p className="text-muted-foreground">
                        {searchQuery || categoryFilter !== "all"
                          ? "Try adjusting your filters"
                          : "No treatment plans in this category"}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!loading && filteredTreatments.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredTreatments.map((treatment) => (
                      <TreatmentCard key={treatment.id} treatment={treatment} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs>
      </div>

      {/* Create Treatment Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Treatment Plan
            </DialogTitle>
            <DialogDescription>
              Create a comprehensive treatment plan for{" "}
              {selectedAppointment?.patient_name}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6 py-4">
              {/* Patient Info Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Patient
                      </p>
                      <p className="font-semibold">
                        {selectedAppointment.patient_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAppointment.patient_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Appointment
                      </p>
                      <p className="font-medium">
                        {new Date(
                          selectedAppointment.appointment_date
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAppointment.doctor_name}
                      </p>
                    </div>
                    {selectedAppointment.services.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-2">
                          Services Completed:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedAppointment.services.map((service, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {service.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Treatment Plan Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="treatmentName">Treatment Name *</Label>
                  <Input
                    id="treatmentName"
                    placeholder="e.g., Full Orthodontic Treatment with Braces"
                    value={createFormData.treatmentName}
                    onChange={(e) => {
                      setCreateFormData((prev) => ({
                        ...prev,
                        treatmentName: e.target.value,
                      }));
                      setFormErrors((prev) => ({
                        ...prev,
                        treatmentName: undefined,
                      }));
                    }}
                    className={
                      formErrors.treatmentName ? "border-destructive" : ""
                    }
                  />
                  {formErrors.treatmentName && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.treatmentName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Treatment Category *</Label>
                  <Select
                    value={createFormData.treatmentCategory}
                    onValueChange={(value) => {
                      setCreateFormData((prev) => ({
                        ...prev,
                        treatmentCategory: value,
                      }));
                      setFormErrors((prev) => ({
                        ...prev,
                        category: undefined,
                      }));
                    }}
                  >
                    <SelectTrigger
                      className={
                        formErrors.category ? "border-destructive" : ""
                      }
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TREATMENT_CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1 rounded ${cat.color} text-white`}
                              >
                                <Icon className="w-3 h-3" />
                              </div>
                              <span>{cat.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formErrors.category && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.category}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Treatment Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the treatment plan, goals, and procedures..."
                    value={createFormData.description}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalVisits">Total Visits Planned</Label>
                    <Input
                      id="totalVisits"
                      type="number"
                      placeholder="e.g., 6"
                      value={createFormData.totalVisitsPlanned}
                      onChange={(e) =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          totalVisitsPlanned: e.target.value,
                        }))
                      }
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for ongoing treatment
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="followUp">Follow-up Interval (days)</Label>
                    <Input
                      id="followUp"
                      type="number"
                      value={createFormData.followUpIntervalDays}
                      onChange={(e) =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          followUpIntervalDays: e.target.value,
                        }))
                      }
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
                setSelectedAppointment(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTreatment} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Treatment Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog
        open={showStatusUpdateModal}
        onOpenChange={setShowStatusUpdateModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Treatment Status</DialogTitle>
            <DialogDescription>
              Change the status of "{selectedTreatment?.treatment_name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select
                value={statusUpdateData.status}
                onValueChange={(value) =>
                  setStatusUpdateData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-green-500" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="paused">
                    <div className="flex items-center gap-2">
                      <Pause className="w-4 h-4 text-yellow-500" />
                      Paused
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      Completed
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-500" />
                      Cancelled
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this status change..."
                value={statusUpdateData.notes}
                onChange={(e) =>
                  setStatusUpdateData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusUpdateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!statusUpdateData.status || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Treatment Plan Details</DialogTitle>
          </DialogHeader>
          {selectedTreatment && (
            <div className="space-y-6 py-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Detailed view with visit history, progress timeline, and
                  linked appointments will be shown here.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentPlans;
