import React, { useState } from "react";
import { Link } from "react-router-dom";
import DentalIllustration from "../../core/components/SvgDental";
import styles from "./SignUp.module.scss";

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ""));
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid:
        minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar,
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate first name
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Validate phone number
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!validatePhone(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = "Password must meet all requirements";
      }
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Form submission logic will be handled by useActionState
      console.log("Form is valid, ready for submission");
    }
  };

  const passwordValidation = validatePassword(formData.password);

  return (
    <div className={styles.signupContainer}>
      <div className={styles.signupWrapper}>
        {/* Left Side - Illustration */}
        <div className={styles.illustrationSection}>
          <div className={styles.illustrationContent}>
            <DentalIllustration />
            <div className={styles.welcomeText}>
              <h1>Join Us Today!</h1>
              <p>
                Create your account and start managing your dental appointments
                with ease.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h2>Create Account</h2>
              <p>Fill in your details to get started</p>
            </div>

            <form
              className={styles.signupForm}
              onSubmit={handleSubmit}
              noValidate
            >
              {/* Name Fields */}
              <div className={styles.nameFields}>
                <div className={styles.inputGroup}>
                  <label htmlFor="firstName" className={styles.inputLabel}>
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                    className={`${styles.inputField} ${
                      errors.firstName ? styles.inputError : ""
                    }`}
                    autoComplete="given-name"
                    aria-describedby={
                      errors.firstName ? "firstName-error" : undefined
                    }
                    aria-invalid={errors.firstName ? "true" : "false"}
                  />
                  {errors.firstName && (
                    <span
                      id="firstName-error"
                      className={styles.errorMessage}
                      role="alert"
                    >
                      {errors.firstName}
                    </span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="lastName" className={styles.inputLabel}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                    className={`${styles.inputField} ${
                      errors.lastName ? styles.inputError : ""
                    }`}
                    autoComplete="family-name"
                    aria-describedby={
                      errors.lastName ? "lastName-error" : undefined
                    }
                    aria-invalid={errors.lastName ? "true" : "false"}
                  />
                  {errors.lastName && (
                    <span
                      id="lastName-error"
                      className={styles.errorMessage}
                      role="alert"
                    >
                      {errors.lastName}
                    </span>
                  )}
                </div>
              </div>

              {/* Email Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.inputLabel}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  className={`${styles.inputField} ${
                    errors.email ? styles.inputError : ""
                  }`}
                  autoComplete="email"
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && (
                  <span
                    id="email-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Phone Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="phoneNumber" className={styles.inputLabel}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className={`${styles.inputField} ${
                    errors.phoneNumber ? styles.inputError : ""
                  }`}
                  autoComplete="tel"
                  aria-describedby={
                    errors.phoneNumber ? "phoneNumber-error" : undefined
                  }
                  aria-invalid={errors.phoneNumber ? "true" : "false"}
                />
                {errors.phoneNumber && (
                  <span
                    id="phoneNumber-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    {errors.phoneNumber}
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
                    placeholder="Create a strong password"
                    className={`${styles.inputField} ${
                      errors.password ? styles.inputError : ""
                    }`}
                    autoComplete="new-password"
                    aria-describedby={
                      errors.password
                        ? "password-error"
                        : "password-requirements"
                    }
                    aria-invalid={errors.password ? "true" : "false"}
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

                {/* Password Requirements */}
                {formData.password && (
                  <div
                    id="password-requirements"
                    className={styles.passwordRequirements}
                  >
                    <div
                      className={`${styles.requirement} ${
                        passwordValidation.minLength ? styles.valid : ""
                      }`}
                    >
                      ✓ At least 8 characters
                    </div>
                    <div
                      className={`${styles.requirement} ${
                        passwordValidation.hasUpperCase ? styles.valid : ""
                      }`}
                    >
                      ✓ One uppercase letter
                    </div>
                    <div
                      className={`${styles.requirement} ${
                        passwordValidation.hasLowerCase ? styles.valid : ""
                      }`}
                    >
                      ✓ One lowercase letter
                    </div>
                    <div
                      className={`${styles.requirement} ${
                        passwordValidation.hasNumbers ? styles.valid : ""
                      }`}
                    >
                      ✓ One number
                    </div>
                    <div
                      className={`${styles.requirement} ${
                        passwordValidation.hasSpecialChar ? styles.valid : ""
                      }`}
                    >
                      ✓ One special character
                    </div>
                  </div>
                )}

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

              {/* Confirm Password Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.inputLabel}>
                  Confirm Password
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className={`${styles.inputField} ${
                      errors.confirmPassword ? styles.inputError : ""
                    }`}
                    autoComplete="new-password"
                    aria-describedby={
                      errors.confirmPassword
                        ? "confirmPassword-error"
                        : undefined
                    }
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span
                    id="confirmPassword-error"
                    className={styles.errorMessage}
                    role="alert"
                  >
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.email ||
                  !formData.phoneNumber ||
                  !formData.password ||
                  !formData.confirmPassword
                }
              >
                Create Account
              </button>

              {/* Sign In Link */}
              <div className={styles.signInPrompt}>
                <span>Already have an account? </span>
                <Link to="/login" className={styles.signInLink}>
                  Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
