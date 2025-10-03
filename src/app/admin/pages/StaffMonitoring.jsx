import { useState, useEffect } from "react";
import { authService } from "@/auth/hooks/authService";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Loader2, RefreshCw, Mail, Trash2 } from "lucide-react";

const StaffMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchIncompleteStaff();
  }, []);

  const fetchIncompleteStaff = async () => {
    try {
      setLoading(true);
      const result = await authService.getIncompleteStaffSignups(50, 0);

      if (result.success) {
        setStaffList(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (invitationId, email) => {
    try {
      setActionLoading((prev) => ({ ...prev, [invitationId]: "reminder" }));
      const result = await authService.sendProfileCompletionReminder(
        invitationId
      );

      if (result.success) {
        alert(`Reminder email sent to ${email}`);
      } else {
        alert(`Failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [invitationId]: null }));
    }
  };

  const handleCleanup = async (invitationId, email) => {
    if (!confirm(`Are you sure you want to cleanup ${email}?`)) return;

    try {
      setActionLoading((prev) => ({ ...prev, [invitationId]: "cleanup" }));
      const result = await authService.adminCleanupIncompleteStaff(
        invitationId,
        "Manual cleanup by admin"
      );

      if (result.success) {
        alert(`Cleanup successful for ${email}`);
        fetchIncompleteStaff();
      } else {
        alert(`Failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [invitationId]: null }));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      accepted: "bg-blue-100 text-blue-800 border-blue-300",
      expired: "bg-red-100 text-red-800 border-red-300",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border ${
          styles[status] || "bg-gray-100"
        }`}
      >
        {status}
      </span>
    );
  };

  const getDaysRemaining = (expiresAt) => {
    const days = Math.ceil(
      (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0)
      return <span className="text-red-600 font-semibold">Expired</span>;
    if (days <= 2)
      return <span className="text-orange-600 font-semibold">{days} days</span>;
    return <span>{days} days</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staff Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Track incomplete staff signups and manage invitations
          </p>
        </div>
        <Button onClick={fetchIncompleteStaff} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Incomplete Staff Signups ({staffList.length})</CardTitle>
          <CardDescription>
            Staff who have pending or incomplete profile setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ✅ All staff profiles are complete!
            </div>
          ) : (
            <div className="space-y-4">
              {staffList.map((staff) => (
                <div
                  key={staff.invitation_id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{staff.email}</h3>
                        {getStatusBadge(staff.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Position:</span>
                          <p className="font-medium">{staff.position}</p>
                        </div>

                        <div>
                          <span className="text-gray-500">Invited:</span>
                          <p className="font-medium">
                            {new Date(staff.invited_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-500">Expires:</span>
                          <p className="font-medium">
                            {getDaysRemaining(staff.expires_at)}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-500">Clinic:</span>
                          <p className="font-medium">
                            {staff.clinic_name || "Not created yet"}
                          </p>
                        </div>
                      </div>

                      {staff.days_since_acceptance && (
                        <div className="mt-2 text-sm">
                          <span className="text-orange-600">
                            ⚠️ Accepted{" "}
                            {Math.round(staff.days_since_acceptance)} days ago -
                            profile incomplete
                          </span>
                        </div>
                      )}

                      <div className="mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {staff.action_required}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSendReminder(staff.invitation_id, staff.email)
                        }
                        disabled={
                          actionLoading[staff.invitation_id] === "reminder" ||
                          staff.is_expired
                        }
                      >
                        {actionLoading[staff.invitation_id] === "reminder" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-1" />
                            Remind
                          </>
                        )}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleCleanup(staff.invitation_id, staff.email)
                        }
                        disabled={
                          actionLoading[staff.invitation_id] === "cleanup"
                        }
                      >
                        {actionLoading[staff.invitation_id] === "cleanup" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cleanup
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffMonitoring;
