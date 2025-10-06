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
  FiUser,
  FiActivity,
} from "react-icons/fi";
import { FaBuilding, FaUserMd } from "react-icons/fa";
import { useAuth } from "@/auth/context/AuthProvider";
import { usePatientFeedback } from "@/hooks/feedback/usePatientFeedback";

const PatientFeedback = () => {
  const { user, profile, isPatient } = useAuth();
  const {
    // State
    loading,
    error,
    availableClinics,
    feedbackHistory,
    selectedClinic,
    selectedDoctor,
    selectedAppointment,
    feedbackForm,
    totalFeedback,
    averageRating,
    averageClinicRating,
    averageDoctorRating,
    canSubmitFeedback,
    formProgress,
    doctorsForSelectedClinic,
    appointmentsForSelectedDoctor,

    // Actions
    handleSubmitFeedback,
    updateFeedbackForm,
    selectClinic,
    selectDoctor,
    selectAppointment,
    resetForm,
  } = usePatientFeedback();

  const [activeTab, setActiveTab] = useState("new");
  const [hoverClinicRating, setHoverClinicRating] = useState(0);
  const [hoverDoctorRating, setHoverDoctorRating] = useState(0);

  // ✅ HANDLERS
  const handleRatingClick = (type, rating) => {
    if (type === "clinic") {
      updateFeedbackForm({ clinic_rating: rating });
    } else {
      updateFeedbackForm({ doctor_rating: rating });
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    console.log("📤 Submitting feedback form...", {
      clinic: selectedClinic?.name,
      doctor: selectedDoctor?.name,
      appointment: selectedAppointment?.id,
      hasAlreadySubmitted: selectedAppointment?.hasFeedback,
    });

    const result = await handleSubmitFeedback();

    if (result.success) {
      console.log("✅ Feedback submitted successfully!");
      setActiveTab("history");

      // ✅ Visual feedback
      setTimeout(() => {
        alert(
          "✅ Feedback submitted successfully! The clinic staff will be notified.\n\n" +
            "The clinic has been removed from your available list since you've reviewed all appointments there."
        );
      }, 100);
    } else {
      console.error("❌ Feedback submission failed:", result.error);
      alert(`❌ Error: ${result.error}`);
    }
  };

  // ✅ DUAL STAR RATING RENDERER
  const renderStars = (
    rating,
    interactive = false,
    size = "normal",
    onHover,
    onLeave,
    onClick
  ) => {
    const sizeClasses = {
      large: "w-8 h-8",
      normal: "w-5 h-5",
      small: "w-4 h-4",
    };

    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      const isActive = starValue <= rating;

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
          onClick={interactive ? () => onClick(starValue) : undefined}
          onMouseEnter={interactive ? () => onHover(starValue) : undefined}
          onMouseLeave={interactive ? () => onLeave(0) : undefined}
        />
      );
    });
  };

  const getRatingText = (rating) => {
    const texts = {
      0: "Not rated yet",
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
              <p className="text-xs text-muted-foreground">All time feedback</p>
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
              <p className="text-sm text-muted-foreground">Overall Average</p>
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
                <FaBuilding className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {averageClinicRating}
              </h3>
              <p className="text-sm text-muted-foreground">Clinic Average</p>
              <div className="flex items-center">
                {renderStars(
                  Math.round(parseFloat(averageClinicRating)),
                  false,
                  "small"
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                <FaUserMd className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                {averageDoctorRating}
              </h3>
              <p className="text-sm text-muted-foreground">Doctor Average</p>
              <div className="flex items-center">
                {renderStars(
                  Math.round(parseFloat(averageDoctorRating)),
                  false,
                  "small"
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
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
                  <span>My Reviews</span>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded-full ${
                      activeTab === "history"
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {totalFeedback}
                  </span>
                </button>
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
            // ✅ NEW FEEDBACK FORM WITH DUAL RATINGS
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
                                    <span className="truncate">
                                  {clinic.address}
                                    </span>
                                </div>

                                  {/* ✅ ENHANCED: Detailed feedback status */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex flex-col gap-1">
                                  <span className="text-primary font-medium">
                                        {clinic.availableAppointments === 1
                                          ? "1 appointment to review"
                                          : `${clinic.availableAppointments} appointments to review`}
                                  </span>
                                      <span className="text-muted-foreground text-[10px]">
                                        {clinic.reviewedAppointments} already
                                        reviewed • {clinic.totalAppointments}{" "}
                                        total visits
                                  </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="flex items-center">
                                        {renderStars(
                                          clinic.rating || 0,
                                          false,
                                          "small"
                                        )}
                                      </div>
                                      <span className="text-[10px] text-muted-foreground">
                                        {clinic.total_reviews} reviews
                                      </span>
                                    </div>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="clinic"
                                checked={selectedClinic?.id === clinic.id}
                                onChange={() => {}}
                                  className="w-5 h-5 text-primary mt-2 flex-shrink-0"
                              />
                            </div>
                          </div>
                        ))}

                          {/* No clinics available message */}
                          {availableClinics.length === 0 && (
                            <div className="col-span-full text-center py-12">
                              <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 rounded-xl p-8 max-w-md mx-auto">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                  All Caught Up! 🎉
                                </h3>
                                <p className="text-muted-foreground mb-1">
                                  You've reviewed all your completed
                                  appointments.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Visit the "Review History" tab to see your
                                  past feedback.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
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
                          Choose the doctor you want to provide feedback for
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
                                  <FaUserMd className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground text-base">
                                    {doctor.name}
                                  </h3>
                                  <p className="text-sm text-primary mb-2">
                                    {doctor.specialization}
                                  </p>
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="text-muted-foreground">
                                      {doctor.availableAppointments} can review
                                    </span>
                                    <div className="flex items-center">
                                      {renderStars(
                                        doctor.rating || 0,
                                        false,
                                        "small"
                                      )}
                                    </div>
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

                          {doctorsForSelectedClinic.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                              <p>
                                No doctors available for feedback at this
                                clinic.
                              </p>
                              <p className="text-sm mt-2">
                                All appointments have been reviewed.
                              </p>
                            </div>
                          )}
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
                          {appointmentsForSelectedDoctor.map((appointment) => (
                            <div
                              key={appointment.id}
                              className={`border rounded-xl p-4 transition-all duration-200 ${
                                appointment.hasFeedback
                                  ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 opacity-60 cursor-not-allowed"
                                  : selectedAppointment?.id === appointment.id
                                  ? "border-primary bg-primary/5 shadow-md cursor-pointer"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                              }`}
                              onClick={() =>
                                !appointment.hasFeedback &&
                                selectAppointment(appointment)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-foreground">
                                    {appointment.services
                                      ?.map((s) => s.name || s)
                                      .join(", ") || "General Appointment"}
                                  </h4>
                                    {appointment.hasFeedback && (
                                      <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                        <FiCheckCircle className="w-3 h-3 mr-1" />
                                        Reviewed
                                      </span>
                                    )}
                                  </div>
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
                                {!appointment.hasFeedback && (
                                <input
                                  type="radio"
                                  name="appointment"
                                  checked={
                                    selectedAppointment?.id === appointment.id
                                  }
                                  onChange={() => {}}
                                  className="w-5 h-5 text-primary"
                                />
                                )}
                              </div>
                            </div>
                          ))}

                          {appointmentsForSelectedDoctor.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                              <p>No appointments available for feedback.</p>
                              <p className="text-sm mt-2">
                                All appointments with this doctor have been
                                reviewed.
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 4: DUAL RATINGS - Clinic & Doctor */}
                    {selectedAppointment && (
                      <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            4
                          </div>
                          <label className="text-lg font-semibold text-foreground">
                            Rate Your Experience
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                          Rate both the clinic and doctor separately (optional
                          but recommended)
                        </p>

                        <div className="ml-11 space-y-6">
                          {/* Clinic Rating */}
                          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                            <div className="flex items-center space-x-3 mb-4">
                              <FaBuilding className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <h4 className="font-semibold text-foreground">
                                Clinic Experience
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              Rate the overall clinic experience (facility,
                              staff, wait time, cleanliness)
                            </p>
                            <div className="text-center space-y-4">
                              <div className="flex items-center justify-center space-x-2">
                                {renderStars(
                                  hoverClinicRating ||
                                    feedbackForm.clinic_rating,
                                  true,
                                  "large",
                                  setHoverClinicRating,
                                  setHoverClinicRating,
                                  (rating) =>
                                    handleRatingClick("clinic", rating)
                                )}
                              </div>
                              <p className="text-lg font-medium text-foreground">
                                {getRatingText(
                                  hoverClinicRating ||
                                    feedbackForm.clinic_rating
                                )}
                              </p>
                              {feedbackForm.clinic_rating > 0 && (
                                <div className="inline-flex items-center px-4 py-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                                  <FiAward className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    Clinic: {feedbackForm.clinic_rating}/5 Stars
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Doctor Rating */}
                          {selectedDoctor && (
                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-6">
                              <div className="flex items-center space-x-3 mb-4">
                                <FaUserMd className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <h4 className="font-semibold text-foreground">
                                  Doctor Performance
                                </h4>
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">
                                Rate {selectedDoctor.name}'s care
                                (professionalism, treatment quality,
                                communication)
                              </p>
                              <div className="text-center space-y-4">
                                <div className="flex items-center justify-center space-x-2">
                                  {renderStars(
                                    hoverDoctorRating ||
                                      feedbackForm.doctor_rating,
                                    true,
                                    "large",
                                    setHoverDoctorRating,
                                    setHoverDoctorRating,
                                    (rating) =>
                                      handleRatingClick("doctor", rating)
                                  )}
                                </div>
                                <p className="text-lg font-medium text-foreground">
                                  {getRatingText(
                                    hoverDoctorRating ||
                                      feedbackForm.doctor_rating
                                  )}
                                </p>
                                {feedbackForm.doctor_rating > 0 && (
                                  <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                                    <FiAward className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                      Doctor: {feedbackForm.doctor_rating}/5
                                      Stars
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Validation Message */}
                          {!feedbackForm.clinic_rating &&
                            !feedbackForm.doctor_rating && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  ⚠️ Please provide at least one rating (clinic
                                  or doctor) to continue
                                </p>
                              </div>
                            )}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 5: Comment */}
                    {(feedbackForm.clinic_rating > 0 ||
                      feedbackForm.doctor_rating > 0) && (
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
                            placeholder="Tell us about your experience with the doctor, staff, and clinic. What did you like? What could be improved? (Minimum 10 characters)"
                            className={`w-full px-4 py-3 border rounded-xl bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 transition-colors ${
                              feedbackForm.comment.trim().length > 0 &&
                              feedbackForm.comment.trim().length < 10
                                ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                : "border-border focus:ring-primary/20 focus:border-primary"
                            }`}
                            rows="6"
                            maxLength="1000"
                            required
                          />
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center space-x-2">
                              {feedbackForm.comment.trim().length === 0 ? (
                                <span className="text-muted-foreground">
                                  ℹ️ Please enter at least 10 characters
                            </span>
                              ) : feedbackForm.comment.trim().length < 10 ? (
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  ⚠️ {10 - feedbackForm.comment.trim().length}{" "}
                                  more character
                                  {10 - feedbackForm.comment.trim().length !== 1
                                    ? "s"
                                    : ""}{" "}
                                  required
                                </span>
                              ) : (
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  ✓ Minimum requirement met
                                </span>
                              )}
                            </div>
                            <span
                              className={
                                feedbackForm.comment.length > 900
                                  ? "text-orange-600 dark:text-orange-400 font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {feedbackForm.comment.length}/1000
                            </span>
                          </div>

                          {/* Feedback Type */}
                          <div className="bg-muted/30 border border-border rounded-xl p-4">
                            <label className="block text-sm font-medium text-foreground mb-3">
                              Feedback Category
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              {["general", "doctor", "service", "facility"].map(
                                (type) => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() =>
                                      updateFeedbackForm({
                                        feedback_type: type,
                                      })
                                    }
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      feedbackForm.feedback_type === type
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                  >
                                    {type.charAt(0).toUpperCase() +
                                      type.slice(1)}
                                  </button>
                                )
                              )}
                            </div>
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
            // ✅ FEEDBACK HISTORY WITH DUAL RATINGS DISPLAY
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">
                  Your Reviews ({feedbackHistory.length} records)
                </h3>
              </div>

              {feedbackHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-muted/20 rounded-full p-6 w-24 h-24 mx-auto mb-6">
                    <FiMessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-3">
                    No Reviews Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't submitted any feedback yet. Share your
                    experience to help us improve!
                  </p>
                    <button
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                      onClick={() => setActiveTab("new")}
                    >
                      <FiSend className="w-4 h-4" />
                      <span>Write Your First Review</span>
                    </button>
                </div>
              ) : (
                feedbackHistory.map((review, index) => (
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
                            {review.doctor ? (
                              <FaUserMd className="w-6 h-6 text-muted-foreground" />
                            ) : (
                              <FaBuilding className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">
                              {review.appointment?.services
                                ?.map((s) => s.name || s)
                                .join(", ") || review.clinic.name}
                            </h3>
                            {review.doctor && (
                            <div className="flex items-center space-x-2 text-primary">
                              <span className="font-medium">
                                  {review.doctor.name}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">
                                  {review.doctor.specialization}
                              </span>
                            </div>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <FaBuilding className="w-4 h-4 mr-1" />
                                {review.clinic.name}
                              </div>
                              {review.appointment && (
                                <>
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
                                </>
                              )}
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
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="p-6 space-y-4">
                      {/* DUAL RATINGS DISPLAY */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Clinic Rating */}
                        {review.clinic_rating && (
                          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <FaBuilding className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium text-foreground">
                                  Clinic Experience
                                </span>
                          </div>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {review.clinic_rating}/5
                          </span>
                        </div>
                            <div className="flex items-center">
                              {renderStars(
                                review.clinic_rating,
                                false,
                                "small"
                              )}
                        </div>
                      </div>
                        )}

                        {/* Doctor Rating */}
                        {review.doctor_rating && (
                          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                                <FaUserMd className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-foreground">
                                  Doctor Performance
                                </span>
                            </div>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                {review.doctor_rating}/5
                              </span>
                            </div>
                            <div className="flex items-center">
                              {renderStars(
                                review.doctor_rating,
                                false,
                                "small"
                          )}
                            </div>
                        </div>
                      )}
                      </div>

                      {/* Overall Rating (Legacy) */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-3">
                          <span className="text-muted-foreground">
                            Overall:
                            </span>
                          <div className="flex items-center space-x-1">
                            {renderStars(review.rating, false, "small")}
                          </div>
                          <span className="font-medium text-foreground">
                            {review.rating}/5 • {getRatingText(review.rating)}
                              </span>
                          </div>
                        <div className="text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Feedback Type Badge */}
                      <div className="inline-flex items-center px-3 py-1 bg-muted rounded-full text-xs font-medium">
                        <span className="capitalize">
                          {review.feedback_type} Feedback
                        </span>
                      </div>

                      {/* Review Comment */}
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-foreground leading-relaxed">
                          {review.comment}
                        </p>
                      </div>

                      {/* Clinic Response */}
                      {review.clinic_response && (
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <FaBuilding className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-primary">
                                Response from {review.clinic.name}
                                </div>
                                {review.responder_name && (
                                  <span className="text-xs text-muted-foreground">
                                    by {review.responder_name}
                                  </span>
                                )}
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

                      {/* Current Ratings Info */}
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            {review.clinic.current_rating > 0 && (
                              <span>
                                Clinic now: {review.clinic.current_rating}⭐ (
                                {review.clinic.total_reviews} reviews)
                              </span>
                            )}
                            {review.doctor?.current_rating > 0 && (
                              <span>
                                Doctor now: {review.doctor.current_rating}⭐ (
                                {review.doctor.total_reviews} reviews)
                              </span>
                            )}
                          </div>
                          <span>Review ID: {review.id.slice(0, 8)}...</span>
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
    </div>
  );
};

export default PatientFeedback;
