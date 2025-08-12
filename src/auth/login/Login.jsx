// Login.jsx - COMPLETELY FIXED
import React, { useState } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useRolebasedRedirect } from "@/core/hooks/useRoleBasedRedirect";

const Login = () => {
  const [loginMethod, setLoginMethod] = useState("password");
  const [otpSent, setOtpSent] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    otpCode: "",
    rememberMe: false,
  });

  const {
    signInWithPassword,
    verifyOTPLogin,
    sendOTP,
    loading: authLoading,
  } = useAuth();

  // ✅ FIXED: Proper role-based redirect
  useRolebasedRedirect();

  // ✅ FIXED: Password login handler
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await signInWithPassword(
        formData.identifier,
        formData.password,
        formData.rememberMe
      );

      if (result.error) {
        setMessage(`❌ ${result.error}`);
      } else {
        setMessage("✅ Login successful! Redirecting...");
        // useRolebasedRedirect will handle navigation
      }
    } catch (error) {
      setMessage(`❌ Login failed: ${error.message}`);
    }

    setLoading(false);
  };

  // ✅ FIXED: OTP flow handler
  const handleOTPFlow = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!otpSent) {
        // Send OTP
        const result = await sendOTP(formData.identifier, identifierType);

        if (result.error) {
          setMessage(`❌ ${result.error}`);
        } else {
          setOtpSent(true);
          setIdentifier(formData.identifier);
          setMessage(`📱 OTP sent to your ${identifierType}!`);
        }
      } else {
        // Verify OTP
        const result = await verifyOTPLogin(
          identifier,
          formData.otpCode,
          identifierType,
          formData.rememberMe
        );

        if (result.error) {
          setMessage(`❌ ${result.error}`);
        } else if (result.requireEmailVerification) {
          setMessage("📧 Please check your email for the login link!");
        } else {
          setMessage("✅ Login successful! Redirecting...");
          // useRolebasedRedirect will handle navigation
        }
      }
    } catch (error) {
      setMessage(`❌ OTP failed: ${error.message}`);
    }

    setLoading(false);
  };

  const resetOTPFlow = () => {
    setOtpSent(false);
    setIdentifier("");
    setFormData({ ...formData, otpCode: "" });
    setMessage("");
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        🏥 Healthcare Login
      </h2>

      {/* ✅ ENHANCED: Login method selector */}
      <div
        style={{
          marginBottom: "30px",
          display: "flex",
          gap: "10px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "4px",
          backgroundColor: "#f8f9fa",
        }}
      >
        <button
          onClick={() => {
            setLoginMethod("password");
            resetOTPFlow();
          }}
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor:
              loginMethod === "password" ? "#007bff" : "transparent",
            color: loginMethod === "password" ? "white" : "#007bff",
            border: "none",
            cursor: "pointer",
            borderRadius: "4px",
            fontWeight: loginMethod === "password" ? "bold" : "normal",
          }}
        >
          🔑 Password
        </button>
        <button
          onClick={() => {
            setLoginMethod("otp");
            resetOTPFlow();
          }}
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor: loginMethod === "otp" ? "#007bff" : "transparent",
            color: loginMethod === "otp" ? "white" : "#007bff",
            border: "none",
            cursor: "pointer",
            borderRadius: "4px",
            fontWeight: loginMethod === "otp" ? "bold" : "normal",
          }}
        >
          📱 OTP
        </button>
      </div>

      {/* ✅ FIXED: Password Login Form */}
      {loginMethod === "password" ? (
        <form onSubmit={handlePasswordLogin}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Email or Phone Number
            </label>
            <input
              type="text"
              value={formData.identifier}
              onChange={(e) =>
                setFormData({ ...formData, identifier: e.target.value })
              }
              placeholder="Enter your email or phone number"
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
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Enter your password"
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
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) =>
                  setFormData({ ...formData, rememberMe: e.target.checked })
                }
              />
              Remember me for 24 hours
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: loading || authLoading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading || authLoading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "500",
            }}
          >
            {loading || authLoading ? "Signing In..." : "🔐 Sign In"}
          </button>

          <div style={{ textAlign: "center", marginTop: "15px" }}>
            <a
              href="/reset-password"
              style={{ color: "#007bff", textDecoration: "none" }}
            >
              Forgot your password?
            </a>
          </div>
        </form>
      ) : (
        /* ✅ FIXED: OTP Login Form */
        <form onSubmit={handleOTPFlow}>
          {!otpSent ? (
            <>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Verification Method
                </label>
                <select
                  value={identifierType}
                  onChange={(e) => setIdentifierType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "16px",
                  }}
                >
                  <option value="email">📧 Email OTP</option>
                  <option value="phone">📱 SMS OTP</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  {identifierType === "email"
                    ? "Email Address"
                    : "Phone Number"}
                </label>
                <input
                  type="text"
                  value={formData.identifier}
                  onChange={(e) =>
                    setFormData({ ...formData, identifier: e.target.value })
                  }
                  placeholder={
                    identifierType === "email"
                      ? "Enter your email address"
                      : "Enter your phone number"
                  }
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
                disabled={loading || authLoading}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: loading || authLoading ? "#ccc" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading || authLoading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                {loading || authLoading ? "Sending OTP..." : "📱 Send OTP"}
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  marginBottom: "20px",
                  padding: "15px",
                  backgroundColor: "#e8f5e8",
                  borderRadius: "4px",
                  border: "1px solid #4caf50",
                }}
              >
                <p style={{ margin: "0", color: "#2e7d32" }}>
                  <strong>OTP sent to:</strong> {identifier}
                </p>
                <p
                  style={{
                    margin: "5px 0 0 0",
                    fontSize: "14px",
                    color: "#2e7d32",
                  }}
                >
                  Enter the verification code you received
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Verification Code
                </label>
                <input
                  type="text"
                  value={formData.otpCode}
                  onChange={(e) =>
                    setFormData({ ...formData, otpCode: e.target.value })
                  }
                  placeholder="Enter 6-digit code"
                  required
                  maxLength="6"
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

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) =>
                      setFormData({ ...formData, rememberMe: e.target.checked })
                    }
                  />
                  Remember me for 24 hours
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || authLoading}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: loading || authLoading ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading || authLoading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  marginBottom: "10px",
                }}
              >
                {loading || authLoading ? "Verifying..." : "✅ Verify & Login"}
              </button>

              <button
                type="button"
                onClick={resetOTPFlow}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                🔄 Use Different Email/Phone
              </button>
            </>
          )}
        </form>
      )}

      {/* ✅ ENHANCED: Message display */}
      {message && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            border: "1px solid",
            borderRadius: "4px",
            backgroundColor: message.includes("❌") ? "#ffebee" : "#e8f5e8",
            borderColor: message.includes("❌") ? "#f44336" : "#4caf50",
            color: message.includes("❌") ? "#c62828" : "#2e7d32",
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <a href="/signup" style={{ color: "#007bff", textDecoration: "none" }}>
          Don't have an account? Create patient account
        </a>
      </div>

      {/* ✅ ADDED: Test credentials */}
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
          🧪 Test Credentials
        </h4>
        <p style={{ margin: "5px 0", fontSize: "14px", color: "#6c757d" }}>
          <strong>Phone:</strong> +639955507221
        </p>
        <p style={{ margin: "5px 0", fontSize: "12px", color: "#6c757d" }}>
          Use this for testing phone verification and OTP login.
        </p>
      </div>
    </div>
  );
};

export default Login;
