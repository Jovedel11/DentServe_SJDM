import { useState, useActionState, useEffect } from "react";
import { useAuth } from "./context/AuthProvider";
import { useRecaptcha } from "@/auth/hooks/useRecaptcha";
import { validateSignupForm } from "@/utils/validation/auth-validation";
import SvgDental from "@/core/components/SvgDental.jsx";
import Loader from "@/core/components/Loader";
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Check Your Email!
            </h2>
            <p className="text-gray-600 mb-4">
              We've sent a verification link to:
            </p>
            <p className="font-semibold text-blue-600 mb-6">{formData.email}</p>

            <div className="text-left mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link</li>
                <li>You'll be automatically taken to your dashboard</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">💡 Note:</span> Keep this tab
                open and check your email in another tab. After clicking the
                verification link, you'll be redirected here automatically.
              </p>
            </div>

            <button
              onClick={() => (window.location.href = "/login")}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Go to Login Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Column - SVG Illustration */}
        <div className="hidden lg:flex flex-col items-center justify-center p-8">
          <div className="mb-6">
            <SvgDental className="drop-shadow-lg" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Join DentalCare Today
            </h1>
            <p className="text-gray-600 text-lg">
              Start your journey to better dental health
            </p>
          </div>
        </div>

        {/* Right Column - Signup Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-3">
                <SvgDental />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">DentalCare</h1>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Create your account
              </h2>
              <p className="text-gray-600">
                Join thousands of satisfied patients
              </p>
            </div>

            <form action={formAction} className="space-y-4">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First name"
                    autoComplete="given-name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      validationErrors.first_name
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                    required
                  />
                  {validationErrors.first_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {validationErrors.first_name}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last name"
                    autoComplete="family-name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      validationErrors.last_name
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                    required
                  />
                  {validationErrors.last_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {validationErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.email
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  required
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.phone
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  required
                />
                {validationErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.phone}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="space-y-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password (min 8 characters)"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      validationErrors.password
                        ? "border-red-500 bg-red-50 pr-10"
                        : "border-gray-300 pr-10"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {validationErrors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength === 0
                              ? "bg-red-500"
                              : passwordStrength === 1
                              ? "bg-red-500 w-1/4"
                              : passwordStrength === 2
                              ? "bg-yellow-500 w-1/2"
                              : passwordStrength === 3
                              ? "bg-blue-500 w-3/4"
                              : "bg-green-500"
                          }`}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
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

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        {formData.password.length >= 8 ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <XCircle size={14} className="text-gray-400" />
                        )}
                        <span
                          className={
                            formData.password.length >= 8
                              ? "text-green-600"
                              : "text-gray-500"
                          }
                        >
                          8+ characters
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/[A-Z]/.test(formData.password) ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <XCircle size={14} className="text-gray-400" />
                        )}
                        <span
                          className={
                            /[A-Z]/.test(formData.password)
                              ? "text-green-600"
                              : "text-gray-500"
                          }
                        >
                          Uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/[0-9]/.test(formData.password) ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <XCircle size={14} className="text-gray-400" />
                        )}
                        <span
                          className={
                            /[0-9]/.test(formData.password)
                              ? "text-green-600"
                              : "text-gray-500"
                          }
                        >
                          Number
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/[^A-Za-z0-9]/.test(formData.password) ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <XCircle size={14} className="text-gray-400" />
                        )}
                        <span
                          className={
                            /[^A-Za-z0-9]/.test(formData.password)
                              ? "text-green-600"
                              : "text-gray-500"
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
              <div className="space-y-1 relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.confirmPassword
                      ? "border-red-500 bg-red-50 pr-10"
                      : "border-gray-300 pr-10"
                  }`}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
                {validationErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {(error || state?.error) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle
                    size={18}
                    className="text-red-600 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-red-600 text-sm">
                    {error || state?.error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isLoaded}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Creating Account...
                  </div>
                ) : isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Signing up...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Terms and Privacy Notice */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to our{" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Already have an account?
                  </span>
                </div>
              </div>

              <div className="text-center mt-4">
                <a
                  href="/login"
                  className="w-full inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
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
