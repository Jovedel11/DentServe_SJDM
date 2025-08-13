import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useVerification } from "../hooks/useVerification";
import { useNavigate } from "react-router-dom";

export const EmailVerification = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, isPatient, isStaff, isAdmin } = useAuth();
  const { resendEmailVerification, loading, error } = useVerification();
  const navigate = useNavigate();

  const userEmail = user?.email ? String(user.email) : "";

  useEffect(() => {
    // check if email is already verified
    if (user?.email_confirmed_at) {
      if (isPatient()) {
        // for patients with phone, check if auto-verified
        if (user.phone_confirmed_at || !user.phone) {
          navigate("/patient/dashboard");
        } else {
          navigate("/verify-phone");
        }
      } else if (isStaff() || isAdmin()) {
        // staff and admin need phone verification after email
        navigate("/verify-phone");
      }
    }
  }, [user, isPatient, isStaff, isAdmin, navigate]);

  useEffect(() => {
    // countdown timer for resend button
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
      setCountdown(60); // 60 second cooldown
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

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
            <li>You'll be automatically redirected to your dashboard</li>
          </ol>
        </div>

        {/* Role-specific information */}
        {isPatient() && (
          <div className="role-specific-info">
            <h4>For Patients:</h4>
            <p>After email verification:</p>
            <ul>
              <li>
                If you provided a phone number, it will be automatically
                verified
              </li>
              <li>
                You'll have full access to book appointments and clinic features
              </li>
            </ul>
          </div>
        )}

        {isStaff() && (
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

        {isAdmin() && (
          <div className="role-specific-info">
            <h4>For Administrators:</h4>
            <p>After email verification:</p>
            <ul>
              <li>Phone verification is required for security</li>
              <li>You'll have full admin dashboard access</li>
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
              disabled={loading}
              className="resend-button"
            >
              {loading ? "Sending..." : "Resend Verification Email"}
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
          <a href="/login" className="back-to-login">
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};
