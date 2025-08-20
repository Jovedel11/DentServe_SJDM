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
 * Help & Support page component - provides assistance and resources for patients
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

  // Mock FAQ data - comprehensive dental care questions
  const faqData = [
    {
      id: 1,
      category: "appointments",
      question: "How do I book an appointment?",
      answer:
        "You can book an appointment by navigating to the 'Book Appointment' page in your dashboard. Select your preferred service, doctor, date, and time, then fill in your contact information to confirm the booking. You'll receive a confirmation email with appointment details.",
    },
    {
      id: 2,
      category: "appointments",
      question: "Can I reschedule or cancel my appointment?",
      answer:
        "Yes, you can reschedule or cancel your appointment up to 24 hours before the scheduled time. Go to the 'My Appointments' page, find your appointment, and click 'Reschedule' or 'Cancel'. Please note that cancellations within 24 hours may incur a fee.",
    },
    {
      id: 3,
      category: "appointments",
      question: "What should I bring to my appointment?",
      answer:
        "Please bring a valid ID, your insurance card (if applicable), a list of current medications, and any previous dental records or X-rays from other providers. Arrive 15 minutes early to complete any necessary paperwork.",
    },
    {
      id: 4,
      category: "billing",
      question: "How do I view my billing history and invoices?",
      answer:
        "Your billing history is available in the 'Billing' section of your profile. You can view past invoices, payment status, insurance claims, and download receipts for your records. All payments and transactions are securely stored.",
    },
    {
      id: 5,
      category: "billing",
      question: "What payment methods do you accept?",
      answer:
        "We accept major credit cards (Visa, MasterCard, American Express), debit cards, bank transfers, and most dental insurance plans. You can manage your payment methods and set up automatic payments in your profile settings.",
    },
    {
      id: 6,
      category: "billing",
      question: "How does insurance billing work?",
      answer:
        "We work directly with most major insurance providers. After your appointment, we'll submit claims to your insurance company. You'll receive a statement showing what insurance covered and any remaining balance you're responsible for.",
    },
    {
      id: 7,
      category: "treatments",
      question: "How can I track my treatment progress?",
      answer:
        "Visit the 'My Treatments' page to view detailed information about your ongoing and completed treatments, including progress updates, session records, treatment plans, and before/after photos when available.",
    },
    {
      id: 8,
      category: "treatments",
      question: "What should I expect during my first visit?",
      answer:
        "Your first visit will include a comprehensive dental exam, digital X-rays if needed, oral cancer screening, and discussion of your dental history and goals. We'll create a personalized treatment plan based on your needs.",
    },
    {
      id: 9,
      category: "treatments",
      question: "How do I prepare for dental procedures?",
      answer:
        "Preparation varies by procedure. Generally, maintain good oral hygiene, avoid eating 2 hours before sedation procedures, and follow any specific pre-operative instructions provided. Contact us if you have any questions.",
    },
    {
      id: 10,
      category: "account",
      question: "How do I update my profile information?",
      answer:
        "Go to the 'Profile' page where you can edit your personal information, contact details, medical history, emergency contacts, and communication preferences. Always keep your information current for optimal care.",
    },
    {
      id: 11,
      category: "account",
      question: "How do I change my password or email?",
      answer:
        "Visit the 'Settings' page to update your password, email address, and other security settings. For email changes, you'll need to verify both your current and new email addresses for security purposes.",
    },
    {
      id: 12,
      category: "technical",
      question: "I'm having trouble logging into my account",
      answer:
        "First, ensure you're using the correct email and password. If you've forgotten your password, use the 'Forgot Password' link on the login page. Clear your browser cache and try again. If issues persist, contact our support team.",
    },
    {
      id: 13,
      category: "technical",
      question: "Is my personal and medical information secure?",
      answer:
        "Yes, we use industry-standard encryption, HIPAA-compliant security measures, and regular security audits to protect your personal and medical information. Your data is never shared with third parties without your explicit consent.",
    },
    {
      id: 14,
      category: "technical",
      question: "Can I access my account from mobile devices?",
      answer:
        "Yes, our patient portal is fully responsive and works on all devices including smartphones and tablets. You can book appointments, view records, and communicate with our team from any device with internet access.",
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
      id: "treatments",
      label: "Treatments",
      count: faqData.filter((f) => f.category === "treatments").length,
    },
    {
      id: "billing",
      label: "Billing & Insurance",
      count: faqData.filter((f) => f.category === "billing").length,
    },
    {
      id: "account",
      label: "Account",
      count: faqData.filter((f) => f.category === "account").length,
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
      contact: "+1 (555) 123-4567",
      hours: "Mon-Fri: 8AM-6PM EST",
      action: "Call Now",
    },
    {
      icon: FiMail,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@dentalcare.com",
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
      // Here you would call your Supabase function to save the support ticket
      // Reset form
      setContactForm({
        subject: "",
        category: "",
        message: "",
        priority: "normal",
      });
      // Show success message
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
                      <option value="treatments">Treatments</option>
                      <option value="billing">Billing & Insurance</option>
                      <option value="technical">Technical Support</option>
                      <option value="feedback">Feedback & Suggestions</option>
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

            {/* Office Hours */}
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
                    Office Hours
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
                    123 Main Street, City, State 12345
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
