import { useState, useEffect } from "react";
import { useVerification } from "../hooks/useVerification";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";

export const PhoneVerification = () => {
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [phoneInput, setPhoneInput] = useState("");
  const [needsPhoneInput, setNeedsPhoneInput] = useState(false);

  const { sendPhoneOTP, verifyPhoneOTP, loading, error } = useVerification();
  const { user, isPatient, isStaff, isAdmin, checkUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tempPassword = searchParams.get("temp_password");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Check if user already has phone verified
    if (user.phone_confirmed_at) {
      navigateToCorrectDestination();
      return;
    }

    // Check if user has a phone number
    if (!user.phone && isPatient()) {
      setNeedsPhoneInput(true);
    } else if (user.phone && !otpSent) {
      handleSendOTP();
    }
  }, [user, isPatient]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const navigateToCorrectDestination = () => {
    if (isPatient()) {
      navigate("/patient/dashboard");
    } else if (isStaff()) {
      navigate("/staff/complete-profile");
    } else if (isAdmin()) {
      navigate("/admin/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const handleSendOTP = async () => {
    const result = await sendPhoneOTP();

    if (result.success) {
      setOtpSent(true);
      setUserPhone(result.phone);
      setCountdown(60); // 60 second cooldown
      setNeedsPhoneInput(false);

      // For testing - remove in production
      if (result.otp_for_testing) {
        console.log("Testing OTP:", result.otp_for_testing);
      }
    }
  };

  const handleAddPhoneAndSendOTP = async (e) => {
    e.preventDefault();

    if (!phoneInput) {
      alert("Please enter your phone number");
      return;
    }

    // Clean and validate phone
    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      alert("Please enter a valid phone number");
      return;
    }

    // Update user phone in auth
    const { error: updateError } = await supabase.auth.updateUser({
      phone: `+${cleanPhone}`,
    });

    if (updateError) {
      console.error("Error updating phone:", updateError);
      alert("Error updating phone number");
      return;
    }

    // Send OTP
    handleSendOTP();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      alert("Please enter a 6-digit OTP code");
      return;
    }

    const result = await verifyPhoneOTP(userPhone, otpCode);

    if (result.success) {
      // Update user profile status
      await checkUserProfile(user);

      // Navigate to appropriate destination
      navigateToCorrectDestination();
    }
  };

  const handleResendOTP = () => {
    if (countdown === 0) {
      handleSendOTP();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="phone-verification">
      <div className="verification-container">
        <div className="verification-icon">📱</div>

        <h2>Phone Verification Required</h2>

        {/* Show temp password for staff/admin */}
        {tempPassword && (isStaff() || isAdmin()) && (
          <div className="temp-password-notice">
            <h3>Welcome! Your temporary password is:</h3>
            <div className="temp-password-display">
              <strong>{tempPassword}</strong>
            </div>
            <p>
              Please save this password. You can change it after completing
              verification.
            </p>
          </div>
        )}

        {/* Role-specific welcome messages */}
        {isStaff() && (
          <div className="role-welcome">
            <h3>Welcome to the Team!</h3>
            <p>
              Please verify your phone number to activate your staff account.
            </p>
          </div>
        )}

        {isAdmin() && (
          <div className="role-welcome">
            <h3>Admin Account Setup</h3>
            <p>Phone verification is required for admin account security.</p>
          </div>
        )}

        {/* Phone input form (for users without phone) */}
        {needsPhoneInput && !otpSent && (
          <form
            onSubmit={handleAddPhoneAndSendOTP}
            className="phone-input-form"
          >
            <h3>Enter Your Phone Number</h3>
            <p>We need your phone number to send the verification code.</p>

            <input
              type="tel"
              placeholder="Enter phone number (e.g., +1234567890)"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
        )}

        {/* Sending OTP state */}
        {!needsPhoneInput && !otpSent && (
          <div className="sending-otp">
            <p>Sending verification code to your phone...</p>
            <div className="spinner"></div>
          </div>
        )}

        {/* OTP verification form */}
        {otpSent && (
          <div className="verify-otp">
            <div className="phone-display">
              <p>We've sent a 6-digit verification code to:</p>
              <strong>{userPhone}</strong>
            </div>

            <form onSubmit={handleVerifyOTP}>
              <div className="otp-input-container">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength="6"
                  required
                  autoFocus
                  className="otp-input"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" disabled={loading || otpCode.length !== 6}>
                {loading ? "Verifying..." : "Verify Phone Number"}
              </button>
            </form>

            <div className="resend-section">
              {countdown > 0 ? (
                <p className="countdown">Resend code in {countdown} seconds</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="resend-button"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* Next steps information */}
        <div className="next-steps">
          <h4>After phone verification:</h4>
          {isPatient() && (
            <ul>
              <li>Full access to book appointments</li>
              <li>Find nearest clinics</li>
              <li>View your medical history</li>
            </ul>
          )}
          {isStaff() && (
            <ul>
              <li>Complete your staff profile</li>
              <li>Access clinic management dashboard</li>
              <li>Manage appointments and patients</li>
            </ul>
          )}
          {isAdmin() && (
            <ul>
              <li>Access admin dashboard</li>
              <li>Manage system settings</li>
              <li>Review partnership requests</li>
            </ul>
          )}
        </div>

        <div className="help-section">
          <h4>Not receiving the code?</h4>
          <ul>
            <li>Check if your phone can receive SMS</li>
            <li>Make sure the phone number is correct</li>
            <li>Try resending the code</li>
            <li>Contact support if needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
