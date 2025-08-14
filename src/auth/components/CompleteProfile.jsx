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
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || !userRole) {
    return null;
  }

  return (
    <div className="complete-profile">
      <div className="profile-container">
        <h2>Complete Your Profile</h2>

        {/* ✅ FIX: Show verification status */}
        <div className="verification-status">
          <h4>Verification Status</h4>
          <div className="status-grid">
            <div
              className={`status-item ${
                isVerifiedEmail ? "verified" : "pending"
              }`}
            >
              Email: {isVerifiedEmail ? "✅ Verified" : "⏳ Pending"}
            </div>
            <div
              className={`status-item ${
                isVerifiedPhone ? "verified" : "pending"
              }`}
            >
              Phone: {isVerifiedPhone ? "✅ Verified" : "⏳ Pending"}
            </div>
          </div>
        </div>

        <div className="profile-status">
          <p>Please complete the following required information:</p>
          {missingFields.length > 0 && (
            <ul className="missing-fields-list">
              {missingFields.map((field) => (
                <li key={field} className="missing-field">
                  {field
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-row">
              <input
                type="text"
                name="first_name"
                placeholder="First Name *"
                value={profileData.first_name || ""}
                onChange={handleInputChange}
                required
                className={
                  missingFields.includes("first_name") ? "required-field" : ""
                }
              />

              <input
                type="text"
                name="last_name"
                placeholder="Last Name *"
                value={profileData.last_name || ""}
                onChange={handleInputChange}
                required
                className={
                  missingFields.includes("last_name") ? "required-field" : ""
                }
              />
            </div>

            <div className="form-row">
              <input
                type="date"
                name="date_of_birth"
                value={profileData.date_of_birth || ""}
                onChange={handleInputChange}
              />

              <select
                name="gender"
                value={profileData.gender || ""}
                onChange={handleInputChange}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Role-specific fields */}
          {userRole === "patient" && (
            <>
              <div className="form-section">
                <h3>Emergency Contact</h3>

                <input
                  type="text"
                  name="emergency_contact_name"
                  placeholder="Emergency Contact Name"
                  value={profileData.emergency_contact_name || ""}
                  onChange={handleInputChange}
                />

                <input
                  type="tel"
                  name="emergency_contact_phone"
                  placeholder="Emergency Contact Phone"
                  value={profileData.emergency_contact_phone || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-section">
                <h3>Medical Information</h3>

                <input
                  type="text"
                  name="insurance_provider"
                  placeholder="Insurance Provider"
                  value={profileData.insurance_provider || ""}
                  onChange={handleInputChange}
                />

                <textarea
                  name="medical_conditions"
                  placeholder="Medical Conditions (comma-separated)"
                  value={(profileData.medical_conditions || []).join(", ")}
                  onChange={(e) =>
                    handleArrayInput("medical_conditions", e.target.value)
                  }
                  rows="3"
                />

                <textarea
                  name="allergies"
                  placeholder="Allergies (comma-separated)"
                  value={(profileData.allergies || []).join(", ")}
                  onChange={(e) =>
                    handleArrayInput("allergies", e.target.value)
                  }
                  rows="3"
                />
              </div>

              <div className="form-section">
                <h3>Notification Preferences</h3>

                <label className="checkbox-label">
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
                  />
                  Email Notifications
                </label>

                <label className="checkbox-label">
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
                  />
                  SMS Notifications
                </label>
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Complete Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
