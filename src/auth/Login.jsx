import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "../hooks/authService";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import styles from "./styles/StaffSignup.module.scss";

const StaffSignup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invitationData, setInvitationData] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const invitationId = searchParams.get("invitation");
  const token = searchParams.get("token");

  // Validate invitation on mount
  useEffect(() => {
    validateInvitation();
  }, [invitationId, token]);

  const validateInvitation = async () => {
    if (!invitationId || !token) {
      setError("Invalid invitation link. Missing parameters.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc(
        "get_staff_invitation_status",
        {
          p_invitation_id: invitationId,
        }
      );

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw new Error(rpcError.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Failed to validate invitation");
      }

      if (!data.invitation) {
        throw new Error("Invitation not found");
      }

      const invitation = data.invitation;

      // Check invitation status
      if (
        invitation.status === "accepted" ||
        invitation.status === "completed"
      ) {
        setError("This invitation has already been used.");
        setLoading(false);
        return;
      }

      if (
        invitation.status === "expired" ||
        new Date(invitation.expires_at) < new Date()
      ) {
        setError(
          "This invitation has expired. Please contact the administrator."
        );
        setLoading(false);
        return;
      }

      if (invitation.status !== "pending") {
        setError("This invitation is no longer valid.");
        setLoading(false);
        return;
      }

      // Validate token matches
      if (invitation.invitation_token !== token) {
        setError("Invalid invitation token.");
        setLoading(false);
        return;
      }

      setInvitationData(invitation);
      setError("");
    } catch (err) {
      console.error("Invitation validation error:", err);
      setError(err.message || "Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) return "First name is required";
    if (!formData.lastName.trim()) return "Last name is required";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 8)
      return "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword)
      return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      console.log("Creating complete staff account...");
      const result = await authService.completeStaffSignupFromInvitation(
        invitationId,
        invitationData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.phone || null
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log("✅ Account created:", result.data);

      console.log("Signing in...");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitationData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        setError("Account created! Please try logging in.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      console.log("✅ Signed in successfully");

      navigate("/staff/complete-profile", {
        state: {
          clinicId: result.data.clinic_id,
          clinicName: result.data.clinic_name,
          position: result.data.position,
          deadline: result.data.deadline,
          isNewSignup: true,
        },
        replace: true,
      });
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.loadingState}>
              <Loader2 className={styles.spinner} />
              <p className={styles.loadingText}>Validating invitation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.headerWithIcon}>
              <XCircle className={styles.iconError} />
              <h1 className={styles.cardTitle}>Invalid Invitation</h1>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.alertError}>
              <p className={styles.alertText}>{error}</p>
            </div>
            <button
              className={styles.button}
              onClick={() => navigate("/contact")}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.cardTitle}>Complete Your Staff Registration</h1>
          <p className={styles.cardDescription}>
            You've been invited to join{" "}
            <strong>
              {invitationData?.metadata?.clinic_name || "our clinic"}
            </strong>{" "}
            as {invitationData?.position}
          </p>
        </div>
        <div className={styles.cardContent}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Email (readonly) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                value={invitationData?.email || ""}
                disabled
                className={`${styles.input} ${styles.inputDisabled}`}
              />
            </div>

            {/* First Name */}
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.label}>
                First Name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter your first name"
                className={styles.input}
                required
              />
            </div>

            {/* Last Name */}
            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.label}>
                Last Name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter your last name"
                className={styles.input}
                required
              />
            </div>

            {/* Phone */}
            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+63 XXX XXX XXXX"
                className={styles.input}
              />
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Min. 8 characters"
                className={styles.input}
                required
              />
            </div>

            {/* Confirm Password */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter password"
                className={styles.input}
                required
              />
            </div>

            {error && (
              <div className={styles.alertError}>
                <p className={styles.alertText}>{error}</p>
              </div>
            )}

            {/* Deadline notice */}
            {invitationData?.expires_at && (
              <div className={styles.alertInfo}>
                <CheckCircle className={styles.iconInfo} />
                <p className={styles.alertText}>
                  Please complete your profile setup within 7 days to activate
                  your account.
                </p>
              </div>
            )}

            <button
              type="submit"
              className={styles.button}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className={styles.buttonSpinner} />
                  Creating Account...
                </>
              ) : (
                "Create Account & Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffSignup;
