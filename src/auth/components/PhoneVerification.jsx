import { useState } from "react";
import { useAuth } from "@/auth/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useRedirectPath } from "../hooks/useRedirectPath";

const PhoneVerification = () => {
  const [step, setStep] = useState("send"); // 'send' | 'verify'
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");

  const { sendPhoneOTP, verifyPhoneOTP, loading, error } = useAuth();
  const redirectPath = useRedirectPath();
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    const result = await sendPhoneOTP();

    if (result.success) {
      setPhone(result.phone);
      setStep("verify");
    }
  };

  const handleVerifyOTP = async () => {
    const result = await verifyPhoneOTP(phone, otp);

    if (result.success) {
      //use auth status to determine redirect
      setTimeout(() => {
        navigate(redirectPath);
      }, 1000);
    }
  };

  const formatOTP = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    return digits.split("").join(" ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="bg-[#F1FAEE] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-blue-100">
        {step === "send" ? (
          <>
            {/* Header - Send OTP */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-3">
                Verify Your Phone
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Secure your account with phone verification
              </p>
            </div>

            {/* Content - Send OTP */}
            <div className="px-8 py-8">
              {/* Info Section */}
              <div className="bg-white rounded-xl p-6 mb-8 border border-blue-200 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-blue-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1A202C] mb-2">
                      Why verify your phone?
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Phone verification adds an extra layer of security to your
                      dental clinic account and helps us send you important
                      appointment reminders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start">
                  <svg
                    className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Verification Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center shadow-lg cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending Verification Code...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      ></path>
                    </svg>
                    Send Verification Code
                  </>
                )}
              </button>

              {/* Help Text */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  A 6-digit code will be sent to your registered phone number
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header - Verify OTP */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-6">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Enter Verification Code
              </h2>
              <p className="text-emerald-100 text-lg leading-relaxed">
                We've sent a 6-digit code to your phone
              </p>
            </div>

            {/* Content - Verify OTP */}
            <div className="px-8 py-8">
              {/* Phone Display */}
              <div className="bg-white rounded-xl p-6 mb-8 border border-emerald-200 shadow-sm text-center">
                <div className="flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5 text-emerald-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    ></path>
                  </svg>
                  <span className="text-sm font-medium text-gray-600">
                    Code sent to:
                  </span>
                </div>
                <p className="font-bold text-[#1A202C] text-lg">{phone}</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start">
                  <svg
                    className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Verification Failed
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* OTP Input */}
              <div className="mb-8">
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-[#1A202C] mb-3 text-center"
                >
                  Enter 6-digit verification code
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    type="text"
                    value={formatOTP(otp)}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="0 0 0 0 0 0"
                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-center text-2xl font-bold tracking-[0.5em] bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-[#1A202C] placeholder-gray-400"
                    maxLength="11"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {otp.length === 6 && (
                      <svg
                        className="w-6 h-6 text-emerald-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {otp.length}/6 digits entered
                </p>
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center shadow-lg cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Verifying Code...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    Verify Code
                  </>
                )}
              </button>

              {/* Resend Section */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Didn't receive the code?
                </p>
                <button
                  onClick={() => setStep("send")}
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors duration-200 underline underline-offset-2"
                >
                  Send a new code
                </button>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-8 py-6 bg-white border-t border-gray-200">
          <div className="flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              ></path>
            </svg>
            <p className="text-xs text-gray-500">
              Your information is secure and encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerification;
