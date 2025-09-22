import { useState, useEffect } from "react";
import { useLogin } from "./hooks/useLogin";
import { validateLoginForm } from "@/utils/validation/auth-validation";
import SvgDental from "@/core/components/SvgDental";
import Loader from "@/core/components/Loader";
import ProtectedForm from "@/core/components/security/ProtectedForm";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Column - SVG Illustration */}
        <div className="hidden lg:flex flex-col items-center justify-center p-8">
          <div className="mb-6">
            <SvgDental className="drop-shadow-lg" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome to DentServe
            </h1>
            <p className="text-gray-600 text-lg">
              Your trusted partner in dental health management
            </p>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-3">
                <SvgDental />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">DentServe</h1>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Sign in to your account
              </h2>
              <p className="text-gray-600">
                Enter your email and password to access your account
              </p>
            </div>

            {/* Protected Form */}
            <ProtectedForm
              onSubmit={handleFormSubmit}
              action="login"
              className="space-y-4"
              showProtection={true}
              protectionSize="normal"
            >
              {/* Email */}
              <div className="space-y-1">
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={credentials.email}
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

              {/* Password */}
              <div className="space-y-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={credentials.password}
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

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </ProtectedForm>

            {/* Footer Links */}
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <a
                  href="/forgot-password"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                >
                  Forgot your password?
                </a>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Don't have an account?
                  </span>
                </div>
              </div>

              <div className="text-center">
                <a
                  href="/signup"
                  className="w-full inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
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
