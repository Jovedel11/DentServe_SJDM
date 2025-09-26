import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiStar,
  FiMessageSquare,
  FiSend,
  FiCheckCircle,
  FiCalendar,
  FiThumbsUp,
  FiMapPin,
  FiClock,
  FiEye,
  FiEyeOff,
  FiAward,
  FiArchive,
  FiTrash2,
  FiAlertTriangle,
  FiRotateCcw,
  FiFolder,
  FiDownload,
  FiUser,
  FiActivity,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientFeedback } from "@/core/hooks/usePatientFeedback";

// ✅ DELETE CONFIRMATION MODAL
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  feedbackDetails,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full dark:bg-red-900/20">
            <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Delete Feedback
          </h3>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground mb-4">
            Are you sure you want to permanently delete this feedback? This
            action cannot be undone.
          </p>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="font-medium text-foreground">
              {feedbackDetails?.rating}/5 stars •{" "}
              {feedbackDetails?.clinic?.name}
            </div>
            <div className="text-muted-foreground">
              {new Date(feedbackDetails?.created_at).toLocaleDateString()} •{" "}
              {feedbackDetails?.doctor?.name}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <FiTrash2 className="w-4 h-4" />
            Delete Permanently
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PatientFeedback = () => {
  const { user, profile, isPatient } = useAuth();
  const {
    // State
    loading,
    error,
    availableClinics,
    feedbackHistory,
    archivedFeedback,
    selectedClinic,
    selectedDoctor,
    selectedAppointment,
    feedbackForm,
    showArchived,
    totalFeedback,
    activeFeedback,
    archivedCount,
    averageRating,
    canSubmitFeedback,
    formProgress,
    doctorsForSelectedClinic,
    appointmentsForSelectedDoctor,

    // Actions
    handleSubmitFeedback,
    archiveFeedback,
    unarchiveFeedback,
    deleteArchivedFeedback,
    downloadFeedbackDetails,
    updateFeedbackForm,
    selectClinic,
    selectDoctor,
    selectAppointment,
    toggleArchiveView,
    resetForm,
  } = usePatientFeedback();

  const [activeTab, setActiveTab] = useState("new");
  const [hoverRating, setHoverRating] = useState(0);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    feedback: null,
  });

  // ✅ HANDLERS
  const handleArchive = async (feedbackId) => {
    const result = await archiveFeedback(feedbackId);
    if (result.success) {
      console.log("Archived successfully");
    } else {
      console.error("Archive failed:", result.error);
    }
  };

  const handleUnarchive = async (feedbackId) => {
    const result = await unarchiveFeedback(feedbackId);
    if (result.success) {
      console.log("Unarchived successfully");
    } else {
      console.error("Unarchive failed:", result.error);
    }
  };

  const handleDeleteClick = (feedback) => {
    setDeleteModal({ isOpen: true, feedback });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.feedback) return;

    const result = await deleteArchivedFeedback(deleteModal.feedback.id);
    if (result.success) {
      console.log("Deleted successfully");
    } else {
      console.error("Delete failed:", result.error);
    }

    setDeleteModal({ isOpen: false, feedback: null });
  };

  const handleRatingClick = (rating) => {
    updateFeedbackForm({ rating });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const result = await handleSubmitFeedback();

    if (result.success) {
      setActiveTab("history");
      console.log("✅ Feedback submitted and staff notified");
    } else {
      console.error("❌ Feedback submission failed:", result.error);
    }
  };

  const renderStars = (rating, interactive = false, size = "normal") => {
    const sizeClasses = {
      large: "w-8 h-8",
      normal: "w-5 h-5",
      small: "w-4 h-4",
    };

    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      const isActive =
        starValue <=
        (interactive ? hoverRating || feedbackForm.rating : rating);

      return (
        <FiStar
          key={index}
          className={`${sizeClasses[size]} transition-all duration-200 ${
            isActive
              ? "text-yellow-400 fill-yellow-400"
              : "text-muted-foreground"
          } ${
            interactive
              ? "cursor-pointer hover:text-yellow-300 hover:scale-110"
              : ""
          }`}
          onClick={interactive ? () => handleRatingClick(starValue) : undefined}
          onMouseEnter={
            interactive ? () => setHoverRating(starValue) : undefined
          }
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        />
      );
    });
  };

  const getRatingText = (rating) => {
    const texts = {
      0: "Select your rating",
      1: "Poor",
      2: "Fair",
      3: "Good",
      4: "Very Good",
      5: "Excellent",
    };
    return texts[rating];
  };

  // ✅ ACCESS CONTROL
  if (!user || !isPatient) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            Only patients can submit and manage feedback.
          </p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Error Loading Feedback
          </h1>
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="text-center">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
          </div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const currentList = showArchived ? archivedFeedback : feedbackHistory;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <FiMessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Patient Feedback
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your dental care experience and help us continuously improve
            our services
          </p>
        </motion.div>

        {/* Analytics Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                <FiMessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {totalFeedback}
              </h3>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-xs text-muted-foreground">
                {activeFeedback} active
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg dark:bg-yellow-900/20">
                <FiStar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {averageRating}
              </h3>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <div className="flex items-center">
                {renderStars(
                  Math.round(parseFloat(averageRating)),
                  false,
                  "small"
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                <FiFolder className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {archivedCount}
              </h3>
              <p className="text-sm text-muted-foreground">Archived Reviews</p>
              <p className="text-xs text-muted-foreground">Personal archive</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                <FiActivity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {availableClinics.length}
              </h3>
              <p className="text-sm text-muted-foreground">Clinics Visited</p>
              <p className="text-xs text-muted-foreground">Can review</p>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Tabs with Archive Toggle */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-center">
            <div className="bg-card border border-border rounded-xl p-2 shadow-lg">
              <div className="flex items-center space-x-2">
                <button
                  className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === "new"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setActiveTab("new")}
                >
                  <FiSend className="w-4 h-4" />
                  <span>New Feedback</span>
                </button>
                <button
                  className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === "history"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setActiveTab("history")}
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{showArchived ? "Archived" : "My Reviews"}</span>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded-full ${
                      activeTab === "history"
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {showArchived ? archivedCount : activeFeedback}
                  </span>
                </button>

                {/* Archive Toggle - Only show in history tab */}
                {activeTab === "history" && (
                  <button
                    onClick={toggleArchiveView}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      showArchived
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {showArchived ? (
                      <>
                        <FiEye className="w-4 h-4" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <FiArchive className="w-4 h-4" />
                        <span>Archive ({archivedCount})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="min-h-[500px]"
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {activeTab === "new" ? (
            // ✅ NEW FEEDBACK FORM
            <div className="max-w-4xl mx-auto">
              <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                {/* Progress Bar */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 px-8 py-4 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {Math.round(formProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${formProgress}%` }}
                    />
                  </div>
                </div>

                <div className="p-8">
                  <form onSubmit={handleSubmitForm} className="space-y-8">
                    {/* Step 1: Clinic Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </div>
                        <label className="text-lg font-semibold text-foreground">
                          Select Clinic
                        </label>
                      </div>
                      <p className="text-sm text-muted-foreground ml-11">
                        Choose the clinic where you had your completed
                        appointment
                      </p>

                      <div className="ml-11 grid gap-4 md:grid-cols-2">
                        {availableClinics.map((clinic) => (
                          <div
                            key={clinic.id}
                            className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                              selectedClinic?.id === clinic.id
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/50 hover:bg-muted/30"
                            }`}
                            onClick={() => selectClinic(clinic)}
                          >
                            <div className="flex items-start space-x-4">
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                                <FaBuilding className="w-8 h-8 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground text-base mb-1">
                                  {clinic.name}
                                </h3>
                                <div className="flex items-center text-xs text-muted-foreground mb-2">
                                  <FiMapPin className="w-3 h-3 mr-1" />
                                  {clinic.address}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-primary font-medium">
                                    {clinic.totalAppointments} completed visits
                                  </span>
                                  <span className="text-muted-foreground">
                                    {clinic.doctors?.length || 0} doctors
                                  </span>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="clinic"
                                checked={selectedClinic?.id === clinic.id}
                                onChange={() => {}}
                                className="w-5 h-5 text-primary mt-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Doctor Selection */}
                    {selectedClinic && doctorsForSelectedClinic.length > 0 && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            2
                          </div>
                          <label className="text-lg font-semibold text-foreground">
                            Select Doctor
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                          Choose the doctor you want to provide feedback for at{" "}
                          {selectedClinic.name}
                        </p>

                        <div className="ml-11 space-y-3">
                          {doctorsForSelectedClinic.map((doctor) => (
                            <div
                              key={doctor.id}
                              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                                selectedDoctor?.id === doctor.id
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                              }`}
                              onClick={() => selectDoctor(doctor)}
                            >
                              <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <FiUser className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground text-base">
                                    {doctor.name}
                                  </h3>
                                  <p className="text-sm text-primary mb-2">
                                    {doctor.specialization}
                                  </p>
                                  <div className="text-sm text-muted-foreground">
                                    {doctor.appointments?.length || 0} completed
                                    appointments
                                  </div>
                                </div>
                                <input
                                  type="radio"
                                  name="doctor"
                                  checked={selectedDoctor?.id === doctor.id}
                                  onChange={() => {}}
                                  className="w-5 h-5 text-primary"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Appointment Selection */}
                    {selectedDoctor && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            3
                          </div>
                          <label className="text-lg font-semibold text-foreground">
                            Select Appointment
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                          Choose which appointment you'd like to review
                        </p>

                        <div className="ml-11 space-y-3">
                          {selectedDoctor.appointments?.map((appointment) => (
                            <div
                              key={appointment.id}
                              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                                selectedAppointment?.id === appointment.id
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                              }`}
                              onClick={() => selectAppointment(appointment)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-foreground">
                                    {appointment.services
                                      ?.map((s) => s.name || s)
                                      .join(", ") || "General Appointment"}
                                  </h4>
                                  <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                      <FiCalendar className="w-4 h-4 mr-1" />
                                      {new Date(
                                        appointment.appointment_date
                                      ).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center">
                                      <FiClock className="w-4 h-4 mr-1" />
                                      {appointment.appointment_time}
                                    </div>
                                  </div>
                                </div>
                                <input
                                  type="radio"
                                  name="appointment"
                                  checked={
                                    selectedAppointment?.id === appointment.id
                                  }
                                  onChange={() => {}}
                                  className="w-5 h-5 text-primary"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 4: Rating */}
                    {selectedAppointment && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            4
                          </div>
                          <label className="text-lg font-semibold text-foreground">
                            Overall Rating
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                          Rate your overall experience with{" "}
                          {selectedDoctor?.name}
                        </p>

                        <div className="ml-11">
                          <div className="bg-muted/30 border border-border rounded-xl p-6">
                            <div className="text-center space-y-4">
                              <div className="flex items-center justify-center space-x-2">
                                {renderStars(
                                  feedbackForm.rating,
                                  true,
                                  "large"
                                )}
                              </div>
                              <p className="text-lg font-medium text-foreground">
                                {getRatingText(feedbackForm.rating)}
                              </p>
                              {feedbackForm.rating > 0 && (
                                <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full">
                                  <FiAward className="w-4 h-4 text-primary mr-2" />
                                  <span className="text-sm font-medium text-primary">
                                    {feedbackForm.rating}/5 Stars
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 5: Message */}
                    {feedbackForm.rating > 0 && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            5
                          </div>
                          <label className="text-lg font-semibold text-foreground">
                            Share Your Experience
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                          Tell us about your experience in detail
                        </p>

                        <div className="ml-11 space-y-4">
                          <textarea
                            value={feedbackForm.comment}
                            onChange={(e) =>
                              updateFeedbackForm({
                                comment: e.target.value,
                              })
                            }
                            placeholder="Tell us about your experience with the doctor, staff, and clinic. What did you like? What could be improved?"
                            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            rows="6"
                            maxLength="1000"
                            required
                          />
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>
                              Be specific and constructive in your feedback
                            </span>
                            <span
                              className={
                                feedbackForm.comment.length > 900
                                  ? "text-warning"
                                  : ""
                              }
                            >
                              {feedbackForm.comment.length}/1000{" "}
                            </span>
                          </div>

                          {/* Privacy Settings */}
                          <div className="bg-muted/30 border border-border rounded-xl p-4">
                            <div className="flex items-start space-x-4">
                              <div className="flex items-center mt-1">
                                <input
                                  type="checkbox"
                                  id="anonymous"
                                  checked={feedbackForm.is_anonymous}
                                  onChange={(e) =>
                                    updateFeedbackForm({
                                      is_anonymous: e.target.checked,
                                    })
                                  }
                                  className="w-5 h-5 text-primary rounded border-border focus:ring-2 focus:ring-primary/20"
                                />
                              </div>
                              <div className="flex-1">
                                <label
                                  htmlFor="anonymous"
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center space-x-2 mb-2">
                                    {feedbackForm.is_anonymous ? (
                                      <FiEyeOff className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <FiEye className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-foreground">
                                      Submit as anonymous review
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {feedbackForm.is_anonymous
                                      ? "Your review will be published without your name. Staff will still see your identity for internal purposes."
                                      : "Your name will be visible with this review to help other patients make informed decisions."}
                                  </p>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Recommend Toggle */}
                        </div>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    {canSubmitFeedback && (
                      <motion.div
                        className="pt-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full flex items-center justify-center space-x-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiSend className="w-5 h-5" />
                          <span>
                            {loading
                              ? "Submitting..."
                              : "Submit Feedback & Notify Staff"}
                          </span>
                        </button>
                      </motion.div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          ) : (
            // ✅ FEEDBACK HISTORY WITH ARCHIVE FUNCTIONALITY
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">
                  {showArchived ? "Archived" : "Active"} Reviews (
                  {currentList.length} records)
                </h3>
              </div>

              {currentList.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-muted/20 rounded-full p-6 w-24 h-24 mx-auto mb-6">
                    <FiMessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-3">
                    {showArchived ? "No Archived Reviews" : "No Reviews Yet"}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {showArchived
                      ? "Reviews you archive will appear here"
                      : "You haven't submitted any feedback yet. Share your experience to help us improve!"}
                  </p>
                  {!showArchived && (
                    <button
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                      onClick={() => setActiveTab("new")}
                    >
                      <FiSend className="w-4 h-4" />
                      <span>Write Your First Review</span>
                    </button>
                  )}
                </div>
              ) : (
                currentList.map((review, index) => (
                  <motion.div
                    key={review.id}
                    className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    {/* Review Header */}
                    <div className="bg-gradient-to-r from-muted/30 to-muted/10 px-6 py-4 border-b border-border">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <FiUser className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">
                              {review.appointment.services
                                ?.map((s) => s.name || s)
                                .join(", ") || "General Appointment"}
                            </h3>
                            <div className="flex items-center space-x-2 text-primary">
                              <span className="font-medium">
                                {review.doctor?.name}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">
                                {review.doctor?.specialization}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <FaBuilding className="w-4 h-4 mr-1" />
                                {review.clinic.name}
                              </div>
                              <div className="flex items-center">
                                <FiCalendar className="w-4 h-4 mr-1" />
                                {new Date(
                                  review.appointment.date
                                ).toLocaleDateString()}
                              </div>
                              // ✅ CONTINUING FROM WHERE IT WAS CUT OFF...
                              <div className="flex items-center">
                                <FiCalendar className="w-4 h-4 mr-1" />
                                {new Date(
                                  review.appointment.date
                                ).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <FiClock className="w-4 h-4 mr-1" />
                                {review.appointment.time}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Privacy Indicator */}
                          {review.is_anonymous ? (
                            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-muted/50 rounded-full text-sm font-medium">
                              <FiEyeOff className="w-4 h-4" />
                              <span>Anonymous</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              <FiEye className="w-4 h-4" />
                              <span>Public</span>
                            </div>
                          )}

                          {/* Archive Status */}
                          {showArchived && (
                            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium dark:bg-orange-900/20 dark:text-orange-400">
                              <FiArchive className="w-4 h-4" />
                              <span>Archived</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="p-6 space-y-4">
                      {/* Rating and Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            {renderStars(review.rating, false, "normal")}
                          </div>
                          <span className="font-medium text-foreground">
                            {review.rating}/5 Stars
                          </span>
                          <span className="text-muted-foreground">
                            {getRatingText(review.rating)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Submitted{" "}
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Review Message */}
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-foreground leading-relaxed">
                          {review.message}
                        </p>
                      </div>

                      {/* Recommendation */}
                      {review.recommend_to_others !== null && (
                        <div className="flex items-center space-x-2">
                          {review.recommend_to_others ? (
                            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium dark:bg-green-900/20 dark:text-green-400">
                              <FiThumbsUp className="w-4 h-4" />
                              <span>Recommends this clinic</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium dark:bg-red-900/20 dark:text-red-400">
                              <span>Does not recommend</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feedback Categories */}
                      {review.feedback_categories &&
                        review.feedback_categories.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-sm text-muted-foreground">
                              Categories:
                            </span>
                            {review.feedback_categories.map((category, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                              >
                                {category
                                  .replace("_", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                            ))}
                          </div>
                        )}

                      {/* Clinic Response */}
                      {review.clinic_response && (
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <FaBuilding className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-primary mb-2">
                                Response from {review.clinic.name}
                              </div>
                              <p className="text-foreground leading-relaxed">
                                {review.clinic_response}
                              </p>
                              {review.responded_at && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Responded on{" "}
                                  {new Date(
                                    review.responded_at
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <FiMessageSquare className="w-4 h-4" />
                          <span>Review ID: {review.id}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Download Button */}
                          <button
                            onClick={() => downloadFeedbackDetails(review)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Download feedback details"
                          >
                            <FiDownload className="w-4 h-4" />
                          </button>

                          {/* Archive/Unarchive Button */}
                          {!showArchived ? (
                            <button
                              onClick={() => handleArchive(review.id)}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              title="Archive feedback"
                            >
                              <FiArchive className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUnarchive(review.id)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:bg-blue-900/20"
                                title="Unarchive feedback"
                              >
                                <FiRotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(review)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                                title="Delete permanently"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, feedback: null })}
          onConfirm={handleDeleteConfirm}
          feedbackDetails={deleteModal.feedback}
        />
      </AnimatePresence>
    </div>
  );
};

export default PatientFeedback;
