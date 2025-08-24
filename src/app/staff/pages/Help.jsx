import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Search,
  Book,
  Calendar,
  Users,
  MessageSquare,
  Settings,
  BarChart3,
  Mail,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Play,
  ChevronDown,
  ChevronUp,
  Star,
  Shield,
  Bell,
  Palette,
  Layout,
  Activity,
  User,
  Stethoscope,
  Building,
  Award,
  Phone,
  MapPin,
  DollarSign,
  AlertCircle,
  Eye,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Lightbulb,
  Target,
  Zap,
  BookOpen,
  Video,
  ExternalLink,
} from "lucide-react";
import { helpContent } from "@/core/common/icons/mock-help";

const Help = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedSection, setExpandedSection] = useState(null);
  const [filteredContent, setFilteredContent] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick actions for common tasks
  const quickActions = [
    {
      id: "schedule-appointment",
      title: "Schedule New Appointment",
      description: "Learn how to create and manage appointments",
      icon: Calendar,
      category: "appointments",
      color:
        "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/10 dark:border-green-800 dark:text-green-400",
    },
    {
      id: "respond-feedback",
      title: "Respond to Patient Feedback",
      description: "Guidelines for professional feedback responses",
      icon: MessageSquare,
      category: "feedback",
      color:
        "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-400",
    },
    {
      id: "update-clinic-info",
      title: "Update Clinic Information",
      description: "Manage clinic details, services, and team",
      icon: Building,
      category: "team",
      color:
        "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/10 dark:border-purple-800 dark:text-purple-400",
    },
    {
      id: "email-templates",
      title: "Email Communication",
      description: "Templates and best practices for patient emails",
      icon: Mail,
      category: "email",
      color:
        "bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-900/10 dark:border-teal-800 dark:text-teal-400",
    },
  ];

  // FAQ items
  const faqItems = [
    {
      question: "How do I cancel an appointment and notify the patient?",
      answer:
        "Go to the appointment in your calendar, change the status to 'Cancelled', add a cancellation reason, and the system will automatically send a cancellation email to the patient using your configured email template.",
      category: "appointments",
    },
    {
      question: "Can I customize the email templates sent to patients?",
      answer:
        "Yes! You can customize email templates in the Settings section. Navigate to Settings > Email Templates to modify the content for appointment confirmations, reminders, and other communications.",
      category: "email",
    },
    {
      question: "How do I handle anonymous feedback?",
      answer:
        "Anonymous feedback will not show patient names or contact information. You can still respond professionally to address concerns, and your response will be visible according to the feedback's privacy settings.",
      category: "feedback",
    },
    {
      question: "What should I do if a patient doesn't show up?",
      answer:
        "Mark the appointment as 'No Show' in the system. You can then send a follow-up email to reschedule and apply your clinic's no-show policy if applicable.",
      category: "appointments",
    },
    {
      question: "How do I add a new doctor to the clinic profile?",
      answer:
        "In the Team & Clinic Profile section, click 'Add Doctor' in the Doctors section. Fill in their credentials, specialization, consultation fees, and upload a professional photo.",
      category: "team",
    },
    {
      question: "Can I see analytics for individual doctors?",
      answer:
        "Yes, the analytics dashboard provides doctor-specific metrics including patient volume, average ratings, revenue generated, and appointment completion rates.",
      category: "analytics",
    },
  ];

  const categories = [
    { id: "all", label: "All Topics" },
    { id: "dashboard", label: "Dashboard" },
    { id: "appointments", label: "Appointments" },
    { id: "team", label: "Team Management" },
    { id: "feedback", label: "Feedback" },
    { id: "analytics", label: "Analytics" },
    { id: "settings", label: "Settings" },
    { id: "email", label: "Email" },
  ];

  // Load help content
  useEffect(() => {
    const loadHelpContent = async () => {
      setLoading(true);
      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 800));
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
            <p className="text-muted-foreground">{content.description}</p>
            <ol className="list-decimal list-inside space-y-2">
              {content.steps.map((step, index) => (
                <li key={index} className="text-card-foreground">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        );

      case "email-template":
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">{content.description}</p>
            <div className="bg-muted/30 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-card-foreground font-mono">
                {content.template}
              </pre>
            </div>
          </div>
        );

      case "templates":
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">{content.description}</p>
            {content.templates.map((template, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <h4 className="font-medium text-card-foreground mb-2">
                  {template.name}
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Subject:
                    </span>
                    <p className="text-sm text-card-foreground font-mono bg-muted/30 px-2 py-1 rounded">
                      {template.subject}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Body:
                    </span>
                    <pre className="text-xs text-card-foreground font-mono bg-muted/30 p-3 rounded whitespace-pre-wrap">
                      {template.body}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case "best-practice":
      case "security":
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">{content.description}</p>
            <ul className="space-y-2">
              {content.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-card-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">{content.description}</p>
            <ul className="space-y-2">
              {content.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-card-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <HelpCircle className="w-8 h-8 mr-3 text-primary" />
            Help & Documentation
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn how to use the staff dashboard to manage your clinic
            efficiently
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-primary" />
          Quick Start Guide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => {
                  setSelectedCategory(action.category);
                  setExpandedSection(`${action.category}-${action.id}`);
                }}
                className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-md ${action.color}`}
              >
                <IconComponent className="w-6 h-6 mb-3" />
                <h3 className="font-medium mb-1">{action.title}</h3>
                <p className="text-sm opacity-80">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Help Content */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-primary" />
          Documentation
        </h2>

        {filteredContent.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              No help topics found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search term or category filter
            </p>
          </div>
        ) : (
          filteredContent.map((category) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.key}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${category.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {category.title}
                    </h3>
                  </div>
                </div>

                <div className="space-y-6">
                  {category.sections.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === section.id ? null : section.id
                          )
                        }
                        className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <h4 className="font-medium text-card-foreground text-left">
                          {section.title}
                        </h4>
                        {expandedSection === section.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>

                      {expandedSection === section.id && (
                        <div className="mt-4 space-y-6">
                          {section.content.map((content, contentIndex) => (
                            <div
                              key={contentIndex}
                              className="pl-4 border-l-2 border-primary/20"
                            >
                              <h5 className="font-medium text-card-foreground mb-3 flex items-center">
                                <Target className="w-4 h-4 mr-2 text-primary" />
                                {content.title}
                              </h5>
                              {renderContent(content)}
                            </div>
                          ))}
                        </div>
                      )}
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
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-primary" />
          Frequently Asked Questions
        </h2>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="space-y-4">
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
                    className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="font-medium text-card-foreground">
                      {faq.question}
                    </span>
                    {expandedSection === `faq-${index}` ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-4" />
                    )}
                  </button>

                  {expandedSection === `faq-${index}` && (
                    <div className="mt-2 p-4 pl-8 text-muted-foreground">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground mb-2">
              Need Additional Help?
            </h3>
            <p className="text-muted-foreground mb-4">
              If you can't find the answer you're looking for, our support team
              is here to help you with any questions about using the staff
              dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-card border border-border text-card-foreground rounded-lg hover:bg-muted/50 transition-colors">
                <Video className="w-4 h-4 mr-2" />
                Video Tutorials
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-card border border-border text-card-foreground rounded-lg hover:bg-muted/50 transition-colors">
                <ExternalLink className="w-4 h-4 mr-2" />
                Knowledge Base
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
