import { useState, useEffect } from "react";
import { useLogin } from "./hooks/useLogin";
import { validateLoginForm } from "@/utils/validation/auth-validation";
import SvgDental from "@/core/components/SvgDental";
import Loader from "@/core/components/Loader";
import ProtectedForm from "@/core/components/security/ProtectedForm";
import { Eye, EyeOff } from "lucide-react";
import styles from "./styles/Login.module.scss";

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const { loginWithEmailPassword, loading, error } = useLogin();

  // Enhanced form submit handler that receives reCAPTCHA info
  const handleFormSubmit = async (e, recaptchaInfo) => {
    console.log("🔐 Form submitted with reCAPTCHA info:", recaptchaInfo);

    // Client-side validation
    const validation = validateLoginForm(credentials, "email-password");
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      throw new Error("Please fill in all required fields correctly");
    }

    setValidationErrors({});

    try {
      const result = await loginWithEmailPassword(
        credentials.email,
        credentials.password,
        () => Promise.resolve(recaptchaInfo)
      );

      if (result?.success) {
        console.log(
          "✅ Login successful - AuthProvider will handle navigation"
        );
      } else if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error("❌ Login error:", error);
      throw error;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  if (isLoading) {
    return <Loader message={"Loading... Please wait."} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Left Column - SVG Illustration */}
        <div className={styles.leftColumn}>
          <div className={styles.svgWrapper}>
            <SvgDental className={styles.svgIcon} />
          </div>
          <div className={styles.welcomeText}>
            <h1 className={styles.welcomeTitle}>Welcome to DentServe</h1>
            <p className={styles.welcomeSubtitle}>
              Your trusted partner in dental health management
            </p>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className={styles.rightColumn}>
          <div className={styles.formCard}>
            {/* Mobile Logo */}
            <div className={styles.mobileLogo}>
              <div className={styles.mobileLogoIcon}>
                <SvgDental />
              </div>
              <h1 className={styles.mobileLogoTitle}>DentServe</h1>
            </div>

            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Sign in to your account</h2>
              <p className={styles.formSubtitle}>
                Enter your email and password to access your account
              </p>
            </div>

            {/* Protected Form */}
            <ProtectedForm
              onSubmit={handleFormSubmit}
              action="login"
              className={styles.form}
              showProtection={true}
              protectionSize="normal"
            >
              {/* Email */}
              <div className={styles.inputGroup}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={credentials.email}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    validationErrors.email ? styles.inputError : ""
                  }`}
                  required
                />
                {validationErrors.email && (
                  <p className={styles.errorText}>{validationErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className={styles.inputGroup}>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={credentials.password}
                    onChange={handleInputChange}
                    className={`${styles.input} ${styles.inputPassword} ${
                      validationErrors.password ? styles.inputError : ""
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

              {/* Error Message */}
              {error && (
                <div className={styles.errorBox}>
                  <p className={styles.errorBoxText}>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <div className={styles.loadingContent}>
                    <div className={styles.spinner}></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </ProtectedForm>

            {/* Footer Links */}
            <div className={styles.footer}>
              <div className={styles.forgotPassword}>
                <a
                  href="/forgot-password"
                  className={styles.forgotPasswordLink}
                >
                  Forgot your password?
                </a>
              </div>

              <div className={styles.divider}>
                <div className={styles.dividerLine}></div>
                <div className={styles.dividerTextWrapper}>
                  <span className={styles.dividerText}>
                    Don't have an account?
                  </span>
                </div>
              </div>

              <div className={styles.signupWrapper}>
                <a href="/signup" className={styles.signupButton}>
                  Create new account
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
