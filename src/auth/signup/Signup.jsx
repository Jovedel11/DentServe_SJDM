// Signup.jsx - COMPLETELY FIXED
import React, { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useRolebasedRedirect } from "@/core/hooks/useRoleBasedRedirect";
import EmailVerificationPrompt from "../components/EmailVerificationPrompt";

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState(false);

  const { signUpUser, user, userProfile } = useAuth();
  const navigate = useNavigate();

  // ✅ FIXED: Proper role-based redirect after signup
  useRolebasedRedirect();

  // ✅ ENHANCED: Listen for email verification and profile creation
  useEffect(() => {
    if (signupCompleted && user && userProfile) {
      console.log("✅ Signup process completed, redirecting based on role");
      // useRolebasedRedirect will handle the navigation
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === "SIGNED_IN" &&
        session?.user?.email_confirmed_at &&
        waitingForVerification
      ) {
        console.log("✅ Email verified, checking profile creation...");

        // Wait a moment for profile creation to complete
        setTimeout(() => {
          setSignupCompleted(true);
          setWaitingForVerification(false);
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [user, userProfile, waitingForVerification, signupCompleted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await signUpUser({
        ...formData,
        userType: "patient", // ✅ Explicitly set user type
      });

      if (result.error) {
        setMessage(`❌ ${result.error}`);
      } else if (result.needsEmailConfirmation) {
        setWaitingForVerification(true);
        setMessage(
          "📧 Please check your email to verify your account. Your phone will be automatically verified when you confirm your email!"
        );
      } else {
        // Immediate login (email already verified)
        setSignupCompleted(true);
      }
    } catch (error) {
      setMessage(`❌ Signup failed: ${error.message}`);
    }

    setLoading(false);
  };

  // ✅ ENHANCED: Better waiting screen
  if (waitingForVerification) {
    return <EmailVerificationPrompt email={formData.email} />;
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h2>🏥 Create Patient Account</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Phone Number * (Philippine format)
          </label>
          <input
            type="tel"
            placeholder="09XXXXXXXX or +639XXXXXXXX"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd" }}
          />
          <small style={{ color: "#666" }}>
            Phone will be automatically verified when you confirm your email
          </small>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Password *
          </label>
          <input
            type="password"
            placeholder="8+ characters, uppercase, lowercase, number, special character"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd" }}
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
          }}
        >
          {loading ? "Creating Account..." : "🏥 Create Patient Account"}
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
            borderColor: message.includes("❌") ? "#f44336" : "#4caf50",
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <a href="/login" style={{ color: "#007bff", textDecoration: "none" }}>
          Already have an account? Login here
        </a>
      </div>

      {/* ✅ ADDED: Information section */}
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
          🏥 For Healthcare Staff
        </h4>
        <p style={{ margin: "0", fontSize: "14px", color: "#6c757d" }}>
          Staff and admin accounts are created by invitation only. Please
          contact your administrator to receive an invitation link.
        </p>
      </div>
    </div>
  );
};

export default Signup;
