import React, { useState } from "react";
import { motion } from "framer-motion";
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
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
/**
 * Enhanced Feedback component with proper clinic → doctor selection flow
 */
const PatientFeedback = () => {
  const [activeTab, setActiveTab] = useState("new");
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [newFeedback, setNewFeedback] = useState({
    rating: 0,
    message: "",
    anonymous: false,
  });
  const [hoverRating, setHoverRating] = useState(0);

  // Mock data for clinics with completed appointments
  const availableClinics = [
    {
      id: 1,
      name: "SmileCare Dental Center",
      location: "Downtown Branch",
      address: "123 Main Street, Downtown",
      image:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop",
      completedAppointments: 3,
      lastVisit: "2025-08-15",
    },
    {
      id: 2,
      name: "Advanced Dental Care",
      location: "North Plaza",
      address: "456 North Ave, Plaza District",
      image:
        "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop",
      completedAppointments: 2,
      lastVisit: "2025-08-10",
    },
    {
      id: 3,
      name: "OrthoSmile Clinic",
      location: "West Side",
      address: "789 West Boulevard",
      image:
        "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=300&fit=crop",
      completedAppointments: 1,
      lastVisit: "2025-08-05",
    },
  ];

  // Mock data for doctors based on selected clinic
  const availableDoctors = {
    1: [
      // SmileCare Dental Center
      {
        id: 1,
        name: "Dr. Sarah Martinez",
        specialty: "General Dentist",
        avatar:
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
        completedAppointments: [
          {
            id: 1,
            date: "2025-08-15",
            time: "10:30 AM",
            service: "Regular Dental Checkup",
          },
          {
            id: 2,
            date: "2025-07-20",
            time: "2:00 PM",
            service: "Teeth Cleaning",
          },
        ],
      },
      {
        id: 2,
        name: "Dr. Michael Johnson",
        specialty: "Oral Surgeon",
        avatar:
          "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
        completedAppointments: [
          {
            id: 3,
            date: "2025-08-01",
            time: "9:15 AM",
            service: "Cavity Filling",
          },
        ],
      },
    ],
    2: [
      // Advanced Dental Care
      {
        id: 3,
        name: "Dr. Emily Chen",
        specialty: "Orthodontist",
        avatar:
          "https://images.unsplash.com/photo-1594824804732-ca8db5ac6b9e?w=400&h=400&fit=crop&crop=face",
        completedAppointments: [
          {
            id: 4,
            date: "2025-08-10",
            time: "11:00 AM",
            service: "Orthodontic Consultation",
          },
          {
            id: 5,
            date: "2025-07-25",
            time: "3:30 PM",
            service: "Braces Adjustment",
          },
        ],
      },
    ],
    3: [
      // OrthoSmile Clinic
      {
        id: 4,
        name: "Dr. James Wilson",
        specialty: "Cosmetic Dentist",
        avatar:
          "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face",
        completedAppointments: [
          {
            id: 6,
            date: "2025-08-05",
            time: "1:00 PM",
            service: "Teeth Whitening Consultation",
          },
        ],
      },
    ],
  };

  // Mock feedback history (removed pending status, only show anonymous indicator)
  const feedbackHistory = [
    {
      id: 1,
      clinic: {
        name: "SmileCare Dental Center",
        location: "Downtown Branch",
      },
      doctor: {
        name: "Dr. Robert Smith",
        specialty: "Periodontist",
        avatar:
          "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face",
      },
      appointment: {
        date: "2025-07-28",
        time: "9:00 AM",
        service: "Deep Teeth Cleaning",
      },
      rating: 5,
      message:
        "Outstanding service! Dr. Smith was incredibly thorough and professional. The deep cleaning was done with great care, and the staff was very accommodating. The clinic environment was spotless and modern. Highly recommend for anyone needing periodontal care.",
      anonymous: false,
      submittedAt: "2025-07-30T14:30:00Z",
      likes: 8,
      helpful: true,
      clinicResponse:
        "Thank you for your wonderful feedback! We're thrilled that you had such a positive experience with Dr. Smith and our team.",
    },
    {
      id: 2,
      clinic: {
        name: "Advanced Dental Care",
        location: "North Plaza",
      },
      doctor: {
        name: "Dr. Lisa Brown",
        specialty: "Endodontist",
        avatar:
          "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop&crop=face",
      },
      appointment: {
        date: "2025-07-15",
        time: "3:30 PM",
        service: "Root Canal Treatment",
      },
      rating: 4,
      message:
        "The root canal procedure went smoothly overall. Dr. Brown explained each step clearly and the pain management was effective. The only minor issue was the longer than expected waiting time, but the quality of care made up for it.",
      anonymous: true,
      submittedAt: "2025-07-17T10:15:00Z",
      likes: 5,
      helpful: true,
      clinicResponse:
        "We appreciate your honest feedback and are glad the procedure went well. We're working on improving our scheduling to reduce wait times.",
    },
    {
      id: 3,
      clinic: {
        name: "OrthoSmile Clinic",
        location: "West Side",
      },
      doctor: {
        name: "Dr. James Wilson",
        specialty: "Cosmetic Dentist",
        avatar:
          "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
      },
      appointment: {
        date: "2025-07-02",
        time: "1:00 PM",
        service: "Dental Consultation",
      },
      rating: 5,
      message:
        "Excellent consultation experience! Dr. Wilson took the time to thoroughly explain my treatment options and answer all my questions. Very professional and knowledgeable.",
      anonymous: false,
      submittedAt: "2025-07-04T16:45:00Z",
      likes: 12,
      helpful: true,
    },
  ];

  const handleRatingClick = (rating) => {
    setNewFeedback((prev) => ({ ...prev, rating }));
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();

    const selectedClinicData = availableClinics.find(
      (c) => c.id === parseInt(selectedClinic)
    );
    const selectedDoctorData = availableDoctors[selectedClinic]?.find(
      (d) => d.id === parseInt(selectedDoctor)
    );

    const feedbackData = {
      clinicId: selectedClinic,
      doctorId: selectedDoctor,
      clinic: selectedClinicData,
      doctor: selectedDoctorData,
      rating: newFeedback.rating,
      message: newFeedback.message,
      anonymous: newFeedback.anonymous,
      submittedAt: new Date().toISOString(),
    };

    console.log("Submitting feedback:", feedbackData);

    // Reset form
    setSelectedClinic("");
    setSelectedDoctor("");
    setNewFeedback({
      rating: 0,
      message: "",
      anonymous: false,
    });
    setHoverRating(0);
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
        starValue <= (interactive ? hoverRating || newFeedback.rating : rating);

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

  const selectedClinicData = availableClinics.find(
    (c) => c.id === parseInt(selectedClinic)
  );
  const doctorsForClinic = availableDoctors[selectedClinic] || [];
  const selectedDoctorData = doctorsForClinic.find(
    (d) => d.id === parseInt(selectedDoctor)
  );

  // Calculate progress for the multi-step form
  const getProgress = () => {
    let steps = 0;
    if (selectedClinic) steps++;
    if (selectedDoctor) steps++;
    if (newFeedback.rating > 0) steps++;
    if (newFeedback.message.trim()) steps++;
    return (steps / 4) * 100;
  };

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

        {/* Enhanced Tabs */}
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
                    {feedbackHistory.length}
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
            <div className="max-w-4xl mx-auto">
              <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                {/* Progress Bar */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 px-8 py-4 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {Math.round(getProgress())}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${getProgress()}%` }}
                    />
                  </div>
                </div>

                {/* Form Header */}
                <div className="px-8 py-6 border-b border-border">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      Share Your Experience
                    </h2>
                    <p className="text-muted-foreground">
                      Follow the steps below to submit your feedback
                    </p>
                  </div>
                </div>

                <div className="p-8">
                  <form onSubmit={handleSubmitFeedback} className="space-y-8">
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
                              selectedClinic === clinic.id.toString()
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/50 hover:bg-muted/30"
                            }`}
                            onClick={() => {
                              setSelectedClinic(clinic.id.toString());
                              setSelectedDoctor(""); // Reset doctor selection
                            }}
                          >
                            <div className="flex items-start space-x-4">
                              <img
                                src={clinic.image}
                                alt={clinic.name}
                                className="w-16 h-16 rounded-lg object-cover border border-border"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground text-base mb-1">
                                  {clinic.name}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {clinic.location}
                                </p>
                                <div className="flex items-center text-xs text-muted-foreground mb-2">
                                  <FiMapPin className="w-3 h-3 mr-1" />
                                  {clinic.address}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-primary font-medium">
                                    {clinic.completedAppointments} completed
                                    visits
                                  </span>
                                  <span className="text-muted-foreground">
                                    Last:{" "}
                                    {new Date(
                                      clinic.lastVisit
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="clinic"
                                value={clinic.id}
                                checked={
                                  selectedClinic === clinic.id.toString()
                                }
                                onChange={() => {}}
                                className="w-5 h-5 text-primary mt-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Doctor Selection */}
                    {selectedClinic && (
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
                          {selectedClinicData?.name}
                        </p>

                        <div className="ml-11 space-y-3">
                          {doctorsForClinic.map((doctor) => (
                            <div
                              key={doctor.id}
                              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                                selectedDoctor === doctor.id.toString()
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                              }`}
                              onClick={() =>
                                setSelectedDoctor(doctor.id.toString())
                              }
                            >
                              <div className="flex items-start space-x-4">
                                <img
                                  src={doctor.avatar}
                                  alt={doctor.name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-border"
                                />
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground text-base">
                                    {doctor.name}
                                  </h3>
                                  <p className="text-sm text-primary mb-2">
                                    {doctor.specialty}
                                  </p>
                                  <div className="space-y-1">
                                    {doctor.completedAppointments.map(
                                      (apt, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between text-sm text-muted-foreground"
                                        >
                                          <span>{apt.service}</span>
                                          <div className="flex items-center space-x-2">
                                            <FiCalendar className="w-3 h-3" />
                                            <span>
                                              {new Date(
                                                apt.date
                                              ).toLocaleDateString()}
                                            </span>
                                            <FiClock className="w-3 h-3 ml-2" />
                                            <span>{apt.time}</span>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                                <input
                                  type="radio"
                                  name="doctor"
                                  value={doctor.id}
                                  checked={
                                    selectedDoctor === doctor.id.toString()
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

                    {/* Step 3: Overall Rating */}
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
                            Overall Rating
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                          Rate your overall experience with{" "}
                          {selectedDoctorData?.name}
                        </p>

                        <div className="ml-11">
                          <div className="bg-muted/30 border border-border rounded-xl p-6">
                            <div className="text-center space-y-4">
                              <div className="flex items-center justify-center space-x-2">
                                {renderStars(newFeedback.rating, true, "large")}
                              </div>
                              <p className="text-lg font-medium text-foreground">
                                {getRatingText(newFeedback.rating)}
                              </p>
                              {newFeedback.rating > 0 && (
                                <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full">
                                  <FiAward className="w-4 h-4 text-primary mr-2" />
                                  <span className="text-sm font-medium text-primary">
                                    {newFeedback.rating}/5 Stars
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 4: Experience Message */}
                    {newFeedback.rating > 0 && (
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
                            Share Your Experience
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                          Tell us about your experience in detail
                        </p>

                        <div className="ml-11 space-y-2">
                          <textarea
                            value={newFeedback.message}
                            onChange={(e) =>
                              setNewFeedback((prev) => ({
                                ...prev,
                                message: e.target.value,
                              }))
                            }
                            placeholder="Tell us about your experience with the doctor, staff, and clinic. What did you like? What could be improved? Your detailed feedback helps us serve you better."
                            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            rows="6"
                            maxLength="500"
                            required
                          />
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>
                              Be specific and constructive in your feedback
                            </span>
                            <span
                              className={
                                newFeedback.message.length > 450
                                  ? "text-warning"
                                  : ""
                              }
                            >
                              {newFeedback.message.length}/500
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 5: Anonymous Option */}
                    {newFeedback.message.trim() && (
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
                            Privacy Settings
                          </label>
                        </div>

                        <div className="ml-11">
                          <div className="bg-muted/30 border border-border rounded-xl p-6">
                            <div className="flex items-start space-x-4">
                              <div className="flex items-center mt-1">
                                <input
                                  type="checkbox"
                                  id="anonymous"
                                  checked={newFeedback.anonymous}
                                  onChange={(e) =>
                                    setNewFeedback((prev) => ({
                                      ...prev,
                                      anonymous: e.target.checked,
                                    }))
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
                                    {newFeedback.anonymous ? (
                                      <FiEyeOff className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <FiEye className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-foreground">
                                      Submit as anonymous review
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {newFeedback.anonymous
                                      ? "Your review will be published without your name or profile information. Only clinic staff will see your identity for internal purposes."
                                      : "Your name and profile will be visible with this review to help other patients make informed decisions."}
                                  </p>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    {newFeedback.message.trim() && (
                      <motion.div
                        className="pt-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <button
                          type="submit"
                          className="w-full flex items-center justify-center space-x-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <FiSend className="w-5 h-5" />
                          <span>Submit Feedback</span>
                        </button>
                      </motion.div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* Review History - Simplified without pending status */
            <div className="max-w-5xl mx-auto space-y-6">
              {feedbackHistory.length > 0 ? (
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
                          <img
                            src={review.doctor.avatar}
                            alt={review.doctor.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-border"
                          />
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">
                              {review.appointment.service}
                            </h3>
                            <div className="flex items-center space-x-2 text-primary">
                              <span className="font-medium">
                                {review.doctor.name}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">
                                {review.doctor.specialty}
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
                              <div className="flex items-center">
                                <FiClock className="w-4 h-4 mr-1" />
                                {review.appointment.time}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {review.anonymous ? (
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
                      {/* Rating */}
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
                          {new Date(review.submittedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Review Message */}
                      <div className="bg-muted/20 rounded-xl p-4">
                        <p className="text-foreground leading-relaxed">
                          {review.message}
                        </p>
                      </div>

                      {/* Clinic Response */}
                      {review.clinicResponse && (
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
                                {review.clinicResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Review Stats */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <FiThumbsUp className="w-4 h-4 text-success" />
                            <span>{review.likes} found this helpful</span>
                          </div>
                          {review.helpful && (
                            <div className="flex items-center space-x-2 px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                              <FiAward className="w-4 h-4" />
                              <span>Helpful Review</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="bg-muted/20 rounded-full p-6 w-24 h-24 mx-auto mb-6">
                    <FiMessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-3">
                    No Reviews Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You haven't submitted any feedback yet. Share your
                    experience to help us improve our services!
                  </p>
                  <button
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    onClick={() => setActiveTab("new")}
                  >
                    <FiSend className="w-4 h-4" />
                    <span>Write Your First Review</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PatientFeedback;
