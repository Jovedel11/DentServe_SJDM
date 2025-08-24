import {
  Calendar,
  Users,
  MessageSquare,
  Settings,
  BarChart3,
  Mail,
  Layout,
} from "lucide-react";
export const helpContent = {
  dashboard: {
    title: "Dashboard Overview",
    icon: Layout,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    sections: [
      {
        id: "dashboard-basics",
        title: "Understanding Your Dashboard",
        content: [
          {
            type: "overview",
            title: "Dashboard Widgets",
            description:
              "Your dashboard provides real-time insights into clinic operations.",
            steps: [
              "View today's appointments and patient statistics",
              "Monitor clinic performance metrics and revenue",
              "Check pending tasks and important notifications",
              "Access quick actions for common tasks",
            ],
          },
          {
            type: "feature",
            title: "Key Metrics",
            description: "Monitor these important metrics daily:",
            steps: [
              "Total appointments scheduled and completed",
              "Patient satisfaction ratings and feedback",
              "Revenue tracking and financial summaries",
              "Staff performance and availability",
            ],
          },
        ],
      },
    ],
  },
  appointments: {
    title: "Appointment Management",
    icon: Calendar,
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    sections: [
      {
        id: "appointment-creation",
        title: "Creating Appointments",
        content: [
          {
            type: "step-by-step",
            title: "How to Schedule a New Appointment",
            description:
              "Follow these steps to create appointments for patients:",
            steps: [
              "Navigate to the Appointments section from the main menu",
              "Click 'New Appointment' or 'Schedule Appointment' button",
              "Select the patient or create a new patient profile",
              "Choose the doctor and available time slot",
              "Select the service type and add any special notes",
              "Confirm appointment details and send confirmation email",
            ],
          },
          {
            type: "tip",
            title: "Best Practices",
            description: "Tips for efficient appointment scheduling:",
            steps: [
              "Always double-check doctor availability before confirming",
              "Leave buffer time between appointments for preparation",
              "Add patient contact information for easy communication",
              "Use appointment notes for special requirements or conditions",
            ],
          },
        ],
      },
      {
        id: "appointment-completion",
        title: "Completing Appointments",
        content: [
          {
            type: "step-by-step",
            title: "Marking Appointments as Complete",
            description: "Process completed appointments and send reports:",
            steps: [
              "Open the completed appointment from the calendar",
              "Update appointment status to 'Completed'",
              "Add treatment notes and recommendations",
              "Generate and review the appointment report",
              "Send completion report to patient via email",
              "Process payment and update patient records",
            ],
          },
          {
            type: "email-template",
            title: "Completion Email Template",
            description: "Use this template when sending completion reports:",
            template: `Subject: Appointment Completion Report - [Patient Name]

Dear [Patient Name],

Thank you for visiting [Clinic Name] today. Your appointment with [Doctor Name] has been completed successfully.

Treatment Summary:
- Service: [Service Type]
- Date: [Appointment Date]
- Notes: [Treatment Notes]

Next Steps:
[Any follow-up recommendations]

If you have any questions, please don't hesitate to contact us.

Best regards,
[Your Name]
[Clinic Name]`,
          },
        ],
      },
      {
        id: "appointment-cancellation",
        title: "Handling Cancellations",
        content: [
          {
            type: "step-by-step",
            title: "Processing Cancelled Appointments",
            description: "Properly handle appointment cancellations:",
            steps: [
              "Update appointment status to 'Cancelled'",
              "Record cancellation reason and timing",
              "Check cancellation policy compliance",
              "Send cancellation confirmation email to patient",
              "Update doctor's schedule to free up the time slot",
              "Process any cancellation fees if applicable",
            ],
          },
          {
            type: "email-template",
            title: "Cancellation Email Template",
            description: "Use this template for cancellation confirmations:",
            template: `Subject: Appointment Cancellation Confirmation - [Patient Name]

Dear [Patient Name],

This email confirms the cancellation of your appointment scheduled for [Date and Time] with [Doctor Name].

Cancellation Details:
- Original Date: [Appointment Date]
- Service: [Service Type]
- Cancelled on: [Cancellation Date]

Please note our cancellation policy: [Policy Details]

To reschedule, please contact us at [Phone Number] or email [Email].

Best regards,
[Your Name]
[Clinic Name]`,
          },
        ],
      },
    ],
  },
  team: {
    title: "Team & Clinic Management",
    icon: Users,
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    sections: [
      {
        id: "clinic-profile",
        title: "Managing Clinic Information",
        content: [
          {
            type: "step-by-step",
            title: "Updating Clinic Details",
            description: "Keep your clinic information current:",
            steps: [
              "Go to Team & Clinic Profile section",
              "Click 'Edit Profile' to enter edit mode",
              "Update clinic name, description, and contact information",
              "Modify operating hours for each day of the week",
              "Add or update services offered with pricing",
              "Save changes and verify all information is correct",
            ],
          },
          {
            type: "feature",
            title: "Services & Pricing Management",
            description: "Managing your clinic's service offerings:",
            steps: [
              "Add new services by clicking 'Add Service' button",
              "Set competitive pricing for each service",
              "Include detailed service descriptions",
              "Remove outdated or discontinued services",
              "Ensure pricing reflects current market rates",
            ],
          },
        ],
      },
      {
        id: "staff-management",
        title: "Managing Staff Members",
        content: [
          {
            type: "step-by-step",
            title: "Adding New Staff Members",
            description: "Onboard new team members:",
            steps: [
              "Click 'Add Staff' in the Staff Members section",
              "Enter staff member's personal information",
              "Assign position, department, and employee ID",
              "Set appropriate permissions for system access",
              "Upload profile picture and complete contact details",
              "Configure start date and other employment details",
            ],
          },
          {
            type: "feature",
            title: "Staff Permissions",
            description: "Understanding permission levels:",
            steps: [
              "Manage Doctors: Can add/edit doctor profiles",
              "View Analytics: Access to reports and statistics",
              "Manage Appointments: Schedule and modify appointments",
              "Manage Staff: Add and edit staff member information",
            ],
          },
        ],
      },
      {
        id: "doctor-management",
        title: "Doctor Profiles",
        content: [
          {
            type: "overview",
            title: "Managing Doctor Information",
            description: "Keep doctor profiles updated and accurate:",
            steps: [
              "Verify doctor credentials and license information",
              "Update consultation fees and availability",
              "Manage specializations and experience details",
              "Monitor doctor ratings and patient feedback",
              "Ensure profile pictures are professional and current",
            ],
          },
        ],
      },
    ],
  },
  feedback: {
    title: "Feedback Management",
    icon: MessageSquare,
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    sections: [
      {
        id: "feedback-overview",
        title: "Understanding Feedback",
        content: [
          {
            type: "overview",
            title: "Feedback Types",
            description: "Your clinic receives different types of feedback:",
            steps: [
              "General: Overall clinic experience and service",
              "Service: Specific treatments or procedures",
              "Doctor: Individual doctor performance and care",
              "Facility: Clinic environment and amenities",
            ],
          },
          {
            type: "feature",
            title: "Anonymous vs. Public Feedback",
            description: "Understanding feedback visibility:",
            steps: [
              "Anonymous feedback: Patient identity is hidden",
              "Public feedback: Visible to other patients online",
              "Private feedback: Only visible to staff internally",
              "Response visibility follows feedback privacy settings",
            ],
          },
        ],
      },
      {
        id: "responding-feedback",
        title: "Responding to Feedback",
        content: [
          {
            type: "step-by-step",
            title: "How to Reply to Patient Feedback",
            description: "Professional response guidelines:",
            steps: [
              "Read the feedback carefully and understand concerns",
              "Click 'Reply to Feedback' button on the feedback card",
              "Write a professional and empathetic response",
              "Address specific issues mentioned by the patient",
              "Offer solutions or follow-up actions if needed",
              "Send the response and mark feedback as addressed",
            ],
          },
          {
            type: "best-practice",
            title: "Response Best Practices",
            description: "Guidelines for professional responses:",
            steps: [
              "Always maintain a professional and courteous tone",
              "Acknowledge the patient's experience and concerns",
              "Avoid being defensive, even with negative feedback",
              "Offer specific actions or improvements when possible",
              "Thank patients for positive feedback and testimonials",
            ],
          },
        ],
      },
      {
        id: "feedback-analytics",
        title: "Feedback Analytics",
        content: [
          {
            type: "feature",
            title: "Monitoring Feedback Trends",
            description: "Use feedback data to improve services:",
            steps: [
              "Track average ratings over time periods",
              "Monitor response rates to maintain engagement",
              "Identify common themes in patient comments",
              "Filter feedback by type, rating, or date range",
              "Use insights to improve clinic operations",
            ],
          },
        ],
      },
    ],
  },
  analytics: {
    title: "Analytics & Reports",
    icon: BarChart3,
    color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    sections: [
      {
        id: "analytics-overview",
        title: "Understanding Analytics",
        content: [
          {
            type: "overview",
            title: "Key Performance Indicators",
            description: "Monitor these important metrics:",
            steps: [
              "Appointment conversion rates and no-show statistics",
              "Revenue per patient and average treatment values",
              "Doctor utilization and efficiency metrics",
              "Patient satisfaction scores and feedback trends",
              "Clinic capacity utilization and scheduling efficiency",
            ],
          },
          {
            type: "feature",
            title: "Report Generation",
            description: "Generate reports for different purposes:",
            steps: [
              "Daily/Weekly operational reports for management",
              "Monthly financial summaries for accounting",
              "Patient satisfaction reports for quality improvement",
              "Doctor performance reports for reviews",
              "Marketing analytics for promotional planning",
            ],
          },
        ],
      },
      {
        id: "monitoring-performance",
        title: "Performance Monitoring",
        content: [
          {
            type: "step-by-step",
            title: "Daily Performance Review",
            description: "Regular monitoring routine:",
            steps: [
              "Check yesterday's appointment completion rate",
              "Review patient feedback and ratings received",
              "Monitor revenue targets and actual performance",
              "Identify any operational issues or bottlenecks",
              "Plan improvements based on data insights",
            ],
          },
        ],
      },
    ],
  },
  settings: {
    title: "Settings & Preferences",
    icon: Settings,
    color:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400",
    sections: [
      {
        id: "profile-settings",
        title: "Profile Management",
        content: [
          {
            type: "step-by-step",
            title: "Updating Your Profile",
            description: "Manage your personal information:",
            steps: [
              "Navigate to Settings from the main menu",
              "Select 'Profile' tab from the settings menu",
              "Update your name, phone, and contact information",
              "Customize your email signature for professional communication",
              "Save changes to update your profile across the system",
            ],
          },
        ],
      },
      {
        id: "notification-settings",
        title: "Notification Preferences",
        content: [
          {
            type: "feature",
            title: "Managing Notifications",
            description: "Control how you receive updates:",
            steps: [
              "Email Notifications: System updates and reports",
              "Push Notifications: Real-time alerts in browser",
              "Appointment Reminders: Upcoming appointment alerts",
              "System Alerts: Important system maintenance notices",
              "Login Notifications: Security alerts for account access",
            ],
          },
        ],
      },
      {
        id: "display-settings",
        title: "Display & Theme",
        content: [
          {
            type: "feature",
            title: "Customizing Your Interface",
            description: "Personalize your dashboard experience:",
            steps: [
              "Choose between Light, Dark, or System theme",
              "Set your preferred language and timezone",
              "Configure date and time formats",
              "Adjust dashboard layout and items per page",
              "Set default calendar view preference",
            ],
          },
        ],
      },
      {
        id: "security-settings",
        title: "Security & Privacy",
        content: [
          {
            type: "step-by-step",
            title: "Changing Your Password",
            description: "Keep your account secure:",
            steps: [
              "Go to Settings > Security tab",
              "Enter your current password for verification",
              "Create a strong new password with mixed characters",
              "Confirm your new password by typing it again",
              "Click 'Update Password' to save changes",
              "You'll receive a confirmation email about the change",
            ],
          },
          {
            type: "security",
            title: "Security Best Practices",
            description: "Protect your account and patient data:",
            steps: [
              "Use strong, unique passwords for your account",
              "Enable two-factor authentication when available",
              "Log out completely when leaving your workstation",
              "Never share your login credentials with others",
              "Report any suspicious account activity immediately",
            ],
          },
        ],
      },
    ],
  },
  email: {
    title: "Email Communication",
    icon: Mail,
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400",
    sections: [
      {
        id: "email-templates",
        title: "Email Templates",
        content: [
          {
            type: "templates",
            title: "Common Email Templates",
            description: "Use these templates for consistent communication:",
            templates: [
              {
                name: "Appointment Confirmation",
                subject: "Appointment Confirmation - [Date] with [Doctor]",
                body: `Dear [Patient Name],

This email confirms your appointment:

Date: [Date]
Time: [Time]
Doctor: [Doctor Name]
Service: [Service Type]
Location: [Clinic Address]

Please arrive 15 minutes early for check-in.

If you need to reschedule, please call us at [Phone] at least 24 hours in advance.

Best regards,
[Staff Name]
[Clinic Name]`,
              },
              {
                name: "Appointment Reminder",
                subject: "Reminder: Your appointment tomorrow at [Time]",
                body: `Dear [Patient Name],

This is a friendly reminder about your appointment:

Tomorrow, [Date] at [Time]
Doctor: [Doctor Name]
Service: [Service Type]

Please bring:
- Valid ID
- Insurance card (if applicable)
- List of current medications

If you cannot attend, please call us at [Phone].

Best regards,
[Staff Name]
[Clinic Name]`,
              },
            ],
          },
        ],
      },
      {
        id: "email-best-practices",
        title: "Email Best Practices",
        content: [
          {
            type: "best-practice",
            title: "Professional Communication",
            description: "Guidelines for patient emails:",
            steps: [
              "Always use professional language and tone",
              "Include clear subject lines that describe the purpose",
              "Personalize emails with patient names and details",
              "Double-check all information before sending",
              "Follow up on important communications if needed",
              "Maintain patient confidentiality in all emails",
            ],
          },
        ],
      },
    ],
  },
};
