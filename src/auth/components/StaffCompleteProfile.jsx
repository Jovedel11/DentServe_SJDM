import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "@/auth/hooks/authService";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/text-area";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/core/components/ui/card";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import {
  Loader2,
  MapPin,
  Upload,
  X,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { useImageUpload } from "@/hooks/file_upload/useImageUpload";

const StaffCompleteProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshAuthStatus } = useAuth();

  // ================== STATE MANAGEMENT ==================
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  // Get data from navigation state
  const { clinicId, clinicName, deadline, isNewSignup } = location.state || {};

  // ================== IMAGE UPLOAD HOOKS ==================
  const clinicImageUpload = useImageUpload({
    uploadType: "general",
    maxSizeMB: 2,
    maxWidthOrHeight: 1200,
    autoCompress: true,
    folder: "clinics",
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  const doctorImageUpload = useImageUpload({
    uploadType: "general",
    maxSizeMB: 1,
    maxWidthOrHeight: 800,
    autoCompress: true,
    folder: "doctors",
    maxFileSize: 5 * 1024 * 1024, // 5MB
  });

  // ================== FORM DATA STATE ==================
  const [formData, setFormData] = useState({
    clinicName: clinicName || "",
    clinicDescription: "",
    clinicAddress: "",
    clinicCity: "San Jose Del Monte",
    clinicProvince: "Bulacan",
    clinicZipCode: "",
    clinicPhone: "",
    clinicEmail: user?.email || "",
    clinicWebsite: "",
    clinicImageUrl: "",
    timezone: "Asia/Manila",
    latitude: 14.8169, // Default SJDM coordinates
    longitude: 121.0583,
    operatingHours: {
      monday: { isOpen: true, start: "09:00", end: "17:00" },
      tuesday: { isOpen: true, start: "09:00", end: "17:00" },
      wednesday: { isOpen: true, start: "09:00", end: "17:00" },
      thursday: { isOpen: true, start: "09:00", end: "17:00" },
      friday: { isOpen: true, start: "09:00", end: "17:00" },
      saturday: { isOpen: false, start: "09:00", end: "12:00" },
      sunday: { isOpen: false, start: "", end: "" },
    },
  });

  // ================== SERVICES STATE ==================
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    category: "General Dentistry",
    duration_minutes: 30,
    min_price: "",
    max_price: "",
    // ✅ NEW: Treatment-related fields
    requires_multiple_visits: false,
    typical_visit_count: 1,
    requires_consultation: true,
    consultation_validity_days: 30,
    treatment_price: "",
    follow_up_price: "",
    pricing_notes: "",
  });

  // ================== DOCTORS STATE ==================
  const [doctors, setDoctors] = useState([]);
  const [newDoctor, setNewDoctor] = useState({
    first_name: "",
    last_name: "",
    license_number: "",
    specialization: "General Dentistry",
    education: "",
    experience_years: "",
    bio: "",
    consultation_fee: "",
    languages_spoken: ["English", "Tagalog"],
    certifications: [],
    awards: [],
    image_url: "",
  });

  // ================== TEMPORARY STATE ==================
  const [newCertification, setNewCertification] = useState({
    name: "",
    year: "",
  });
  const [newAward, setNewAward] = useState("");
  const [doctorImagePreview, setDoctorImagePreview] = useState(null);

  // ================== CONSTANTS ==================
  const serviceCategories = [
    "General Dentistry",
    "Cosmetic Dentistry",
    "Orthodontics",
    "Oral Surgery",
    "Pediatric Dentistry",
    "Periodontics",
    "Endodontics",
    "Prosthodontics",
  ];

  const FILE_SIZE_LIMITS = {
    clinic: { maxMB: 10, display: "10MB" },
    doctor: { maxMB: 5, display: "5MB" },
  };

  // ================== LIFECYCLE ==================
  useEffect(() => {
    checkCompletionStatus();
  }, []);

  // ================== PROFILE STATUS CHECK ==================
  const checkCompletionStatus = async () => {
    try {
      setLoading(true);
      const result = await authService.checkStaffProfileCompletionStatus();

      if (result.success) {
        if (result.is_completed) {
          navigate("/staff/dashboard");
          return;
        }

        if (result.clinic_name) {
          setFormData((prev) => ({
            ...prev,
            clinicName: result.clinic_name,
          }));
        }
      }
    } catch (err) {
      console.error("❌ Status check error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================== UTILITY FUNCTIONS ==================
  const showError = (message, duration = 4000) => {
    setError(message);
    setTimeout(() => setError(""), duration);
  };

  const showLocationMessage = (message, duration = 5000) => {
    setLocationMessage(message);
    setTimeout(() => setLocationMessage(""), duration);
  };

  // ================== FORM HANDLERS ==================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTimeChange = (day, field, value) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          isOpen: !prev.operatingHours[day].isOpen,
        },
      },
    }));
  };

  // ================== LOCATION HANDLER ==================
  const handleGetCurrentLocation = async () => {
    setError("");
    setLocationMessage("🔍 Detecting your location...");

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setFormData((prev) => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));

      showLocationMessage(
        `✅ Location detected: ${position.coords.latitude.toFixed(
          6
        )}, ${position.coords.longitude.toFixed(6)}`
      );
    } catch (err) {
      console.error("❌ Location error:", err);
      showError(
        "Could not get location. Please enter coordinates manually or use default SJDM location."
      );
    }
  };

  // ================== CLINIC IMAGE HANDLERS ==================
  const handleClinicImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    const result = await clinicImageUpload.selectFile(file);

    if (!result.success) {
      showError(result.error);
    }
  };

  const handleClinicImageUpload = async () => {
    if (!clinicImageUpload.canUpload) return;

    const result = await clinicImageUpload.uploadFile();

    if (result.success) {
      setFormData((prev) => ({
        ...prev,
        clinicImageUrl: result.data.imageUrl,
      }));
      console.log("✅ Clinic image uploaded:", result.data.imageUrl);
    } else {
      showError(result.error || "Failed to upload clinic image");
    }
  };

  const handleRemoveClinicImage = () => {
    setFormData((prev) => ({ ...prev, clinicImageUrl: "" }));
    clinicImageUpload.reset();
  };

  // ================== SERVICE HANDLERS ==================
  const handleServiceInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox inputs
    if (type === "checkbox") {
      setNewService((prev) => ({ ...prev, [name]: checked }));
    } else {
      setNewService((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addService = () => {
    if (!newService.name.trim()) {
      showError("⚠️ Service name is required");
      return;
    }

    // Validation for treatment services
    if (newService.requires_multiple_visits) {
      if (
        !newService.typical_visit_count ||
        newService.typical_visit_count < 1
      ) {
        showError("⚠️ Please specify the typical number of visits required");
        return;
      }
    }

    setServices((prev) => [...prev, { ...newService, id: Date.now() }]);

    // Reset to defaults
    setNewService({
      name: "",
      description: "",
      category: "General Dentistry",
      duration_minutes: 30,
      min_price: "",
      max_price: "",
      requires_multiple_visits: false,
      typical_visit_count: 1,
      requires_consultation: true,
      consultation_validity_days: 30,
      treatment_price: "",
      follow_up_price: "",
      pricing_notes: "",
    });
    setError("");
  };

  const removeService = (id) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // ================== DOCTOR HANDLERS ==================
  const handleDoctorInputChange = (e) => {
    const { name, value } = e.target;
    setNewDoctor((prev) => ({ ...prev, [name]: value }));
  };

  const handleLanguagesChange = (e) => {
    const languages = e.target.value
      .split(",")
      .map((lang) => lang.trim())
      .filter(Boolean);
    setNewDoctor((prev) => ({ ...prev, languages_spoken: languages }));
  };

  // ✅ ENHANCED: Doctor Image Upload (matches clinic flow)
  const handleDoctorImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    const result = await doctorImageUpload.selectFile(file);

    if (!result.success) {
      showError(result.error);
    }
  };

  const handleDoctorImageUpload = async () => {
    if (!doctorImageUpload.canUpload) return;

    const result = await doctorImageUpload.uploadFile();

    if (result.success) {
      setNewDoctor((prev) => ({
        ...prev,
        image_url: result.data.imageUrl,
      }));
      console.log("✅ Doctor image uploaded:", result.data.imageUrl);
    } else {
      showError(result.error || "Failed to upload doctor image");
    }
  };

  const handleRemoveDoctorImage = () => {
    setNewDoctor((prev) => ({ ...prev, image_url: "" }));
    doctorImageUpload.reset();
  };

  const addDoctor = () => {
    // Validation
    if (!newDoctor.first_name.trim() || !newDoctor.last_name.trim()) {
      showError("⚠️ Doctor first name and last name are required");
      return;
    }

    if (!newDoctor.license_number.trim()) {
      showError("⚠️ Doctor license number is required");
      return;
    }

    // Add doctor to list
    setDoctors((prev) => [...prev, { ...newDoctor, id: Date.now() }]);

    // Reset form
    setNewDoctor({
      first_name: "",
      last_name: "",
      license_number: "",
      specialization: "General Dentistry",
      education: "",
      experience_years: "",
      bio: "",
      consultation_fee: "",
      languages_spoken: ["English", "Tagalog"],
      certifications: [],
      awards: [],
      image_url: "",
    });

    // Reset image upload
    doctorImageUpload.reset();
    setError("");
  };

  const removeDoctor = (id) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  };

  // ================== CERTIFICATION HANDLERS ==================
  const addCertification = () => {
    if (!newCertification.name.trim()) {
      showError("⚠️ Certification name is required");
      return;
    }

    setNewDoctor((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: newCertification.name.trim(),
          year: newCertification.year ? parseInt(newCertification.year) : null,
        },
      ],
    }));

    setNewCertification({ name: "", year: "" });
  };

  const removeCertification = (index) => {
    setNewDoctor((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  // ================== AWARD HANDLERS ==================
  const addAward = () => {
    if (!newAward.trim()) {
      showError("⚠️ Award name is required");
      return;
    }

    setNewDoctor((prev) => ({
      ...prev,
      awards: [...prev.awards, newAward.trim()],
    }));

    setNewAward("");
  };

  const removeAward = (index) => {
    setNewDoctor((prev) => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index),
    }));
  };

  // ================== VALIDATION ==================
  const validateForm = () => {
    // Clinic validation
    if (!formData.clinicName.trim()) {
      return "⚠️ Clinic name is required";
    }
    if (!formData.clinicAddress.trim()) {
      return "⚠️ Clinic address is required";
    }
    if (!formData.clinicPhone.trim()) {
      return "⚠️ Clinic phone is required";
    }

    // Location validation
    if (!formData.latitude || !formData.longitude) {
      return "⚠️ Location coordinates are required";
    }
    if (formData.latitude < -90 || formData.latitude > 90) {
      return "⚠️ Invalid latitude value (must be between -90 and 90)";
    }
    if (formData.longitude < -180 || formData.longitude > 180) {
      return "⚠️ Invalid longitude value (must be between -180 and 180)";
    }

    // Services validation
    if (services.length === 0) {
      return "⚠️ At least one service is required";
    }

    // Doctors validation
    if (doctors.length === 0) {
      return "⚠️ At least one doctor is required";
    }

    return null;
  };

  // ================== DATA TRANSFORMATION ==================
  const transformOperatingHoursForDatabase = (hours) => {
    const weekdays = {};
    const weekends = {};

    Object.entries(hours).forEach(([day, config]) => {
      if (!config.isOpen) return; // Skip closed days

      const dayData = {
        start: config.start,
        end: config.end,
      };

      if (day === "saturday" || day === "sunday") {
        weekends[day] = dayData;
      } else {
        weekdays[day] = dayData;
      }
    });

    return {
      weekdays,
      weekends,
    };
  };

  // ================== FORM SUBMISSION ==================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Prepare clinic data
      const clinicData = {
        name: formData.clinicName.trim(),
        description: formData.clinicDescription.trim() || null,
        address: formData.clinicAddress.trim(),
        city: formData.clinicCity.trim(),
        province: formData.clinicProvince.trim(),
        zip_code: formData.clinicZipCode.trim() || null,
        phone: formData.clinicPhone.trim(),
        email: formData.clinicEmail.trim(),
        website_url: formData.clinicWebsite.trim() || null,
        operating_hours: transformOperatingHoursForDatabase(
          formData.operatingHours
        ),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        image_url: formData.clinicImageUrl || null,
        timezone: formData.timezone,
      };

      // Prepare services data
      const servicesData = services.map((service) => ({
        name: service.name.trim(),
        description: service.description?.trim() || null,
        category: service.category,
        duration_minutes: parseInt(service.duration_minutes) || 30,
        min_price: service.min_price ? parseFloat(service.min_price) : null,
        max_price: service.max_price ? parseFloat(service.max_price) : null,
        is_active: true,
        priority: 10,
        // ✅ NEW: Treatment-related fields
        requires_multiple_visits: service.requires_multiple_visits || false,
        typical_visit_count: service.requires_multiple_visits
          ? parseInt(service.typical_visit_count) || 1
          : 1,
        requires_consultation: service.requires_consultation ?? true,
        consultation_validity_days:
          parseInt(service.consultation_validity_days) || 30,
        treatment_price: service.treatment_price
          ? parseFloat(service.treatment_price)
          : null,
        follow_up_price: service.follow_up_price
          ? parseFloat(service.follow_up_price)
          : null,
        pricing_notes: service.pricing_notes?.trim() || null,
      }));

      // Prepare doctors data
      const doctorsData = doctors.map((doctor) => ({
        first_name: doctor.first_name.trim(),
        last_name: doctor.last_name.trim(),
        license_number: doctor.license_number.trim(),
        specialization: doctor.specialization,
        education: doctor.education?.trim() || null,
        experience_years: doctor.experience_years
          ? parseInt(doctor.experience_years)
          : null,
        bio: doctor.bio?.trim() || null,
        consultation_fee: doctor.consultation_fee
          ? parseFloat(doctor.consultation_fee)
          : null,
        languages_spoken: doctor.languages_spoken,
        certifications:
          doctor.certifications.length > 0 ? doctor.certifications : null,
        awards: doctor.awards.length > 0 ? doctor.awards : null,
        image_url: doctor.image_url || null,
        is_available: true,
      }));

      console.log("📤 Submitting profile data:", {
        clinic: clinicData.name,
        services: servicesData.length,
        doctors: doctorsData.length,
      });

      // Submit to backend
      const result = await authService.updateStaffCompleteProfileV2(
        {}, // Empty profile data object
        clinicData,
        servicesData,
        doctorsData
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to complete profile");
      }

      console.log("✅ Profile completed successfully!");
      await refreshAuthStatus();

      // Navigate to dashboard
      navigate("/staff/dashboard", {
        state: {
          message: "🎉 Profile completed successfully! Welcome to DentServe.",
        },
      });
    } catch (err) {
      console.error("❌ Profile completion error:", err);
      setError(err.message || "Failed to complete profile. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  // ================== RENDER: LOADING STATE ==================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ================== RENDER: MAIN FORM ==================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ==================== HEADER ==================== */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Your Clinic Profile
          </h1>
          <p className="text-gray-600">
            Set up your clinic, services, and team to start accepting patients
          </p>
          {deadline && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                ⏰ <strong>Important:</strong> Complete your profile within 7
                days to activate your account
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Global Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* ==================== SECTION 1: CLINIC INFO ==================== */}
        <Card className="shadow-lg border-t-4 border-t-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <CardTitle className="text-2xl">Clinic Information</CardTitle>
                <CardDescription>
                  Basic details about your dental clinic
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Clinic Image Upload */}
            <div className="space-y-3 border-2 border-dashed border-blue-200 rounded-lg p-6 bg-blue-50/50">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  Clinic Image
                </Label>
                <span className="text-xs text-gray-500">
                  Max: {FILE_SIZE_LIMITS.clinic.display}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Upload your clinic's logo or a representative image
              </p>

              {formData.clinicImageUrl ? (
                // Uploaded Image
                <div className="relative inline-block w-full">
                  <img
                    src={formData.clinicImageUrl}
                    alt="Clinic"
                    className="w-full h-64 object-cover rounded-lg border-4 border-green-300 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveClinicImage}
                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Uploaded
                  </div>
                </div>
              ) : clinicImageUpload.preview ? (
                // Preview with Upload Button
                <div className="space-y-3">
                  <img
                    src={clinicImageUpload.preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg border-2 border-dashed border-blue-300"
                  />
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handleClinicImageUpload}
                      disabled={clinicImageUpload.isProcessing}
                      className="flex-1"
                    >
                      {clinicImageUpload.isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...{" "}
                          {Math.round(clinicImageUpload.uploadState.progress)}%
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Confirm Upload
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clinicImageUpload.reset()}
                      disabled={clinicImageUpload.isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Upload Area
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-12 text-center hover:border-blue-500 hover:bg-blue-100 transition-all">
                    <Upload className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                    <p className="text-base font-medium text-gray-700 mb-2">
                      Click to upload clinic image
                    </p>
                    <p className="text-sm text-gray-500">
                      Supported: JPEG, PNG, WebP • Max{" "}
                      {FILE_SIZE_LIMITS.clinic.display}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleClinicImageSelect}
                    className="hidden"
                  />
                </label>
              )}

              {clinicImageUpload.error && (
                <Alert variant="destructive">
                  <AlertDescription>{clinicImageUpload.error}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName" className="font-semibold">
                  Clinic Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clinicName"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleInputChange}
                  placeholder="e.g., Smile Dental Clinic"
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicPhone" className="font-semibold">
                  Contact Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clinicPhone"
                  name="clinicPhone"
                  value={formData.clinicPhone}
                  onChange={handleInputChange}
                  placeholder="+639171234567"
                  required
                  className="text-base"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="clinicDescription" className="font-semibold">
                Description{" "}
                <span className="text-gray-400 text-sm">(Optional)</span>
              </Label>
              <Textarea
                id="clinicDescription"
                name="clinicDescription"
                value={formData.clinicDescription}
                onChange={handleInputChange}
                rows={4}
                placeholder="Tell patients about your clinic, specialties, and what makes you unique..."
                className="text-base resize-none"
              />
              <p className="text-xs text-gray-500">
                {formData.clinicDescription.length}/500 characters
              </p>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="clinicWebsite" className="font-semibold">
                Website URL{" "}
                <span className="text-gray-400 text-sm">(Optional)</span>
              </Label>
              <Input
                id="clinicWebsite"
                name="clinicWebsite"
                value={formData.clinicWebsite}
                onChange={handleInputChange}
                placeholder="https://www.yourdentalclinic.com"
                type="url"
                className="text-base"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="clinicAddress" className="font-semibold">
                Complete Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clinicAddress"
                name="clinicAddress"
                value={formData.clinicAddress}
                onChange={handleInputChange}
                placeholder="e.g., 123 Main St, Building Name, Unit #"
                required
                className="text-base"
              />
            </div>

            {/* City, Province, Zip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicCity" className="font-semibold">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clinicCity"
                  name="clinicCity"
                  value={formData.clinicCity}
                  onChange={handleInputChange}
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicProvince" className="font-semibold">
                  Province <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clinicProvince"
                  name="clinicProvince"
                  value={formData.clinicProvince}
                  onChange={handleInputChange}
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicZipCode" className="font-semibold">
                  Zip Code
                </Label>
                <Input
                  id="clinicZipCode"
                  name="clinicZipCode"
                  value={formData.clinicZipCode}
                  onChange={handleInputChange}
                  placeholder="3023"
                  className="text-base"
                />
              </div>
            </div>

            {/* Location Coordinates */}
            <div className="border-2 border-green-200 rounded-lg p-6 space-y-4 bg-green-50/50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  GPS Coordinates <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  className="border-green-300 hover:bg-green-100"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Use Current Location
                </Button>
              </div>

              <p className="text-sm text-gray-600">
                Accurate coordinates help patients find your clinic on the map
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="font-medium">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="14.8169"
                    required
                    className="text-base font-mono"
                  />
                  <p className="text-xs text-gray-500">Range: -90 to 90</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude" className="font-medium">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="121.0583"
                    required
                    className="text-base font-mono"
                  />
                  <p className="text-xs text-gray-500">Range: -180 to 180</p>
                </div>
              </div>

              {locationMessage && (
                <Alert className="bg-green-100 border-green-300">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {locationMessage}
                  </AlertDescription>
                </Alert>
              )}

              {formData.latitude && formData.longitude && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    📍 Current Location:
                  </p>
                  <p className="text-xs font-mono text-gray-600 mb-3">
                    {parseFloat(formData.latitude).toFixed(6)},{" "}
                    {parseFloat(formData.longitude).toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                  >
                    View on Google Maps →
                  </a>
                </div>
              )}
            </div>

            {/* Operating Hours */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  Operating Hours
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Set your clinic's working hours for each day
                </p>
              </div>

              <div className="space-y-3">
                {Object.keys(formData.operatingHours).map((day) => (
                  <div
                    key={day}
                    className="flex items-center gap-4 p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors"
                  >
                    <div className="w-36">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.operatingHours[day].isOpen}
                          onChange={() => handleDayToggle(day)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="capitalize font-medium text-gray-700">
                          {day}
                        </span>
                      </label>
                    </div>
                    {formData.operatingHours[day].isOpen && (
                      <>
                        <Input
                          type="time"
                          value={formData.operatingHours[day].start}
                          onChange={(e) =>
                            handleTimeChange(day, "start", e.target.value)
                          }
                          className="w-36"
                        />
                        <span className="text-gray-500 font-medium">to</span>
                        <Input
                          type="time"
                          value={formData.operatingHours[day].end}
                          onChange={(e) =>
                            handleTimeChange(day, "end", e.target.value)
                          }
                          className="w-36"
                        />
                      </>
                    )}
                    {!formData.operatingHours[day].isOpen && (
                      <span className="text-gray-400 italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================== SECTION 2: SERVICES ==================== */}
        <Card className="shadow-lg border-t-4 border-t-purple-500">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Services Offered <span className="text-red-500">*</span>
                </CardTitle>
                <CardDescription>
                  Add the dental services your clinic provides, including
                  treatment details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Add Service Form */}
            <div className="border-2 border-purple-200 p-6 rounded-lg space-y-4 bg-purple-50/50">
              <h4 className="font-semibold text-purple-900 mb-3">
                Add New Service
              </h4>

              {/* Basic Service Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  name="name"
                  placeholder="Service name (e.g., Teeth Cleaning) *"
                  value={newService.name}
                  onChange={handleServiceInputChange}
                  className="text-base"
                />
                <select
                  name="category"
                  value={newService.category}
                  onChange={handleServiceInputChange}
                  className="border rounded-md px-3 py-2 text-base bg-white"
                >
                  {serviceCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <Textarea
                name="description"
                placeholder="Brief description of the service (optional)"
                value={newService.description}
                onChange={handleServiceInputChange}
                rows={2}
                className="text-base resize-none"
              />

              {/* Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">
                    Duration (min)
                  </Label>
                  <Input
                    name="duration_minutes"
                    type="number"
                    placeholder="30"
                    value={newService.duration_minutes}
                    onChange={handleServiceInputChange}
                    min="1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Min Price (₱)</Label>
                  <Input
                    name="min_price"
                    type="number"
                    placeholder="500"
                    value={newService.min_price}
                    onChange={handleServiceInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Max Price (₱)</Label>
                  <Input
                    name="max_price"
                    type="number"
                    placeholder="1000"
                    value={newService.max_price}
                    onChange={handleServiceInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* ✅ NEW: Treatment Plan Section */}
              <div className="border-t-2 border-purple-300 pt-4 space-y-4">
                <h5 className="font-semibold text-purple-900 flex items-center gap-2">
                  <span className="text-lg">📋</span> Treatment Plan Settings
                </h5>

                {/* Consultation Requirements */}
                <div className="bg-white rounded-lg p-4 space-y-3 border border-purple-200">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="requires_consultation"
                      name="requires_consultation"
                      checked={newService.requires_consultation}
                      onChange={handleServiceInputChange}
                      className="mt-1 w-4 h-4 text-purple-600 rounded"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="requires_consultation"
                        className="font-medium cursor-pointer"
                      >
                        Requires Consultation First
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Patient must have a consultation before booking this
                        service
                      </p>
                    </div>
                  </div>

                  {newService.requires_consultation && (
                    <div className="ml-7 space-y-2">
                      <Label className="text-xs text-gray-600">
                        Consultation Validity (days)
                      </Label>
                      <Input
                        name="consultation_validity_days"
                        type="number"
                        placeholder="30"
                        value={newService.consultation_validity_days}
                        onChange={handleServiceInputChange}
                        min="1"
                        className="max-w-xs"
                      />
                      <p className="text-xs text-gray-500">
                        How long the consultation remains valid for booking this
                        service
                      </p>
                    </div>
                  )}
                </div>

                {/* Multiple Visits Requirement */}
                <div className="bg-white rounded-lg p-4 space-y-3 border border-purple-200">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="requires_multiple_visits"
                      name="requires_multiple_visits"
                      checked={newService.requires_multiple_visits}
                      onChange={handleServiceInputChange}
                      className="mt-1 w-4 h-4 text-purple-600 rounded"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="requires_multiple_visits"
                        className="font-medium cursor-pointer"
                      >
                        Requires Multiple Visits (Treatment Plan)
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        This service needs multiple appointments to complete
                      </p>
                    </div>
                  </div>

                  {newService.requires_multiple_visits && (
                    <div className="ml-7 space-y-3">
                      <div>
                        <Label className="text-xs text-gray-600">
                          Typical Number of Visits{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          name="typical_visit_count"
                          type="number"
                          placeholder="3"
                          value={newService.typical_visit_count}
                          onChange={handleServiceInputChange}
                          min="1"
                          max="50"
                          className="max-w-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Average number of appointments needed to complete
                          treatment
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">
                            Treatment Price (₱)
                          </Label>
                          <Input
                            name="treatment_price"
                            type="number"
                            placeholder="5000"
                            value={newService.treatment_price}
                            onChange={handleServiceInputChange}
                            min="0"
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Total cost for entire treatment
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-600">
                            Follow-up Visit Price (₱)
                          </Label>
                          <Input
                            name="follow_up_price"
                            type="number"
                            placeholder="1000"
                            value={newService.follow_up_price}
                            onChange={handleServiceInputChange}
                            min="0"
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Cost per follow-up appointment
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">
                          Pricing Notes (Optional)
                        </Label>
                        <Textarea
                          name="pricing_notes"
                          placeholder="e.g., Payment can be split across visits, includes all materials..."
                          value={newService.pricing_notes}
                          onChange={handleServiceInputChange}
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={addService}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>

            {/* Services List */}
            {services.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">
                    Added Services ({services.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="border-2 border-purple-100 p-4 rounded-lg bg-white hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {/* Service Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900">
                              {service.name}
                            </p>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {service.category}
                            </span>
                          </div>

                          {/* Description */}
                          {service.description && (
                            <p className="text-sm text-gray-600 mb-3">
                              {service.description}
                            </p>
                          )}

                          {/* Basic Info Row */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              ⏱️ {service.duration_minutes} min
                            </span>
                            {service.min_price && service.max_price && (
                              <span className="flex items-center gap-1">
                                💰 ₱{service.min_price} - ₱{service.max_price}
                              </span>
                            )}
                          </div>

                          {/* Treatment Details */}
                          <div className="flex flex-wrap gap-2">
                            {service.requires_consultation && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md flex items-center gap-1">
                                <span>🔍</span>
                                Requires Consultation (
                                {service.consultation_validity_days} days)
                              </span>
                            )}

                            {service.requires_multiple_visits && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-md flex items-center gap-1">
                                <span>📋</span>
                                Treatment Plan ({
                                  service.typical_visit_count
                                }{" "}
                                visits)
                              </span>
                            )}
                          </div>

                          {/* Treatment Pricing */}
                          {service.requires_multiple_visits && (
                            <div className="mt-3 pt-3 border-t border-purple-100">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                {service.treatment_price && (
                                  <div>
                                    <span className="text-gray-500">
                                      Treatment:
                                    </span>
                                    <span className="font-semibold text-purple-700 ml-2">
                                      ₱
                                      {parseFloat(
                                        service.treatment_price
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {service.follow_up_price && (
                                  <div>
                                    <span className="text-gray-500">
                                      Follow-up:
                                    </span>
                                    <span className="font-semibold text-purple-700 ml-2">
                                      ₱
                                      {parseFloat(
                                        service.follow_up_price
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {service.pricing_notes && (
                                <p className="text-xs text-gray-500 mt-2 italic">
                                  💡 {service.pricing_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Remove Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(service.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {services.length === 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800">
                  ⚠️ Please add at least one service to continue
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        {/* ==================== SECTION 3: DOCTORS ==================== */}
        <Card className="shadow-lg border-t-4 border-t-green-500">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Doctors <span className="text-red-500">*</span>
                </CardTitle>
                <CardDescription>
                  Add at least one doctor to complete your clinic profile
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Add Doctor Form */}
            <div className="border-2 border-green-200 p-6 rounded-lg space-y-5 bg-green-50/50">
              <h4 className="font-semibold text-green-900 mb-3">
                Add New Doctor
              </h4>

              {/* ✅ ENHANCED: Doctor Photo Upload (matches clinic flow) */}
              <div className="space-y-3">
                <Label className="font-semibold">
                  Doctor Photo{" "}
                  <span className="text-gray-400 text-sm">(Optional)</span>
                </Label>
                <p className="text-xs text-gray-600">
                  Max size: {FILE_SIZE_LIMITS.doctor.display}
                </p>

                {newDoctor.image_url ? (
                  // Uploaded Image
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={newDoctor.image_url}
                        alt="Doctor"
                        className="w-24 h-24 object-cover rounded-full border-4 border-green-300 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveDoctorImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">
                        Photo uploaded successfully
                      </span>
                    </div>
                  </div>
                ) : doctorImageUpload.preview ? (
                  // Preview with Upload Button
                  <div className="flex items-start gap-4">
                    <img
                      src={doctorImageUpload.preview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-full border-2 border-dashed border-green-300"
                    />
                    <div className="flex flex-col gap-2 flex-1">
                      <Button
                        type="button"
                        onClick={handleDoctorImageUpload}
                        disabled={doctorImageUpload.isProcessing}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {doctorImageUpload.isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...{" "}
                            {Math.round(doctorImageUpload.uploadState.progress)}
                            %
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Confirm Upload
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => doctorImageUpload.reset()}
                        disabled={doctorImageUpload.isProcessing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Upload Area
                  <label className="cursor-pointer inline-block">
                    <div className="w-24 h-24 border-2 border-dashed border-green-300 rounded-full flex items-center justify-center hover:border-green-500 hover:bg-green-100 transition-all">
                      <Upload className="h-8 w-8 text-green-400" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDoctorImageSelect}
                      className="hidden"
                    />
                  </label>
                )}

                {doctorImageUpload.error && (
                  <Alert variant="destructive" className="text-sm">
                    <AlertDescription>
                      {doctorImageUpload.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Doctor Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="first_name"
                    placeholder="Juan"
                    value={newDoctor.first_name}
                    onChange={handleDoctorInputChange}
                    className="text-base"
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="last_name"
                    placeholder="Dela Cruz"
                    value={newDoctor.last_name}
                    onChange={handleDoctorInputChange}
                    className="text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>
                    License Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="license_number"
                    placeholder="PRC-12345"
                    value={newDoctor.license_number}
                    onChange={handleDoctorInputChange}
                    className="text-base"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Specialization</Label>
                  <select
                    name="specialization"
                    value={newDoctor.specialization}
                    onChange={handleDoctorInputChange}
                    className="w-full border rounded-md px-3 py-2 text-base bg-white"
                  >
                    {serviceCategories.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Education</Label>
                <Input
                  name="education"
                  placeholder="e.g., DMD from University of the Philippines"
                  value={newDoctor.education}
                  onChange={handleDoctorInputChange}
                  className="text-base"
                />
              </div>

              <div className="space-y-1">
                <Label>Bio</Label>
                <Textarea
                  name="bio"
                  placeholder="Brief professional bio (optional)"
                  value={newDoctor.bio}
                  onChange={handleDoctorInputChange}
                  rows={3}
                  className="text-base resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Experience (Years)</Label>
                  <Input
                    name="experience_years"
                    type="number"
                    placeholder="5"
                    value={newDoctor.experience_years}
                    onChange={handleDoctorInputChange}
                    min="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Consultation Fee (₱)</Label>
                  <Input
                    name="consultation_fee"
                    type="number"
                    placeholder="500"
                    value={newDoctor.consultation_fee}
                    onChange={handleDoctorInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Languages</Label>
                  <Input
                    name="languages_spoken"
                    placeholder="English, Tagalog"
                    value={newDoctor.languages_spoken.join(", ")}
                    onChange={handleLanguagesChange}
                  />
                </div>
              </div>

              {/* Certifications Section */}
              <div className="border-t-2 border-green-200 pt-4 space-y-3">
                <Label className="font-semibold text-base">
                  Certifications{" "}
                  <span className="text-gray-400 text-sm">(Optional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Certification name"
                    value={newCertification.name}
                    onChange={(e) =>
                      setNewCertification((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Year"
                    value={newCertification.year}
                    onChange={(e) =>
                      setNewCertification((prev) => ({
                        ...prev,
                        year: e.target.value,
                      }))
                    }
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCertification}
                    className="border-green-300 hover:bg-green-100"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {newDoctor.certifications.length > 0 && (
                  <div className="space-y-2">
                    {newDoctor.certifications.map((cert, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-200 text-sm"
                      >
                        <span className="font-medium">
                          {cert.name}{" "}
                          {cert.year && (
                            <span className="text-gray-500">({cert.year})</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCertification(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Awards Section */}
              <div className="border-t-2 border-green-200 pt-4 space-y-3">
                <Label className="font-semibold text-base">
                  Awards & Recognitions{" "}
                  <span className="text-gray-400 text-sm">(Optional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Award name"
                    value={newAward}
                    onChange={(e) => setNewAward(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAward}
                    className="border-green-300 hover:bg-green-100"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {newDoctor.awards.length > 0 && (
                  <div className="space-y-2">
                    {newDoctor.awards.map((award, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-200 text-sm"
                      >
                        <span className="font-medium">{award}</span>
                        <button
                          type="button"
                          onClick={() => removeAward(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={addDoctor}
                className="w-full bg-green-600 hover:bg-green-700 text-base py-6"
                disabled={doctorImageUpload.isProcessing}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Doctor to Clinic
              </Button>
            </div>

            {/* Doctors List */}
            {doctors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">
                    Added Doctors ({doctors.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className="flex items-start gap-4 border-2 border-green-100 p-4 rounded-lg bg-white hover:border-green-300 transition-colors"
                    >
                      {doctor.image_url ? (
                        <img
                          src={doctor.image_url}
                          alt={`Dr. ${doctor.first_name}`}
                          className="w-20 h-20 object-cover rounded-full border-2 border-green-300 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-700 font-bold text-2xl flex-shrink-0">
                          {doctor.first_name.charAt(0)}
                          {doctor.last_name.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-lg text-gray-900">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                {doctor.specialization}
                              </span>
                              <span className="text-xs text-gray-500">
                                {doctor.license_number}
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDoctor(doctor.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {doctor.education && (
                          <p className="text-sm text-gray-600 mt-2">
                            🎓 {doctor.education}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          {doctor.experience_years && (
                            <span>📅 {doctor.experience_years} years exp.</span>
                          )}
                          {doctor.consultation_fee && (
                            <span>💰 ₱{doctor.consultation_fee}</span>
                          )}
                          {doctor.languages_spoken.length > 0 && (
                            <span>🗣️ {doctor.languages_spoken.join(", ")}</span>
                          )}
                        </div>

                        {doctor.certifications.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-green-700">
                              🏆 {doctor.certifications.length} certification(s)
                            </span>
                          </div>
                        )}

                        {doctor.awards.length > 0 && (
                          <div className="mt-1">
                            <span className="text-xs font-medium text-blue-700">
                              ⭐ {doctor.awards.length} award(s)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doctors.length === 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800">
                  ⚠️ Please add at least one doctor to continue
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ==================== SECTION 4: SUBMIT ==================== */}
        <Card className="shadow-xl border-t-4 border-t-blue-600">
          <CardContent className="pt-6 space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-6">
              <h4 className="font-bold text-lg mb-4 text-gray-900">
                📋 Profile Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>Clinic:</strong> {formData.clinicName || "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle
                    className={`h-5 w-5 flex-shrink-0 ${
                      services.length > 0 ? "text-green-600" : "text-gray-300"
                    }`}
                  />
                  <span className="text-sm">
                    <strong>Services:</strong> {services.length} added
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle
                    className={`h-5 w-5 flex-shrink-0 ${
                      doctors.length > 0 ? "text-green-600" : "text-gray-300"
                    }`}
                  />
                  <span className="text-sm">
                    <strong>Doctors:</strong> {doctors.length} added
                  </span>
                </div>
                {formData.clinicImageUrl && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">Clinic image uploaded</span>
                  </div>
                )}
                {formData.clinicDescription && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">Description added</span>
                  </div>
                )}
                {formData.clinicWebsite && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">Website URL added</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white text-lg py-7 shadow-lg hover:shadow-xl transition-all"
              disabled={
                submitting ||
                clinicImageUpload.isProcessing ||
                doctorImageUpload.isProcessing
              }
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-3 h-6 w-6" />
                  Complete Profile & Activate Account
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">
              By completing your profile, you agree to DentServe's terms and
              conditions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffCompleteProfile;
