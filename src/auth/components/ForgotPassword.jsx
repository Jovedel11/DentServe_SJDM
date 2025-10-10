import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthProvider";
import { useRecaptcha } from "../hooks/useRecaptcha";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-foreground))]/10 to-background flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border/50"
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
              <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/80 px-8 py-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="relative inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg"
                >
                  <svg
                    className="w-10 h-10 text-white"
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
                <h2 className="text-3xl font-bold text-white mb-2 relative">
                  Forgot Password?
                </h2>
                <p className="text-primary-foreground/90 text-base relative">
                  No worries! We'll help you reset it securely
                </p>
              </div>

              {/* Form */}
              <div className="p-8">
                <div className="mb-6">
                  <p className="text-muted-foreground text-center text-sm leading-relaxed">
                    Enter your email address and we'll send you a secure link to
                    reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-foreground"
                    >
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors"
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
                        className="w-full px-4 py-3.5 pl-12 bg-background border-2 border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-primary transition-all duration-200 text-foreground placeholder:text-muted-foreground"
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
                        className="bg-destructive/10 border-2 border-destructive/20 rounded-xl p-4 flex items-start"
                      >
                        <svg
                          className="w-5 h-5 text-destructive mt-0.5 mr-3 flex-shrink-0"
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
                          <h3 className="text-sm font-semibold text-destructive">
                            Error
                          </h3>
                          <p className="text-sm text-destructive/90 mt-1">
                            {error}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Security Notice */}
                  {!isLoaded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-yellow-500/10 border-2 border-yellow-500/20 rounded-xl p-4 flex items-start"
                    >
                      <svg
                        className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3 flex-shrink-0 animate-spin"
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
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <div>
                        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">
                          Loading Security
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-600 mt-1">
                          Please wait while we load security features...
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
                    className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                          />
                          <path
                            className="opacity-75"
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
                          className="ml-2 w-5 h-5"
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
              className="p-8 text-center"
            >
              {/* Success Header */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full mb-6 shadow-lg"
              >
                <svg
                  className="w-12 h-12 text-green-600 dark:text-green-500"
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
              <h3 className="text-3xl font-bold text-foreground mb-3">
                Check Your Email!
              </h3>
              <p className="text-muted-foreground mb-4 text-base">
                We've sent a password reset link to:
              </p>
              <p className="text-muted-foreground mb-4 text-base">
                If an account exists with this email, a password reset link has
                been sent to:
              </p>
              <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 mb-6">
                <p className="font-semibold text-primary break-all text-lg">
                  {email}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 border border-border rounded-xl p-6 mb-6 text-left">
                <h4 className="font-semibold text-foreground mb-4 flex items-center text-lg">
                  <svg
                    className="w-5 h-5 text-primary mr-2"
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
                <ol className="space-y-3">
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
                      className="flex items-start"
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-primary/10 text-primary rounded-full text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground text-sm mt-0.5">
                        {step}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              </div>

              {/* Resend Section */}
              <div className="mb-6">
                {countdown > 0 ? (
                  <div className="bg-yellow-500/10 border-2 border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mr-2"
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
                      <p className="text-yellow-800 dark:text-yellow-500 font-semibold">
                        Resend available in {countdown}s
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="inline-flex items-center px-6 py-3 border-2 border-primary/20 rounded-xl text-primary bg-primary/5 hover:bg-primary/10 transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95"
                  >
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
        <div className="bg-muted/30 px-8 py-6 border-t border-border">
          <h4 className="font-semibold text-foreground mb-3 flex items-center text-sm">
            <svg
              className="w-5 h-5 text-primary mr-2"
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
          <ul className="space-y-2 text-xs text-muted-foreground">
            {[
              "Make sure you entered the correct email address",
              "Check your spam/junk folder",
              "The reset link expires in 1 hour",
              "Contact support if issues persist",
            ].map((tip, index) => (
              <li key={index} className="flex items-start">
                <svg
                  className="w-4 h-4 text-primary/60 mr-2 mt-0.5 flex-shrink-0"
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
        <div className="px-8 py-6 bg-card border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <a
              href="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
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
                />
              </svg>
              Back to Login
            </a>
            <a
              href="/signup"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
            >
              Don't have an account? Sign up
              <svg
                className="ml-2 w-4 h-4"
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
