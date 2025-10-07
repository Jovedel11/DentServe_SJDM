import React, { useCallback } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Activity,
  RefreshCw,
  AlertTriangle,
  Plus,
  Filter,
  Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// UI Components
import Toast from "@/core/components/ui/toast";
import EmptyState from "@/core/components/ui/empty-state";
import Loader from "@/core/components/Loader";

// Specialized Components
import StatsCard from "../components/upcomming/stats-card";
import SearchBar from "../components/upcomming/search-bar";
import FilterSection from "../components/upcomming/filter-section";
import UrgentReminders from "../components/upcomming/urgent-reminders";
import OngoingTreatments from "../components/upcomming/ongoing-treatments";
import AppointmentCard from "../components/upcomming/appointment-card";

import TreatmentAlertBanner from "@/app/shared/components/treatment-alert-banner";

// Modals
import CancelModal from "../components/upcomming/cancel-modal";
import DetailsModal from "../components/upcomming/details-modal";
import TreatmentDetailsModal from "../components/upcomming/treatment-details-modal";

// Logic Hook
import { useAppointmentManagement } from "../hook/useUpcommingAppointment";

const UpcomingAppointments = () => {
  const navigate = useNavigate();

  const {
    // Auth
    user,
    isPatient,

    // Data
    filteredAppointments,
    urgentAppointments,
    ongoingTreatments,
    treatmentsLoading,
    treatmentsError,
    stats,

    // Loading states
    loading: appointmentsLoading,
    error: appointmentsError,

    // Search & Filters
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    bookingTypeFilter,
    setBookingTypeFilter,

    // Modals
    selectedAppointment,
    setSelectedAppointment,
    selectedTreatment,
    setSelectedTreatment,
    cancelModal,
    setCancelModal,

    // Real-time
    isConnected,

    // Toast
    toastMessage,
    closeToast,

    // Actions
    refresh,
    handleCancelAppointment,
    confirmCancelAppointment,
    handleViewDetails,
    handleViewTreatmentPlan,
    closeCancelModal,
  } = useAppointmentManagement();

  // Utility functions
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const formatTime = useCallback((timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const getReminderMessage = useCallback(
    (appointment) => {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      if (appointment.appointment_date === today) {
        return {
          message: `Today at ${formatTime(appointment.appointment_time)}`,
          type: "today",
          urgent: true,
        };
      } else if (appointment.appointment_date === tomorrowStr) {
        return {
          message: `Tomorrow at ${formatTime(appointment.appointment_time)}`,
          type: "tomorrow",
          urgent: true,
        };
      } else {
        return {
          message: `${formatDate(appointment.appointment_date)} at ${formatTime(
            appointment.appointment_time
          )}`,
          type: "upcoming",
          urgent: false,
        };
      }
    },
    [formatDate, formatTime]
  );

  const handleDownloadDetails = useCallback(
    (appointment) => {
      const details = `
APPOINTMENT DETAILS
==================
Booking Type: ${appointment.booking_type || "N/A"}
Service: ${
        appointment.services?.map((s) => s.name).join(", ") ||
        "Consultation Only"
      }
Doctor: ${appointment.doctor?.name || "N/A"}
Clinic: ${appointment.clinic?.name || "N/A"}
Address: ${appointment.clinic?.address || "N/A"}
Date: ${formatDate(appointment.appointment_date)}
Time: ${formatTime(appointment.appointment_time)}
Duration: ${
        appointment.duration_minutes
          ? `${appointment.duration_minutes} minutes`
          : "N/A"
      }
Status: ${appointment.status}
${appointment.symptoms ? `Symptoms: ${appointment.symptoms}` : ""}
Notes: ${appointment.notes || "None"}

CONTACT INFORMATION
==================
Phone: ${appointment.clinic?.phone || "N/A"}
Email: ${appointment.clinic?.email || "N/A"}

Consultation Fee: ₱${appointment.consultation_fee_charged || 0}
    `;

      const blob = new Blob([details], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appointment-${appointment.id}-details.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [formatDate, formatTime]
  );

  const urgentTreatments = React.useMemo(() => {
    return ongoingTreatments.filter((t) => {
      if (!t.next_visit_date) return false;
      const today = new Date();
      const nextVisit = new Date(t.next_visit_date);
      const daysDiff = Math.floor((today - nextVisit) / (1000 * 60 * 60 * 24));
      return daysDiff > 0; // Overdue
    });
  }, [ongoingTreatments]);

  const hasUrgentTreatments = urgentTreatments.length > 0;

  // Access control
  if (!user || !isPatient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 glass-effect rounded-xl border shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            You need to be a verified patient to view appointments.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (appointmentsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 glass-effect rounded-xl border shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Error Loading Appointments
          </h1>
          <p className="text-muted-foreground mb-6">{appointmentsError}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (appointmentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Loader message="Loading your appointments..." size="large" />
      </div>
    );
  }

  // Empty state
  if (
    filteredAppointments.length === 0 &&
    ongoingTreatments.length === 0 &&
    !appointmentsLoading &&
    !searchTerm &&
    statusFilter === "all" &&
    bookingTypeFilter === "all"
  ) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <EmptyState
            icon={Calendar}
            title="No Upcoming Appointments"
            description="You don't have any upcoming appointments scheduled. Book your next dental visit today."
            action={
              <button
                onClick={() => navigate("/patient/book-appointment")}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Book New Appointment
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Toast */}
        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={closeToast}
          />
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Upcoming Appointments
              </h1>
              <p className="text-muted-foreground text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Manage your scheduled appointments and ongoing treatments •{" "}
                {stats.total} upcoming
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                disabled={appointmentsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    appointmentsLoading ? "animate-spin" : ""
                  }`}
                />
                {appointmentsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Upcoming"
              value={stats.total}
              icon={<Calendar className="w-6 h-6 text-primary" />}
              color="primary"
              trend={`${stats.urgentCount} urgent`}
            />
            <StatsCard
              title="Pending Approval"
              value={stats.pending}
              icon={<Clock className="w-6 h-6 text-warning" />}
              color="warning"
            />
            <StatsCard
              title="Confirmed"
              value={stats.confirmed}
              icon={<CheckCircle2 className="w-6 h-6 text-success" />}
              color="success"
            />
            <StatsCard
              title="Active Treatments"
              value={stats.ongoingTreatments}
              icon={<Activity className="w-6 h-6 text-accent" />}
              color="accent"
              trend={
                stats.overduetreatments > 0
                  ? `${stats.overduetreatments} overdue`
                  : "On track"
              }
            />
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Consultation Only"
              value={stats.consultationOnly}
              icon={<Stethoscope className="w-5 h-5 text-blue-600" />}
              color="blue-600"
            />
            <StatsCard
              title="With Services" // ✅ CHANGED from "With Treatment"
              value={stats.withServices} // ✅ CHANGED from "withTreatment"
              icon={<Activity className="w-5 h-5 text-purple-600" />}
              color="purple-600"
            />
            <StatsCard
              title="Treatment Plan Linked" // ✅ CLEARER NAME
              value={stats.linkedToTreatmentPlan} // ✅ CHANGED from "treatmentPlanLinked"
              icon={<Calendar className="w-5 h-5 text-green-600" />}
              color="green-600"
            />
          </div>

          {/* Search Bar */}
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm("")}
            placeholder="Search appointments, doctors, or clinics..."
          />

          {/* Filter Section */}
          <FilterSection
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            bookingTypeFilter={bookingTypeFilter}
            setBookingTypeFilter={setBookingTypeFilter}
            stats={stats}
          />
        </div>

        {/* Urgent Treatment Alerts */}
        {hasUrgentTreatments && (
          <div className="mb-6">
            <TreatmentAlertBanner
              treatments={urgentTreatments}
              summary={{
                total_active: ongoingTreatments.length,
                total_overdue: urgentTreatments.length,
              }}
            />
          </div>
        )}

        {/* Urgent Reminders */}
        <UrgentReminders
          urgentAppointments={urgentAppointments}
          getReminderMessage={getReminderMessage}
        />

        {/* Ongoing Treatments */}
        <OngoingTreatments
          treatments={ongoingTreatments}
          loading={treatmentsLoading}
          error={treatmentsError}
          formatDate={formatDate}
          formatTime={formatTime}
          onViewDetails={handleViewTreatmentPlan}
        />

        {/* Appointments List */}
        {filteredAppointments.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Your Appointments ({filteredAppointments.length})
            </h2>
            {filteredAppointments.map((appointment) => {
              const reminder = getReminderMessage(appointment);

              return (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  reminder={reminder}
                  onViewDetails={handleViewDetails}
                  onDownload={handleDownloadDetails}
                  onCancel={handleCancelAppointment}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <EmptyState
              icon={Filter}
              title="No appointments match your filters"
              description="Try adjusting your search or filter criteria"
              action={
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setBookingTypeFilter("all");
                    }}
                    className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => navigate("/patient/book-appointment")}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Book New
                  </button>
                </div>
              }
            />
          </div>
        )}

        {/* Modals */}
        <CancelModal
          isOpen={cancelModal.isOpen}
          appointment={cancelModal.appointment}
          canCancel={cancelModal.canCancel}
          reason={cancelModal.reason}
          eligibilityMessage={cancelModal.eligibilityMessage}
          loading={false}
          onClose={closeCancelModal}
          onConfirm={confirmCancelAppointment}
          onReasonChange={(reason) =>
            setCancelModal((prev) => ({ ...prev, reason }))
          }
        />

        <DetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onDownload={handleDownloadDetails}
          formatDate={formatDate}
          formatTime={formatTime}
        />

        <TreatmentDetailsModal
          treatment={selectedTreatment}
          onClose={() => setSelectedTreatment(null)}
          formatDate={formatDate}
          formatTime={formatTime}
        />
      </div>
    </div>
  );
};

export default UpcomingAppointments;
