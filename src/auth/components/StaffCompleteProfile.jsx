import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "@/auth/hooks/authService";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/core/components/ui/card";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Loader2, MapPin } from "lucide-react";

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

  const [formData, setFormData] = useState({
    // Clinic info
    clinicName: clinicName || "",
    clinicAddress: "",
    clinicCity: "San Jose Del Monte",
    clinicProvince: "Bulacan",
    clinicZipCode: "",
    clinicPhone: "",
    clinicEmail: user?.email || "",

    // Location coordinates (for geography)
    latitude: 14.8169, // Default SJDM latitude
    longitude: 121.0583, // Default SJDM longitude

    // Operating hours
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

  // Services state - array of service objects
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    category: "General Dentistry",
    duration_minutes: 30,
    min_price: "",
    max_price: "",
  });

  // Available service categories
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
          // Already completed - redirect
          navigate("/staff/dashboard");
          return;
        }

        // Load existing clinic data if any
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

  // Get current location button handler
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

  const validateForm = () => {
    if (!formData.clinicName.trim()) return "Clinic name is required";
    if (!formData.clinicAddress.trim()) return "Clinic address is required";
    if (!formData.clinicPhone.trim()) return "Clinic phone is required";

    // Validate coordinates
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

      // Prepare profile data
      const profileData = {
        // Add any profile updates here if needed
      };

      // Prepare clinic data with location coordinates
      const clinicData = {
        name: formData.clinicName,
        address: formData.clinicAddress,
        city: formData.clinicCity,
        province: formData.clinicProvince,
        zip_code: formData.clinicZipCode,
        phone: formData.clinicPhone,
        email: formData.clinicEmail,
        operating_hours: formData.operatingHours,

        // Send coordinates (will be converted to geography in DB)
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      // Prepare services data as array (for services table)
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

      // Call V2 function (creates services in services table)
      const result = await authService.updateStaffCompleteProfileV2(
        profileData,
        clinicData,
        servicesData
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh auth status
      await refreshAuthStatus();

      // Success - redirect to staff dashboard
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Clinic Profile</CardTitle>
            <CardDescription>
              {deadline && (
                <Alert className="mt-2">
                  <AlertDescription>
                    ⏰ Please complete within 7 days to activate your account
                  </AlertDescription>
                </Alert>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Clinic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Clinic Information</h3>

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

                {/* Location Coordinates Section */}
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
                    This helps patients find your clinic on the map. Click "Use
                    Current Location" if you're at the clinic, or enter
                    coordinates manually.
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
                        📍 Current Location:{" "}
                        {parseFloat(formData.latitude).toFixed(6)},{" "}
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
              </div>

              {/* Operating Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Operating Hours</h3>
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

              {/* Services */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Services Offered *</h3>

                {/* Add service form */}
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

                {/* Services list */}
                {services.length > 0 && (
                  <div className="space-y-2">
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
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing Profile...
                  </>
                ) : (
                  "Complete Profile & Activate Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffCompleteProfile;
