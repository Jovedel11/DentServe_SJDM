import React, { useState, useEffect } from "react";
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

// Hooks
import { useTreatmentPlans } from "@/hooks/appointment/useTreatmentPlans";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// Treatment Categories
const TREATMENT_CATEGORIES = [
  { value: "orthodontics", label: "Orthodontics (Braces, Aligners)" },
  { value: "implants", label: "Dental Implants" },
  { value: "root_canal", label: "Root Canal Therapy" },
  { value: "periodontics", label: "Periodontal Treatment (Gum Disease)" },
  {
    value: "prosthodontics",
    label: "Prosthodontics (Crowns, Bridges, Dentures)",
  },
  { value: "cosmetic", label: "Cosmetic Dentistry" },
  { value: "oral_surgery", label: "Oral Surgery" },
  { value: "endodontics", label: "Endodontic Treatment" },
  { value: "preventive", label: "Preventive Care Program" },
  { value: "restorative", label: "Restorative Dentistry" },
  { value: "other", label: "Other Specialized Treatment" },
];

const TreatmentPlans = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isStaff, isAdmin, profile } = useAuth();
  const treatmentPlansHook = useTreatmentPlans();

  // Get appointment from navigation state (if coming from completed appointment)
  const initialAppointment = location.state?.appointment;

  // State
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    treatmentName: "",
    treatmentCategory: "",
    description: "",
    totalVisitsPlanned: "",
    followUpIntervalDays: "30",
  });

  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Show toast
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      4000
    );
  };

  // Fetch treatment plans on mount
  useEffect(() => {
    treatmentPlansHook.getOngoingTreatments(null, true); // Include paused
  }, []);

  // Auto-open create modal if coming from completed appointment
  useEffect(() => {
    if (initialAppointment) {
      setSelectedPatient({
        id: initialAppointment.patient_id,
        name: initialAppointment.patient?.name,
        email: initialAppointment.patient?.email,
        phone: initialAppointment.patient?.phone,
      });
      setCreateModalOpen(true);
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [initialAppointment]);

  // Search patients
  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setPatientResults([]);
      return;
    }

    setSearchingPatients(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          phone,
          user_profiles!inner (
            first_name,
            last_name
          )
        `
        )
        .or(
          `email.ilike.%${query}%,user_profiles.first_name.ilike.%${query}%,user_profiles.last_name.ilike.%${query}%`
        )
        .eq("user_type", "patient")
        .eq("is_active", true)
        .limit(10);

      if (error) throw error;

      const formattedResults = data.map((user) => ({
        id: user.id,
        name: `${user.user_profiles[0].first_name} ${user.user_profiles[0].last_name}`,
        email: user.email,
        phone: user.phone,
      }));

      setPatientResults(formattedResults);
    } catch (err) {
      console.error("Patient search error:", err);
      setPatientResults([]);
    } finally {
      setSearchingPatients(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!selectedPatient) {
      newErrors.patient = "Please select a patient";
    }

    if (!formData.treatmentName.trim()) {
      newErrors.treatmentName = "Treatment name is required";
    }

    if (!formData.treatmentCategory) {
      newErrors.treatmentCategory = "Please select a treatment category";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Treatment description is required";
    }

    if (
      formData.totalVisitsPlanned &&
      (parseInt(formData.totalVisitsPlanned) < 1 ||
        parseInt(formData.totalVisitsPlanned) > 50)
    ) {
      newErrors.totalVisitsPlanned = "Visits must be between 1 and 50";
    }

    if (
      formData.followUpIntervalDays &&
      (parseInt(formData.followUpIntervalDays) < 1 ||
        parseInt(formData.followUpIntervalDays) > 365)
    ) {
      newErrors.followUpIntervalDays =
        "Interval must be between 1 and 365 days";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle create treatment plan
  const handleCreateTreatmentPlan = async () => {
    if (!validateForm()) {
      showToast("Please fix the errors in the form", "error");
      return;
    }

    const treatmentPlanData = {
      patientId: selectedPatient.id,
      clinicId: profile?.clinic_id,
      treatmentName: formData.treatmentName,
      description: formData.description,
      treatmentCategory: formData.treatmentCategory,
      totalVisitsPlanned: formData.totalVisitsPlanned
        ? parseInt(formData.totalVisitsPlanned)
        : null,
      followUpIntervalDays: parseInt(formData.followUpIntervalDays),
      initialAppointmentId: initialAppointment?.id || null,
    };

    const result = await treatmentPlansHook.createTreatmentPlan(
      treatmentPlanData
    );

    if (result.success) {
      showToast("✅ Treatment plan created successfully!", "success");
      setCreateModalOpen(false);
      resetForm();
      treatmentPlansHook.getOngoingTreatments(null, true);
    } else {
      showToast(result.error || "Failed to create treatment plan", "error");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      treatmentName: "",
      treatmentCategory: "",
      description: "",
      totalVisitsPlanned: "",
      followUpIntervalDays: "30",
    });
    setSelectedPatient(null);
    setPatientSearch("");
    setPatientResults([]);
    setErrors({});
  };

  // Handle status update
  const handleStatusUpdate = async (planId, newStatus) => {
    const result = await treatmentPlansHook.updateTreatmentPlanStatus(
      planId,
      newStatus
    );

    if (result.success) {
      showToast(`Treatment plan ${newStatus} successfully!`, "success");
      treatmentPlansHook.getOngoingTreatments(null, true);
      setDetailsModalOpen(false);
    } else {
      showToast(result.error || "Failed to update status", "error");
    }
  };

  // Filter treatment plans
  const filteredPlans =
    treatmentPlansHook.ongoingTreatments?.filter((plan) => {
      // Tab filter
      if (activeTab === "active" && plan.status !== "active") return false;
      if (activeTab === "completed" && plan.status !== "completed")
        return false;
      if (activeTab === "paused" && plan.status !== "paused") return false;

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const searchableText = [
          plan.treatment_name,
          plan.patient_name,
          plan.treatment_category,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(search)) return false;
      }

      return true;
    }) || [];

  // Status badge
  const StatusBadge = ({ status }) => {
    const config = {
      active: {
        className: "bg-green-100 text-green-800 border-green-300",
        icon: Activity,
        label: "Active",
      },
      completed: {
        className: "bg-blue-100 text-blue-800 border-blue-300",
        icon: CheckCircle,
        label: "Completed",
      },
      paused: {
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: Pause,
        label: "Paused",
      },
      cancelled: {
        className: "bg-red-100 text-red-800 border-red-300",
        icon: Ban,
        label: "Cancelled",
      },
    };

    const { className, icon: Icon, label } = config[status] || config.active;

    return (
      <Badge className={`${className} border font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  // Treatment Plan Card
  const TreatmentPlanCard = ({ plan }) => {
    const progressPercentage = plan.progress_percentage || 0;
    const isOverdue =
      plan.alert_level === "urgent" || plan.alert_level === "overdue";

    return (
      <Card
        className={`hover:shadow-lg transition-all ${
          isOverdue
            ? "border-l-4 border-l-red-500"
            : "border-l-4 border-l-purple-500"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{plan.treatment_name}</h3>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={plan.status} />
                <Badge variant="outline" className="text-xs">
                  {plan.treatment_category?.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPlan(plan);
                setDetailsModalOpen(true);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Patient */}
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{plan.patient_name}</span>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{plan.visits_completed || 0} visits completed</span>
              {plan.total_visits_planned && (
                <span>of {plan.total_visits_planned} planned</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-1">Started</p>
              <p className="font-medium">
                {new Date(plan.start_date).toLocaleDateString()}
              </p>
            </div>
            {plan.next_visit_date && plan.status === "active" && (
              <div>
                <p className="text-muted-foreground mb-1">Next Visit</p>
                <p className="font-medium">
                  {new Date(plan.next_visit_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Security check
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Heart className="w-8 h-8 text-purple-600" />
              Treatment Plans
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage ongoing treatment plans and patient care programs
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Treatment Plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Plans
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {treatmentPlansHook.activeTreatments || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {treatmentPlansHook.ongoingTreatments?.filter(
                      (p) => p.status === "completed"
                    ).length || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Overdue
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {treatmentPlansHook.overdueCount || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Plans
                  </p>
                  <p className="text-3xl font-bold">
                    {treatmentPlansHook.totalTreatments || 0}
                  </p>
                </div>
                <Heart className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed top-4 right-4 z-50 max-w-md"
            >
              <Alert
                variant={toast.type === "error" ? "destructive" : "default"}
                className="shadow-lg"
              >
                {toast.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {toast.type === "error" ? "Error" : "Success"}
                </AlertTitle>
                <AlertDescription>{toast.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search treatment plans by patient name, treatment type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({treatmentPlansHook.totalTreatments || 0})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({treatmentPlansHook.activeTreatments || 0})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed (
              {treatmentPlansHook.ongoingTreatments?.filter(
                (p) => p.status === "completed"
              ).length || 0}
              )
            </TabsTrigger>
            <TabsTrigger value="paused">
              Paused ({treatmentPlansHook.pausedTreatments || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {treatmentPlansHook.loading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </CardContent>
              </Card>
            ) : filteredPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-96 text-center space-y-4">
                  <Heart className="w-16 h-16 text-muted-foreground/50" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      No Treatment Plans Found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? "No treatment plans match your search criteria"
                        : "Get started by creating your first treatment plan"}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => setCreateModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Treatment Plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => (
                  <TreatmentPlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Treatment Plan Modal */}
        <Dialog
          open={createModalOpen}
          onOpenChange={(open) => {
            setCreateModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-purple-600" />
                Create New Treatment Plan
              </DialogTitle>
              <DialogDescription>
                Create a comprehensive treatment plan for ongoing patient care
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Patient Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Select Patient <span className="text-red-600">*</span>
                </Label>

                {selectedPatient ? (
                  <Card className="border-2 border-purple-200 bg-purple-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {selectedPatient.name}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {selectedPatient.email}
                          </p>
                          {selectedPatient.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              {selectedPatient.phone}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPatient(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search patient by name or email..."
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          searchPatients(e.target.value);
                        }}
                        className={`pl-10 ${
                          errors.patient ? "border-red-500" : ""
                        }`}
                      />
                    </div>

                    {searchingPatients && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}

                    {patientResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                        {patientResults.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => setSelectedPatient(patient)}
                            className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {patient.email}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {errors.patient && (
                      <p className="text-xs text-red-600">{errors.patient}</p>
                    )}
                  </>
                )}
              </div>

              <Separator />

              {/* Treatment Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="treatmentName"
                  className="text-sm font-semibold"
                >
                  Treatment Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="treatmentName"
                  placeholder="e.g., Full Mouth Rehabilitation, Orthodontic Treatment"
                  value={formData.treatmentName}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      treatmentName: e.target.value,
                    }));
                    if (errors.treatmentName)
                      setErrors((prev) => ({
                        ...prev,
                        treatmentName: undefined,
                      }));
                  }}
                  className={errors.treatmentName ? "border-red-500" : ""}
                />
                {errors.treatmentName && (
                  <p className="text-xs text-red-600">{errors.treatmentName}</p>
                )}
              </div>

              {/* Treatment Category */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Treatment Category <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={formData.treatmentCategory}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      treatmentCategory: value,
                    }));
                    if (errors.treatmentCategory)
                      setErrors((prev) => ({
                        ...prev,
                        treatmentCategory: undefined,
                      }));
                  }}
                >
                  <SelectTrigger
                    className={errors.treatmentCategory ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select treatment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.treatmentCategory && (
                  <p className="text-xs text-red-600">
                    {errors.treatmentCategory}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Treatment Description <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  placeholder="Detailed description of the treatment plan, procedures involved, and expected outcomes..."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                    if (errors.description)
                      setErrors((prev) => ({
                        ...prev,
                        description: undefined,
                      }));
                  }}
                  rows={4}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-xs text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Visit Planning */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Total Visits Planned
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="e.g., 8"
                    value={formData.totalVisitsPlanned}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        totalVisitsPlanned: e.target.value,
                      }));
                      if (errors.totalVisitsPlanned)
                        setErrors((prev) => ({
                          ...prev,
                          totalVisitsPlanned: undefined,
                        }));
                    }}
                    className={
                      errors.totalVisitsPlanned ? "border-red-500" : ""
                    }
                  />
                  {errors.totalVisitsPlanned && (
                    <p className="text-xs text-red-600">
                      {errors.totalVisitsPlanned}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave empty if uncertain
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Follow-up Interval (Days)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="30"
                    value={formData.followUpIntervalDays}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        followUpIntervalDays: e.target.value,
                      }));
                      if (errors.followUpIntervalDays)
                        setErrors((prev) => ({
                          ...prev,
                          followUpIntervalDays: undefined,
                        }));
                    }}
                    className={
                      errors.followUpIntervalDays ? "border-red-500" : ""
                    }
                  />
                  {errors.followUpIntervalDays && (
                    <p className="text-xs text-red-600">
                      {errors.followUpIntervalDays}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTreatmentPlan}
                disabled={treatmentPlansHook.loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {treatmentPlansHook.loading ? (
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

        {/* Details Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Treatment Plan Details
              </DialogTitle>
              <DialogDescription>
                View comprehensive information and progress
              </DialogDescription>
            </DialogHeader>

            {selectedPlan && (
              <div className="space-y-6 py-4">
                {/* Status & Actions */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedPlan.status} />
                  <div className="flex gap-2">
                    {selectedPlan.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusUpdate(selectedPlan.id, "paused")
                        }
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    {selectedPlan.status === "paused" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusUpdate(selectedPlan.id, "active")
                        }
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    {selectedPlan.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusUpdate(selectedPlan.id, "completed")
                        }
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Treatment Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress
                      value={selectedPlan.progress_percentage || 0}
                      className="h-3"
                    />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedPlan.progress_percentage || 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Complete
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {selectedPlan.visits_completed || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Visits Done
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {selectedPlan.total_visits_planned || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Planned
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Treatment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Patient</p>
                      <p className="font-medium">{selectedPlan.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Treatment Category
                      </p>
                      <p className="font-medium">
                        {selectedPlan.treatment_category?.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedPlan.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {new Date(
                            selectedPlan.start_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedPlan.next_visit_date && (
                        <div>
                          <p className="text-muted-foreground">Next Visit</p>
                          <p className="font-medium">
                            {new Date(
                              selectedPlan.next_visit_date
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TreatmentPlans;
