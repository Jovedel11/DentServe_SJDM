import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const CompleteProfile = () => {
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [missingFields, setMissingFields] = useState([]);

  const {
    user,
    userRole,
    checkUserProfile,
    getVerificationStep,
    loading: authLoading,
    isVerifiedEmail,
    isVerifiedPhone,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    if (!user) {
      navigate("/login");
      return;
    }

    checkProfileCompleteness();
  }, [user, userRole, authLoading, getVerificationStep]);

  const checkProfileCompleteness = async () => {
    try {
      const { data, error: profileError } = await supabase.rpc(
        "is_user_profile_complete"
      );

      if (profileError)
        throw new Error(profileError.message || "Profile check failed");

      if (data?.can_use_app) {
        // Profile is complete, navigate to dashboard
        navigateToCorrectDashboard();
      } else {
        setMissingFields(data?.missing_fields || []);
        await loadCurrentProfileData();
      }
    } catch (error) {
      console.error("Error checking profile:", error);
      setError(error.message || "Error loading profile information");
    }
  };

  const loadCurrentProfileData = async () => {
    try {
      // ✅ FIX: Get current user ID from your function
      const { data: currentUserId } = await supabase.rpc("get_current_user_id");
      if (!currentUserId) throw new Error("User not found");

      // ✅ FIX: Load user profile data correctly
      const { data: userProfileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", currentUserId)
        .single();

      if (profileError)
        throw new Error(profileError.message || "Profile fetch failed");

      // Load basic user data
      const { data: userData } = await supabase
        .from("users")
        .select("phone, email")
        .eq("id", currentUserId)
        .single();

      // Set basic profile data
      let baseProfileData = {
        ...userProfileData,
        phone: userData?.phone,
        email: userData?.email,
      };

      // Load role-specific data
      if (userRole === "patient") {
        const { data: patientData } = await supabase
          .from("patient_profiles")
          .select("*")
          .eq("user_profile_id", userProfileData.id)
          .single();

        setProfileData({
          ...baseProfileData,
          ...patientData,
        });
      } else if (userRole === "staff") {
        // Staff should use StaffCompleteProfile component
        navigate("/staff/complete-profile", { replace: true });
        return;
      } else if (userRole === "admin") {
        const { data: adminData } = await supabase
          .from("admin_profiles")
          .select("*")
          .eq("user_profile_id", userProfileData.id)
          .single();

        setProfileData({
          ...baseProfileData,
          ...adminData,
        });
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
      setError(error.message || "Error loading profile data");
    }
  };

  const navigateToCorrectDashboard = () => {
    switch (userRole) {
      case "patient":
        navigate("/patient/dashboard", { replace: true });
        break;
      case "staff":
        navigate("/staff/dashboard", { replace: true });
        break;
      case "admin":
        navigate("/admin/dashboard", { replace: true });
        break;
      default:
        navigate("/dashboard", { replace: true });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleArrayInput = (name, value) => {
    const array = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    setProfileData((prev) => ({
      ...prev,
      [name]: array,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: currentUserId } = await supabase.rpc("get_current_user_id");
      if (!currentUserId) throw new Error("User not found");

      // Update user_profiles table
      const { error: profileUpdateError } = await supabase
        .from("user_profiles")
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          date_of_birth: profileData.date_of_birth || null,
          gender: profileData.gender || null,
        })
        .eq("user_id", currentUserId);

      if (profileUpdateError)
        throw new Error(profileUpdateError.message || "Profile update failed");

      // Update role-specific profile
      if (userRole === "patient") {
        // Get user profile ID
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", currentUserId)
          .single();

        const { error: patientUpdateError } = await supabase
          .from("patient_profiles")
          .update({
            emergency_contact_name: profileData.emergency_contact_name || null,
            emergency_contact_phone:
              profileData.emergency_contact_phone || null,
            insurance_provider: profileData.insurance_provider || null,
            medical_conditions: profileData.medical_conditions || [],
            allergies: profileData.allergies || [],
            email_notifications: profileData.email_notifications ?? true,
            sms_notifications: profileData.sms_notifications ?? false,
          })
          .eq("user_profile_id", userProfile.id);

        if (patientUpdateError)
          throw new Error(
            patientUpdateError.message || "Patient profile update failed"
          );
      }

      // Re-check profile completeness
      await checkUserProfile(user);

      // Navigate to dashboard
      navigateToCorrectDashboard();
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(error.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
        <div className="bg-[#F1FAEE] rounded-2xl shadow-xl p-8 w-full max-w-md text-center border border-blue-100">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">
              Loading Profile...
            </h2>
            <p className="text-gray-600">
              Please wait while we prepare your profile setup...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !userRole) {
    return null;
  }

  const getRoleInfo = () => {
    switch (userRole) {
      case "patient":
        return {
          title: "Patient Profile Setup",
          subtitle:
            "Complete your patient information to start booking appointments",
          icon: (
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          ),
          gradient: "from-blue-600 to-cyan-600",
        };
      case "staff":
        return {
          title: "Staff Profile Setup",
          subtitle:
            "Complete your staff information to access clinic management",
          icon: (
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h2a2 2 0 002-2V6m-8 0V6a2 2 0 012-2h4a2 2 0 012 2v0"
              ></path>
            </svg>
          ),
          gradient: "from-emerald-600 to-teal-600",
        };
      case "admin":
        return {
          title: "Administrator Profile Setup",
          subtitle:
            "Complete your admin information to access full system control",
          icon: (
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              ></path>
            </svg>
          ),
          gradient: "from-purple-600 to-indigo-600",
        };
      default:
        return {
          title: "Complete Profile Setup",
          subtitle: "Complete your profile information",
          icon: (
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          ),
          gradient: "from-blue-600 to-cyan-600",
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#F1FAEE] rounded-2xl shadow-2xl overflow-hidden border border-blue-100">
          {/* Header */}
          <div
            className={`bg-gradient-to-r ${roleInfo.gradient} px-8 py-8 text-center`}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-6">
              {roleInfo.icon}
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              {roleInfo.title}
            </h1>
            <p className="text-lg text-white text-opacity-90 leading-relaxed max-w-2xl mx-auto">
              {roleInfo.subtitle}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Verification Status */}
            <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-[#1A202C] mb-6 flex items-center">
                <svg
                  className="w-6 h-6 text-blue-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Verification Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`flex items-center p-4 rounded-lg border-2 ${
                    isVerifiedEmail
                      ? "bg-green-50 border-green-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      isVerifiedEmail ? "bg-green-100" : "bg-amber-100"
                    }`}
                  >
                    {isVerifiedEmail ? (
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A202C]">
                      Email Verification
                    </p>
                    <p
                      className={`text-sm ${
                        isVerifiedEmail ? "text-green-600" : "text-amber-600"
                      }`}
                    >
                      {isVerifiedEmail ? "Verified" : "Pending"}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-center p-4 rounded-lg border-2 ${
                    isVerifiedPhone
                      ? "bg-green-50 border-green-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      isVerifiedPhone ? "bg-green-100" : "bg-amber-100"
                    }`}
                  >
                    {isVerifiedPhone ? (
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A202C]">
                      Phone Verification
                    </p>
                    <p
                      className={`text-sm ${
                        isVerifiedPhone ? "text-green-600" : "text-amber-600"
                      }`}
                    >
                      {isVerifiedPhone ? "Verified" : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Missing Fields Alert */}
            {missingFields.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.186-.833-2.96 0L3.854 16.5c-.77.833.192 2.5 1.732 2.5z"
                    ></path>
                  </svg>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">
                      Required Information Missing
                    </h3>
                    <p className="text-red-700 mb-4">
                      Please complete the following required fields to continue:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingFields.map((field) => (
                        <span
                          key={field}
                          className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full"
                        >
                          {field
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information Section */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-[#1A202C] mb-6 flex items-center">
                  <svg
                    className="w-6 h-6 text-blue-600 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="first_name"
                      className="block text-sm font-medium text-[#1A202C]"
                    >
                      First Name *
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      name="first_name"
                      placeholder="Enter your first name"
                      value={profileData.first_name || ""}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white ${
                        missingFields.includes("first_name")
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="last_name"
                      className="block text-sm font-medium text-[#1A202C]"
                    >
                      Last Name *
                    </label>
                    <input
                      id="last_name"
                      type="text"
                      name="last_name"
                      placeholder="Enter your last name"
                      value={profileData.last_name || ""}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white ${
                        missingFields.includes("last_name")
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="date_of_birth"
                      className="block text-sm font-medium text-[#1A202C]"
                    >
                      Date of Birth
                    </label>
                    <input
                      id="date_of_birth"
                      type="date"
                      name="date_of_birth"
                      value={profileData.date_of_birth || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="gender"
                      className="block text-sm font-medium text-[#1A202C]"
                    >
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={profileData.gender || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Patient-specific sections */}
              {userRole === "patient" && (
                <>
                  {/* Emergency Contact Section */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-xl font-bold text-[#1A202C] mb-6 flex items-center">
                      <svg
                        className="w-6 h-6 text-red-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        ></path>
                      </svg>
                      Emergency Contact
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label
                          htmlFor="emergency_contact_name"
                          className="block text-sm font-medium text-[#1A202C]"
                        >
                          Emergency Contact Name
                        </label>
                        <input
                          id="emergency_contact_name"
                          type="text"
                          name="emergency_contact_name"
                          placeholder="Full name of emergency contact"
                          value={profileData.emergency_contact_name || ""}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="emergency_contact_phone"
                          className="block text-sm font-medium text-[#1A202C]"
                        >
                          Emergency Contact Phone
                        </label>
                        <input
                          id="emergency_contact_phone"
                          type="tel"
                          name="emergency_contact_phone"
                          placeholder="Phone number"
                          value={profileData.emergency_contact_phone || ""}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Information Section */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-xl font-bold text-[#1A202C] mb-6 flex items-center">
                      <svg
                        className="w-6 h-6 text-green-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                      Medical Information
                    </h3>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label
                          htmlFor="insurance_provider"
                          className="block text-sm font-medium text-[#1A202C]"
                        >
                          Insurance Provider
                        </label>
                        <input
                          id="insurance_provider"
                          type="text"
                          name="insurance_provider"
                          placeholder="Your insurance provider name"
                          value={profileData.insurance_provider || ""}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="medical_conditions"
                          className="block text-sm font-medium text-[#1A202C]"
                        >
                          Medical Conditions
                        </label>
                        <textarea
                          id="medical_conditions"
                          name="medical_conditions"
                          placeholder="List any medical conditions, separated by commas (e.g., diabetes, hypertension)"
                          value={(profileData.medical_conditions || []).join(
                            ", "
                          )}
                          onChange={(e) =>
                            handleArrayInput(
                              "medical_conditions",
                              e.target.value
                            )
                          }
                          rows="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="allergies"
                          className="block text-sm font-medium text-[#1A202C]"
                        >
                          Allergies
                        </label>
                        <textarea
                          id="allergies"
                          name="allergies"
                          placeholder="List any allergies, separated by commas (e.g., penicillin, latex, nuts)"
                          value={(profileData.allergies || []).join(", ")}
                          onChange={(e) =>
                            handleArrayInput("allergies", e.target.value)
                          }
                          rows="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notification Preferences Section */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-xl font-bold text-[#1A202C] mb-6 flex items-center">
                      <svg
                        className="w-6 h-6 text-purple-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 17h5l-5 5v-5zM4.828 4.828A9 9 0 019.172 1.172M14.828 14.828A9 9 0 009.172 19.172m0 0L5 15l4-4m6 6l4-4-4-4"
                        ></path>
                      </svg>
                      Notification Preferences
                    </h3>

                    <div className="space-y-4">
                      <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                        <input
                          type="checkbox"
                          name="email_notifications"
                          checked={profileData.email_notifications ?? true}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              email_notifications: e.target.checked,
                            }))
                          }
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-4">
                          <span className="text-[#1A202C] font-medium">
                            Email Notifications
                          </span>
                          <p className="text-sm text-gray-600">
                            Receive appointment reminders and updates via email
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                        <input
                          type="checkbox"
                          name="sms_notifications"
                          checked={profileData.sms_notifications ?? false}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              sms_notifications: e.target.checked,
                            }))
                          }
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-4">
                          <span className="text-[#1A202C] font-medium">
                            SMS Notifications
                          </span>
                          <p className="text-sm text-gray-600">
                            Receive appointment reminders and updates via text
                            message
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
                  <svg
                    className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Profile Update Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-4 bg-gradient-to-r ${roleInfo.gradient} hover:opacity-90 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center shadow-lg`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      Complete Profile
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

export default CompleteProfile;
