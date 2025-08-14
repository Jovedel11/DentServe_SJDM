import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { updatePassword, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session for password reset
    checkResetSession();
  }, []);

  const checkResetSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        // No valid session, redirect to forgot password
        navigate("/forgot-password");
        return;
      }

      setIsResetting(true);
    } catch (error) {
      console.error("Error checking reset session:", error);
      navigate("/forgot-password");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      );
      return;
    }

    const result = await updatePassword(password);

    if (result.success) {
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } else {
      setError(result.error);
    }
  };

  if (!isResetting) {
    return (
      <div className="reset-password-loading">
        <h2>Verifying reset link...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-success">
        <h2>Password Updated Successfully!</h2>
        <p>
          Your password has been updated. You can now login with your new
          password.
        </p>
        <p>Redirecting to login page in 3 seconds...</p>
        <a href="/login" className="login-link">
          Go to Login Now
        </a>
      </div>
    );
  }

  return (
    <div className="reset-password">
      <div className="reset-container">
        <h2>Reset Your Password</h2>
        <p>Please enter your new password below.</p>

        <form onSubmit={handleSubmit} className="reset-form">
          <div className="form-group">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="8"
            />
            <div className="password-requirements">
              <p>Password must contain:</p>
              <ul>
                <li className={password.length >= 8 ? "valid" : ""}>
                  At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? "valid" : ""}>
                  One uppercase letter
                </li>
                <li className={/[a-z]/.test(password) ? "valid" : ""}>
                  One lowercase letter
                </li>
                <li className={/\d/.test(password) ? "valid" : ""}>
                  One number
                </li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="reset-button"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </button>
        </form>

        <div className="reset-help">
          <a href="/login">← Back to Login</a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
