import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Building2, User, MapPin, Calendar, Phone, Mail } from "lucide-react";

const StaffCompleteProfile = () => {
  const [profileData, setProfileData] = useState({
    // Basic info
    first_name: "",
    last_name: "",
    phone: "",

    // Clinic info
    clinic_name: "",
    clinic_address: "", // Street address
    clinic_city: "San Jose Del Monte", // Default city
    clinic_province: "Bulacan", // Default province
    clinic_zip_code: "", // Staff provides
    clinic_phone: "",
    clinic_email: "",

    // Services offered
    services_offered: [],

    // Operating hours
    operating_hours: {
      monday: { open: "08:00", close: "17:00", closed: false },
      tuesday: { open: "08:00", close: "17:00", closed: false },
      wednesday: { open: "08:00", close: "17:00", closed: false },
      thursday: { open: "08:00", close: "17:00", closed: false },
      friday: { open: "08:00", close: "17:00", closed: false },
      saturday: { open: "08:00", close: "12:00", closed: false },
      sunday: { open: "08:00", close: "12:00", closed: true },
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableServices] = useState([
    "General Dentistry",
    "Teeth Cleaning",
    "Dental Fillings",
    "Root Canal Treatment",
    "Tooth Extraction",
    "Orthodontics",
    "Braces",
    "Dental Implants",
    "Cosmetic Dentistry",
    "Teeth Whitening",
    "Pediatric Dentistry",
    "Periodontics",
    "Endodontics",
    "Oral Surgery",
  ]);

  const {
    user,
    authStatus,
    loading: authLoading,
    refreshAuthStatus,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (authStatus?.user_role !== "staff") {
      navigate("/unauthorized");
      return;
    }

    if (authStatus?.can_access_app) {
      navigate("/staff/dashboard");
      return;
    }

    loadExistingData();
  }, [user, authStatus, authLoading, navigate]);

  const loadExistingData = async () => {
    try {
      // Load any existing profile data
      const { data: profileInfo } = await supabase.rpc(
        "get_user_complete_profile"
      );

      if (profileInfo) {
        setProfileData((prev) => ({
          ...prev,
          first_name: profileInfo.first_name || "",
          last_name: profileInfo.last_name || "",
          phone: profileInfo.phone || "",
        }));
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (service) => {
    setProfileData((prev) => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter((s) => s !== service)
        : [...prev.services_offered, service],
    }));
  };

  const handleTimeChange = (day, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleDayToggle = (day) => {
    setProfileData((prev) => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          closed: !prev.operating_hours[day].closed,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      const requiredFields = [
        "first_name",
        "last_name",
        "phone",
        "clinic_name",
        "clinic_address",
        "clinic_phone",
        "clinic_email",
      ];

      for (const field of requiredFields) {
        if (!profileData[field]?.trim()) {
          throw new Error(`${field.replace("_", " ")} is required`);
        }
      }

      if (profileData.services_offered.length === 0) {
        throw new Error("Please select at least one service");
      }

      // Update profile using the corrected function name
      const { data, error } = await supabase.rpc(
        "update_staff_complete_profile",
        {
          p_profile_data: {
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
          },
          p_clinic_data: {
            name: profileData.clinic_name,
            address: profileData.clinic_address,
            city: profileData.clinic_city,
            province: profileData.clinic_province,
            zip_code: profileData.clinic_zip_code,
            phone: profileData.clinic_phone,
            email: profileData.clinic_email,
            services_offered: profileData.services_offered,
            operating_hours: profileData.operating_hours,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to complete profile");
      }

      // Refresh auth status to get updated verification state
      await refreshAuthStatus();

      // Navigate to dashboard
      navigate("/staff/dashboard", { replace: true });
    } catch (error) {
      console.error("Profile completion error:", error);
      setError(error.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Loading...</h2>
          <p className="text-gray-600">
            Please wait while we prepare your profile setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-6">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Complete Your Clinic Profile
            </h1>
            <p className="text-lg text-emerald-100 leading-relaxed max-w-2xl mx-auto">
              Set up your clinic information to start managing appointments and
              serving patients
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <User className="w-6 h-6 text-emerald-600 mr-3" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="first_name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      First Name *
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      value={profileData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="last_name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Last Name *
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      value={profileData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Contact Number *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Clinic Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Building2 className="w-6 h-6 text-emerald-600 mr-3" />
                  Clinic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label
                      htmlFor="clinic_name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Clinic Name *
                    </label>
                    <input
                      id="clinic_name"
                      name="clinic_name"
                      type="text"
                      required
                      value={profileData.clinic_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="clinic_phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Clinic Phone *
                    </label>
                    <input
                      id="clinic_phone"
                      name="clinic_phone"
                      type="tel"
                      required
                      value={profileData.clinic_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="clinic_email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Clinic Email *
                    </label>
                    <input
                      id="clinic_email"
                      name="clinic_email"
                      type="email"
                      required
                      value={profileData.clinic_email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Clinic Address Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <MapPin className="w-6 h-6 text-emerald-600 mr-3" />
                  Clinic Location
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <textarea
                      name="clinic_address"
                      value={profileData.clinic_address}
                      onChange={handleInputChange}
                      rows={2}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Enter complete street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="clinic_city"
                      value={profileData.clinic_city}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="San Jose Del Monte"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province *
                    </label>
                    <input
                      type="text"
                      name="clinic_province"
                      value={profileData.clinic_province}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Bulacan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="clinic_zip_code"
                      value={profileData.clinic_zip_code}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g., 3023"
                    />
                  </div>
                </div>
              </div>

              {/* Services Offered */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Calendar className="w-6 h-6 text-emerald-600 mr-3" />
                  Services Offered *
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableServices.map((service) => (
                    <label
                      key={service}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={profileData.services_offered.includes(service)}
                        onChange={() => handleServiceToggle(service)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Operating Hours */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Calendar className="w-6 h-6 text-emerald-600 mr-3" />
                  Operating Hours
                </h3>
                <div className="space-y-4">
                  {Object.entries(profileData.operating_hours).map(
                    ([day, hours]) => (
                      <div key={day} className="flex items-center space-x-4">
                        <div className="w-20">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {day}
                          </span>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!hours.closed}
                            onChange={() => handleDayToggle(day)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            Open
                          </span>
                        </label>
                        {!hours.closed && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="time"
                              value={hours.open}
                              onChange={(e) =>
                                handleTimeChange(day, "open", e.target.value)
                              }
                              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={hours.close}
                              onChange={(e) =>
                                handleTimeChange(day, "close", e.target.value)
                              }
                              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Setting up Clinic...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-5 h-5 mr-3" />
                      Complete Setup
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCompleteProfile;
