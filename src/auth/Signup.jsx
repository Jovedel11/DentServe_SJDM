import { useState } from "react";
import { useAuth } from "./context/AuthProvider";
import { useRecaptcha } from "@/auth/hooks/useRecaptcha";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    insurance_provider: "",
    medical_conditions: [],
    allergies: [],
  });
  const [success, setSuccess] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const { signUpUser, loading, error } = useAuth();
  const { executeRecaptcha, isLoaded } = useRecaptcha();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleArrayInput = (name, value) => {
    const array = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    setFormData((prev) => ({
      ...prev,
      [name]: array,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoaded) {
      alert("Please wait for security verification to load");
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha("patient_signup");
      if (!recaptchaToken) {
        alert("Security verification failed. Please try again.");
        return;
      }

      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      const result = await signUpUser({ ...formData, recaptchaToken });

      if (result && result.success) {
        setSuccess(true);
        setShowEmailModal(true);
      } else {
        console.error("Signup failed:", result);
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("An error occurred during signup. Please try again.");
    }
  };

  if (showEmailModal) {
    return (
      <div className="signup-success-modal">
        <div className="modal-content">
          <div className="success-icon">📧</div>
          <h2>Check Your Email!</h2>
          <p>We've sent a verification link to:</p>
          <strong>{formData.email}</strong>

          <div className="instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link</li>
              <li>You'll be automatically taken to your dashboard</li>
            </ol>
          </div>

          <div className="email-note">
            <p>
              💡 <strong>Note:</strong> Keep this tab open and check your email
              in another tab. After clicking the verification link, you'll be
              redirected here automatically.
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/login")}
            className="secondary-button"
          >
            Go to Login Instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-signup-form">
      <h2>Create Patient Account</h2>

      <form onSubmit={handleSubmit}>
        {/* Required Fields */}
        <div className="form-section">
          <h3>Required Information</h3>

          <input
            type="email"
            name="email"
            placeholder="Email Address *"
            value={formData.email}
            onChange={handleInputChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password (min 8 characters) *"
            value={formData.password}
            onChange={handleInputChange}
            required
            minLength="8"
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password *"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="first_name"
            placeholder="First Name *"
            value={formData.first_name}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="last_name"
            placeholder="Last Name *"
            value={formData.last_name}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* Optional Personal Information */}
        <div className="form-section">
          <h3>Personal Information (Optional)</h3>

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number (for SMS notifications)"
            value={formData.phone}
            onChange={handleInputChange}
          />

          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleInputChange}
          />

          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        {/* Emergency Contact */}
        <div className="form-section">
          <h3>Emergency Contact (Optional)</h3>

          <input
            type="text"
            name="emergency_contact_name"
            placeholder="Emergency Contact Name"
            value={formData.emergency_contact_name}
            onChange={handleInputChange}
          />

          <input
            type="tel"
            name="emergency_contact_phone"
            placeholder="Emergency Contact Phone"
            value={formData.emergency_contact_phone}
            onChange={handleInputChange}
          />
        </div>

        {/* Medical Information */}
        <div className="form-section">
          <h3>Medical Information (Optional)</h3>

          <input
            type="text"
            name="insurance_provider"
            placeholder="Insurance Provider"
            value={formData.insurance_provider}
            onChange={handleInputChange}
          />

          <textarea
            name="medical_conditions"
            placeholder="Medical Conditions (comma-separated)"
            value={formData.medical_conditions.join(", ")}
            onChange={(e) =>
              handleArrayInput("medical_conditions", e.target.value)
            }
            rows="3"
          />

          <textarea
            name="allergies"
            placeholder="Allergies (comma-separated)"
            value={formData.allergies.join(", ")}
            onChange={(e) => handleArrayInput("allergies", e.target.value)}
            rows="3"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading || !isLoaded}>
          {loading ? "Creating Account..." : "Create Patient Account"}
        </button>
      </form>

      <div className="signup-footer">
        <p>
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
