// ResetPassword.jsx - NEW COMPONENT
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "@/auth/hooks/authService";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState("request"); // 'request' or 'reset'
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  // ✅ Check if this is a password reset callback
  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const type = searchParams.get("type");

    if (type === "recovery" && accessToken && refreshToken) {
      // This is a password reset callback
      setStep("reset");
      setMessage("✅ Email verified! Please enter your new password.");
    }
  }, [searchParams]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await authService.resetPassword(email);

      if (result.error) {
        setMessage(`❌ ${result.error}`);
      } else {
        setMessage(
          "📧 Password reset link sent to your email! Please check your inbox."
        );
      }
    } catch (error) {
      setMessage(`❌ Failed to send reset email: ${error.message}`);
    }

    setLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        setMessage("❌ Passwords do not match");
        setLoading(false);
        return;
      }

      const result = await authService.updatePassword(newPassword);

      if (result.error) {
        setMessage(`❌ ${result.error}`);
      } else {
        setMessage("✅ Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (error) {
      setMessage(`❌ Failed to update password: ${error.message}`);
    }

    setLoading(false);
  };

  if (step === "reset") {
    return (
      <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
          🔐 Set New Password
        </h2>

        <form onSubmit={handlePasswordReset}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              New Password *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8+ characters, uppercase, lowercase, number, special character"
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Confirm New Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "500",
            }}
          >
            {loading ? "Updating Password..." : "🔐 Update Password"}
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
            🔐 Password Requirements
          </h4>
          <ul
            style={{
              margin: "0",
              paddingLeft: "20px",
              fontSize: "14px",
              color: "#6c757d",
            }}
          >
            <li>At least 8 characters long</li>
            <li>Contains uppercase and lowercase letters</li>
            <li>Contains at least one number</li>
            <li>Contains at least one special character</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        🔐 Reset Password
      </h2>

      <form onSubmit={handleRequestReset}>
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
          >
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
          <small style={{ color: "#666" }}>
            We'll send you a link to reset your password
          </small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "500",
          }}
        >
          {loading ? "Sending Reset Link..." : "📧 Send Reset Link"}
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

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <a href="/login" style={{ color: "#007bff", textDecoration: "none" }}>
          ← Back to Login
        </a>
      </div>

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
          📋 Instructions
        </h4>
        <ol
          style={{
            margin: "0",
            paddingLeft: "20px",
            fontSize: "14px",
            color: "#6c757d",
          }}
        >
          <li>Enter your registered email address</li>
          <li>Check your email for the reset link</li>
          <li>Click the link to set a new password</li>
          <li>Return to login with your new password</li>
        </ol>
      </div>
    </div>
  );
};

export default ResetPassword;
