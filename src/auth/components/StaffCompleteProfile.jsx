import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export const StaffCompleteProfile = () => {
  const [profileData, setProfileData] = useState({
    employee_id: "",
    position: "",
    department: "",
    hire_date: new Date().toISOString().split("T")[0],
    clinic_id: "",
  });
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user, userRole, checkUserProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || userRole !== "staff") {
      navigate("/login");
      return;
    }

    loadInitialData();
  }, [user, userRole]);

  const loadInitialData = async () => {
    try {
      // Load available clinics (admin can see all, staff invited to specific clinic)
      const { data: clinicsData, error: clinicsError } = await supabase
        .from("clinics")
        .select("id, name, address, city")
        .eq("is_active", true);

      if (clinicsError) throw clinicsError;
      setClinics(clinicsData || []);

      // Load current staff profile if exists
      const { data: staffData } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("user_profile_id", await supabase.rpc("get_current_user_id"))
        .single();

      if (staffData) {
        setProfileData({
          employee_id: staffData.employee_id || "",
          position: staffData.position || "",
          department: staffData.department || "",
          hire_date:
            staffData.hire_date || new Date().toISOString().split("T")[0],
          clinic_id: staffData.clinic_id || "",
        });

        // Load doctors for the clinic
        if (staffData.clinic_id) {
          loadClinicDoctors(staffData.clinic_id);
        }
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("Error loading form data");
    }
  };

  const loadClinicDoctors = async (clinicId) => {
    try {
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select(
          `
          *,
          doctor_clinics!inner(clinic_id, is_active)
        `
        )
        .eq("doctor_clinics.clinic_id", clinicId)
        .eq("doctor_clinics.is_active", true);

      if (doctorsError) throw doctorsError;
      setDoctors(doctorsData || []);
    } catch (error) {
      console.error("Error loading doctors:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Load doctors when clinic is selected
    if (name === "clinic_id" && value) {
      loadClinicDoctors(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!profileData.clinic_id || !profileData.position) {
        throw new Error("Please fill in all required fields");
      }

      // Update staff profile
      const { error: updateError } = await supabase
        .from("staff_profiles")
        .update({
          employee_id: profileData.employee_id,
          position: profileData.position,
          department: profileData.department,
          hire_date: profileData.hire_date,
          clinic_id: profileData.clinic_id,
          is_active: true, // Activate staff after profile completion
        })
        .eq("user_profile_id", await supabase.rpc("get_current_user_id"));

      if (updateError) throw updateError;

      // Re-check profile completeness
      await checkUserProfile(user);

      // Navigate to staff dashboard
      navigate("/staff/dashboard");
    } catch (error) {
      console.error("Error updating staff profile:", error);
      setError("Error updating profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || userRole !== "staff") {
    return null;
  }

  return (
    <div className="staff-complete-profile">
      <div className="profile-container">
        <h2>Complete Your Staff Profile</h2>

        <div className="welcome-message">
          <h3>Welcome to the Team!</h3>
          <p>
            Please complete your staff information to activate your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="staff-profile-form">
          {/* Basic Staff Information */}
          <div className="form-section">
            <h3>Staff Information</h3>

            <div className="form-row">
              <input
                type="text"
                name="employee_id"
                placeholder="Employee ID (optional)"
                value={profileData.employee_id}
                onChange={handleInputChange}
              />

              <input
                type="text"
                name="position"
                placeholder="Position/Job Title *"
                value={profileData.position}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <input
                type="text"
                name="department"
                placeholder="Department (optional)"
                value={profileData.department}
                onChange={handleInputChange}
              />

              <input
                type="date"
                name="hire_date"
                value={profileData.hire_date}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Clinic Assignment */}
          <div className="form-section">
            <h3>Clinic Assignment</h3>

            <select
              name="clinic_id"
              value={profileData.clinic_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Your Clinic *</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name} - {clinic.city}
                </option>
              ))}
            </select>

            {profileData.clinic_id && (
              <div className="clinic-info">
                <h4>Clinic Details</h4>
                {clinics.find((c) => c.id === profileData.clinic_id) && (
                  <div className="clinic-details">
                    <p>
                      <strong>Name:</strong>{" "}
                      {clinics.find((c) => c.id === profileData.clinic_id).name}
                    </p>
                    <p>
                      <strong>Address:</strong>{" "}
                      {
                        clinics.find((c) => c.id === profileData.clinic_id)
                          .address
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctors at Clinic */}
          {doctors.length > 0 && (
            <div className="form-section">
              <h3>Doctors at Your Clinic</h3>
              <div className="doctors-list">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="doctor-item">
                    <div className="doctor-info">
                      <h4>Dr. {doctor.specialization}</h4>
                      <p>License: {doctor.license_number}</p>
                      <p>Experience: {doctor.experience_years} years</p>
                      {doctor.languages_spoken && (
                        <p>Languages: {doctor.languages_spoken.join(", ")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permissions Info */}
          <div className="form-section">
            <h3>Your Staff Permissions</h3>
            <div className="permissions-info">
              <p>As a staff member, you will have access to:</p>
              <ul>
                <li>✅ Manage appointments for your clinic</li>
                <li>✅ View patient information (clinic patients only)</li>
                <li>✅ Manage doctors and schedules</li>
                <li>✅ View clinic analytics and growth metrics</li>
                <li>✅ Respond to feedback</li>
                <li>✅ Receive condition reports from patients</li>
              </ul>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="submit"
              disabled={
                loading || !profileData.clinic_id || !profileData.position
              }
            >
              {loading
                ? "Activating Account..."
                : "Complete Setup & Activate Account"}
            </button>
          </div>
        </form>

        <div className="help-section">
          <h4>Need Help?</h4>
          <ul>
            <li>
              Contact your clinic administrator if you don't see your clinic
              listed
            </li>
            <li>Make sure all required fields are filled out</li>
            <li>Your account will be activated immediately after completion</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
