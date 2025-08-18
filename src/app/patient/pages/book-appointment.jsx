import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUser,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";
import { useTheme } from "@/core/contexts/ThemeProvider";
import { cn } from "@/lib/utils";

const clinics = [
  {
    id: 1,
    name: "Downtown Dental Clinic",
    address: "123 Main St, City Center",
    distance: "0.5 miles",
    hours: "Mon-Fri: 8am-7pm, Sat: 9am-4pm",
    phone: "(555) 123-4567",
  },
  {
    id: 2,
    name: "Westside Dental Care",
    address: "456 Oak Ave, West District",
    distance: "1.2 miles",
    hours: "Mon-Thu: 9am-6pm, Fri: 8am-5pm",
    phone: "(555) 987-6543",
  },
  {
    id: 3,
    name: "Uptown Dental Studio",
    address: "789 Pine Rd, Uptown",
    distance: "2.0 miles",
    hours: "Tue-Sat: 8am-6pm, Sun: 10am-2pm",
    phone: "(555) 456-7890",
  },
];

const services = [
  {
    id: 1,
    name: "Regular Checkup",
    duration: "60 min",
    price: "$150",
    description: "Comprehensive dental examination and cleaning",
  },
  {
    id: 2,
    name: "Teeth Cleaning",
    duration: "45 min",
    price: "$120",
    description: "Professional dental cleaning and polishing",
  },
  {
    id: 3,
    name: "Cavity Filling",
    duration: "90 min",
    price: "$250",
    description: "Treatment for dental cavities and decay",
  },
  {
    id: 4,
    name: "Teeth Whitening",
    duration: "120 min",
    price: "$400",
    description: "Professional teeth whitening treatment",
  },
  {
    id: 5,
    name: "Root Canal",
    duration: "180 min",
    price: "$800",
    description: "Root canal therapy for infected teeth",
  },
  {
    id: 6,
    name: "Consultation",
    duration: "30 min",
    price: "$80",
    description: "Initial consultation for treatment planning",
  },
];

const doctors = [
  {
    id: 1,
    name: "Dr. Martinez",
    specialty: "General Dentistry",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Dr. Johnson",
    specialty: "Orthodontics",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Dr. Smith",
    specialty: "Cosmetic Dentistry",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 4,
    name: "Dr. Brown",
    specialty: "Oral Surgery",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
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

const BookAppointment = () => {
  const { theme } = useTheme();
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [hasPreferredClinic, setHasPreferredClinic] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    clinic: "",
    service: "",
    doctor: "",
    date: "",
    time: "",
    notes: "",
    contactInfo: {
      name: "",
      phone: "",
      email: "",
    },
  });

  // Build steps array conditionally
  const buildSteps = () => {
    const baseSteps = [
      { id: 1, title: "Select Service", icon: FiUser },
      { id: 2, title: "Choose Clinic", icon: FiMapPin },
      { id: 3, title: "Choose Doctor", icon: FiUser },
      { id: 4, title: "Pick Date & Time", icon: FiCalendar },
      { id: 5, title: "Contact Info", icon: FiPhone },
      { id: 6, title: "Review & Confirm", icon: FiCheckCircle },
    ];

    return baseSteps;
  };

  const steps = buildSteps();

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
    if (currentStep < steps.length) {
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
    // API call to book appointment would go here
    alert("Appointment booked successfully!");
  };

  const isStepComplete = (step) => {
    switch (step) {
      case 1:
        return formData.service !== "";
      case 2:
        return formData.clinic !== "";
      case 3:
        return formData.doctor !== "";
      case 4:
        return formData.date !== "" && formData.time !== "";
      case 5:
        return (
          formData.contactInfo.name !== "" &&
          formData.contactInfo.phone !== "" &&
          formData.contactInfo.email !== ""
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
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Select a Service
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose the dental service you need
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  className={cn(
                    "border rounded-xl p-4 cursor-pointer transition-all",
                    formData.service === service.name
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500"
                  )}
                  onClick={() => handleInputChange("service", service.name)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {service.name}
                    </h3>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {service.duration}
                      </span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        {service.price}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {service.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose Your Clinic
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select your preferred dental clinic
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinics.map((clinic) => (
                <motion.div
                  key={clinic.id}
                  className={cn(
                    "border rounded-xl p-4 cursor-pointer transition-all",
                    formData.clinic === clinic.name
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500"
                  )}
                  onClick={() => handleInputChange("clinic", clinic.name)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {clinic.name}
                    </h3>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {clinic.distance}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {clinic.address}
                  </p>
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>{clinic.hours}</p>
                    <p className="mt-1">{clinic.phone}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose Your Doctor
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select your preferred dentist
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <motion.div
                  key={doctor.id}
                  className={cn(
                    "border rounded-xl p-4 cursor-pointer transition-all",
                    formData.doctor === doctor.name
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500"
                  )}
                  onClick={() => handleInputChange("doctor", doctor.name)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-200">
                      <img
                        src={doctor.image}
                        alt={doctor.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {doctor.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {doctor.specialty}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span className="text-sm font-medium">
                          {doctor.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Select Date & Time
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose your preferred appointment date and time
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Time Slots
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      className={cn(
                        "py-2 px-3 text-sm rounded-lg transition-colors",
                        formData.time === time
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                      )}
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
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please provide your contact details
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.contactInfo.name}
                    onChange={(e) =>
                      handleInputChange("contactInfo.name", e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.contactInfo.phone}
                    onChange={(e) =>
                      handleInputChange("contactInfo.phone", e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.contactInfo.email}
                    onChange={(e) =>
                      handleInputChange("contactInfo.email", e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  placeholder="Any specific requirements or notes..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows="4"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Review & Confirm
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please review your appointment details
              </p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                    <FiUser className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Service
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.service}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                    <FiMapPin className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Clinic
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.clinic}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                    <FiUser className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Doctor
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.doctor}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                    <FiCalendar className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Date
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(formData.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                    <FiClock className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Time
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                    <FiPhone className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Phone
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.contactInfo.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                    <FiMail className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Email
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.contactInfo.email}
                    </p>
                  </div>
                </div>
                {formData.notes && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
                      <FiUser className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Notes
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formData.notes}
                      </p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Welcome to DentalCare!
                  </h2>
                  <button
                    onClick={() => setShowWelcomeModal(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  Do you have a preferred clinic location?
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setHasPreferredClinic(true);
                      setShowWelcomeModal(false);
                    }}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Yes, I have a preference
                  </button>
                  <button
                    onClick={() => {
                      setHasPreferredClinic(false);
                      setShowWelcomeModal(false);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
                  >
                    No, I need help choosing
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <div className="flex flex-wrap justify-between relative">
            {steps.map((step, index) => {
              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center relative pb-8 md:pb-0 z-10",
                    index !== steps.length - 1 ? "flex-1" : ""
                  )}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-primary-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <FiCheckCircle size={18} />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs md:text-sm font-medium text-center max-w-20",
                        isActive || isCompleted
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "hidden md:block h-1 flex-1 mx-2",
                        isCompleted
                          ? "bg-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 md:p-8 mb-8"
        >
          {renderStepContent()}
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-gray-200 dark:border-gray-700 pt-6"
        >
          <div className="flex justify-between">
            {currentStep > 1 ? (
              <button
                onClick={handlePrevious}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Previous
              </button>
            ) : (
              <div></div>
            )}

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={!isStepComplete(currentStep)}
                className={cn(
                  "px-6 py-3 bg-primary-600 text-white font-medium rounded-lg transition-colors",
                  !isStepComplete(currentStep)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-primary-700"
                )}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center"
              >
                <FiCheckCircle className="mr-2" />
                Confirm Appointment
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookAppointment;
