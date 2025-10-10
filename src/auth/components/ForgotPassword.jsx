import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthProvider";
import { useRecaptcha } from "../hooks/useRecaptcha";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/ForgotPassword.module.scss";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { resetPassword, loading, error } = useAuth();
  const { executeRecaptcha, isLoaded } = useRecaptcha();

  useEffect(() => {
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

    const recaptchaToken = await executeRecaptcha("forgot_password");
    if (!recaptchaToken) {
      alert("reCAPTCHA verification failed");
      return;
    }

    const result = await resetPassword(email);

    if (result.success) {
      setEmailSent(true);
      setCountdown(60);
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      handleSubmit({ preventDefault: () => {} });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.card}
      >
        <AnimatePresence mode="wait">
          {!emailSent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                <h2 className={styles.headerTitle}>Forgot Password?</h2>
                <p className={styles.headerSubtitle}>
                  No worries! We'll help you reset it securely
                </p>
              </div>

              {/* Form */}
              <div className={styles.formContent}>
                <div className={styles.formDescription}>
                  <p>
                    Enter your email address and we'll send you a secure link to
                    reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                      Email Address
                    </label>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputIconLeft}>
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
                            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                          />
                        </svg>
                      </div>
                      <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={styles.input}
                      />
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

                  {/* Security Notice */}
                  {!isLoaded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={styles.alertWarning}
                    >
                      <svg
                        className={styles.alertIconSpinner}
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
                      <div>
                        <h3 className={styles.alertTitle}>Loading Security</h3>
                        <p className={styles.alertMessage}>
                          Please wait while we load security features...
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
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
                        Sending Reset Link...
                      </>
                    ) : (
                      <>
                        Send Reset Link
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
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={styles.successContent}
            >
              {/* Success Header */}
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </motion.div>
              <h3 className={styles.successTitle}>Check Your Email!</h3>
              <p className={styles.successMessage}>
                If an account exists with this email, a password reset link has
                been sent to:
              </p>
              <div className={styles.emailDisplay}>
                <p>{email}</p>
              </div>

              {/* Instructions */}
              <div className={styles.instructionsBox}>
                <h4 className={styles.instructionsTitle}>
                  <svg
                    className={styles.instructionsIcon}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  What to do next:
                </h4>
                <ol className={styles.instructionsList}>
                  {[
                    "Check your email inbox (and spam folder)",
                    "Click the reset link in the email",
                    "Enter your new password",
                    "Login with your new credentials",
                  ].map((step, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className={styles.instructionItem}
                    >
                      <span className={styles.stepNumber}>{index + 1}</span>
                      <span className={styles.stepText}>{step}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>

              {/* Resend Section */}
              <div className={styles.resendSection}>
                {countdown > 0 ? (
                  <div className={styles.countdownBox}>
                    <div className={styles.countdownContent}>
                      <svg
                        className={styles.countdownIcon}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className={styles.countdownText}>
                        Resend available in {countdown}s
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className={styles.resendButton}
                  >
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Resend Reset Link
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Section */}
        <div className={styles.helpSection}>
          <h4 className={styles.helpTitle}>
            <svg
              className={styles.helpIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Having trouble?
          </h4>
          <ul className={styles.helpList}>
            {[
              "Make sure you entered the correct email address",
              "Check your spam/junk folder",
              "The reset link expires in 1 hour",
              "Contact support if issues persist",
            ].map((tip, index) => (
              <li key={index} className={styles.helpItem}>
                <svg
                  className={styles.helpItemIcon}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation Links */}
        <div className={styles.navSection}>
          <div className={styles.navLinks}>
            <a href="/login" className={styles.navLink}>
              <svg
                className={styles.navIconLeft}
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
            <a href="/signup" className={styles.navLink}>
              Don't have an account? Sign up
              <svg
                className={styles.navIconRight}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
