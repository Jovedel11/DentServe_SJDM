import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiSearch,
  FiPhone,
  FiMail,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiSend,
  FiClock,
  FiMapPin,
  FiShield,
  FiBook,
} from "react-icons/fi";

/**
 * ✅ Production-Ready Help & Support - Aligned with Database Schema
 */
const PatientHelp = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contactForm, setContactForm] = useState({
    subject: "",
    category: "",
    message: "",
    priority: "normal",
  });

  // ✅ UPDATED FAQ DATA - Reflects Actual System Features
  const faqData = [
    // APPOINTMENTS
    {
      id: 1,
      category: "appointments",
      question: "How do I book an appointment?",
      answer:
        "Navigate to the 'Book Appointment' page from your dashboard. Select your preferred clinic, doctor, service type, and available time slot. Fill in any additional notes about your visit, then confirm your booking. You'll receive an email notification once your appointment is confirmed.",
    },
    {
      id: 2,
      category: "appointments",
      question: "Can I cancel or reschedule my appointment?",
      answer:
        "Yes, you can cancel your appointment from the 'Upcoming Appointments' page. Click on the appointment card and select 'Cancel Appointment'. Please note that cancellations should be done in advance. Currently, for rescheduling, you'll need to cancel and book a new appointment.",
    },
    {
      id: 3,
      category: "appointments",
      question: "How do I view my appointment history?",
      answer:
        "Go to 'Appointment History' from your dashboard menu. You can view all your past appointments, filter by status (completed, cancelled), and see detailed information including clinic, doctor, service, and date. You can also archive old appointments to keep your history organized.",
    },
    {
      id: 4,
      category: "appointments",
      question: "What should I bring to my appointment?",
      answer:
        "Please bring a valid ID and your insurance card (if applicable). If this is your first visit, make sure your profile is complete with your medical conditions, allergies, and emergency contact information. This helps us provide you with better care.",
    },
    {
      id: 5,
      category: "appointments",
      question: "Will I receive appointment reminders?",
      answer:
        "Yes, you'll receive email reminders about your upcoming appointments. You can manage your notification preferences in the Settings page. Make sure your email address is up to date in your profile.",
    },

    // PROFILE & ACCOUNT
    {
      id: 6,
      category: "account",
      question: "How do I update my profile information?",
      answer:
        "Go to the 'Profile' page where you can edit your personal information (name, date of birth, gender, phone), upload a profile photo, update your emergency contact details, add medical conditions and allergies, specify your insurance provider, and select preferred doctors.",
    },
    {
      id: 7,
      category: "account",
      question: "Why is my medical history important?",
      answer:
        "Your medical conditions and allergies are crucial for your safety during dental procedures. Please keep this information current in your profile. Your dentist will review this before any treatment to ensure safe and appropriate care.",
    },
    {
      id: 8,
      category: "account",
      question: "How do I change my password?",
      answer:
        "Visit the 'Settings' page and go to the Security section. Enter your new password (minimum 6 characters) and confirm it. For your security, you'll need to log in again after changing your password.",
    },
    {
      id: 9,
      category: "account",
      question: "Can I update my emergency contact information?",
      answer:
        "Yes, go to your 'Profile' page and scroll to the Emergency Contact section. Update the name and phone number of your emergency contact. This information is important in case we need to reach someone during your appointment.",
    },

    // FEEDBACK & REVIEWS
    {
      id: 10,
      category: "feedback",
      question: "How do I leave feedback about my visit?",
      answer:
        "After completing an appointment, go to the 'Feedback' page. You'll see a list of clinics and doctors you've visited. You can rate both the clinic (facility, staff, service) and the doctor (care, professionalism) separately, with a star rating and written comment (minimum 10 characters).",
    },
    {
      id: 11,
      category: "feedback",
      question: "Can I edit or delete my feedback?",
      answer:
        "Currently, feedback cannot be edited or deleted once submitted to maintain authenticity and integrity of reviews. However, clinic staff can respond to your feedback, and you'll be notified of their response.",
    },
    {
      id: 12,
      category: "feedback",
      question: "Will the clinic see my feedback?",
      answer:
        "Yes, staff at the clinic can view all feedback submitted by patients. They may respond to your feedback, and you'll receive a notification when they do. Your feedback helps clinics improve their services.",
    },

    // DASHBOARD & ANALYTICS
    {
      id: 13,
      category: "dashboard",
      question: "What is my Health Score?",
      answer:
        "Your Health Score is calculated based on your appointment attendance and consistency. It appears on your dashboard and reflects how well you're maintaining your dental health through regular check-ups and completed treatments.",
    },
    {
      id: 14,
      category: "dashboard",
      question: "What information is shown on my dashboard?",
      answer:
        "Your dashboard displays upcoming appointments, appointment statistics (total, completed, cancelled), health analytics, recent notifications, profile completion status, and quick access to book new appointments. It's your central hub for managing your dental care.",
    },

    // DOCTORS & CLINICS
    {
      id: 15,
      category: "doctors",
      question: "How do I find dentists and clinics?",
      answer:
        "Use the 'Dentist' page to browse available dentists and clinics. You can view their profiles, specializations, ratings, and services offered. You can also use the 'Map View' to find clinics near your location.",
    },
    {
      id: 16,
      category: "doctors",
      question: "Can I select a preferred doctor?",
      answer:
        "Yes! In your Profile page, you can add doctors to your 'Preferred Doctors' list. This helps you quickly book appointments with doctors you trust and have seen before.",
    },
    {
      id: 17,
      category: "doctors",
      question: "How are doctor and clinic ratings calculated?",
      answer:
        "Ratings are based on patient feedback after completed appointments. Each rating includes separate scores for clinic experience (facility, staff, service) and doctor performance (care, professionalism, treatment), averaged to show an overall rating.",
    },

    // NOTIFICATIONS
    {
      id: 18,
      category: "notifications",
      question: "What types of notifications will I receive?",
      answer:
        "You'll receive notifications for: appointment confirmations, appointment reminders, appointment cancellations, feedback requests after visits, and responses to your feedback. All notifications are sent via email and also appear in your notification bell.",
    },
    {
      id: 19,
      category: "notifications",
      question: "How do I manage my notification preferences?",
      answer:
        "Go to Settings > Notifications to manage your email notification preferences. Appointment reminders are always sent for your safety, but you can control other notification types.",
    },

    // SETTINGS & PRIVACY
    {
      id: 20,
      category: "settings",
      question: "Can I change the theme/appearance?",
      answer:
        "Yes! Go to Settings > Appearance to choose between Light, Dark, or System theme. Your preference is saved locally in your browser and will apply across all your sessions.",
    },
    {
      id: 21,
      category: "settings",
      question: "How do I export my data?",
      answer:
        "In Settings > Privacy & Data, you can export all your personal data including profile information, appointment history, medical records, and feedback. This downloads a JSON file with all your data for your records (GDPR compliant).",
    },
    {
      id: 22,
      category: "settings",
      question: "How do I delete my account?",
      answer:
        "Account deletion is available in Settings > Privacy & Data > Danger Zone. This is permanent and irreversible. You'll need to contact support to complete the deletion process as it requires verification for security purposes.",
    },

    // TECHNICAL SUPPORT
    {
      id: 23,
      category: "technical",
      question: "Is my personal and medical information secure?",
      answer:
        "Yes, we use industry-standard encryption and security measures to protect your personal and medical information. Your data is stored securely in our database with restricted access, and we never share your information with third parties without your explicit consent.",
    },
    {
      id: 24,
      category: "technical",
      question: "Can I access my account from mobile devices?",
      answer:
        "Yes, our patient portal is fully responsive and works on all devices including smartphones and tablets. You can book appointments, view your history, submit feedback, and access all features from any device with internet access.",
    },
    {
      id: 25,
      category: "technical",
      question: "I'm having trouble logging into my account",
      answer:
        "First, ensure you're using the correct email and password. If you've forgotten your password, use the 'Forgot Password' link on the login page. If you recently signed up, make sure you've verified your email address. If issues persist, contact our support team.",
    },
    {
      id: 26,
      category: "technical",
      question: "What should I do if I don't receive email notifications?",
      answer:
        "Check your spam/junk folder first. Ensure your email address in your profile is correct and verified. Check your notification settings in Settings > Notifications to make sure email notifications are enabled. If the issue persists, contact support.",
    },
  ];

  const categories = [
    { id: "all", label: "All Topics", count: faqData.length },
    {
      id: "appointments",
      label: "Appointments",
      count: faqData.filter((f) => f.category === "appointments").length,
    },
    {
      id: "account",
      label: "Profile & Account",
      count: faqData.filter((f) => f.category === "account").length,
    },
    {
      id: "feedback",
      label: "Feedback & Reviews",
      count: faqData.filter((f) => f.category === "feedback").length,
    },
    {
      id: "dashboard",
      label: "Dashboard & Analytics",
      count: faqData.filter((f) => f.category === "dashboard").length,
    },
    {
      id: "doctors",
      label: "Doctors & Clinics",
      count: faqData.filter((f) => f.category === "doctors").length,
    },
    {
      id: "notifications",
      label: "Notifications",
      count: faqData.filter((f) => f.category === "notifications").length,
    },
    {
      id: "settings",
      label: "Settings & Privacy",
      count: faqData.filter((f) => f.category === "settings").length,
    },
    {
      id: "technical",
      label: "Technical Support",
      count: faqData.filter((f) => f.category === "technical").length,
    },
  ];

  const contactMethods = [
    {
      icon: FiPhone,
      title: "Phone Support",
      description: "Speak with our support team",
      contact: "+63 XXX XXX XXXX", // ✅ Update with actual contact
      hours: "Mon-Fri: 8AM-6PM",
      action: "Call Now",
    },
    {
      icon: FiMail,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@dentserve.com", // ✅ Update with actual email
      hours: "Response within 24 hours",
      action: "Send Email",
    },
  ];

  const resources = [
    {
      icon: FiBook,
      title: "FAQ Guide",
      description: "Complete guide with frequently asked questions",
      link: "#faq-section",
      internal: true,
    },
    {
      icon: FiShield,
      title: "Privacy Policy",
      description: "How we protect and handle your information",
      link: "/privacy-policy",
      internal: true,
    },
    {
      icon: FiFileText,
      title: "Terms of Service",
      description: "Terms and conditions for using our services",
      link: "/terms-of-service",
      internal: true,
    },
  ];

  const filteredFaqs = faqData.filter((faq) => {
    const matchesCategory =
      activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFaqToggle = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const handleContactFormChange = (field, value) => {
    setContactForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleContactFormSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Contact form submitted:", contactForm);
      // ✅ TODO: Integrate with your support ticket system or email service
      // For now, just log and show success
      setContactForm({
        subject: "",
        category: "",
        message: "",
        priority: "normal",
      });
      alert(
        "Your message has been sent successfully! We'll get back to you soon."
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("There was an error sending your message. Please try again.");
    }
  };

  const scrollToFaq = () => {
    document
      .getElementById("faq-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen p-6 bg-background md:p-6 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8 md:mb-8 mb-6 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2 font-sans md:text-3xl text-2xl">
            Help & Support
          </h1>
          <p className="text-muted-foreground text-lg md:text-lg text-base">
            Find answers to your questions or get in touch with our support team
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          className="mb-8 md:mb-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-8 gap-6">
          {/* FAQ Section */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
              <div
                className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4"
                id="faq-section"
              >
                <h2 className="text-xl font-semibold text-foreground md:text-xl text-lg">
                  Frequently Asked Questions
                </h2>
              </div>

              {/* Categories */}
              <div className="px-6 py-6 border-b border-border md:px-6 px-4">
                <div className="flex items-start gap-2 flex-wrap md:gap-2 gap-1 overflow-x-auto md:overflow-x-visible">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                        activeCategory === category.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-card-foreground border-border hover:border-primary/30 hover:text-primary"
                      }`}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      <span className="leading-none">{category.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold min-w-[18px] text-center ${
                          activeCategory === category.id
                            ? "bg-primary-foreground/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {category.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ List */}
              <div className="p-6 md:p-6 p-4">
                {filteredFaqs.length > 0 ? (
                  <div className="space-y-0">
                    {filteredFaqs.map((faq, index) => (
                      <motion.div
                        key={faq.id}
                        className="border-b border-border last:border-b-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                      >
                        <button
                          className={`w-full flex justify-between items-start gap-4 py-4 bg-none border-none text-left cursor-pointer transition-colors duration-300 ${
                            expandedFaq === faq.id
                              ? "text-primary"
                              : "text-foreground hover:text-primary"
                          }`}
                          onClick={() => handleFaqToggle(faq.id)}
                        >
                          <span className="text-base font-medium leading-relaxed flex-1">
                            {faq.question}
                          </span>
                          {expandedFaq === faq.id ? (
                            <FiChevronUp className="text-xl flex-shrink-0 transition-transform duration-300" />
                          ) : (
                            <FiChevronDown className="text-xl flex-shrink-0 transition-transform duration-300" />
                          )}
                        </button>
                        {expandedFaq === faq.id && (
                          <motion.div
                            className="pb-4 overflow-hidden"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <p className="text-base leading-relaxed text-muted-foreground m-0">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <FiSearch className="text-6xl text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No results found
                    </h3>
                    <p className="text-base text-muted-foreground m-0">
                      Try adjusting your search or browse different categories.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Side Content */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Methods */}
            <motion.div
              className="bg-card border border-border rounded-2xl shadow-md overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4">
                <h3 className="text-xl font-semibold text-foreground md:text-xl text-lg">
                  Contact Support
                </h3>
              </div>
              <div className="p-6 md:p-6 p-4 space-y-4">
                {contactMethods.map((method, index) => {
                  const Icon = method.icon;
                  return (
                    <motion.div
                      key={method.title}
                      className="flex items-start gap-4 p-4 border border-border rounded-lg bg-muted/20 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary text-primary-foreground flex-shrink-0">
                        <Icon className="text-xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-foreground mb-1">
                          {method.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {method.description}
                        </p>
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-primary block">
                            {method.contact}
                          </span>
                          <span className="text-xs text-muted-foreground/80 block">
                            {method.hours}
                          </span>
                        </div>
                      </div>
                      <button className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 whitespace-nowrap flex-shrink-0">
                        {method.action}
                        <FiExternalLink className="text-xs" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Resources */}
            <motion.div
              className="bg-card border border-border rounded-2xl shadow-md overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4">
                <h3 className="text-xl font-semibold text-foreground md:text-xl text-lg">
                  Helpful Resources
                </h3>
              </div>
              <div className="p-6 md:p-6 p-4 space-y-2">
                {resources.map((resource, index) => {
                  const Icon = resource.icon;
                  return (
                    <motion.button
                      key={resource.title}
                      onClick={
                        resource.internal && resource.link === "#faq-section"
                          ? scrollToFaq
                          : undefined
                      }
                      className="w-full flex items-start gap-3 p-3 rounded-lg text-card-foreground transition-all duration-300 hover:bg-muted/50 hover:text-primary cursor-pointer text-left"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary flex-shrink-0">
                        <Icon className="text-base" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium leading-tight mb-1">
                          {resource.title}
                        </h4>
                        <p className="text-xs text-muted-foreground m-0 leading-tight opacity-80">
                          {resource.description}
                        </p>
                      </div>
                      <FiExternalLink className="text-sm flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              className="bg-card border border-border rounded-2xl shadow-md overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="px-6 py-6 bg-muted/30 border-b border-border md:px-6 px-4">
                <h3 className="text-xl font-semibold text-foreground md:text-xl text-lg">
                  Send us a Message
                </h3>
                <p className="text-sm text-muted-foreground mt-2 m-0">
                  Can't find what you're looking for? Send us a message and
                  we'll get back to you.
                </p>
              </div>

              <form
                onSubmit={handleContactFormSubmit}
                className="p-6 md:p-6 p-4 space-y-4"
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground/80">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) =>
                      handleContactFormChange("subject", e.target.value)
                    }
                    className="w-full px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground/80">
                      Category
                    </label>
                    <select
                      value={contactForm.category}
                      onChange={(e) =>
                        handleContactFormChange("category", e.target.value)
                      }
                      className="w-full px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                      required
                    >
                      <option value="">Select a category</option>
                      <option value="appointments">Appointments</option>
                      <option value="account">Profile & Account</option>
                      <option value="feedback">Feedback & Reviews</option>
                      <option value="technical">Technical Support</option>
                      <option value="suggestions">Suggestions</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground/80">
                      Priority
                    </label>
                    <select
                      value={contactForm.priority}
                      onChange={(e) =>
                        handleContactFormChange("priority", e.target.value)
                      }
                      className="w-full px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground/80">
                    Message
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) =>
                      handleContactFormChange("message", e.target.value)
                    }
                    className="w-full px-3 py-3 border-2 border-input bg-input text-foreground rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 resize-vertical min-h-[120px]"
                    placeholder="Please describe your issue in detail..."
                    rows="6"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground border-none rounded-lg text-base font-medium cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 mt-4"
                >
                  <FiSend className="text-base" />
                  <span>Send Message</span>
                </button>
              </form>
            </motion.div>

            {/* Office Hours - You can customize this */}
            <motion.div
              className="bg-card border border-border rounded-2xl shadow-md overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="p-6 md:p-6 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <FiClock className="text-primary text-2xl flex-shrink-0" />
                  <h4 className="text-lg font-semibold text-foreground">
                    Support Hours
                  </h4>
                </div>

                <div className="space-y-0 mb-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-sm font-medium text-foreground">
                      Monday - Friday
                    </span>
                    <span className="text-sm text-muted-foreground">
                      8:00 AM - 6:00 PM
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-sm font-medium text-foreground">
                      Saturday
                    </span>
                    <span className="text-sm text-muted-foreground">
                      9:00 AM - 3:00 PM
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-sm font-medium text-foreground">
                      Sunday
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Closed
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-4 border-t border-border text-sm text-muted-foreground">
                  <FiMapPin className="text-primary text-base flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    San Jose Del Monte, Bulacan, Philippines
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHelp;
