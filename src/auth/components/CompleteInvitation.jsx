// CompleteInvitation.jsx - NEW COMPONENT
import React, { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";

const CompleteInvitation = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [invitationValid, setInvitationValid] = useState(false);
  const [userType, setUserType] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const { sendPhoneVerification, verifyPhoneSignup } = useAuth();
  const navigate = useNavigate();

  // ✅ Check invitation validity on component mount
  useEffect(() => {
    checkInvitationValidity();
  }, []);

  const checkInvitationValidity = async () => {
    try {
      const token = searchParams.get("token");
      const type = searchParams.get("type");

      if (!token || type !== "invite") {
        setMessage("❌ Invalid or expired invitation link");
        setLoading(false);
        return;
      }

      // Verify the invitation token with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "invite",
      });

      if (error) {
        setMessage("❌ Invalid or expired invitation link");
        setLoading(false);
        return;
      }

      // Get user metadata from the invitation
      const metadata = data.user?.user_metadata || {};
      setUserType(metadata.user_type || "staff");
      setClinicName(metadata.clinic_name || "Healthcare Facility");
      setInvitationValid(true);
      setLoading(false);
    } catch (error) {
      console.error("Invitation validation error:", error);
      setMessage("❌ Error validating invitation");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        setMessage("❌ Passwords do not match");
        setSubmitting(false);
        return;
      }

      // Update user profile with invitation acceptance
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          invitation_completed: true,
        },
      });

      if (updateError) throw updateError;

      // For staff/admin, phone verification is required
      if (userType === "staff" || userType === "admin") {
        setPhoneVerificationStep(true);
        setMessage(
          "✅ Account setup complete! Now verifying your phone number..."
        );

        // Send phone verification
        const phoneResult = await sendPhoneVerification(formData.phone);
        if (phoneResult.error) {
          setMessage(`❌ Phone verification failed: ${phoneResult.error}`);
        } else {
          setMessage("📱 SMS verification code sent to your phone!");
        }
      } else {
        setMessage("✅ Account setup complete! Redirecting...");
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch (error) {
      setMessage(`❌ Setup failed: ${error.message}`);
    }

    setSubmitting(false);
  };

  const handlePhoneVerification = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await verifyPhoneSignup(formData.phone, otpCode);

      if (result.error) {
        setMessage(`❌ Phone verification failed: ${result.error}`);
      } else {
        setMessage("✅ Phone verified! Account setup complete. Redirecting...");
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch (error) {
      setMessage(`❌ Verification failed: ${error.message}`);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h3>🔄 Validating invitation...</h3>
      </div>
    );
  }

  if (!invitationValid) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h3>❌ Invalid Invitation</h3>
        <p>This invitation link is invalid or has expired.</p>
        <a href="/login" style={{ color: "#007bff" }}>
          Return to Login
        </a>
      </div>
    );
  }

  if (phoneVerificationStep) {
    return (
      <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
        <h2>📱 Phone Verification</h2>
        <p>
          Enter the verification code sent to: <strong>{formData.phone}</strong>
        </p>

        <form onSubmit={handlePhoneVerification}>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength="6"
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "18px",
                textAlign: "center",
                letterSpacing: "2px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: submitting ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "16px",
            }}
          >
            {submitting ? "Verifying..." : "✅ Verify Phone"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              border: "1px solid #ccc",
              backgroundColor: message.includes("❌") ? "#ffebee" : "#e8f5e8",
              borderRadius: "4px",
            }}
          >
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2>
          🏥 Complete Your {userType === "admin" ? "Admin" : "Staff"} Account
        </h2>
        <p style={{ color: "#666" }}>
          You've been invited to join <strong>{clinicName}</strong> as{" "}
          {userType === "admin" ? "an administrator" : "a staff member"}.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Phone Number * (Required for {userType} accounts)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="09XXXXXXXX or +639XXXXXXXX"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <small style={{ color: "#666" }}>
            You'll receive an SMS verification code after completing this form
          </small>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="8+ characters, uppercase, lowercase, number, special character"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "30px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Confirm Password *
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            placeholder="Re-enter your password"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: submitting ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: submitting ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "500",
          }}
        >
          {submitting ? "Setting up account..." : "🏥 Complete Account Setup"}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            border: "1px solid #ccc",
            backgroundColor: message.includes("❌") ? "#ffebee" : "#e8f5e8",
            borderRadius: "4px",
            borderColor: message.includes("❌") ? "#f44336" : "#4caf50",
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
          border: "1px solid #e9ecef",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>
          🔐 Security Requirements
        </h4>
        <ul
          style={{
            margin: "0",
            paddingLeft: "20px",
            fontSize: "14px",
            color: "#6c757d",
          }}
        >
          <li>Phone verification is mandatory for {userType} accounts</li>
          <li>Strong password with special characters required</li>
          <li>Your account will be activated after phone verification</li>
        </ul>
      </div>
    </div>
  );
};

export default CompleteInvitation;
