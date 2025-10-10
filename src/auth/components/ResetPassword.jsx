import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/ResetPassword.module.scss";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { updatePassword, loading } = useAuth();
  const navigate = useNavigate();

  const attemptsRef = useRef(0);
  const maxAttempts = 3;

  useEffect(() => {
    checkResetSession();
  }, []);

  const checkResetSession = async () => {
    try {
      attemptsRef.current += 1;
      console.log("🔍 Checking reset session... Attempt:", attemptsRef.current);

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      console.log("📧 Hash params:", {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type,
      });

      if (accessToken && refreshToken && type === "recovery") {
        console.log("🔐 Setting session from URL tokens...");

        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("❌ Session error:", sessionError);
          throw sessionError;
        }

        console.log("✅ Session established from URL tokens");
        setIsResetting(true);

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("📊 Session check:", {
        hasSession: !!session,
        error: sessionError?.message,
      });

      if (sessionError) {
        throw sessionError;
      }

      if (session) {
        console.log("✅ Valid session found");
        setIsResetting(true);
        return;
      }

      if (attemptsRef.current < maxAttempts) {
        console.log(
          `⏳ No session yet, retrying in 1 second... (${attemptsRef.current}/${maxAttempts})`
        );
        setTimeout(() => {
          checkResetSession();
        }, 1000);
        return;
      }

      console.log(
        `❌ No valid session after ${maxAttempts} attempts, redirecting to forgot-password`
      );
      setError("Reset link is invalid or expired. Please request a new one.");

      setTimeout(() => {
        navigate("/forgot-password");
      }, 3000);
    } catch (error) {
      console.error("❌ Error checking reset session:", error);
      setError("Failed to verify reset link. Please request a new one.");

      setTimeout(() => {
        navigate("/forgot-password");
      }, 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("Password must contain uppercase, lowercase, and numbers");
      return;
    }

    const result = await updatePassword(password);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } else {
      setError(result.error);
    }
  };

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "One number",
      met: /\d/.test(password),
    },
  ];

  // Error state
  if (error && !isResetting) {
    return (
      <div className={styles.pageContainer}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.card}
        >
          <div className={styles.errorIconWrapper}>
            <svg
              className={styles.errorIcon}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className={styles.errorTitle}>Invalid Reset Link</h2>
          <p className={styles.errorMessage}>{error}</p>
          <div className={styles.redirectNotice}>
            <p>Redirecting you to request a new reset link...</p>
          </div>
          <button
            onClick={() => navigate("/forgot-password")}
            className={styles.buttonPrimary}
          >
            Go to Forgot Password
          </button>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (!isResetting) {
    return (
      <div className={styles.pageContainer}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.card}
        >
          <div className={styles.loadingIconWrapper}>
            <svg className={styles.loadingIcon} fill="none" viewBox="0 0 24 24">
              <circle
                className={styles.loadingCircle}
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className={styles.loadingPath}
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2 className={styles.loadingTitle}>Verifying Reset Link</h2>
          <p className={styles.loadingMessage}>
            Please wait while we verify your request...
          </p>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className={styles.pageContainer}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.card}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className={styles.successIconWrapper}
          >
            <svg
              className={styles.successIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
          <h2 className={styles.successTitle}>Password Updated!</h2>
          <p className={styles.successMessage}>
            Your password has been updated successfully. You can now login with
            your new credentials.
          </p>
          <div className={styles.redirectNoticeSuccess}>
            <p>Redirecting to login in 3 seconds...</p>
          </div>
          <a href="/login" className={styles.buttonSuccess}>
            Go to Login Now
            <svg
              className={styles.buttonIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        </motion.div>
      </div>
    );
  }

  // Main form
  return (
    <div className={styles.pageContainer}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.formCard}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerPattern} />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className={styles.headerIconWrapper}
          >
            <svg
              className={styles.headerIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </motion.div>
          <h2 className={styles.headerTitle}>Reset Password</h2>
          <p className={styles.headerSubtitle}>
            Create a secure new password for your account
          </p>
        </div>

        {/* Form */}
        <div className={styles.formContent}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* New Password Field */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                New Password
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="8"
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.inputIconButton}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg
                      className={styles.inputIcon}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className={styles.inputIcon}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              <AnimatePresence>
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={styles.requirementsBox}
                  >
                    <p className={styles.requirementsTitle}>
                      Password Requirements:
                    </p>
                    <div className={styles.requirementsList}>
                      {passwordRequirements.map((req, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`${styles.requirementItem} ${
                            req.met ? styles.requirementMet : ""
                          }`}
                        >
                          <div className={styles.requirementIcon}>
                            {req.met ? (
                              <svg
                                className={styles.checkIcon}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <div className={styles.dotIcon} />
                            )}
                          </div>
                          {req.label}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Confirm Password Field */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm New Password
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.inputIconButton}
                  aria-label="Toggle confirm password visibility"
                >
                  {confirmPassword && (
                    <div
                      className={`${styles.matchIndicator} ${
                        password === confirmPassword && confirmPassword
                          ? styles.matchIndicatorSuccess
                          : styles.matchIndicatorError
                      }`}
                    >
                      <svg
                        className={styles.matchIcon}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {password === confirmPassword && confirmPassword ? (
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.alertError}
                >
                  <svg
                    className={styles.alertIcon}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className={styles.alertTitle}>Error</h3>
                    <p className={styles.alertMessage}>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className={styles.submitButton}
            >
              {loading ? (
                <>
                  <svg
                    className={styles.buttonSpinner}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className={styles.spinnerCircle}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className={styles.spinnerPath}
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Updating Password...
                </>
              ) : (
                <>
                  Update Password
                  <svg
                    className={styles.buttonIcon}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className={styles.backLink}>
            <a href="/login" className={styles.link}>
              <svg
                className={styles.linkIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Login
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
