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
import { Loader2, CheckCircle, XCircle } from "lucide-react";

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

      // ✅ FIXED: Single server-side call that creates everything
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

      // ✅ Now sign in with the created credentials
      console.log("Signing in...");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitationData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        // Account created but sign-in failed - user can try logging in manually
        setError("Account created! Please try logging in.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      console.log("✅ Signed in successfully");

      // ✅ Navigate to profile completion
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Validating invitation...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Staff Registration</CardTitle>
          <CardDescription>
            You've been invited to join{" "}
            <strong>
              {invitationData?.metadata?.clinic_name || "our clinic"}
            </strong>{" "}
            as {invitationData?.position}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={invitationData?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter your first name"
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter your last name"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+63 XXX XXX XXXX"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Min. 8 characters"
                required
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter password"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Deadline notice */}
            {invitationData?.expires_at && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Please complete your profile setup within 7 days to activate
                  your account.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSignup;
