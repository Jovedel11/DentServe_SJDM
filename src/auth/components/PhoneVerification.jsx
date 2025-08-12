// PhoneVerification.jsx - COMPLETE VERSION
import React, { useState } from "react";
import { authService } from "@/auth/hooks/authService";

const PhoneVerification = ({ onComplete }) => {
  const [step, setStep] = useState("send"); // 'send' or 'verify'
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await authService.sendPhoneVerification(phone);

    if (result.success) {
      setStep("verify");
      setMessage("Verification code sent to your phone!");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await authService.verifyPhoneSignup(phone, token);

    if (result.success) {
      setMessage("Phone verified successfully!");
      onComplete();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2>📱 Phone Verification Required</h2>
      <p>Please verify your phone number to complete your account setup.</p>

      {step === "send" ? (
        <form onSubmit={handleSendCode}>
          <div style={{ marginBottom: "15px" }}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone Number (09XXXXXXXX or +639XXXXXXXX)"
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Sending..." : "📱 Send Verification Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode}>
          <p>
            Enter the code sent to: <strong>{phone}</strong>
          </p>

          <div style={{ marginBottom: "15px" }}>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter 6-digit verification code"
              required
              maxLength="6"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "18px",
                textAlign: "center",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "10px",
            }}
          >
            {loading ? "Verifying..." : "✅ Verify Code"}
          </button>

          <button
            type="button"
            onClick={() => setStep("send")}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            🔄 Change Phone Number
          </button>
        </form>
      )}

      {error && (
        <div
          style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: "4px",
            color: "#c62828",
          }}
        >
          ❌ {error}
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "#e8f5e8",
            border: "1px solid #4caf50",
            borderRadius: "4px",
            color: "#2e7d32",
          }}
        >
          ✅ {message}
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
        }}
      >
        <h4>📋 Test Phone Number</h4>
        <p>
          <strong>09955507221</strong> or <strong>+639955507221</strong>
        </p>
        <p style={{ fontSize: "12px", color: "#666" }}>
          Use this number for testing SMS verification.
        </p>
      </div>
    </div>
  );
};

export default PhoneVerification;
