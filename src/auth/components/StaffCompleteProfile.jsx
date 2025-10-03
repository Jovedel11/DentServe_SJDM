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
import { Loader2, MapPin, Upload, X } from "lucide-react";
import { useImageUpload } from "@/hooks/file_upload/useImageUpload";

const StaffCompleteProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshAuthStatus } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  // Get data from navigation state
  const { clinicId, clinicName, deadline, isNewSignup } = location.state || {};

  const clinicImageUpload = useImageUpload({
    uploadType: "general",
    maxSizeMB: 2, // Compress to 2MB
    maxWidthOrHeight: 1200,
    autoCompress: true,
    folder: "clinics",
    maxFileSize: 10 * 1024 * 1024, // 10MB max
  });

  const doctorImageUpload = useImageUpload({
    uploadType: "general",
    maxSizeMB: 1, // Compress to 1MB
    maxWidthOrHeight: 800,
    autoCompress: true,
    folder: "doctors",
    maxFileSize: 5 * 1024 * 1024, // 5MB max
  });

  const [formData, setFormData] = useState({
    clinicName: clinicName || "",
    clinicAddress: "",
    clinicCity: "San Jose Del Monte",
    clinicProvince: "Bulacan",
    clinicZipCode: "",
    clinicPhone: "",
    clinicEmail: user?.email || "",
    clinicImageUrl: "", // 🆕

    latitude: 14.8169,
    longitude: 121.0583,

    operatingHours: {
      monday: { isOpen: true, open: "09:00", close: "17:00" },
      tuesday: { isOpen: true, open: "09:00", close: "17:00" },
      wednesday: { isOpen: true, open: "09:00", close: "17:00" },
      thursday: { isOpen: true, open: "09:00", close: "17:00" },
      friday: { isOpen: true, open: "09:00", close: "17:00" },
      saturday: { isOpen: false, open: "09:00", close: "12:00" },
      sunday: { isOpen: false, open: "", close: "" },
    },
  });

  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    category: "General Dentistry",
    duration_minutes: 30,
    min_price: "",
    max_price: "",
  });

  // 🆕 DOCTORS STATE WITH IMAGE
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
    image_url: "",
    uploadingImage: false, // 🆕 Local upload state
  });

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

  useEffect(() => {
    checkCompletionStatus();
  }, []);

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
      console.error("Status check error:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleGetCurrentLocation = async () => {
    setError("");
    setLocationMessage("Getting your location...");

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported by your browser");
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

      setLocationMessage(
        `✅ Location detected: ${position.coords.latitude.toFixed(
          6
        )}, ${position.coords.longitude.toFixed(6)}`
      );

      setTimeout(() => setLocationMessage(""), 5000);
    } catch (err) {
      console.error("Location error:", err);
      setError(
        "Could not get location. Please enter coordinates manually or use default SJDM location."
      );
      setTimeout(() => setError(""), 5000);
    }
  };

  // 🆕 CLINIC IMAGE UPLOAD HANDLER
  const handleClinicImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    const result = await clinicImageUpload.selectFile(file);

    if (!result.success) {
      setError(result.error);
      setTimeout(() => setError(""), 3000);
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
      setError(result.error || "Failed to upload clinic image");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleRemoveClinicImage = () => {
    setFormData((prev) => ({ ...prev, clinicImageUrl: "" }));
    clinicImageUpload.reset();
  };

  // Service management
  const handleServiceInputChange = (e) => {
    const { name, value } = e.target;
    setNewService((prev) => ({ ...prev, [name]: value }));
  };

  const addService = () => {
    if (!newService.name.trim()) {
      setError("Service name is required");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setServices((prev) => [...prev, { ...newService, id: Date.now() }]);
    setNewService({
      name: "",
      description: "",
      category: "General Dentistry",
      duration_minutes: 30,
      min_price: "",
      max_price: "",
    });
    setError("");
  };

  const removeService = (id) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // 🆕 DOCTOR MANAGEMENT
  const handleDoctorInputChange = (e) => {
    const { name, value } = e.target;
    setNewDoctor((prev) => ({ ...prev, [name]: value }));
  };

  const handleLanguagesChange = (e) => {
    const languages = e.target.value.split(",").map((lang) => lang.trim());
    setNewDoctor((prev) => ({ ...prev, languages_spoken: languages }));
  };

  const handleDoctorImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setNewDoctor((prev) => ({ ...prev, uploadingImage: true }));

    try {
      // Use the pre-initialized hook
      const selectResult = await doctorImageUpload.selectFile(file);

      if (!selectResult.success) {
        setError(selectResult.error);
        setNewDoctor((prev) => ({ ...prev, uploadingImage: false }));
        setTimeout(() => setError(""), 3000);
        return;
      }

      const uploadResult = await doctorImageUpload.uploadFile();

      if (uploadResult.success) {
        setNewDoctor((prev) => ({
          ...prev,
          image_url: uploadResult.data.imageUrl,
          uploadingImage: false,
        }));
        console.log("✅ Doctor image uploaded:", uploadResult.data.imageUrl);
        doctorImageUpload.reset(); // Clean up after successful upload
      } else {
        setError(uploadResult.error || "Failed to upload doctor image");
        setNewDoctor((prev) => ({ ...prev, uploadingImage: false }));
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Doctor image upload error:", err);
      setError("Failed to upload doctor image");
      setNewDoctor((prev) => ({ ...prev, uploadingImage: false }));
      setTimeout(() => setError(""), 3000);
    }
  };

  const addDoctor = () => {
    if (!newDoctor.first_name.trim() || !newDoctor.last_name.trim()) {
      setError("Doctor first name and last name are required");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!newDoctor.license_number.trim()) {
      setError("Doctor license number is required");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const { uploadingImage, ...doctorData } = newDoctor;
    setDoctors((prev) => [...prev, { ...doctorData, id: Date.now() }]);

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
      image_url: "",
      uploadingImage: false,
    });
    setError("");
  };

  const removeDoctor = (id) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  };

  const validateForm = () => {
    if (!formData.clinicName.trim()) return "Clinic name is required";
    if (!formData.clinicAddress.trim()) return "Clinic address is required";
    if (!formData.clinicPhone.trim()) return "Clinic phone is required";

    if (!formData.latitude || !formData.longitude) {
      return "Location coordinates are required";
    }
    if (formData.latitude < -90 || formData.latitude > 90) {
      return "Invalid latitude value (must be between -90 and 90)";
    }
    if (formData.longitude < -180 || formData.longitude > 180) {
      return "Invalid longitude value (must be between -180 and 180)";
    }

    if (services.length === 0) return "At least one service is required";
    if (doctors.length === 0) return "At least one doctor is required";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const profileData = {};

      const clinicData = {
        name: formData.clinicName,
        address: formData.clinicAddress,
        city: formData.clinicCity,
        province: formData.clinicProvince,
        zip_code: formData.clinicZipCode,
        phone: formData.clinicPhone,
        email: formData.clinicEmail,
        operating_hours: formData.operatingHours,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        image_url: formData.clinicImageUrl || null, // 🆕
      };

      const servicesData = services.map((service) => ({
        name: service.name,
        description: service.description || null,
        category: service.category,
        duration_minutes: parseInt(service.duration_minutes) || 30,
        min_price: service.min_price ? parseFloat(service.min_price) : null,
        max_price: service.max_price ? parseFloat(service.max_price) : null,
        is_active: true,
        priority: 10,
      }));

      // 🆕 DOCTORS DATA WITH IMAGE
      const doctorsData = doctors.map((doctor) => ({
        first_name: doctor.first_name,
        last_name: doctor.last_name,
        license_number: doctor.license_number,
        specialization: doctor.specialization,
        education: doctor.education || null,
        experience_years: doctor.experience_years
          ? parseInt(doctor.experience_years)
          : null,
        bio: doctor.bio || null,
        consultation_fee: doctor.consultation_fee
          ? parseFloat(doctor.consultation_fee)
          : null,
        languages_spoken: doctor.languages_spoken,
        image_url: doctor.image_url || null, // 🆕
        is_available: true,
      }));

      console.log("📤 Submitting profile with:", {
        clinicData,
        servicesCount: servicesData.length,
        doctorsCount: doctorsData.length,
      });

      const result = await authService.updateStaffCompleteProfileV2(
        profileData,
        clinicData,
        servicesData,
        doctorsData
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log("✅ Profile completed successfully");
      await refreshAuthStatus();

      navigate("/staff/dashboard", {
        state: {
          message: "Profile completed successfully! Welcome to DentServe.",
        },
      });
    } catch (err) {
      console.error("Profile completion error:", err);
      setError(err.message || "Failed to complete profile");
    } finally {
      setSubmitting(false);
    }
  };

  const FILE_SIZE_LIMITS = {
    clinic: { maxMB: 10, display: "10MB" },
    doctor: { maxMB: 5, display: "5MB" },
    profile: { maxMB: 5, display: "5MB" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* CLINIC INFO CARD */}
        <Card>
          <CardHeader>
            <CardTitle>1. Clinic Information</CardTitle>
            <CardDescription>
              {deadline && (
                <Alert className="mt-2">
                  <AlertDescription>
                    ⏰ Complete within 7 days to activate your account
                  </AlertDescription>
                </Alert>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 🆕 CLINIC IMAGE UPLOAD */}
            <div className="space-y-3 border rounded-lg p-4 bg-blue-50">
              <Label className="text-base font-semibold">Clinic Image</Label>
              <p className="text-sm text-muted-foreground">
                Upload the clinic's logo or a representative image.
              </p>
              {/* 🆕 SIZE LIMIT WARNING */}
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                <span>⚠️</span>
                <span>
                  Maximum file size:{" "}
                  <strong>{FILE_SIZE_LIMITS.clinic.display}</strong> (Free tier
                  limit)
                </span>
              </div>

              {formData.clinicImageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={formData.clinicImageUrl}
                    alt="Clinic"
                    className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-blue-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveClinicImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : clinicImageUpload.preview ? (
                <div className="space-y-3">
                  <img
                    src={clinicImageUpload.preview}
                    alt="Preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-dashed"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleClinicImageUpload}
                      disabled={clinicImageUpload.isProcessing}
                      size="sm"
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
                          Upload Image
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => clinicImageUpload.reset()}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload clinic image
                    </p>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, or WebP (Max 5MB)
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

            {/* Clinic Name & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name *</Label>
                <Input
                  id="clinicName"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicPhone">Phone *</Label>
                <Input
                  id="clinicPhone"
                  name="clinicPhone"
                  value={formData.clinicPhone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="clinicAddress">Address *</Label>
              <Input
                id="clinicAddress"
                name="clinicAddress"
                value={formData.clinicAddress}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* City, Province, Zip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicCity">City</Label>
                <Input
                  id="clinicCity"
                  name="clinicCity"
                  value={formData.clinicCity}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicProvince">Province</Label>
                <Input
                  id="clinicProvince"
                  name="clinicProvince"
                  value={formData.clinicProvince}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicZipCode">Zip Code</Label>
                <Input
                  id="clinicZipCode"
                  name="clinicZipCode"
                  value={formData.clinicZipCode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Location Coordinates */}
            <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Clinic Location (GPS Coordinates) *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                >
                  📍 Use Current Location
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                This helps patients find your clinic on the map.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="14.8169"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Range: -90 to 90
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="121.0583"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Range: -180 to 180
                  </p>
                </div>
              </div>

              {locationMessage && (
                <Alert>
                  <AlertDescription className="text-sm text-green-700">
                    {locationMessage}
                  </AlertDescription>
                </Alert>
              )}

              {formData.latitude && formData.longitude && (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    📍 Current: {parseFloat(formData.latitude).toFixed(6)},{" "}
                    {parseFloat(formData.longitude).toFixed(6)}
                    <br />
                    <a
                      href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View on Google Maps →
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Operating Hours */}
            <div className="space-y-3">
              <h4 className="font-semibold">Operating Hours</h4>
              {Object.keys(formData.operatingHours).map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-32">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.operatingHours[day].isOpen}
                        onChange={() => handleDayToggle(day)}
                      />
                      <span className="capitalize">{day}</span>
                    </label>
                  </div>
                  {formData.operatingHours[day].isOpen && (
                    <>
                      <Input
                        type="time"
                        value={formData.operatingHours[day].open}
                        onChange={(e) =>
                          handleTimeChange(day, "open", e.target.value)
                        }
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={formData.operatingHours[day].close}
                        onChange={(e) =>
                          handleTimeChange(day, "close", e.target.value)
                        }
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SERVICES CARD */}
        <Card>
          <CardHeader>
            <CardTitle>2. Services Offered *</CardTitle>
            <CardDescription>
              Add the services your clinic provides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  name="name"
                  placeholder="Service name *"
                  value={newService.name}
                  onChange={handleServiceInputChange}
                />
                <select
                  name="category"
                  value={newService.category}
                  onChange={handleServiceInputChange}
                  className="border rounded-md px-3 py-2"
                >
                  {serviceCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                name="description"
                placeholder="Description (optional)"
                value={newService.description}
                onChange={handleServiceInputChange}
              />

              <div className="grid grid-cols-3 gap-3">
                <Input
                  name="duration_minutes"
                  type="number"
                  placeholder="Duration (min)"
                  value={newService.duration_minutes}
                  onChange={handleServiceInputChange}
                />
                <Input
                  name="min_price"
                  type="number"
                  placeholder="Min Price"
                  value={newService.min_price}
                  onChange={handleServiceInputChange}
                />
                <Input
                  name="max_price"
                  type="number"
                  placeholder="Max Price"
                  value={newService.max_price}
                  onChange={handleServiceInputChange}
                />
              </div>

              <Button
                type="button"
                onClick={addService}
                variant="outline"
                className="w-full"
              >
                Add Service
              </Button>
            </div>

            {services.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  Added Services ({services.length})
                </p>
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between border p-3 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.category} • {service.duration_minutes} min
                        {service.min_price &&
                          ` • ₱${service.min_price}-${service.max_price}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService(service.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🆕 DOCTORS CARD WITH IMAGE */}
        <Card>
          <CardHeader>
            <CardTitle>3. Doctors *</CardTitle>
            <CardDescription>
              Add at least one doctor to complete your clinic profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border p-4 rounded-lg space-y-3 bg-green-50">
              {/* 🆕 DOCTOR IMAGE UPLOAD */}
              <div className="space-y-2">
                <Label>Doctor Photo (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Max size: <strong>{FILE_SIZE_LIMITS.doctor.display}</strong>
                </p>
                {newDoctor.image_url ? (
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={newDoctor.image_url}
                        alt="Doctor"
                        className="w-24 h-24 object-cover rounded-full border-2 border-green-300"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewDoctor((prev) => ({ ...prev, image_url: "" }))
                        }
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm text-green-700">✓ Photo uploaded</p>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-block">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center hover:border-green-400 hover:bg-green-50">
                      {newDoctor.uploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                      ) : (
                        <Upload className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDoctorImageSelect}
                      className="hidden"
                      disabled={newDoctor.uploadingImage}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  name="first_name"
                  placeholder="First Name *"
                  value={newDoctor.first_name}
                  onChange={handleDoctorInputChange}
                />
                <Input
                  name="last_name"
                  placeholder="Last Name *"
                  value={newDoctor.last_name}
                  onChange={handleDoctorInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  name="license_number"
                  placeholder="License Number *"
                  value={newDoctor.license_number}
                  onChange={handleDoctorInputChange}
                />
                <select
                  name="specialization"
                  value={newDoctor.specialization}
                  onChange={handleDoctorInputChange}
                  className="border rounded-md px-3 py-2"
                >
                  {serviceCategories.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                name="education"
                placeholder="Education (e.g., DMD from University of the Philippines)"
                value={newDoctor.education}
                onChange={handleDoctorInputChange}
              />

              <Textarea
                name="bio"
                placeholder="Short bio (optional)"
                value={newDoctor.bio}
                onChange={handleDoctorInputChange}
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  name="experience_years"
                  type="number"
                  placeholder="Years Experience"
                  value={newDoctor.experience_years}
                  onChange={handleDoctorInputChange}
                />
                <Input
                  name="consultation_fee"
                  type="number"
                  placeholder="Fee (₱)"
                  value={newDoctor.consultation_fee}
                  onChange={handleDoctorInputChange}
                />
                <Input
                  name="languages_spoken"
                  placeholder="Languages"
                  value={newDoctor.languages_spoken.join(", ")}
                  onChange={handleLanguagesChange}
                />
              </div>

              <Button
                type="button"
                onClick={addDoctor}
                variant="outline"
                className="w-full"
                disabled={newDoctor.uploadingImage}
              >
                Add Doctor
              </Button>
            </div>

            {doctors.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  Added Doctors ({doctors.length})
                </p>
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center gap-4 border p-3 rounded-lg bg-white"
                  >
                    {doctor.image_url && (
                      <img
                        src={doctor.image_url}
                        alt={`Dr. ${doctor.first_name}`}
                        className="w-16 h-16 object-cover rounded-full border-2"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {doctor.specialization} • {doctor.license_number}
                      </p>
                      {doctor.experience_years && (
                        <p className="text-xs text-muted-foreground">
                          {doctor.experience_years} years experience
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDoctor(doctor.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SUBMIT CARD */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Summary:</h4>
              <ul className="text-sm space-y-1">
                <li>✓ Clinic: {formData.clinicName || "Not set"}</li>
                <li>✓ Services: {services.length} added</li>
                <li>✓ Doctors: {doctors.length} added</li>
                {formData.clinicImageUrl && <li>✓ Clinic image uploaded</li>}
              </ul>
            </div>

            <Button
              type="submit"
              onClick={handleSubmit}
              className="w-full"
              disabled={submitting || clinicImageUpload.isProcessing}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                "Complete Profile & Activate Account"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffCompleteProfile;
