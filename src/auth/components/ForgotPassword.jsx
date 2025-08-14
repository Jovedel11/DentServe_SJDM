import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthProvider";
import { useRecaptcha } from "../hooks/useRecaptcha";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { resetPassword, loading, error } = useAuth();
  const { executeRecaptcha, isLoaded } = useRecaptcha();

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoaded) {
      alert("Please wait for security verification to load");
      return;
    }

    if (!email) {
      alert("Please enter your email address");
      return;
    }

    // Execute reCAPTCHA
    const recaptchaToken = await executeRecaptcha("forgot_password");
    if (!recaptchaToken) {
      alert("reCAPTCHA verification failed");
      return;
    }

    const result = await resetPassword(email);

    if (result.success) {
      setEmailSent(true);
      setCountdown(60); // 60 second cooldown
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      handleSubmit({ preventDefault: () => {} });
    }
  };

  return (
    <div className="forgot-password">
      <div className="forgot-container">
        <h2>Forgot Your Password?</h2>

        {!emailSent ? (
          <>
            <p>
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            <form onSubmit={handleSubmit} className="forgot-form">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && <div className="error-message">{error}</div>}

              <button
                type="submit"
                disabled={loading || !isLoaded}
                className="reset-request-button"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="email-sent-confirmation">
            <div className="success-icon">✅</div>
            <h3>Reset Link Sent!</h3>
            <p>We've sent a password reset link to:</p>
            <strong>{email}</strong>

            <div className="next-steps">
              <h4>What to do next:</h4>
              <ol>
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Enter your new password</li>
                <li>Login with your new password</li>
              </ol>
            </div>

            <div className="resend-section">
              {countdown > 0 ? (
                <p className="countdown">
                  Resend available in {countdown} seconds
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="resend-button"
                >
                  Resend Reset Link
                </button>
              )}
            </div>
          </div>
        )}

        <div className="forgot-help">
          <h4>Having trouble?</h4>
          <ul>
            <li>Make sure you entered the correct email address</li>
            <li>Check your spam/junk folder</li>
            <li>The reset link expires in 1 hour</li>
            <li>Contact support if you continue to have issues</li>
          </ul>
        </div>

        <div className="auth-links">
          <a href="/login">← Back to Login</a>
          <a href="/signup">Don't have an account? Sign up</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
