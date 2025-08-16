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
      // ✅ SIMPLIFIED: Use auth status to determine redirect
      setTimeout(() => {
        navigate(redirectPath);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {step === "send" ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verify Your Phone
            </h2>
            <p className="text-gray-600 mb-6">
              We'll send a verification code to your phone number.
            </p>
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Enter Verification Code
            </h2>
            <p className="text-gray-600 mb-6">
              Enter the 6-digit code sent to {phone}
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-center text-lg tracking-widest"
            />
            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneVerification;
