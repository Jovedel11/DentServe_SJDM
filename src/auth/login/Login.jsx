import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { useRecaptcha } from "../hooks/useRecaptcha";

const Login = () => {
  const [loginMethod, setLoginMethod] = useState("email-password");
  const [credentials, setCredentials] = useState({
    email: "",
    phone: "",
    password: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");

  const {
    loginWithEmailPassword,
    loginWithPhonePassword,
    loginWithEmailOTP,
    loginWithPhoneOTP,
    verifyLoginOTP,
    loading,
    error,
  } = useLogin();

  const { executeRecaptcha, isLoaded } = useRecaptcha();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isLoaded) {
      alert("Please wait for security verification to load");
      return;
    }

    let result;

    switch (loginMethod) {
      case "email-password":
        result = await loginWithEmailPassword(
          credentials.email,
          credentials.password
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
          }
        } else {
          result = await verifyLoginOTP(otpIdentifier, credentials.otp, "sms");
        }
        break;
    }

    if (result?.success && result.user) {
      // Navigation handled by AuthProvider
      console.log("Login successful");
    }
  };

  return (
    <div className="login-form">
      <h2>Login to Your Account</h2>

      {/* Login Method Selector */}
      <div className="method-selector">
        <button
          type="button"
          className={loginMethod === "email-password" ? "active" : ""}
          onClick={() => setLoginMethod("email-password")}
        >
          Email + Password
        </button>
        <button
          type="button"
          className={loginMethod === "phone-password" ? "active" : ""}
          onClick={() => setLoginMethod("phone-password")}
        >
          Phone + Password
        </button>
        <button
          type="button"
          className={loginMethod === "email-otp" ? "active" : ""}
          onClick={() => setLoginMethod("email-otp")}
        >
          Email + OTP
        </button>
        <button
          type="button"
          className={loginMethod === "phone-otp" ? "active" : ""}
          onClick={() => setLoginMethod("phone-otp")}
        >
          Phone + OTP
        </button>
      </div>

      <form onSubmit={handleLogin}>
        {/* Email + Password */}
        {loginMethod === "email-password" && (
          <>
            <input
              type="email"
              placeholder="Email Address"
              value={credentials.email}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              required
            />
          </>
        )}

        {/* Phone + Password */}
        {loginMethod === "phone-password" && (
          <>
            <input
              type="tel"
              placeholder="Phone Number"
              value={credentials.phone}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, phone: e.target.value }))
              }
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              required
            />
          </>
        )}

        {/* Email + OTP */}
        {loginMethod === "email-otp" && (
          <>
            {!otpSent ? (
              <input
                type="email"
                placeholder="Email Address"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            ) : (
              <input
                type="text"
                placeholder="Enter OTP from email"
                value={credentials.otp}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, otp: e.target.value }))
                }
                required
                maxLength="6"
              />
            )}
          </>
        )}

        {/* Phone + OTP */}
        {loginMethod === "phone-otp" && (
          <>
            {!otpSent ? (
              <input
                type="tel"
                placeholder="Phone Number"
                value={credentials.phone}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, phone: e.target.value }))
                }
                required
              />
            ) : (
              <input
                type="text"
                placeholder="Enter OTP from SMS"
                value={credentials.otp}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, otp: e.target.value }))
                }
                required
                maxLength="6"
              />
            )}
          </>
        )}

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading
            ? "Processing..."
            : otpSent
            ? "Verify OTP"
            : loginMethod.includes("otp")
            ? "Send OTP"
            : "Login"}
        </button>
      </form>

      {/* Additional Options */}
      <div className="login-options">
        <a href="/forgot-password">Forgot Password?</a>
        <a href="/signup">Don't have an account? Sign up</a>
      </div>
    </div>
  );
};

export default Login;
