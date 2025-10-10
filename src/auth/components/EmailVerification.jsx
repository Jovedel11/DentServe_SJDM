import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useVerification } from "../hooks/useVerification";
import { useNavigate } from "react-router-dom";
import styles from "../styles/EmailVerification.module.scss";

const EmailVerification = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  const { user, userRole, isVerifiedEmail, getVerificationStep, loading } =
    useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      console.log("No user, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    if (isVerifiedEmail) {
      console.log("Email already verified, checking next step");
      try {
        const nextStep = getVerificationStep();
        if (nextStep && typeof nextStep === "string") {
          console.log("Redirecting to next step:", nextStep);
          navigate(`/${nextStep}`, { replace: true });
        } else {
          console.log("All verifications complete, redirecting to dashboard");
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Error getting verification step:", err);
        navigate("/dashboard", { replace: true });
      }
      return;
    }
  }, [user, userRole, isVerifiedEmail, getVerificationStep, loading, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return;

    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const result = await useVerification.resendEmailVerification();

      if (result?.success) {
        setEmailSent(true);
        setCountdown(60);
      } else {
        setVerificationError(result?.error || "Failed to resend email");
      }
    } catch (err) {
      console.error("Error resending email:", err);
      setVerificationError("Failed to resend email");
    } finally {
      setVerificationLoading(false);
    }
  };

  const roleInfo = useMemo(() => {
    const getRoleInfo = () => {
      switch (userRole) {
        case "patient":
          return {
            title: "For Patients",
            iconClass: styles.iconPatient,
            steps: [
              "Phone number will be automatically verified (if provided)",
              "Complete your patient profile",
              "Start booking appointments with our dental clinic",
            ],
          };
        case "staff":
          return {
            title: "For Staff Members",
            iconClass: styles.iconStaff,
            steps: [
              "Verify your phone number for security",
              "Complete your staff profile setup",
              "Access clinic management dashboard",
            ],
          };
        case "admin":
          return {
            title: "For Administrators",
            iconClass: styles.iconAdmin,
            steps: [
              "Phone verification required for enhanced security",
              "Full admin dashboard access after verification",
              "Manage all clinic operations and staff",
            ],
          };
        default:
          return null;
      }
    };
    return getRoleInfo();
  }, [userRole]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingIcon}>
            <svg className={styles.spinner} fill="none" viewBox="0 0 24 24">
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
          </div>
          <h2 className={styles.loadingTitle}>Loading...</h2>
          <p className={styles.loadingText}>
            Please wait while we verify your account status...
          </p>
        </div>
      </div>
    );
  }

  if (!user || isVerifiedEmail) {
    return null;
  }

  const userEmail = user?.email || "";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerBackground} />
          <div className={styles.headerIcon}>
            <svg
              className={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 7.89a1 1 0 001.42 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className={styles.headerTitle}>Verify Your Email</h2>
          <p className={styles.headerSubtitle}>
            We've sent a verification link to secure your account
          </p>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Email Display */}
          <div className={styles.emailDisplay}>
            <div className={styles.emailLabel}>
              <svg
                className={styles.emailIcon}
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
              <span>Verification sent to:</span>
            </div>
            <p className={styles.emailAddress}>{userEmail}</p>
          </div>

          {/* Instructions */}
          <div className={styles.instructions}>
            <h3 className={styles.instructionsTitle}>
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
            </h3>
            <ol className={styles.instructionsList}>
              <li>
                <span className={styles.stepNumber}>1</span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li>
                <span className={styles.stepNumber}>2</span>
                <span>Click the verification link in the email</span>
              </li>
              <li>
                <span className={styles.stepNumber}>3</span>
                <span>
                  You'll be automatically redirected to complete your setup
                </span>
              </li>
            </ol>
          </div>

          {/* Role-specific Information */}
          {roleInfo && (
            <div className={styles.roleInfo}>
              <h4 className={styles.roleTitle}>
                <div className={roleInfo.iconClass} />
                <span>{roleInfo.title}</span>
              </h4>
              <p className={styles.roleSubtitle}>After email verification:</p>
              <ul className={styles.roleSteps}>
                {roleInfo.steps.map((step, index) => (
                  <li key={index}>
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
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Message */}
          {verificationError && (
            <div className={styles.alertError}>
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
                <h3>Verification Error</h3>
                <p>{verificationError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {emailSent && (
            <div className={styles.alertSuccess}>
              <svg
                className={styles.alertIcon}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3>Email Sent!</h3>
                <p>Verification email resent successfully!</p>
              </div>
            </div>
          )}

          {/* Resend Section */}
          <div className={styles.resendSection}>
            <h4 className={styles.resendTitle}>Haven't received the email?</h4>
            {countdown > 0 ? (
              <div className={styles.countdownBox}>
                <svg
                  className={styles.clockIcon}
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
                <p>Resend available in {countdown} seconds</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={verificationLoading}
                className={styles.resendButton}
              >
                {verificationLoading ? (
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
                    Sending...
                  </>
                ) : (
                  <>
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
                    Resend Verification Email
                  </>
                )}
              </button>
            )}
          </div>

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
              Not receiving the email?
            </h4>
            <ul className={styles.helpList}>
              <li>
                <svg
                  className={styles.checkmark}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Check your spam/junk folder
              </li>
              <li>
                <svg
                  className={styles.checkmark}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Make sure{" "}
                <span className={styles.emailHighlight}>{userEmail}</span> is
                correct
              </li>
              <li>
                <svg
                  className={styles.checkmark}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Try resending the verification email
              </li>
              <li>
                <svg
                  className={styles.checkmark}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Contact support if the problem persists
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={styles.backButton}
          >
            <svg
              className={styles.backIcon}
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
          </button>
          <div className={styles.securityNote}>
            <svg
              className={styles.lockIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Your information is secure and encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
