import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useVerification } from "../hooks/useVerification";
import { useNavigate } from "react-router-dom";

const EmailVerification = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, userRole, isVerifiedEmail, getVerificationStep, loading } =
    useAuth();
  const {
    resendEmailVerification,
    loading: verificationLoading,
    error,
  } = useVerification();
  const navigate = useNavigate();

  // ✅ FIX: Redirect logic based on verification status
  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      console.log("No user, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    // ✅ FIX: If email is already verified, check next step
    if (isVerifiedEmail) {
      console.log("Email already verified, checking next step");
      const nextStep = getVerificationStep();
      if (nextStep) {
        console.log("Redirecting to next step:", nextStep);
        navigate(`/${nextStep}`, { replace: true });
      } else {
        // No verification needed, go to dashboard
        console.log("All verifications complete, redirecting to dashboard");
        navigate("/dashboard", { replace: true });
      }
      return;
    }
  }, [user, userRole, isVerifiedEmail, getVerificationStep, loading, navigate]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return;

    const result = await resendEmailVerification();

    if (result.success) {
      setEmailSent(true);
      setCountdown(60);
    }
  };

  // ✅ FIX: Show loading while auth is loading
  if (loading) {
    return (
      <div className="verification-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // ✅ FIX: Don't render if user is already verified or no user
  if (!user || isVerifiedEmail) {
    return null;
  }

  const userEmail = user?.email || "";

  return (
    <div className="email-verification">
      <div className="verification-container">
        <div className="verification-icon">📧</div>

        <h2>Verify Your Email Address</h2>

        <div className="email-info">
          <p>We've sent a verification link to:</p>
          <strong>{userEmail}</strong>
        </div>

        <div className="verification-instructions">
          <h3>What to do next:</h3>
          <ol>
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the verification link in the email</li>
            <li>You'll be automatically redirected to complete your setup</li>
          </ol>
        </div>

        {/* Role-specific information */}
        {userRole === "patient" && (
          <div className="role-specific-info">
            <h4>For Patients:</h4>
            <p>After email verification:</p>
            <ul>
              <li>
                If you provided a phone number, it will be automatically
                verified
              </li>
              <li>You'll be redirected to complete your profile</li>
              <li>Then you'll have access to book appointments</li>
            </ul>
          </div>
        )}

        {userRole === "staff" && (
          <div className="role-specific-info">
            <h4>For Staff Members:</h4>
            <p>After email verification:</p>
            <ul>
              <li>You'll need to verify your phone number</li>
              <li>Complete your staff profile setup</li>
              <li>Your account will be activated for clinic management</li>
            </ul>
          </div>
        )}

        {userRole === "admin" && (
          <div className="role-specific-info">
            <h4>For Administrators:</h4>
            <p>After email verification:</p>
            <ul>
              <li>Phone verification is required for security</li>
              <li>
                You'll have full admin dashboard access after verification
              </li>
            </ul>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {emailSent && (
          <div className="success-message">
            Verification email resent successfully!
          </div>
        )}

        <div className="resend-section">
          {countdown > 0 ? (
            <p className="countdown">Resend available in {countdown} seconds</p>
          ) : (
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={verificationLoading}
              className="resend-button"
            >
              {verificationLoading ? "Sending..." : "Resend Verification Email"}
            </button>
          )}
        </div>

        <div className="help-section">
          <h4>Not receiving the email?</h4>
          <ul>
            <li>Check your spam/junk folder</li>
            <li>Make sure {userEmail} is correct</li>
            <li>Try resending the verification email</li>
            <li>Contact support if the problem persists</li>
          </ul>
        </div>

        <div className="auth-actions">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="back-to-login"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
