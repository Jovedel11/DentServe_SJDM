import { useState, useActionState, useEffect } from "react";
import { useAuth } from "./context/AuthProvider";
import { useRecaptcha } from "@/auth/hooks/useRecaptcha";
import { validateSignupForm } from "@/utils/validation/auth-validation";
import SvgDental from "@/core/components/SvgDental.jsx";
import Loader from "@/core/components/Loader";
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import styles from "./styles/Signup.module.scss";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { signUpUser, loading, error } = useAuth();
  const { executeRecaptcha, isLoaded } = useRecaptcha();

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  // useActionState for form handling
  const [state, formAction, isPending] = useActionState(
    async (_prevState, formDataAction) => {
      // Client-side validation
      const validation = validateSignupForm(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return { success: false, errors: validation.errors };
      }

      setValidationErrors({});

      if (!isLoaded) {
        return {
          success: false,
          error: "Please wait for security verification to load",
        };
      }

      try {
        const recaptchaToken = await executeRecaptcha("patient_signup");
        if (!recaptchaToken) {
          return {
            success: false,
            error: "Security verification failed. Please try again.",
          };
        }

        const result = await signUpUser({ ...formData, recaptchaToken });

        if (result && result.success) {
          setShowEmailModal(true);
          return { success: true };
        } else {
          return { success: false, error: "Signup failed. Please try again." };
        }
      } catch (error) {
        console.error("Signup error:", error);
        return {
          success: false,
          error: "An error occurred during signup. Please try again.",
        };
      }
    },
    null
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Check password strength
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  if (isLoading) {
    return <Loader message={"Loading... Please wait."} />;
  }

  if (showEmailModal) {
    return (
      <div className={styles.container}>
        <div className={styles.modalWrapper}>
          <div className={styles.modal}>
            <div className={styles.modal__icon}>
              <span>📧</span>
            </div>
            <h2 className={styles.modal__title}>Check Your Email!</h2>
            <p className={styles.modal__subtitle}>
              We've sent a verification link to:
            </p>
            <p className={styles.modal__email}>{formData.email}</p>

            <div className={styles.modal__steps}>
              <h3 className={styles.modal__stepsTitle}>Next Steps:</h3>
              <ol className={styles.modal__stepsList}>
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link</li>
                <li>You'll be automatically taken to your dashboard</li>
              </ol>
            </div>

            <div className={styles.modal__notice}>
              <p className={styles.modal__noticeText}>
                <span className={styles.modal__noticeLabel}>💡 Note:</span> Keep
                this tab open and check your email in another tab. After
                clicking the verification link, you'll be redirected here
                automatically.
              </p>
            </div>

            <button
              onClick={() => (window.location.href = "/login")}
              className={styles.modal__button}
            >
              Go to Login Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Left Column - SVG Illustration */}
        <div className={styles.illustration}>
          <div className={styles.illustration__svg}>
            <SvgDental className={styles.illustration__icon} />
          </div>
          <div className={styles.illustration__text}>
            <h1 className={styles.illustration__title}>
              Join DentalCare Today
            </h1>
            <p className={styles.illustration__subtitle}>
              Start your journey to better dental health
            </p>
          </div>
        </div>

        {/* Right Column - Signup Form */}
        <div className={styles.formWrapper}>
          <div className={styles.card}>
            {/* Mobile Logo */}
            <div className={styles.mobileLogo}>
              <div className={styles.mobileLogo__svg}>
                <SvgDental />
              </div>
              <h1 className={styles.mobileLogo__title}>DentalCare</h1>
            </div>

            <div className={styles.header}>
              <h2 className={styles.header__title}>Create your account</h2>
              <p className={styles.header__subtitle}>
                Join thousands of satisfied patients
              </p>
            </div>

            <form action={formAction} className={styles.form}>
              {/* First Name & Last Name */}
              <div className={styles.nameGrid}>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First name"
                    autoComplete="given-name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      validationErrors.first_name ? styles.input__error : ""
                    }`}
                    required
                  />
                  {validationErrors.first_name && (
                    <p className={styles.errorTextSmall}>
                      {validationErrors.first_name}
                    </p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last name"
                    autoComplete="family-name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      validationErrors.last_name ? styles.input__error : ""
                    }`}
                    required
                  />
                  {validationErrors.last_name && (
                    <p className={styles.errorTextSmall}>
                      {validationErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className={styles.inputGroup}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    validationErrors.email ? styles.input__error : ""
                  }`}
                  required
                />
                {validationErrors.email && (
                  <p className={styles.errorText}>{validationErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className={styles.inputGroup}>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    validationErrors.phone ? styles.input__error : ""
                  }`}
                  required
                />
                {validationErrors.phone && (
                  <p className={styles.errorText}>{validationErrors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div className={styles.passwordSection}>
                <div className={styles.inputGroup}>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password (min 8 characters)"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`${styles.input} ${styles.input__password} ${
                        validationErrors.password ? styles.input__error : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className={styles.errorText}>
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className={styles.strengthIndicator}>
                    <div className={styles.strengthBar}>
                      <div className={styles.strengthBar__track}>
                        <div
                          className={`${styles.strengthBar__fill} ${
                            styles[`strengthBar__fill--${passwordStrength}`]
                          }`}
                        ></div>
                      </div>
                      <span className={styles.strengthBar__label}>
                        {passwordStrength === 0
                          ? "Very weak"
                          : passwordStrength === 1
                          ? "Weak"
                          : passwordStrength === 2
                          ? "Fair"
                          : passwordStrength === 3
                          ? "Good"
                          : "Strong"}
                      </span>
                    </div>

                    <div className={styles.strengthChecks}>
                      <div className={styles.strengthCheck}>
                        {formData.password.length >= 8 ? (
                          <CheckCircle
                            size={14}
                            className={styles.strengthCheck__iconActive}
                          />
                        ) : (
                          <XCircle
                            size={14}
                            className={styles.strengthCheck__iconInactive}
                          />
                        )}
                        <span
                          className={
                            formData.password.length >= 8
                              ? styles.strengthCheck__textActive
                              : styles.strengthCheck__textInactive
                          }
                        >
                          8+ characters
                        </span>
                      </div>
                      <div className={styles.strengthCheck}>
                        {/[A-Z]/.test(formData.password) ? (
                          <CheckCircle
                            size={14}
                            className={styles.strengthCheck__iconActive}
                          />
                        ) : (
                          <XCircle
                            size={14}
                            className={styles.strengthCheck__iconInactive}
                          />
                        )}
                        <span
                          className={
                            /[A-Z]/.test(formData.password)
                              ? styles.strengthCheck__textActive
                              : styles.strengthCheck__textInactive
                          }
                        >
                          Uppercase letter
                        </span>
                      </div>
                      <div className={styles.strengthCheck}>
                        {/[0-9]/.test(formData.password) ? (
                          <CheckCircle
                            size={14}
                            className={styles.strengthCheck__iconActive}
                          />
                        ) : (
                          <XCircle
                            size={14}
                            className={styles.strengthCheck__iconInactive}
                          />
                        )}
                        <span
                          className={
                            /[0-9]/.test(formData.password)
                              ? styles.strengthCheck__textActive
                              : styles.strengthCheck__textInactive
                          }
                        >
                          Number
                        </span>
                      </div>
                      <div className={styles.strengthCheck}>
                        {/[^A-Za-z0-9]/.test(formData.password) ? (
                          <CheckCircle
                            size={14}
                            className={styles.strengthCheck__iconActive}
                          />
                        ) : (
                          <XCircle
                            size={14}
                            className={styles.strengthCheck__iconInactive}
                          />
                        )}
                        <span
                          className={
                            /[^A-Za-z0-9]/.test(formData.password)
                              ? styles.strengthCheck__textActive
                              : styles.strengthCheck__textInactive
                          }
                        >
                          Special character
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className={styles.inputGroup}>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`${styles.input} ${styles.input__password} ${
                      validationErrors.confirmPassword
                        ? styles.input__error
                        : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className={styles.errorText}>
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {(error || state?.error) && (
                <div className={styles.errorBox}>
                  <AlertCircle size={18} className={styles.errorBox__icon} />
                  <p className={styles.errorBox__text}>
                    {error || state?.error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isLoaded}
                className={styles.submitButton}
              >
                {loading ? (
                  <div className={styles.loadingWrapper}>
                    <div className={styles.spinner}></div>
                    Creating Account...
                  </div>
                ) : isPending ? (
                  <div className={styles.loadingWrapper}>
                    <div className={styles.spinner}></div>
                    Signing up...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Terms and Privacy Notice */}
            <div className={styles.terms}>
              <p className={styles.terms__text}>
                By creating an account, you agree to our{" "}
                <a href="/terms" className={styles.terms__link}>
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className={styles.terms__link}>
                  Privacy Policy
                </a>
              </p>
            </div>

            {/* Footer Links */}
            <div className={styles.footer}>
              <div className={styles.divider}>
                <div className={styles.divider__line}></div>
                <div className={styles.divider__text}>
                  <span>Already have an account?</span>
                </div>
              </div>

              <div className={styles.footer__action}>
                <a href="/login" className={styles.loginButton}>
                  Sign in instead
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
