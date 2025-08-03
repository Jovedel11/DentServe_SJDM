import { useActionState, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DentalIllustration from "../../core/components/SvgDental";
import { useAuth } from "../context/AuthProvider";
import styles from "./Login.module.scss";
import {
  passwordLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
} from "../validation/index";
import {
  detectInputType,
  formatPhone,
  formatFormErrors,
} from "../../utils/formatter";

async function loginAction(_prevState, formData) {
  const rawData = {
    identifier: formData.get("identifier")?.trim() || "",
    password: formData.get("password") || "",
    otp: formData.get("otp") || "",
    rememberMe: formData.get("rememberMe") === "on",
    loginType: formData.get("loginType") || "password",
  };

  const schemeMap = {
    password: passwordLoginSchema,
    "otp-request": otpRequestSchema,
    "otp-verify": otpVerifySchema,
  };

  // select the appropriate schema based on login type
  const schema = schemeMap[rawData.loginType];
  if (!schema) {
    return {
      success: false,
      errors: { form: "Invalid login type specified." },
      data: rawData,
    };
  }

  // validate the data
  const validation = schema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      errors: formatFormErrors(validation.error),
      data: rawData,
    };
  }

  return {
    success: true,
    errors: {},
    data: validation.data,
    action: rawData.loginType,
  };
}

const Login = () => {
  const navigate = useNavigate();
  const { loginWithPassword, loginWithOTP } = useAuth();
  const [loginMode, setLoginMode] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ message: "", type: "" });

  const [formState, formAction] = useActionState(loginAction, {
    success: false,
    errors: {},
    data: {},
  });

  // Handle successful form validation
  const handleValidatedSubmit = async (validatedData) => {
    setIsLoading(true);
    setStatusMessage({ message: "", type: "" });

    try {
      const inputType = detectInputType(validatedData.identifier);

      switch (validatedData.action) {
        case "password":
          await loginWithPassword(
            validatedData.identifier,
            validatedData.password,
            validatedData.rememberMe || false
          );
          setStatusMessage({
            message: "Login successful! Redirecting...",
            type: "success",
          });
          setTimeout(() => navigate("/dashboard"), 1000);
          break;

        case "otp-request":
          if (inputType !== "phone") {
            throw new Error("OTP login is only available for phone numbers");
          }

          const phone = formatPhone(validatedData.identifier);
          await loginWithOTP(phone);

          setOtpSent(true);
          setStatusMessage({
            message: "OTP sent successfully! Check your phone.",
            type: "success",
          });
          break;

        case "otp-verify":
          const verifyPhone = formatPhone(validatedData.identifier);
          await loginWithOTP(verifyPhone, validatedData.otp);

          setStatusMessage({
            message: "OTP verified! Redirecting...",
            type: "success",
          });
          setTimeout(() => navigate("/dashboard"), 1000);
          break;

        default:
          throw new Error("Invalid action type");
      }
    } catch (error) {
      console.error("Login error:", error);
      setStatusMessage({
        message:
          error.message || "An unexpected error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = await loginAction(formState, formData);

    if (result.success) {
      await handleValidatedSubmit(result.data);
    }
  };

  // Handle mode switching
  const switchLoginMode = () => {
    setLoginMode(loginMode === "password" ? "otp" : "password");
    setOtpSent(false);
    setStatusMessage({ message: "", type: "" });
  };

  // Clear specific field error when user starts typing
  const clearFieldError = (fieldName) => {
    if (formState.errors[fieldName]) {
      // This will be handled by the next form submission
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginWrapper}>
        {/* Left Side - Illustration */}
        <div className={styles.illustrationSection}>
          <div className={styles.illustrationContent}>
            <DentalIllustration />
            <div className={styles.welcomeText}>
              <h1>Welcome Back!</h1>
              <p>
                Access your dental appointment dashboard and manage your oral
                health journey.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h2>Sign In</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            {/* Status Message */}
            {statusMessage.message && (
              <div
                className={`${styles.statusMessage} ${
                  statusMessage.type === "success"
                    ? styles.success
                    : styles.error
                }`}
                role="alert"
                aria-live="polite"
              >
                {statusMessage.message}
              </div>
            )}

            <form
              className={styles.loginForm}
              action={formAction}
              onSubmit={handleSubmit}
              noValidate
              aria-label="Sign in form"
            >
              {/* Hidden input for login type */}
              <input
                type="hidden"
                name="loginType"
                value={
                  loginMode === "password"
                    ? "password"
                    : otpSent
                    ? "otp-verify"
                    : "otp-request"
                }
              />

              {/* Email/Phone Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="identifier" className={styles.inputLabel}>
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  defaultValue={formState.data?.identifier || ""}
                  onChange={() => clearFieldError("identifier")}
                  placeholder="Enter your email or phone number"
                  className={`${styles.inputField} ${
                    formState.errors.identifier ? styles.inputError : ""
                  }`}
                  autoComplete="email tel"
                  aria-describedby={
                    formState.errors.identifier ? "identifier-error" : undefined
                  }
                  aria-invalid={!!formState.errors.identifier}
                  disabled={isLoading}
                />
                {formState.errors.identifier && (
                  <span
                    id="identifier-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    {formState.errors.identifier}
                  </span>
                )}
              </div>

              {/* Password Input (shown only in password mode) */}
              {loginMode === "password" && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.inputLabel}>
                      Password
                    </label>
                    <div className={styles.passwordWrapper}>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        onChange={() => clearFieldError("password")}
                        placeholder="Enter your password"
                        className={`${styles.inputField} ${
                          formState.errors.password ? styles.inputError : ""
                        }`}
                        autoComplete="current-password"
                        aria-describedby={
                          formState.errors.password
                            ? "password-error"
                            : undefined
                        }
                        aria-invalid={!!formState.errors.password}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        disabled={isLoading}
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                    {formState.errors.password && (
                      <span
                        id="password-error"
                        className={styles.errorMessage}
                        role="alert"
                      >
                        {formState.errors.password}
                      </span>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className={styles.optionsRow}>
                    <label className={styles.rememberMe}>
                      <input
                        type="checkbox"
                        name="rememberMe"
                        disabled={isLoading}
                      />
                      Remember me
                    </label>
                    <Link to="/forgot-password" className={styles.forgotLink}>
                      Forgot password?
                    </Link>
                  </div>
                </>
              )}

              {/* OTP Input (shown only in OTP mode after sending) */}
              {loginMode === "otp" && otpSent && (
                <div className={styles.inputGroup}>
                  <label htmlFor="otp" className={styles.inputLabel}>
                    OTP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    id="otp"
                    name="otp"
                    onChange={() => clearFieldError("otp")}
                    placeholder="Enter 6-digit code"
                    className={`${styles.inputField} ${
                      formState.errors.otp ? styles.inputError : ""
                    }`}
                    autoComplete="one-time-code"
                    aria-describedby={
                      formState.errors.otp ? "otp-error" : undefined
                    }
                    aria-invalid={!!formState.errors.otp}
                    disabled={isLoading}
                    maxLength="6"
                  />
                  {formState.errors.otp && (
                    <span
                      id="otp-error"
                      className={styles.errorMessage}
                      role="alert"
                    >
                      {formState.errors.otp}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Processing..."
                    : loginMode === "password"
                    ? "Sign In"
                    : otpSent
                    ? "Verify OTP"
                    : "Send OTP"}
                </button>

                {/* Alternate Login Method */}
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={switchLoginMode}
                  disabled={isLoading}
                >
                  {loginMode === "password"
                    ? "Login with OTP instead"
                    : "Login with password instead"}
                </button>
              </div>

              {/* Form Errors */}
              {formState.errors.form && (
                <div className={styles.formError} role="alert">
                  {formState.errors.form}
                </div>
              )}

              {/* Sign Up Link */}
              <div className={styles.signUpPrompt}>
                <span>Don't have an account? </span>
                <Link to="/signup" className={styles.signUpLink}>
                  Sign Up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
