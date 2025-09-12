import {
  FaClinicMedical,
  FaChartLine,
  FaUsers,
  FaUserPlus,
  FaCalendarCheck,
  FaCheckCircle,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaComments,
} from "react-icons/fa";

// collaboration component
export const benefits = [
  {
    icon: <FaUsers />,
    title: "Expand Your Patient Base",
    description:
      "Reach thousands of patients actively searching for quality dental care in your area",
  },
  {
    icon: <FaChartLine />,
    title: "Boost Practice Efficiency",
    description:
      "Reduce no-shows by 40% with automated reminders and streamlined scheduling",
  },
  {
    icon: <FaCalendarCheck />,
    title: "Optimize Appointment Bookings",
    description:
      "Fill last-minute openings and reduce downtime with our intelligent booking system",
  },
  {
    icon: <FaClinicMedical />,
    title: "Modern Practice Management",
    description:
      "Access powerful analytics to make data-driven decisions about your practice",
  },
];

// footer component
export const steps = [
  {
    icon: <FaUserPlus aria-label="Register" />,
    title: "Register Effortlessly",
    description: "Create your account in under 2 minutes via email.",
    tooltip: "We prioritize your privacy and data security.",
  },
  {
    icon: <FaCalendarCheck aria-label="Schedule" />,
    title: "Schedule with Ease",
    description:
      "Select your preferred service, clinic location, and appointment time.",
    tooltip: "See real-time appointment availability.",
  },
  {
    icon: <FaCheckCircle aria-label="Confirm" />,
    title: "Confirm and Arrive",
    description:
      "Receive instant booking confirmation and step-by-step directions.",
    tooltip: "We'll also send helpful appointment reminders.",
  },
];

export const socialLinks = [
  { icon: <FaTwitter />, label: "Twitter", href: "https://twitter.com" },
  {
    icon: <FaInstagram />,
    label: "Instagram",
    href: "https://instagram.com",
  },
  { icon: <FaLinkedinIn />, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: <FaYoutube />, label: "YouTube", href: "https://youtube.com" },
];

export const legalLinks = [
  { text: "Privacy Policy", href: "#privacy" },
  { text: "Terms of Service", href: "#terms" },
  { text: "Cookie Settings", href: "#cookies" },
];

// service component
export const features = [
  {
    icon: <FaCalendarAlt />,
    title: "Appointment Management",
    items: [
      "Online booking system",
      "Automated reminders",
      "Calendar sync",
      "Waitlist management",
    ],
  },
  {
    icon: <FaMapMarkerAlt />,
    title: "Clinic Navigation",
    items: [
      "Real-time availability",
      "Location tracking",
      "Accessibility features",
      "Interactive practice map",
    ],
  },
  {
    icon: <FaComments />,
    title: "Patient Engagement",
    items: [
      "Secure messaging",
      "Treatment feedback",
      "Automated follow-ups",
      "Oral health resources",
    ],
  },
];
