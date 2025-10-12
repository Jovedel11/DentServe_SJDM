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
  FileWarning,
  Sparkle,
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
import { Badge } from "@/core/components/ui/badge";

// Hooks
import { useTreatmentPlans } from "@/hooks/appointment/useTreatmentPlans";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useAppointmentRealtime } from "@/hooks/appointment/useAppointmentRealtime";

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
    icon: Sparkle,
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
    createTreatmentPlanFromAppointment,
    clearError,
  } = useTreatmentPlans();

  useAppointmentRealtime({
    onAppointmentUpdate: () => {
      console.log("📡 Appointment updated - refreshing treatment plans");
      loadAllTreatments();
    },
    enableAppointments: true,
  });

  // State Management
  const [activeTab, setActiveTab] = useState("pending");
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
  const [availableDoctors, setAvailableDoctors] = useState([]);

  // Create Treatment Form State (ENHANCED)
  const [createFormData, setCreateFormData] = useState({
    treatmentName: "",
    treatmentCategory: "",
    description: "",
    diagnosis: "",
    totalVisitsPlanned: "",
    followUpIntervalDays: "30",
    assignedDoctorId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    additionalNotes: "",
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

  // ✅ Helper Functions - Moved to component scope
  const resetCreateForm = () => {
    setCreateFormData({
      treatmentName: "",
      treatmentCategory: "",
      description: "",
      diagnosis: "",
      totalVisitsPlanned: "",
      followUpIntervalDays: "30",
      assignedDoctorId: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      additionalNotes: "",
    });
    setFormErrors({});
  };

  const getCategoryInfo = (categoryValue) => {
    return (
      TREATMENT_CATEGORIES.find((c) => c.value === categoryValue) ||
      TREATMENT_CATEGORIES[9]
    );
  };

  const loadPendingAppointments = async () => {
    setLoadingPending(true);
    const result = await getAppointmentsAwaitingTreatmentPlans();
    setLoadingPending(false);

    if (result.success) {
      console.log("📋 Pending appointments loaded:", result.appointments);
      setPendingAppointments(result.appointments || []);
    } else {
      const errorMessage =
        result.error || "Failed to load pending appointments";
      console.error("Error loading pending appointments:", errorMessage);

      if (!errorMessage.includes("Clinic not loaded") || profile?.user_id) {
        showToast(errorMessage, "error");
      }
    }
  };

  // ✅ Load Available Doctors - FIXED to use doctor_clinics junction table
  const loadAvailableDoctors = async () => {
    const clinicId = profile?.role_specific_data?.clinic_id;

    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from("doctor_clinics")
        .select(
          `
          doctor_id,
          doctors (
            id, 
            first_name, 
            last_name, 
            specialization,
            is_available
          )
        `
        )
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("doctors(first_name)");

      if (error) throw error;

      const doctorsList = (data || [])
        .map((dc) => dc.doctors)
        .filter((doctor) => doctor && doctor.is_available);

      setAvailableDoctors(doctorsList);
    } catch (err) {
      console.error("Failed to load doctors:", err);
    }
  };

  useEffect(() => {
    if ((isStaff || isAdmin) && profile?.user_id) {
      loadPendingAppointments();
      loadAllTreatments();
      loadAvailableDoctors();
    }
  }, [isStaff, isAdmin, profile?.user_id]);

  useEffect(() => {
    if (location.state?.fromAppointment) {
      const { appointment } = location.state;
      setSelectedAppointment(appointment);
      setShowCreateModal(true);
      setActiveTab("pending");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadAllTreatments = async () => {
    await getOngoingTreatments(null, true);
  };

  // Filter Treatments by Tab
  const filteredTreatments = useMemo(() => {
    let filtered = ongoingTreatments || [];

    if (activeTab === "active") {
      filtered = filtered.filter((t) => t.status === "active");
    } else if (activeTab === "paused") {
      filtered = filtered.filter((t) => t.status === "paused");
    } else if (activeTab === "completed") {
      filtered = filtered.filter((t) => t.status === "completed");
    } else if (activeTab === "overdue") {
      filtered = filtered.filter((t) => t.timeline?.is_overdue);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (t) => t.treatment_category === categoryFilter
      );
    }

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

  const filteredPendingAppointments = useMemo(() => {
    if (!searchQuery) return pendingAppointments;

    const query = searchQuery.toLowerCase();
    return pendingAppointments.filter(
      (apt) =>
        apt.patient?.name?.toLowerCase().includes(query) ||
        apt.patient?.email?.toLowerCase().includes(query) ||
        apt.medical_history?.diagnosis_summary?.toLowerCase().includes(query)
    );
  }, [pendingAppointments, searchQuery]);

  const handleViewDetails = async (treatmentId) => {
    const result = await getTreatmentPlanDetails(treatmentId);
    if (result.success) {
      setSelectedTreatment(result.plan);
      setShowDetailsModal(true);
    } else {
      showToast(result.error || "Failed to load treatment details", "error");
    }
  };

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

  const handleSelectAppointment = (appointment) => {
    setSelectedAppointment(appointment);

    const medicalHistory = appointment.medical_history || {};
    const doctor = appointment.doctor || {};

    const detectCategory = (treatmentName) => {
      if (!treatmentName) return "";
      const name = treatmentName.toLowerCase();

      if (name.includes("root canal") || name.includes("endodontic"))
        return "root_canal";
      if (
        name.includes("brace") ||
        name.includes("align") ||
        name.includes("orthodontic")
      )
        return "orthodontics";
      if (name.includes("implant")) return "implants";
      if (name.includes("gum") || name.includes("periodontal"))
        return "periodontics";
      if (
        name.includes("crown") ||
        name.includes("bridge") ||
        name.includes("denture")
      )
        return "prosthodontics";
      if (
        name.includes("whitening") ||
        name.includes("veneer") ||
        name.includes("cosmetic")
      )
        return "cosmetic";
      if (name.includes("extraction") || name.includes("surgery"))
        return "oral_surgery";
      if (name.includes("cleaning") || name.includes("preventive"))
        return "preventive";
      if (name.includes("filling") || name.includes("restoration"))
        return "restorative";

      return "other";
    };

    const recommendedTreatment =
      medicalHistory.recommended_treatment_name || "";

    setCreateFormData({
      treatmentName: recommendedTreatment,
      treatmentCategory: detectCategory(recommendedTreatment),
      description: medicalHistory.diagnosis_summary || "",
      diagnosis: medicalHistory.diagnosis_summary || "",
      totalVisitsPlanned: medicalHistory.recommended_visits?.toString() || "",
      followUpIntervalDays: "30",
      assignedDoctorId: doctor.id || "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      additionalNotes: "",
    });

    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleCreateTreatment = async () => {
    if (!selectedAppointment) {
      showToast("No appointment selected", "error");
      return;
    }

    const errors = {};
    if (!createFormData.treatmentName.trim())
      errors.treatmentName = "Treatment name is required";
    if (!createFormData.treatmentCategory)
      errors.category = "Category is required";
    if (!createFormData.startDate) errors.startDate = "Start date is required";
    if (
      createFormData.endDate &&
      createFormData.endDate < createFormData.startDate
    ) {
      errors.endDate = "End date must be after start date";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("Please fix the form errors", "error");
      return;
    }

    const clinicId =
      profile?.role_specific_data?.clinic_id ||
      selectedAppointment.clinic?.id ||
      null;

    const patientId =
      selectedAppointment.patient?.id || selectedAppointment.patient_id || null;

    console.log("🔍 Treatment Creation Debug:", {
      patientId,
      clinicId,
      treatmentName: createFormData.treatmentName,
      profile,
      selectedAppointment,
    });

    if (!patientId) {
      showToast("Patient ID is missing from appointment data", "error");
      return;
    }

    if (!clinicId) {
      showToast("Clinic ID is missing. Please refresh and try again.", "error");
      return;
    }

    if (!createFormData.treatmentName.trim()) {
      showToast("Treatment name is required", "error");
      return;
    }

    const treatmentData = {
      patientId,
      clinicId,
      treatmentName: createFormData.treatmentName,
      description: createFormData.description || null,
      treatmentCategory: createFormData.treatmentCategory,
      totalVisitsPlanned: createFormData.totalVisitsPlanned
        ? parseInt(createFormData.totalVisitsPlanned)
        : null,
      followUpIntervalDays: parseInt(createFormData.followUpIntervalDays),
      initialAppointmentId: null,
      sourceAppointmentId:
        selectedAppointment.appointment_id || selectedAppointment.id,
      diagnosis: createFormData.diagnosis || null,
      assignedDoctorId: createFormData.assignedDoctorId || null,
      startDate: createFormData.startDate,
      endDate: createFormData.endDate || null,
      additionalNotes: createFormData.additionalNotes || null,
    };

    console.log("📤 Sending treatment data:", treatmentData);

    const result = await createPlan(treatmentData);

    if (result.success) {
      showToast("✅ Treatment plan created successfully!", "success");
      setShowCreateModal(false);
      resetCreateForm();
      setSelectedAppointment(null);
      await loadAllTreatments();
      await loadPendingAppointments();
    } else {
      console.error("Treatment plan creation failed:", {
        error: result.error,
        treatmentData,
        profile,
        selectedAppointment,
      });
      showToast(result.error || "Failed to create treatment plan", "error");
    }
  };

  // ✅ Pending Appointment Card Component - Moved to component scope
  const PendingAppointmentCard = ({ appointment }) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const daysAgo = Math.floor(
      (new Date() - appointmentDate) / (1000 * 60 * 60 * 24)
    );

    const medicalHistory = appointment.medical_history || {};
    const patient = appointment.patient || {};
    const doctor = appointment.doctor || {};
    const services = appointment.services || [];
    const hasMedicalRecommendation = medicalHistory.recommended_treatment_name;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.01 }}
      >
        <Card
          className={`cursor-pointer hover:shadow-lg transition-all border-l-4 ${
            hasMedicalRecommendation
              ? "border-l-purple-500 bg-purple-50/30"
              : "border-l-orange-500 bg-orange-50/30"
          }`}
        >
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge
                      variant="warning"
                      className={
                        hasMedicalRecommendation
                          ? "bg-purple-500 text-white"
                          : "bg-orange-500 text-white"
                      }
                    >
                      <AlertOctagon className="w-3 h-3 mr-1" />
                      {hasMedicalRecommendation
                        ? "Has Diagnosis"
                        : "Awaiting Treatment Plan"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {daysAgo} day{daysAgo !== 1 ? "s" : ""} ago
                    </Badge>
                    {medicalHistory.requires_treatment_plan && (
                      <Badge variant="destructive" className="text-xs">
                        <FileWarning className="w-3 h-3 mr-1" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                    {patient.name || "Unknown Patient"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {patient.email || "No email"}
                  </p>
                  {patient.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {patient.phone}
                    </p>
                  )}
                  {patient.age && (
                    <p className="text-xs text-muted-foreground">
                      Age: {patient.age} years
                    </p>
                  )}
                </div>
              </div>

              <Separator />

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
                  <span className="font-medium">
                    {doctor.name || "Unassigned"}
                  </span>
                  {doctor.specialization && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      {doctor.specialization}
                    </Badge>
                  )}
                </div>
              </div>

              {hasMedicalRecommendation && (
                <div className="bg-purple-100 dark:bg-purple-950 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                        Recommended Treatment
                      </p>
                      <p className="text-base font-bold text-purple-700 dark:text-purple-300 mt-1">
                        {medicalHistory.recommended_treatment_name}
                      </p>
                    </div>
                  </div>

                  {medicalHistory.recommended_visits && (
                    <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300 mb-2">
                      <Target className="w-3 h-3" />
                      <span>
                        {medicalHistory.recommended_visits} visits planned
                      </span>
                    </div>
                  )}

                  {medicalHistory.diagnosis_summary && (
                    <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                      <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1">
                        Diagnosis:
                      </p>
                      <p className="text-sm text-purple-800 dark:text-purple-200 line-clamp-3">
                        {medicalHistory.diagnosis_summary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {services.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Services Completed:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {services.map((service, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {service.name}
                        {service.category && (
                          <span className="ml-1 opacity-60">
                            ({service.category})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {appointment.treatment_plan_notes && (
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">
                    Staff Notes:
                  </p>
                  <p className="text-sm line-clamp-2">
                    {appointment.treatment_plan_notes}
                  </p>
                </div>
              )}

              <Button
                onClick={() => handleSelectAppointment(appointment)}
                className="w-full"
                variant={hasMedicalRecommendation ? "default" : "outline"}
              >
                <Plus className="w-4 h-4 mr-2" />
                {hasMedicalRecommendation
                  ? "Create from Diagnosis"
                  : "Create Treatment Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ✅ Progress Ring Component - Moved to component scope
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

  // ✅ Treatment Card Component - Moved to component scope
  const TreatmentCard = ({ treatment }) => {
    const category = getCategoryInfo(treatment.treatment_category);
    const IconComponent = category.icon;
    const progress = treatment.progress?.percentage || 0;
    const isOverdue = treatment.timeline?.is_overdue;
    const visitsCompleted = treatment.progress?.visits_completed || 0;
    const totalVisits = treatment.progress?.total_visits_planned || 0;

    const hasNextAppointment = treatment.next_appointment?.date != null;
    const nextAppointmentDate = hasNextAppointment
      ? new Date(treatment.next_appointment.date)
      : null;

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
              : hasNextAppointment // ✅ NEW: Green border if next appointment is scheduled
              ? "border-l-green-500"
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

                  <div className="flex flex-col gap-1">
                    {isOverdue && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Overdue
                      </Badge>
                    )}
                    {/* ✅ NEW: Show next appointment badge */}
                    {hasNextAppointment && !isOverdue && (
                      <Badge className="flex items-center gap-1 bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="w-3 h-3" />
                        {treatment.next_appointment?.status === "confirmed"
                          ? "Confirmed"
                          : "Pending"}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ✅ ENHANCED: Patient info with better display */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span className="font-medium">
                      {/* ✅ FIX: Handle both patient_name formats */}
                      {treatment.patient_name ||
                        treatment.patient?.name ||
                        "Unknown Patient"}
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
                    {/* ✅ ENHANCED: Better next appointment display */}
                    <p className="text-sm font-semibold">
                      {hasNextAppointment ? (
                        <span className="text-green-600">
                          {nextAppointmentDate.toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-orange-600">Not scheduled</span>
                      )}
                    </p>
                  </div>
                </div>

                {hasNextAppointment && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3 text-green-600" />
                      <span className="font-medium text-green-900">
                        Next: {nextAppointmentDate.toLocaleDateString()} at{" "}
                        {treatment.next_appointment.time}
                      </span>
                      {treatment.next_appointment.doctor?.name && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <Stethoscope className="w-3 h-3 text-green-600" />
                          <span className="text-green-800">
                            {treatment.next_appointment.doctor.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

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
          <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                <span className="hidden sm:inline">Pending</span>
                <span>({pendingAppointments.length})</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="active">
              <span className="hidden sm:inline">Active</span>
              <span className="sm:hidden">Act.</span> (
              {ongoingTreatments?.filter((t) => t.status === "active").length ||
                0}
              )
            </TabsTrigger>
            <TabsTrigger value="overdue">
              <span className="hidden sm:inline">Overdue</span>
              <span className="sm:hidden">Over.</span> (
              {summary?.overdue_count || 0})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <span className="hidden sm:inline">Completed</span>
              <span className="sm:hidden">Comp.</span> (
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
                        These completed appointments are flagged for treatment
                        plan creation. Appointments with diagnosis
                        recommendations will auto-populate the form.
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredPendingAppointments.map((apt) => (
                        <PendingAppointmentCard
                          key={apt.appointment_id}
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

      {/* Create Treatment Plan Modal - ENHANCED */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Treatment Plan
            </DialogTitle>
            <DialogDescription>
              Create a comprehensive treatment plan for{" "}
              {selectedAppointment?.patient?.name ||
                selectedAppointment?.patient_name}
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
                        {selectedAppointment.patient?.name ||
                          selectedAppointment.patient_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAppointment.patient?.email ||
                          selectedAppointment.patient_email}
                      </p>
                      {selectedAppointment.patient?.age && (
                        <p className="text-xs text-muted-foreground">
                          Age: {selectedAppointment.patient.age}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Consultation
                      </p>
                      <p className="font-medium">
                        {new Date(
                          selectedAppointment.appointment_date
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        {selectedAppointment.doctor?.name ||
                          selectedAppointment.doctor_name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical History Auto-Populated Info */}
              {selectedAppointment.medical_history?.diagnosis_summary && (
                <Alert className="bg-purple-50 dark:bg-purple-950 border-purple-200">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <AlertTitle>Diagnosis from Consultation</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="text-sm">
                      {selectedAppointment.medical_history.diagnosis_summary}
                    </p>
                    {selectedAppointment.medical_history
                      .recommended_treatment_name && (
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                          📋 Treatment:{" "}
                          {
                            selectedAppointment.medical_history
                              .recommended_treatment_name
                          }
                        </p>
                        {selectedAppointment.medical_history
                          .recommended_visits && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            <Target className="w-3 h-3 inline mr-1" />
                            {
                              selectedAppointment.medical_history
                                .recommended_visits
                            }{" "}
                            visits planned
                          </p>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* ✅ SIMPLIFIED: Staff Input Fields Only */}
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Treatment details are auto-filled from the consultation. You
                    only need to set the timeline and add any additional notes.
                  </AlertDescription>
                </Alert>

                {/* Read-only Treatment Name */}
                <div>
                  <Label>Treatment Plan Name</Label>
                  <Input
                    value={createFormData.treatmentName}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-populated from diagnosis
                  </p>
                </div>

                {/* ✅ NEW: Start Date */}
                <div>
                  <Label htmlFor="startDate">
                    Start Date <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="date"
                    id="startDate"
                    value={createFormData.startDate}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className={formErrors.startDate ? "border-destructive" : ""}
                  />
                  {formErrors.startDate && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.startDate}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    When will the treatment begin?
                  </p>
                </div>

                {/* ✅ NEW: End Date (Optional) */}
                <div>
                  <Label htmlFor="endDate">Estimated End Date (Optional)</Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={createFormData.endDate}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    min={createFormData.startDate}
                    disabled={!createFormData.startDate}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected completion date (can be updated later)
                  </p>
                </div>

                {/* ✅ NEW: Additional Notes */}
                <div>
                  <Label htmlFor="additionalNotes">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="additionalNotes"
                    value={createFormData.additionalNotes}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        additionalNotes: e.target.value,
                      }))
                    }
                    placeholder="Add any special instructions, precautions, or notes for this treatment plan..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Auto-Populated Info Summary */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      Auto-Populated Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">
                        {TREATMENT_CATEGORIES.find(
                          (c) => c.value === createFormData.treatmentCategory
                        )?.label || "Other"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Assigned Doctor:
                      </span>
                      <span className="font-medium">
                        {availableDoctors.find(
                          (d) => d.id === createFormData.assignedDoctorId
                        )
                          ? `Dr. ${
                              availableDoctors.find(
                                (d) => d.id === createFormData.assignedDoctorId
                              ).first_name
                            } ${
                              availableDoctors.find(
                                (d) => d.id === createFormData.assignedDoctorId
                              ).last_name
                            }`
                          : selectedAppointment.doctor?.name ||
                            "Consultation Doctor"}
                      </span>
                    </div>
                    {createFormData.totalVisitsPlanned && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Planned Visits:
                        </span>
                        <span className="font-medium">
                          {createFormData.totalVisitsPlanned} visits
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Follow-up Interval:
                      </span>
                      <span className="font-medium">
                        Every {createFormData.followUpIntervalDays} days
                      </span>
                    </div>
                  </CardContent>
                </Card>
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
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Treatment Plan Details
            </DialogTitle>
            <DialogDescription>
              {selectedTreatment ? (
                <>
                  {selectedTreatment.treatment_name} -{" "}
                  {selectedTreatment.patient?.name || "Unknown Patient"}
                </>
              ) : (
                "Loading treatment plan details..."
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedTreatment && (
            <div className="space-y-6 py-4">
              {/* Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Progress Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-4">
                    <ProgressRing
                      progress={selectedTreatment.progress_percentage || 0}
                      size={120}
                      strokeWidth={10}
                    />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Visits Completed
                          </p>
                          <p className="text-2xl font-bold">
                            {selectedTreatment.visits_completed || 0} /
                            {selectedTreatment.total_visits_planned || "∞"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Status
                          </p>
                          <Badge className="capitalize text-lg px-3 py-1">
                            {selectedTreatment.status}
                          </Badge>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Started:
                          </span>
                          <span className="ml-2 font-medium">
                            {new Date(
                              selectedTreatment.start_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        {selectedTreatment.expected_end_date && (
                          <div>
                            <span className="text-muted-foreground">
                              Expected End:
                            </span>
                            <span className="ml-2 font-medium">
                              {new Date(
                                selectedTreatment.expected_end_date
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Appointment Info */}
              {selectedTreatment.next_visit_appointment_id && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      Next Scheduled Visit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Next visit date:{" "}
                      {selectedTreatment.next_visit_date
                        ? new Date(
                            selectedTreatment.next_visit_date
                          ).toLocaleDateString()
                        : "Not scheduled"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Patient Info */}
              {selectedTreatment.patient && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name:</p>
                        <p className="font-medium">
                          {selectedTreatment.patient.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email:</p>
                        <p className="font-medium">
                          {selectedTreatment.patient.email}
                        </p>
                      </div>
                      {selectedTreatment.patient.phone && (
                        <div>
                          <p className="text-muted-foreground">Phone:</p>
                          <p className="font-medium">
                            {selectedTreatment.patient.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Visit History */}
              {selectedTreatment.visits &&
                selectedTreatment.visits.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Visit History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedTreatment.visits.map((visit, idx) => (
                          <div
                            key={visit.id || idx}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={
                                  visit.is_completed ? "default" : "outline"
                                }
                              >
                                Visit #{visit.visit_number}
                              </Badge>
                              <span className="text-sm">
                                {visit.visit_purpose || "Follow-up visit"}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {visit.appointment?.appointment_date &&
                                new Date(
                                  visit.appointment.appointment_date
                                ).toLocaleDateString()}
                              {visit.appointment?.appointment_time &&
                                ` at ${visit.appointment.appointment_time}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Actions */}
              <Button
                onClick={() => setShowDetailsModal(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentPlans;
