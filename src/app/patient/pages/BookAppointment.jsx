import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Building2,
  Star,
  ArrowLeft,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import WelcomeModal from "../../shared/components/welcome-modal";

const BookAppointment = () => {
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    clinic: "",
    service: "",
    doctor: "",
    date: "",
    time: "",
    notes: "",
    contactInfo: {
      phone: "",
      email: "",
    },
  });

  // Mock data - replace with API calls
  const clinics = [
    {
      id: 1,
      name: "Downtown Dental Center",
      address: "123 Main St, Downtown",
      distance: "0.8 miles",
      rating: 4.9,
      image:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&h=200&fit=crop",
      services: ["General", "Cosmetic", "Orthodontics"],
    },
    {
      id: 2,
      name: "Smile Care Clinic",
      address: "456 Oak Ave, Midtown",
      distance: "1.2 miles",
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=300&h=200&fit=crop",
      services: ["General", "Pediatric", "Emergency"],
    },
    {
      id: 3,
      name: "Advanced Dental Solutions",
      address: "789 Pine St, Uptown",
      distance: "2.1 miles",
      rating: 4.7,
      image:
        "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=300&h=200&fit=crop",
      services: ["Cosmetic", "Surgical", "Implants"],
    },
  ];

  const services = [
    {
      id: 1,
      name: "Regular Checkup",
      duration: "60 min",
      price: "$150",
      description: "Comprehensive dental examination and cleaning",
      icon: Stethoscope,
      category: "General",
    },
    {
      id: 2,
      name: "Teeth Cleaning",
      duration: "45 min",
      price: "$120",
      description: "Professional dental cleaning and polishing",
      icon: Stethoscope,
      category: "General",
    },
    {
      id: 3,
      name: "Cavity Filling",
      duration: "90 min",
      price: "$250",
      description: "Treatment for dental cavities and decay",
      icon: Stethoscope,
      category: "Restorative",
    },
    {
      id: 4,
      name: "Teeth Whitening",
      duration: "120 min",
      price: "$400",
      description: "Professional teeth whitening treatment",
      icon: Stethoscope,
      category: "Cosmetic",
    },
    {
      id: 5,
      name: "Root Canal",
      duration: "180 min",
      price: "$800",
      description: "Root canal therapy for infected teeth",
      icon: Stethoscope,
      category: "Endodontic",
    },
    {
      id: 6,
      name: "Consultation",
      duration: "30 min",
      price: "$80",
      description: "Initial consultation for treatment planning",
      icon: Stethoscope,
      category: "General",
    },
  ];

  const doctors = [
    {
      id: 1,
      name: "Dr. Sarah Martinez",
      specialty: "General Dentistry",
      rating: 4.9,
      experience: "12 years",
      image:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
      clinicId: 1,
    },
    {
      id: 2,
      name: "Dr. Michael Johnson",
      specialty: "Orthodontics",
      rating: 4.8,
      experience: "15 years",
      image:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
      clinicId: 1,
    },
    {
      id: 3,
      name: "Dr. Emily Smith",
      specialty: "Cosmetic Dentistry",
      rating: 4.7,
      experience: "8 years",
      image:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
      clinicId: 2,
    },
    {
      id: 4,
      name: "Dr. James Brown",
      specialty: "Oral Surgery",
      rating: 4.9,
      experience: "20 years",
      image:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
      clinicId: 3,
    },
  ];

  const timeSlots = [
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
  ];

  const steps = [
    { id: 1, title: "Select Clinic", icon: Building2 },
    { id: 2, title: "Choose Service", icon: Stethoscope },
    { id: 3, title: "Pick Doctor", icon: User },
    { id: 4, title: "Date & Time", icon: Calendar },
    { id: 5, title: "Contact Info", icon: Phone },
    { id: 6, title: "Review", icon: CheckCircle2 },
  ];

  // Filter doctors based on selected clinic
  const availableDoctors = formData.clinic
    ? doctors.filter((doctor) => doctor.clinicId === parseInt(formData.clinic))
    : doctors;

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
  };

  const handleSelectClinic = () => {
    // Navigate to clinics page - implement your routing logic
    console.log("Navigate to clinics page");
    setShowWelcomeModal(false);
  };

  const handleContinueBooking = () => {
    setShowWelcomeModal(false);
  };

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log("Booking appointment:", formData);
    // Handle appointment booking logic here
  };

  const isStepComplete = (step) => {
    switch (step) {
      case 1:
        return formData.clinic !== "";
      case 2:
        return formData.service !== "";
      case 3:
        return formData.doctor !== "";
      case 4:
        return formData.date !== "" && formData.time !== "";
      case 5:
        return (
          formData.contactInfo.phone !== "" && formData.contactInfo.email !== ""
        );
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Select a Clinic
              </h2>
              <p className="text-muted-foreground">
                Choose your preferred dental clinic
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clinics.map((clinic) => (
                <motion.div
                  key={clinic.id}
                  className={`group cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                    formData.clinic === clinic.id.toString()
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                  onClick={() =>
                    handleInputChange("clinic", clinic.id.toString())
                  }
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="aspect-video overflow-hidden rounded-lg mb-4">
                    <img
                      src={clinic.image}
                      alt={clinic.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground">
                        {clinic.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">
                          {clinic.rating}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{clinic.address}</span>
                    </div>
                    <div className="text-sm text-primary font-medium">
                      {clinic.distance} away
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {clinic.services.map((service, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Select a Service
              </h2>
              <p className="text-muted-foreground">
                Choose the dental service you need
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <motion.div
                    key={service.id}
                    className={`cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
                      formData.service === service.name
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    onClick={() => handleInputChange("service", service.name)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {service.name}
                          </h3>
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                            {service.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {service.duration}
                        </div>
                        <div className="font-bold text-primary">
                          {service.price}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Choose Your Doctor
              </h2>
              <p className="text-muted-foreground">
                Select your preferred dentist
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableDoctors.map((doctor) => (
                <motion.div
                  key={doctor.id}
                  className={`cursor-pointer rounded-2xl border-2 p-6 text-center transition-all duration-200 hover:shadow-lg ${
                    formData.doctor === doctor.name
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                  onClick={() => handleInputChange("doctor", doctor.name)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-20 h-20 mx-auto mb-4 overflow-hidden rounded-full border-4 border-primary/20">
                    <img
                      src={doctor.image}
                      alt={doctor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {doctor.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {doctor.specialty}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{doctor.rating}</span>
                    </div>
                    <span>{doctor.experience}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Select Date & Time
              </h2>
              <p className="text-muted-foreground">
                Choose your preferred appointment date and time
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground">
                  Select Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground">
                  Available Time Slots
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        formData.time === time
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                      }`}
                      onClick={() => handleInputChange("time", time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Contact Information
              </h2>
              <p className="text-muted-foreground">
                Please provide your contact details
              </p>
            </div>
            <div className="max-w-lg mx-auto space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.contactInfo.phone}
                    onChange={(e) =>
                      handleInputChange("contactInfo.phone", e.target.value)
                    }
                    className="w-full rounded-xl border-2 border-border bg-background pl-11 pr-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.contactInfo.email}
                    onChange={(e) =>
                      handleInputChange("contactInfo.email", e.target.value)
                    }
                    className="w-full rounded-xl border-2 border-border bg-background pl-11 pr-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Additional Notes (Optional)
                </label>
                <textarea
                  placeholder="Any specific requirements or notes..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows="4"
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        const selectedClinic = clinics.find(
          (c) => c.id.toString() === formData.clinic
        );
        const selectedDoctor = doctors.find((d) => d.name === formData.doctor);

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Review & Confirm
              </h2>
              <p className="text-muted-foreground">
                Please review your appointment details
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl border-2 border-border bg-card p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <Building2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Clinic</div>
                    <div className="text-muted-foreground">
                      {selectedClinic?.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedClinic?.address}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Stethoscope className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Service</div>
                    <div className="text-muted-foreground">
                      {formData.service}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <User className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Doctor</div>
                    <div className="text-muted-foreground">
                      {formData.doctor}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDoctor?.specialty}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      Date & Time
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(formData.date).toLocaleDateString()} at{" "}
                      {formData.time}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Contact</div>
                    <div className="text-muted-foreground">
                      {formData.contactInfo.phone}
                    </div>
                    <div className="text-muted-foreground">
                      {formData.contactInfo.email}
                    </div>
                  </div>
                </div>

                {formData.notes && (
                  <div className="flex items-start gap-4">
                    <div className="h-5 w-5 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">Notes</div>
                      <div className="text-muted-foreground">
                        {formData.notes}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        onSelectClinic={handleSelectClinic}
        onContinue={handleContinueBooking}
      />

      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl">
          {/* Progress Steps */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const isAccessible = step.id <= currentStep;

                return (
                  <div
                    key={step.id}
                    className="flex items-center flex-shrink-0"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : isActive
                            ? "border-primary bg-primary/10 text-primary"
                            : isAccessible
                            ? "border-muted-foreground bg-background text-muted-foreground"
                            : "border-muted bg-muted text-muted-foreground/50"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-sm font-medium ${
                            isActive || isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.title}
                        </div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`mx-4 h-0.5 w-16 transition-colors duration-200 ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-12"
            >
              <div className="rounded-2xl border bg-card p-8 shadow-sm">
                {renderStepContent()}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <motion.div
            className="flex items-center justify-between border-t pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>
              )}
            </div>

            <div>
              {currentStep < 6 ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepComplete(currentStep)}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all duration-200 ${
                    isStepComplete(currentStep)
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  }`}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Confirm Appointment
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BookAppointment;
