import { useState } from "react";
import RecaptchaProtection from "./RecaptchaProtection";
import { useRecaptchaWithUI } from "@/core/hooks/useRecaptchaWithUI";

const ProtectedForm = ({
  children,
  onSubmit,
  action = "form_submit",
  showProtection = true,
  protectionSize = "normal",
  className = "",
  ...formProps
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isLoaded,
    isVerifying,
    verified,
    error,
    score,
    hasAttempted,
    executeVerification,
    verificationState,
    setVerificationState,
  } = useRecaptchaWithUI(action);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only execute reCAPTCHA when form is actually submitted
    if (!verified) {
      try {
        console.log("🔐 Form submitted - executing reCAPTCHA verification...");
        await executeVerification();
      } catch (error) {
        console.error(
          "❌ reCAPTCHA verification failed on form submit:",
          error
        );
        return; // Stop form submission if reCAPTCHA fails
      }
    }

    // Proceed with form submission only after successful reCAPTCHA
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(e, { score, verified: true });
      } catch (error) {
        console.error("Form submission error:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleVerificationChange = (newState) => {
    setVerificationState((prev) => ({ ...prev, ...newState }));
  };

  return (
    <form onSubmit={handleSubmit} className={className} {...formProps}>
      {children}

      {showProtection && (
        <div className="mt-4">
          <RecaptchaProtection
            isVisible={isLoaded}
            onVerificationChange={handleVerificationChange}
            action={action}
            executeRecaptcha={executeVerification}
            isVerifying={isVerifying}
            verified={verified}
            error={error}
            hasAttempted={hasAttempted}
            size={protectionSize}
          />
        </div>
      )}
    </form>
  );
};

export default ProtectedForm;
