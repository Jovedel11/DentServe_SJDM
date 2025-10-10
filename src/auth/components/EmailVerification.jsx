import { useState, useEffect } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useVerification } from "../hooks/useVerification"; // Import as object
import { useNavigate } from "react-router-dom";

const EmailVerification = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  const { user, userRole, isVerifiedEmail, getVerificationStep, loading } =
    useAuth();
  const navigate = useNavigate();

  // Rest of your useEffect logic stays the same...
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
      // Use the object method
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

  // Rest of your component logic...
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
        <div className="bg-[#F1FAEE] rounded-2xl shadow-xl p-8 w-full max-w-md text-center border border-blue-100">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">
              Loading...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your account status...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || isVerifiedEmail) {
    return null;
  }

  const userEmail = user?.email || "";

  const getRoleInfo = () => {
    switch (userRole) {
      case "patient":
        return {
          title: "For Patients",
          icon: (
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          ),
          steps: [
            "Phone number will be automatically verified (if provided)",
            "Complete your patient profile",
            "Start booking appointments with our dental clinic",
          ],
        };
      case "staff":
        return {
          title: "For Staff Members",
          icon: (
            <svg
              className="w-6 h-6 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h2a2 2 0 002-2V6m-8 0V6a2 2 0 012-2h4a2 2 0 012 2v0"
              ></path>
            </svg>
          ),
          steps: [
            "Verify your phone number for security",
            "Complete your staff profile setup",
            "Access clinic management dashboard",
          ],
        };
      case "admin":
        return {
          title: "For Administrators",
          icon: (
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              ></path>
            </svg>
          ),
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

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-foreground))]/10 to-background flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border/50"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/80 px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg"
          >
            <svg
              className="w-12 h-12 text-white"
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
          </motion.div>
          <h2 className="text-4xl font-bold text-white mb-3 relative">
            Verify Your Email
          </h2>
          <p className="text-primary-foreground/90 text-lg leading-relaxed relative">
            We've sent a verification link to secure your account
          </p>
        </div>

        {/* Content - use similar enhancements as above components */}
        <div className="px-8 py-8">
          {/* Email Display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 mb-8 text-center shadow-sm"
          >
            <div className="flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-primary mr-2"
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
              <span className="text-sm font-semibold text-muted-foreground">
                Verification sent to:
              </span>
            </div>
            <p className="font-bold text-foreground text-xl break-all">
              {userEmail}
            </p>
          </motion.div>

          {/* Instructions */}
          <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-[#1A202C] mb-4 flex items-center text-lg">
              <svg
                className="w-5 h-5 text-blue-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                ></path>
              </svg>
              What to do next:
            </h3>
            <ol className="space-y-3">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-600 rounded-full text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                  1
                </span>
                <span className="text-gray-700">
                  Check your email inbox (and spam folder)
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-600 rounded-full text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                  2
                </span>
                <span className="text-gray-700">
                  Click the verification link in the email
                </span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-600 rounded-full text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                  3
                </span>
                <span className="text-gray-700">
                  You'll be automatically redirected to complete your setup
                </span>
              </li>
            </ol>
          </div>

          {/* Role-specific Information */}
          {roleInfo && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 mb-8 border border-gray-200">
              <h4 className="font-bold text-[#1A202C] mb-4 flex items-center text-lg">
                {roleInfo.icon}
                <span className="ml-2">{roleInfo.title}</span>
              </h4>
              <p className="text-gray-600 mb-4 font-medium">
                After email verification:
              </p>
              <ul className="space-y-3">
                {roleInfo.steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Message */}
          {verificationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Verification Error
                </h3>
                <p className="text-sm text-red-700 mt-1">{verificationError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {emailSent && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  Email Sent!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Verification email resent successfully!
                </p>
              </div>
            </div>
          )}

          {/* Resend Section */}
          <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm text-center">
            <h4 className="font-semibold text-[#1A202C] mb-4">
              Haven't received the email?
            </h4>
            {countdown > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-amber-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <p className="text-amber-800 font-medium">
                    Resend available in {countdown} seconds
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={verificationLoading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {verificationLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      ></path>
                    </svg>
                    Resend Verification Email
                  </>
                )}
              </button>
            )}
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
            <h4 className="font-semibold text-[#1A202C] mb-4 flex items-center">
              <svg
                className="w-5 h-5 text-blue-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              Not receiving the email?
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <svg
                  className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Check your spam/junk folder
              </li>
              <li className="flex items-start">
                <svg
                  className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Make sure{" "}
                <span className="font-medium text-[#1A202C]">{userEmail}</span>{" "}
                is correct
              </li>
              <li className="flex items-start">
                <svg
                  className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Try resending the verification email
              </li>
              <li className="flex items-start">
                <svg
                  className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Contact support if the problem persists
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
            >
              <svg
                className="mr-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
              Back to Login
            </button>
            <div className="flex items-center text-xs text-gray-500">
              <svg
                className="w-4 h-4 text-gray-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                ></path>
              </svg>
              Your information is secure and encrypted
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerification;
