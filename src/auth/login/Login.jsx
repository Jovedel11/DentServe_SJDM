import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DentalIllustration from "../../core/components/SvgDental";
import { useAuth } from "../context/AuthProvider";
import styles from "./Login.module.scss";

const Login = () => {
  // Form state management
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loginType, setLoginType] = useState("email");
  const [showPassword, setShowPassword] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    loading: false,
    message: null,
    success: false,
  });

  // Validation functions
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) =>
    /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s+/g, ""));

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear errors when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Handle login type change
  const handleLoginTypeChange = (type) => {
    setLoginType(type);
    setFormData((prev) => ({ ...prev, emailOrPhone: "" }));
    setErrors((prev) => ({ ...prev, emailOrPhone: null }));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    const { emailOrPhone, password } = formData;

    if (!emailOrPhone.trim()) {
      newErrors.emailOrPhone = `${
        loginType === "email" ? "Email" : "Phone number"
      } is required`;
    } else if (loginType === "email" && !validateEmail(emailOrPhone)) {
      newErrors.emailOrPhone = "Please enter a valid email address";
    } else if (loginType === "phone" && !validatePhone(emailOrPhone)) {
      newErrors.emailOrPhone = "Please enter a valid phone number";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
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
            {submitStatus.message && (
              <div
                className={`${styles.statusMessage} ${
                  submitStatus.success ? styles.success : styles.error
                }`}
                role="alert"
              >
                {submitStatus.message}
              </div>
            )}

            <form
              className={styles.loginForm}
              onSubmit={handleSubmit}
              noValidate
              aria-label="Sign in form"
            >
              {/* Login Type Toggle */}
              <div className={styles.loginTypeToggle}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${
                    loginType === "email" ? styles.active : ""
                  }`}
                  onClick={() => handleLoginTypeChange("email")}
                  aria-pressed={loginType === "email"}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${
                    loginType === "phone" ? styles.active : ""
                  }`}
                  onClick={() => handleLoginTypeChange("phone")}
                  aria-pressed={loginType === "phone"}
                >
                  Phone
                </button>
              </div>

              {/* Email/Phone Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="emailOrPhone" className={styles.inputLabel}>
                  {loginType === "email" ? "Email Address" : "Phone Number"}
                </label>
                <input
                  type={loginType === "email" ? "email" : "tel"}
                  id="emailOrPhone"
                  name="emailOrPhone"
                  value={formData.emailOrPhone}
                  onChange={handleInputChange}
                  placeholder={
                    loginType === "email"
                      ? "Enter your email"
                      : "Enter your phone number"
                  }
                  className={`${styles.inputField} ${
                    errors.emailOrPhone ? styles.inputError : ""
                  }`}
                  autoComplete={loginType === "email" ? "email" : "tel"}
                  aria-describedby={
                    errors.emailOrPhone ? "emailOrPhone-error" : undefined
                  }
                  aria-invalid={!!errors.emailOrPhone}
                />
                {errors.emailOrPhone && (
                  <span
                    id="emailOrPhone-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    {errors.emailOrPhone}
                  </span>
                )}
              </div>

              {/* Password Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.inputLabel}>
                  Password
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className={`${styles.inputField} ${
                      errors.password ? styles.inputError : ""
                    }`}
                    autoComplete="current-password"
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {errors.password && (
                  <span
                    id="password-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    {errors.password}
                  </span>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className={styles.forgotPassword}>
                <Link to="/forgot-password" className={styles.forgotLink}>
                  Forgot your password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitStatus.loading}
              >
                {submitStatus.loading ? "Processing..." : "Sign In"}
              </button>

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
