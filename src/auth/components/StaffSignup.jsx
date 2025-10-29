import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "../hooks/authService";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/core/components/ui/card";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Mail,
  Phone,
  User,
  Lock,
  AlertCircle,
  Calendar,
} from "lucide-react";
import styles from "../styles/StaffSignup.module.scss";

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const invitationId = searchParams.get("invitation");
  const token = searchParams.get("token");

  // Validate invitation on mount
  useEffect(() => {
    validateInvitation();
  }, [invitationId, token]);

  // Calculate password strength
  useEffect(() => {
    if (formData.password) {
      let strength = 0;
      if (formData.password.length >= 8) strength++;
      if (formData.password.length >= 12) strength++;
      if (/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password))
        strength++;
      if (/[0-9]/.test(formData.password)) strength++;
      if (/[^A-Za-z0-9]/.test(formData.password)) strength++;
      setPasswordStrength(Math.min(strength, 4));
    } else {
      setPasswordStrength(0);
    }
  }, [formData.password]);

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

  const getPasswordStrengthLabel = () => {
    const labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
    return labels[passwordStrength - 1] || "";
  };

  const getPasswordStrengthClass = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength <= 2) return styles.strengthWeak;
    if (passwordStrength === 3) return styles.strengthGood;
    return styles.strengthStrong;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <CardContent className={styles.cardContent}>
            <div className={styles.loadingState}>
              <Loader2 className={styles.loadingIcon} />
              <p className={styles.loadingText}>Validating invitation...</p>
              <p className={styles.loadingSubtext}>
                Please wait while we verify your invitation link
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <CardHeader className={styles.cardHeader}>
            <div className={styles.errorHeader}>
              <div className={styles.errorIconWrapper}>
                <XCircle className={styles.errorIcon} />
              </div>
              <div>
                <CardTitle className={styles.cardTitle}>
                  Invalid Invitation
                </CardTitle>
                <CardDescription className={styles.cardDescription}>
                  This invitation link is not valid
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className={styles.cardContent}>
            <Alert variant="destructive" className={styles.alert}>
              <AlertCircle className={styles.alertIcon} />
              <AlertDescription className={styles.alertDescription}>
                {error}
              </AlertDescription>
            </Alert>
            <Button
              className={styles.fullWidthButton}
              onClick={() => navigate("/contact")}
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader className={styles.cardHeader}>
          <div className={styles.headerTop}>
            <div className={styles.securityBadge}>
              <Shield className={styles.securityIcon} />
              <span>Secure Registration</span>
            </div>
          </div>
          <CardTitle className={styles.cardTitle}>
            Complete Your Staff Registration
          </CardTitle>
          <CardDescription className={styles.cardDescription}>
            You've been invited to join{" "}
            <strong className={styles.clinicName}>
              {invitationData?.metadata?.clinic_name || "our clinic"}
            </strong>{" "}
            as{" "}
            <span className={styles.position}>{invitationData?.position}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className={styles.cardContent}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Email (readonly) */}
            <div className={styles.formField}>
              <Label htmlFor="email" className={styles.label}>
                Email Address
              </Label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} />
                <Input
                  id="email"
                  type="email"
                  value={invitationData?.email || ""}
                  disabled
                  className={styles.disabledInput}
                />
              </div>
            </div>

            {/* Name Row */}
            <div className={styles.formRow}>
              {/* First Name */}
              <div className={styles.formField}>
                <Label htmlFor="firstName" className={styles.label}>
                  First Name <span className={styles.required}>*</span>
                </Label>
                <div className={styles.inputWrapper}>
                  <User className={styles.inputIcon} />
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className={styles.formField}>
                <Label htmlFor="lastName" className={styles.label}>
                  Last Name <span className={styles.required}>*</span>
                </Label>
                <div className={styles.inputWrapper}>
                  <User className={styles.inputIcon} />
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    required
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className={styles.formField}>
              <Label htmlFor="phone" className={styles.label}>
                Phone Number <span className={styles.optional}>(Optional)</span>
              </Label>
              <div className={styles.inputWrapper}>
                <Phone className={styles.inputIcon} />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 XXX XXX XXXX"
                  className={styles.input}
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.formField}>
              <Label htmlFor="password" className={styles.label}>
                Password <span className={styles.required}>*</span>
              </Label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minimum 8 characters"
                  required
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.togglePassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className={styles.eyeIcon} />
                  ) : (
                    <Eye className={styles.eyeIcon} />
                  )}
                </button>
              </div>
              {formData.password && (
                <div className={styles.passwordStrength}>
                  <div className={styles.strengthBar}>
                    <div
                      className={`${
                        styles.strengthFill
                      } ${getPasswordStrengthClass()}`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    />
                  </div>
                  {passwordStrength > 0 && (
                    <span
                      className={`${
                        styles.strengthLabel
                      } ${getPasswordStrengthClass()}`}
                    >
                      {getPasswordStrengthLabel()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className={styles.formField}>
              <Label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password <span className={styles.required}>*</span>
              </Label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter your password"
                  required
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.togglePassword}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className={styles.eyeIcon} />
                  ) : (
                    <Eye className={styles.eyeIcon} />
                  )}
                </button>
              </div>
              {formData.confirmPassword &&
                formData.password === formData.confirmPassword && (
                  <div className={styles.passwordMatch}>
                    <CheckCircle className={styles.checkIcon} />
                    <span>Passwords match</span>
                  </div>
                )}
            </div>

            {error && (
              <Alert variant="destructive" className={styles.errorAlert}>
                <AlertCircle className={styles.alertIcon} />
                <AlertDescription className={styles.alertDescription}>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Deadline notice */}
            {invitationData?.expires_at && (
              <Alert className={styles.infoAlert}>
                <Calendar className={styles.infoIcon} />
                <AlertDescription className={styles.deadlineText}>
                  Please complete your profile setup within{" "}
                  <strong>7 days</strong> to activate your account.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className={styles.buttonIcon} />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account & Continue
                  <CheckCircle className={styles.buttonIconRight} />
                </>
              )}
            </Button>

            <p className={styles.disclaimer}>
              By creating an account, you agree to our Terms of Service and
              Privacy Policy
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSignup;
