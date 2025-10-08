import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Search,
  Calendar,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  AlertCircle,
  Eye,
  Archive,
  Zap,
  BookOpen,
  Mail,
  Phone,
  ExternalLink,
  Shield,
  Palette,
  Heart,
  User,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useIsMobile } from "@/core/hooks/use-mobile";

/**
 * ✅ Production-Ready Staff Help Component
 * - Aligned with actual database schema and staff features
 * - Mobile responsive
 * - Based on real staff workflows
 */
const Help = () => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedSection, setExpandedSection] = useState(null);
  const [filteredContent, setFilteredContent] = useState([]);
  const [loading, setLoading] = useState(true);

  // Categories based on actual staff features
  const categories = [
    { id: "all", label: "All Topics", icon: BookOpen },
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "treatment", label: "Treatment Plans", icon: Heart },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "profile", label: "Profile & Clinic", icon: User },
    { id: "settings", label: "Settings", icon: Shield },
  ];

  // Quick actions based on actual staff workflow
  const quickActions = [
    {
      id: "manage-appointments",
      title: "Manage Appointments",
      description: "Approve, reject, or complete appointments",
      icon: Calendar,
      category: "appointments",
      color:
        "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-400",
    },
    {
      id: "treatment-plans",
      title: "Treatment Plans",
      description: "Create and track patient treatment plans",
      icon: Heart,
      category: "treatment",
      color:
        "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/10 dark:border-rose-800 dark:text-rose-400",
    },
    {
      id: "view-feedback",
      title: "Patient Feedback",
      description: "View and respond to patient feedback",
      icon: MessageSquare,
      category: "feedback",
      color:
        "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-400",
    },
    {
      id: "view-analytics",
      title: "Clinic Analytics",
      description: "View appointment and clinic statistics",
      icon: BarChart3,
      category: "analytics",
      color:
        "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/10 dark:border-purple-800 dark:text-purple-400",
    },
  ];

  // Help content based on actual database functions and features
  const helpContent = {
    dashboard: {
      title: "Dashboard Overview",
      icon: TrendingUp,
      color: "bg-blue-100 dark:bg-blue-900/20",
      sections: [
        {
          id: "dashboard-overview",
          title: "Understanding Your Dashboard",
          content: [
            {
              title: "Dashboard Overview",
              type: "info",
              description:
                "Your dashboard provides a real-time overview of clinic operations including today's appointments, weekly statistics, recent feedback, and urgent alerts.",
              steps: [
                "Today's appointments with patient details",
                "Weekly appointment statistics",
                "Recent patient feedback",
                "Notifications and alerts",
                "Quick actions for common tasks",
              ],
            },
          ],
        },
      ],
    },
    appointments: {
      title: "Appointment Management",
      icon: Calendar,
      color: "bg-green-100 dark:bg-green-900/20",
      sections: [
        {
          id: "approve-appointments",
          title: "Approving Appointments",
          content: [
            {
              title: "How to Approve Appointments",
              type: "step-by-step",
              description:
                "Use the approve_appointment function to confirm patient appointments.",
              steps: [
                "Navigate to 'Manage Appointments' page",
                "View pending appointments in the 'Pending' tab",
                "Click the checkmark icon on the appointment card",
                "Add optional staff notes about the appointment",
                "Click 'Approve' to confirm the appointment",
                "Patient receives automatic email confirmation",
              ],
            },
          ],
        },
        {
          id: "reject-appointments",
          title: "Rejecting Appointments",
          content: [
            {
              title: "How to Reject Appointments",
              type: "step-by-step",
              description:
                "Use the reject_appointment function when appointments cannot be fulfilled.",
              steps: [
                "Open the appointment you want to reject",
                "Click the 'Reject' button (X icon)",
                "Select a rejection category (doctor_unavailable, overbooked, patient_request, etc.)",
                "Provide a clear rejection reason",
                "Optionally suggest reschedule and alternative dates",
                "Click 'Reject Appointment' to confirm",
                "Patient receives automatic email notification",
              ],
            },
          ],
        },
        {
          id: "complete-appointments",
          title: "Completing Appointments",
          content: [
            {
              title: "How to Complete Appointments",
              type: "step-by-step",
              description:
                "Use the complete_appointment function to mark appointments as completed.",
              steps: [
                "Navigate to confirmed appointments",
                "Click 'Complete' on the finished appointment",
                "Add completion notes (treatment summary, observations)",
                "Select completed services from the list",
                "If treatment plan needed, click 'Yes' to create one",
                "If no treatment plan needed, click 'No' to finish",
                "Appointment moves to history automatically",
              ],
            },
          ],
        },
        {
          id: "no-show-appointments",
          title: "Marking No-Shows",
          content: [
            {
              title: "How to Mark No-Show Appointments",
              type: "step-by-step",
              description:
                "Use the mark_appointment_no_show function when patients don't arrive.",
              steps: [
                "Wait 15 minutes past appointment time (grace period)",
                "Click 'Mark as No-Show' button",
                "Add staff notes about the no-show",
                "Confirm the action",
                "Patient's reliability score is updated",
                "Appointment is recorded in history",
              ],
            },
          ],
        },
        {
          id: "view-history",
          title: "Appointment History & Archive",
          content: [
            {
              title: "Managing Appointment History",
              type: "info",
              description:
                "View and manage completed, cancelled, and no-show appointments.",
              steps: [
                "Go to 'Appointment History' page",
                "Filter by status (completed, cancelled, no-show)",
                "Search by patient name or date",
                "View detailed appointment information",
                "Archive old appointments to keep dashboard clean",
                "Download appointment reports for records",
              ],
            },
          ],
        },
      ],
    },
    treatment: {
      title: "Treatment Plans",
      icon: Heart,
      color: "bg-rose-100 dark:bg-rose-900/20",
      sections: [
        {
          id: "create-treatment-plan",
          title: "Creating Treatment Plans",
          content: [
            {
              title: "How to Create Treatment Plans",
              type: "step-by-step",
              description:
                "Create comprehensive treatment plans for patients requiring multiple visits.",
              steps: [
                "After completing an appointment, select 'Create Treatment Plan'",
                "Or navigate to 'Treatment Plans' page and click 'Create New'",
                "Select the patient",
                "Choose treatment category (orthodontics, periodontics, etc.)",
                "Set total cost and estimated sessions",
                "Add detailed description and notes",
                "Set priority level (normal, high, urgent)",
                "Treatment plan is created with 'active' status",
              ],
            },
          ],
        },
        {
          id: "manage-treatment-plans",
          title: "Managing Treatment Plans",
          content: [
            {
              title: "Treatment Plan Management",
              type: "info",
              description:
                "Track and update patient treatment plans throughout their treatment journey.",
              steps: [
                "View all treatment plans in 'Treatment Plans' page",
                "Filter by status (active, paused, completed, cancelled)",
                "Track progress automatically as appointments complete",
                "View treatment alerts (overdue visits, high-priority)",
                "Pause treatment plans if needed",
                "Mark as completed when treatment is finished",
              ],
            },
          ],
        },
      ],
    },
    feedback: {
      title: "Feedback Management",
      icon: MessageSquare,
      color: "bg-yellow-100 dark:bg-yellow-900/20",
      sections: [
        {
          id: "view-feedback",
          title: "Viewing Patient Feedback",
          content: [
            {
              title: "How to View Feedback",
              type: "step-by-step",
              description:
                "Access and review patient feedback using get_staff_feedback_list function.",
              steps: [
                "Navigate to 'Feedback Management' page",
                "View all feedback sorted by date",
                "Filter by rating (1-5 stars)",
                "Filter by status (pending, responded, flagged)",
                "Click on feedback to view full details",
                "See patient information (if not anonymous)",
                "Review attached appointment details",
              ],
            },
          ],
        },
        {
          id: "respond-feedback",
          title: "Responding to Feedback",
          content: [
            {
              title: "Professional Feedback Response",
              type: "best-practice",
              description:
                "Guidelines for responding to patient feedback professionally.",
              steps: [
                "Acknowledge the patient's concerns or compliments",
                "Address specific points mentioned in feedback",
                "Provide solutions or explanations when needed",
                "Maintain professional and empathetic tone",
                "Keep responses concise and helpful",
                "Thank patients for their feedback",
                "For negative feedback, offer to discuss further offline",
              ],
            },
          ],
        },
      ],
    },
    analytics: {
      title: "Clinic Analytics",
      icon: BarChart3,
      color: "bg-purple-100 dark:bg-purple-900/20",
      sections: [
        {
          id: "view-analytics",
          title: "Viewing Analytics",
          content: [
            {
              title: "Understanding Analytics Dashboard",
              type: "info",
              description: "Access clinic performance metrics and statistics.",
              steps: [
                "Navigate to 'Clinic Analytics' page",
                "View appointment statistics (total, completed, cancelled, no-show)",
                "See monthly trends and patterns",
                "Track patient volume over time",
                "Monitor feedback ratings and trends",
                "View staff performance metrics",
                "Export reports for documentation",
              ],
            },
          ],
        },
      ],
    },
    profile: {
      title: "Profile & Clinic Management",
      icon: User,
      color: "bg-indigo-100 dark:bg-indigo-900/20",
      sections: [
        {
          id: "staff-profile",
          title: "Managing Your Staff Profile",
          content: [
            {
              title: "How to Update Your Profile",
              type: "step-by-step",
              description: "Keep your staff profile information up to date.",
              steps: [
                "Navigate to 'Staff Profile' page",
                "Update your personal information (name, phone)",
                "Update your position and department",
                "Upload profile photo if needed",
                "Save changes to update your profile",
              ],
            },
          ],
        },
        {
          id: "clinic-info",
          title: "Managing Clinic Information",
          content: [
            {
              title: "Updating Clinic Details",
              type: "info",
              description: "Manage clinic information visible to patients.",
              steps: [
                "In 'Staff Profile' page, go to 'Clinic Information' section",
                "Update clinic name, address, and contact details",
                "Update operating hours and services offered",
                "Add or update doctor information",
                "Manage clinic photos and branding",
                "All changes reflect on patient-facing pages",
              ],
            },
          ],
        },
      ],
    },
    settings: {
      title: "Settings",
      icon: Shield,
      color: "bg-gray-100 dark:bg-gray-900/20",
      sections: [
        {
          id: "appearance",
          title: "Appearance Settings",
          content: [
            {
              title: "Customizing Appearance",
              type: "info",
              description: "Personalize your dashboard appearance.",
              steps: [
                "Go to 'Settings' page",
                "Select 'Appearance' tab",
                "Choose theme (Light, Dark, or System)",
                "Theme preference is saved automatically",
              ],
            },
          ],
        },
        {
          id: "notifications",
          title: "Notification Preferences",
          content: [
            {
              title: "Managing Notifications",
              type: "info",
              description: "Control email notification preferences.",
              steps: [
                "Go to 'Settings' page",
                "Select 'Notifications' tab",
                "Toggle email notifications on/off",
                "Note: Critical notifications (appointment reminders, system alerts) are always sent for safety",
                "Save your preferences",
              ],
            },
          ],
        },
        {
          id: "security",
          title: "Security Settings",
          content: [
            {
              title: "Changing Your Password",
              type: "step-by-step",
              description: "Update your account password for security.",
              steps: [
                "Go to 'Settings' page",
                "Select 'Security' tab",
                "Enter your new password (minimum 6 characters)",
                "Confirm your new password",
                "Click 'Update Password' to save",
                "You will remain logged in after password change",
              ],
            },
          ],
        },
      ],
    },
  };

  // FAQ items based on actual system features
  const faqItems = [
    {
      question: "How do I approve a pending appointment?",
      answer:
        "Go to 'Manage Appointments', select the 'Pending' tab, click the checkmark icon on the appointment you want to approve, optionally add staff notes, and click 'Approve'. The patient will receive an automatic email confirmation.",
      category: "appointments",
    },
    {
      question: "What happens when I reject an appointment?",
      answer:
        "When you reject an appointment, you must provide a rejection category and reason. The patient receives an automatic email notification. You can optionally suggest alternative dates for rescheduling.",
      category: "appointments",
    },
    {
      question: "When should I mark an appointment as 'No-Show'?",
      answer:
        "Wait 15 minutes past the appointment time (grace period) before marking as no-show. This updates the patient's reliability score and helps track appointment patterns.",
      category: "appointments",
    },
    {
      question:
        "How do I create a treatment plan after completing an appointment?",
      answer:
        "When completing an appointment, a dialog will ask if the patient needs a treatment plan. Click 'Yes' and you'll be taken to the treatment plan creation page with the patient's information pre-filled.",
      category: "treatment",
    },
    {
      question: "Can I pause an active treatment plan?",
      answer:
        "Yes, in the 'Treatment Plans' page, you can pause any active treatment plan if the patient needs to take a break from treatment. You can resume it later when they're ready to continue.",
      category: "treatment",
    },
    {
      question: "How do I respond to anonymous feedback?",
      answer:
        "Anonymous feedback will not show patient names or contact information. You can still respond professionally to address concerns. Your response will be visible based on the feedback's privacy settings.",
      category: "feedback",
    },
    {
      question: "Where can I see appointment statistics?",
      answer:
        "Navigate to 'Clinic Analytics' to view comprehensive statistics including total appointments, completion rates, cancellations, no-shows, and monthly trends.",
      category: "analytics",
    },
    {
      question: "Can I archive old appointments?",
      answer:
        "Yes, in 'Appointment History', you can archive completed, cancelled, or no-show appointments to keep your active view clean. Archived appointments can be restored or permanently deleted.",
      category: "appointments",
    },
  ];

  // Load help content
  useEffect(() => {
    const loadHelpContent = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setLoading(false);
    };

    loadHelpContent();
  }, []);

  // Filter content based on search and category
  useEffect(() => {
    let filtered = [];

    Object.entries(helpContent).forEach(([key, category]) => {
      if (selectedCategory === "all" || selectedCategory === key) {
        const matchesSearch =
          searchTerm === "" ||
          category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.sections.some(
            (section) =>
              section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              section.content.some(
                (content) =>
                  content.title
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  content.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
              )
          );

        if (matchesSearch) {
          filtered.push({ key, ...category });
        }
      }
    });

    setFilteredContent(filtered);
  }, [searchTerm, selectedCategory]);

  // Render content based on type
  const renderContent = (content) => {
    switch (content.type) {
      case "step-by-step":
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm md:text-base">
              {content.description}
            </p>
            <ol className="list-decimal list-inside space-y-2 md:space-y-3">
              {content.steps.map((step, index) => (
                <li
                  key={index}
                  className="text-card-foreground text-sm md:text-base pl-2"
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        );

      case "best-practice":
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm md:text-base">
              {content.description}
            </p>
            <ul className="space-y-2 md:space-y-3">
              {content.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-card-foreground text-sm md:text-base">
                    {step}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );

      case "info":
      default:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm md:text-base">
              {content.description}
            </p>
            <ul className="space-y-2 md:space-y-3">
              {content.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-card-foreground text-sm md:text-base">
                    {step}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={`${isMobile ? "p-4" : "p-6"}`}>
        <div className="animate-pulse space-y-4 md:space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div
            className={`grid grid-cols-1 ${
              isMobile ? "gap-3" : "md:grid-cols-2 lg:grid-cols-4 gap-4"
            }`}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 md:h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 md:h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isMobile ? "p-4" : "p-6"
      } space-y-6 md:space-y-8`}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-2">
          <h1
            className={`${
              isMobile ? "text-2xl" : "text-3xl"
            } font-bold text-foreground flex items-center`}
          >
            <HelpCircle
              className={`${
                isMobile ? "w-6 h-6" : "w-8 h-8"
              } mr-2 md:mr-3 text-primary`}
            />
            Help & Documentation
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Learn how to manage appointments, treatment plans, and clinic
            operations
          </p>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm md:text-base"
            />
          </div>

          <div
            className={`flex flex-wrap gap-2 ${
              isMobile ? "justify-center" : ""
            }`}
          >
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div>
        <h2
          className={`${
            isMobile ? "text-lg" : "text-xl"
          } font-semibold text-foreground mb-3 md:mb-4 flex items-center`}
        >
          <Zap
            className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} mr-2 text-primary`}
          />
          Quick Start Guide
        </h2>
        <div
          className={`grid grid-cols-1 ${
            isMobile ? "gap-3" : "md:grid-cols-2 lg:grid-cols-4 gap-4"
          }`}
        >
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => {
                  setSelectedCategory(action.category);
                  setExpandedSection(`${action.category}-0`);
                }}
                className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-md ${action.color}`}
              >
                <IconComponent
                  className={`${isMobile ? "w-5 h-5" : "w-6 h-6"} mb-2 md:mb-3`}
                />
                <h3 className="font-medium text-sm md:text-base mb-1">
                  {action.title}
                </h3>
                <p className="text-xs md:text-sm opacity-80">
                  {action.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Help Content */}
      <div className="space-y-4 md:space-y-6">
        <h2
          className={`${
            isMobile ? "text-lg" : "text-xl"
          } font-semibold text-foreground flex items-center`}
        >
          <BookOpen
            className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} mr-2 text-primary`}
          />
          Documentation
        </h2>

        {filteredContent.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 md:p-12 text-center">
            <Search className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-card-foreground mb-2">
              No help topics found
            </h3>
            <p className="text-sm md:text-base text-muted-foreground">
              Try adjusting your search term or category filter
            </p>
          </div>
        ) : (
          filteredContent.map((category) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.key}
                className="bg-card border border-border rounded-xl p-4 md:p-6"
              >
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <IconComponent
                      className={`${isMobile ? "w-4 h-4" : "w-5 h-5"}`}
                    />
                  </div>
                  <h3
                    className={`${
                      isMobile ? "text-lg" : "text-xl"
                    } font-semibold text-card-foreground`}
                  >
                    {category.title}
                  </h3>
                </div>

                <div className="space-y-4 md:space-y-6">
                  {category.sections.map((section, sectionIndex) => (
                    <div key={section.id}>
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === section.id ? null : section.id
                          )
                        }
                        className="w-full flex items-center justify-between p-3 md:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <h4 className="font-medium text-card-foreground text-left text-sm md:text-base">
                          {section.title}
                        </h4>
                        {expandedSection === section.id ? (
                          <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>

                      <AnimatePresence>
                        {expandedSection === section.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 space-y-4 md:space-y-6"
                          >
                            {section.content.map((content, contentIndex) => (
                              <div
                                key={contentIndex}
                                className="pl-3 md:pl-4 border-l-2 border-primary/20"
                              >
                                <h5 className="font-medium text-card-foreground mb-2 md:mb-3 flex items-center text-sm md:text-base">
                                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 text-primary flex-shrink-0" />
                                  {content.title}
                                </h5>
                                {renderContent(content)}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAQ Section */}
      <div>
        <h2
          className={`${
            isMobile ? "text-lg" : "text-xl"
          } font-semibold text-foreground mb-3 md:mb-4 flex items-center`}
        >
          <AlertCircle
            className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} mr-2 text-primary`}
          />
          Frequently Asked Questions
        </h2>
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="space-y-3 md:space-y-4">
            {faqItems
              .filter(
                (faq) =>
                  selectedCategory === "all" ||
                  faq.category === selectedCategory
              )
              .filter(
                (faq) =>
                  searchTerm === "" ||
                  faq.question
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((faq, index) => (
                <div key={index}>
                  <button
                    onClick={() =>
                      setExpandedSection(
                        expandedSection === `faq-${index}`
                          ? null
                          : `faq-${index}`
                      )
                    }
                    className="w-full flex items-center justify-between p-3 md:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="font-medium text-card-foreground text-sm md:text-base pr-4">
                      {faq.question}
                    </span>
                    {expandedSection === `faq-${index}` ? (
                      <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSection === `faq-${index}` && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-3 md:p-4 pl-6 md:pl-8 text-muted-foreground text-sm md:text-base"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
            <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground mb-2 text-base md:text-lg">
              Need Additional Help?
            </h3>
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              If you can't find the answer you're looking for, our support team
              is here to help.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
              <a
                href="mailto:support@dentserve.com"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm md:text-base"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </a>
              <a
                href="tel:+639171234567"
                className="inline-flex items-center justify-center px-4 py-2 bg-card border border-border text-card-foreground rounded-lg hover:bg-muted/50 transition-colors text-sm md:text-base"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
