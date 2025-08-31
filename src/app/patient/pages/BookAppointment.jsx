import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Building2,
  Star,
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  MapPin,
  MessageSquare,
  Clock,
  Search,
  AlertCircle,
  Loader2,
} from "lucide-react";
import WelcomeModal from "../components/welcome-modal";
import {
  clinics,
  doctors,
  services,
  serviceCategories,
  timeSlots,
} from "@/data/patient/real/mock-appointment";
import { useAuth } from "@/auth/context/AuthProvider";

const BookAppointment = () => {
  const { profile } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    clinic: "",
    service: "",
    doctor: "",
    date: "",
    time: "",
    notes: "",
  });

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const steps = [
    { id: 1, title: "Select Clinic", icon: Building2 },
    { id: 2, title: "Choose Service", icon: Stethoscope },
    { id: 3, title: "Pick Doctor", icon: User },
    { id: 4, title: "Date & Time", icon: Calendar },
    { id: 5, title: "Review", icon: CheckCircle2 },
  ];

  // Computed Values
  const filteredClinics = clinics.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.specialties.some((specialty) =>
        specialty.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const conditions = profile?.role_specific_data?.medical_conditions?.forEach(
    (condition) => condition
  );

  const filteredServices =
    selectedCategory === "all"
      ? services.slice(0, 5)
      : services
          .filter((service) => service.category === selectedCategory)
          .slice(0, 5);

  const availableDoctors = formData.clinic
    ? doctors.filter((doctor) => doctor.clinicId === formData.clinic)
    : doctors;

  // Event Handlers
  const handleWelcomeModalClose = (action) => {
    setShowWelcomeModal(false);
    if (action === "browse") {
      console.log("Navigate to clinics/map page");
    }
  };

  const handleSelectClinic = () => handleWelcomeModalClose("browse");
  const handleContinueBooking = () => handleWelcomeModalClose("continue");

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const bookingData = {
        ...formData,
        userProfile,
        timestamp: new Date().toISOString(),
      };

      console.log("Booking appointment:", bookingData);

      // Success feedback
      alert("Appointment booked successfully!");

      // Reset form or redirect
      // navigate('/appointments');
    } catch (err) {
      setError(err.message || "Failed to book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
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
      default:
        return false;
    }
  };

  // Step Content Renderers
  const renderClinicStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Select Your Clinic
        </h2>
        <p className="text-muted-foreground">
          Choose from our network of trusted dental clinics
        </p>
      </div>

      {/* Search Input */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clinics by name, location, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Clinics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredClinics.map((clinic) => (
          <motion.div
            key={clinic.id}
            className={`group cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-xl ${
              formData.clinic === clinic.id
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card hover:border-primary/50"
            }`}
            onClick={() => handleInputChange("clinic", clinic.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Clinic Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {clinic.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-foreground">
                      {clinic.rating}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({clinic.total_reviews} reviews)
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{clinic.address}</span>
                </div>
              </div>
              <div className="aspect-square w-20 h-20 overflow-hidden rounded-xl border border-border flex-shrink-0">
                <img
                  src={clinic.image}
                  alt={clinic.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </div>

            {/* Clinic Info */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {clinic.description}
              </p>

              {/* Specialties */}
              <div className="flex flex-wrap gap-2">
                {clinic.specialties.slice(0, 3).map((specialty, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                  >
                    {specialty}
                  </span>
                ))}
                {clinic.specialties.length > 3 && (
                  <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                    +{clinic.specialties.length - 3} more
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2">
                {clinic.features.slice(0, 2).map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Recent Reviews */}
              {clinic.recentReviews && clinic.recentReviews.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      Recent Review
                    </span>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {[...Array(clinic.recentReviews[0].rating)].map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 fill-yellow-400 text-yellow-400"
                            />
                          )
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        by {clinic.recentReviews[0].patient}
                      </span>
                    </div>
                    <p className="text-sm text-foreground italic">
                      "{clinic.recentReviews[0].comment}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredClinics.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No clinics found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria
          </p>
        </div>
      )}
    </div>
  );

  const renderServiceStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Select a Service
        </h2>
        <p className="text-muted-foreground">
          Choose from our most popular dental services
        </p>
      </div>

      {/* Service Categories */}
      <div className="flex flex-wrap justify-center gap-2">
        {serviceCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Services Note */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 inline-block">
          Showing our top 5 most requested services. Need a specific treatment?
          <span className="text-primary font-medium ml-1">
            Contact us directly.
          </span>
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 max-w-4xl mx-auto">
        {filteredServices.map((service) => {
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
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground text-lg">
                        {service.name}
                      </h3>
                      {service.popular && (
                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                          Popular
                        </span>
                      )}
                      {service.priority <= 3 && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-full">
                      {service.category}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {service.description}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    {service.duration}
                  </div>
                  <div className="font-bold text-primary text-xl">
                    {service.price}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Services CTA */}
      <div className="text-center">
        <div className="bg-muted/20 rounded-xl p-6 max-w-md mx-auto">
          <h4 className="font-semibold text-foreground mb-2">
            Need a different service?
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            We offer comprehensive dental care beyond these popular services.
          </p>
          <button className="text-primary font-medium hover:underline text-sm">
            View All Services & Treatments
          </button>
        </div>
      </div>
    </div>
  );

  const renderDoctorStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Choose Your Doctor
        </h2>
        <p className="text-muted-foreground">
          Select your preferred dentist for this service
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {availableDoctors.map((doctor) => (
          <motion.div
            key={doctor.id}
            className={`cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
              formData.doctor === doctor.name
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card hover:border-primary/50"
            }`}
            onClick={() => handleInputChange("doctor", doctor.name)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 overflow-hidden rounded-xl border-2 border-primary/20 flex-shrink-0">
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {doctor.name}
                </h3>
                <p className="text-primary font-medium mb-2">
                  {doctor.specialty}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{doctor.rating}</span>
                  </div>
                  <span>{doctor.experience}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {doctor.education.split(",")[0]}
                </p>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {doctor.specializations.slice(0, 2).map((spec, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{doctor.availability}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {availableDoctors.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No doctors available
          </h3>
          <p className="text-muted-foreground">
            Please select a clinic first to see available doctors
          </p>
        </div>
      )}
    </div>
  );

  const renderDateTimeStep = () => (
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

      {/* Optional Notes */}
      <div className="max-w-2xl mx-auto">
        <label className="block text-sm font-medium text-foreground mb-2">
          Additional Notes (Optional)
        </label>
        <textarea
          placeholder="Any specific requirements, concerns, or notes for your appointment..."
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          rows="4"
          className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none resize-none"
        />
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedClinic = clinics.find((c) => c.id === formData.clinic);
    const selectedDoctor = doctors.find((d) => d.name === formData.doctor);
    const selectedService = services.find((s) => s.name === formData.service);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Review & Confirm
          </h2>
          <p className="text-muted-foreground">
            Please review your appointment details before confirming
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Appointment Details */}
            <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Appointment Details
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
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

                <div className="flex items-start gap-3">
                  <Stethoscope className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Service</div>
                    <div className="text-muted-foreground">
                      {formData.service}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedService?.duration} • {selectedService?.price}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
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

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      Date & Time
                    </div>
                    <div className="text-muted-foreground">
                      {formData.date &&
                        new Date(formData.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formData.time}
                    </div>
                  </div>
                </div>

                {formData.notes && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">Notes</div>
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        {formData.notes}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Your Information
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      Patient Name
                    </div>
                    <div className="text-muted-foreground">
                      {profile?.profile?.first_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Phone</div>
                    <div className="text-muted-foreground">
                      {profile?.phone}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Email</div>
                    <div className="text-muted-foreground">
                      {profile?.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      Medical Conditions
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {conditions || []}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Your contact information is taken from
                  your profile. You can update it in your account settings if
                  needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderClinicStep();
      case 2:
        return renderServiceStep();
      case 3:
        return renderDoctorStep();
      case 4:
        return renderDateTimeStep();
      case 5:
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <>
      <WelcomeModal
        isOpen={showWelcomeModal}
        onSelectClinic={handleSelectClinic}
        onContinue={handleContinueBooking}
      />

      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Book Your Appointment
            </h1>
            <p className="text-muted-foreground">
              Schedule your dental care appointment in a few simple steps
            </p>
          </motion.div>

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

          {/* Error Message */}
          {error && (
            <motion.div
              className="mb-6 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-12"
            >
              <div className="rounded-2xl border bg-card p-8 shadow-lg">
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
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border-2 border-border bg-background px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>
              )}
            </div>

            <div>
              {currentStep < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepComplete(currentStep) || loading}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all duration-200 ${
                    isStepComplete(currentStep) && !loading
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
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Confirm Appointment
                    </>
                  )}
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
