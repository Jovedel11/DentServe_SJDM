import { useState, useActionState, useEffect } from "react";
import { useLogin } from "./hooks/useLogin";
import { useRecaptcha } from "./hooks/useRecaptcha";
import { validateLoginForm } from "@/utils/validation/auth-validation";
import SvgDental from "@/core/components/SvgDental";
import Loader from "@/core/components/Loader";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

const Login = () => {
  const [loginMethod, setLoginMethod] = useState("email-password");
  const [credentials, setCredentials] = useState({
    email: "",
    phone: "",
    password: "",
    otp: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const {
    loginWithEmailPassword,
    loginWithPhonePassword,
    loginWithEmailOTP,
    loginWithPhoneOTP,
    verifyLoginOTP,
    loading,
    error,
  } = useLogin();

  const { isLoaded, executeRecaptchaWithFallback, isVerifying } =
    useRecaptcha();

  // useActionState for form handling
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData) => {
      // Client-side validation
      const validation = validateLoginForm(credentials, loginMethod);
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

      let result;

      switch (loginMethod) {
        case "email-password":
          result = await loginWithEmailPassword(
            credentials.email,
            credentials.password,
            executeRecaptchaWithFallback
          );
          break;
        case "phone-password":
          result = await loginWithPhonePassword(
            credentials.phone,
            credentials.password
          );
          break;
        case "email-otp":
          if (!otpSent) {
            result = await loginWithEmailOTP(credentials.email);
            if (result.success) {
              setOtpSent(true);
              setOtpIdentifier(credentials.email);
              // Start resend timer
              setResendTimer(30);
            }
          } else {
            result = await verifyLoginOTP(
              otpIdentifier,
              credentials.otp,
              "email"
            );
          }
          break;
        case "phone-otp":
          if (!otpSent) {
            result = await loginWithPhoneOTP(credentials.phone);
            if (result.success) {
              setOtpSent(true);
              setOtpIdentifier(credentials.phone);
              // Start resend timer
              setResendTimer(30);
            }
          } else {
            result = await verifyLoginOTP(
              otpIdentifier,
              credentials.otp,
              "sms"
            );
          }
          break;
      }

      if (result?.success) {
        console.log("Login successful - AuthProvider will handle navigation");
      }

      return result;
    },
    null
  );

  // Handle resend OTP timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleMethodChange = (method) => {
    setLoginMethod(method);
    setCredentials({
      email: "",
      phone: "",
      password: "",
      otp: "",
    });
    setOtpSent(false);
    setValidationErrors({});
    setResendTimer(0);
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setResendTimer(30);
    if (loginMethod === "email-otp") {
      await loginWithEmailOTP(credentials.email);
    } else if (loginMethod === "phone-otp") {
      await loginWithPhoneOTP(credentials.phone);
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
              Welcome to DentalCare
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
              <h1 className="text-2xl font-bold text-gray-800">DentalCare</h1>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Sign in to your account
              </h2>
              <p className="text-gray-600">
                Choose your preferred login method
              </p>
            </div>

            {/* Method Selector */}
            <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
              {[
                { key: "email-password", label: "Email" },
                { key: "phone-password", label: "Phone" },
                { key: "email-otp", label: "Email OTP" },
                { key: "phone-otp", label: "SMS OTP" },
              ].map((method) => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => handleMethodChange(method.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    loginMethod === method.key
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            <form action={formAction} className="space-y-4">
              {/* Email + Password */}
              {loginMethod === "email-password" && (
                <>
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
                </>
              )}

              {/* Phone + Password */}
              {loginMethod === "phone-password" && (
                <>
                  <div className="space-y-1">
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      placeholder="Phone number"
                      value={credentials.phone}
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
                </>
              )}

              {/* Email + OTP */}
              {loginMethod === "email-otp" && (
                <>
                  {!otpSent ? (
                    <div className="space-y-1">
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="Email address"
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
                  ) : (
                    <>
                      <div className="space-y-1">
                        <input
                          type="text"
                          name="otp"
                          placeholder="Enter 6-digit OTP"
                          value={credentials.otp}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center text-lg tracking-wider ${
                            validationErrors.otp
                              ? "border-red-500 bg-red-50"
                              : "border-gray-300"
                          }`}
                          required
                          maxLength="6"
                        />
                        {validationErrors.otp && (
                          <p className="text-red-500 text-sm mt-1">
                            {validationErrors.otp}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 text-center">
                          OTP sent to {otpIdentifier}
                        </p>
                      </div>
                      <div className="flex justify-center items-center mt-2">
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={resendTimer > 0}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <RefreshCw size={14} className="mr-1" />
                          {resendTimer > 0
                            ? `Resend in ${resendTimer}s`
                            : "Resend OTP"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Change Email
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Phone + OTP */}
              {loginMethod === "phone-otp" && (
                <>
                  {!otpSent ? (
                    <div className="space-y-1">
                      <input
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        placeholder="Phone number"
                        value={credentials.phone}
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
                  ) : (
                    <>
                      <div className="space-y-1">
                        <input
                          type="text"
                          name="otp"
                          placeholder="Enter 6-digit OTP"
                          value={credentials.otp}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center text-lg tracking-wider ${
                            validationErrors.otp
                              ? "border-red-500 bg-red-50"
                              : "border-gray-300"
                          }`}
                          required
                          maxLength="6"
                        />
                        {validationErrors.otp && (
                          <p className="text-red-500 text-sm mt-1">
                            {validationErrors.otp}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 text-center">
                          OTP sent to {otpIdentifier}
                        </p>
                      </div>
                      <div className="flex justify-center items-center mt-2">
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={resendTimer > 0}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <RefreshCw size={14} className="mr-1" />
                          {resendTimer > 0
                            ? `Resend in ${resendTimer}s`
                            : "Resend OTP"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Change Phone
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Error Message */}
              {(error || state?.error) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm text-center">
                    {error || state?.error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={(loading || !isLoaded || isPending, isVerifying)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-[1.02] disabled:transform-none"
              >
                {loading || isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    {otpSent ? "Verifying..." : "Processing..."}
                  </div>
                ) : isVerifying ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Verifying Security...
                  </div>
                ) : (
                  <>
                    {otpSent
                      ? "Verify OTP"
                      : loginMethod.includes("otp")
                      ? "Send OTP"
                      : "Sign In"}
                  </>
                )}
              </button>
            </form>

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
