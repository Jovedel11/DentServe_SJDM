//navbar component
export const navLinks = [
  { path: "/", label: "Home" },
  { path: "/services", label: "Services" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
];

// service component
export const benefits = {
    patient: [
      "24/7 appointment access",
      "Reduced waiting times",
      "Treatment plan tracking",
    ],
    clinic: [
      "Optimized scheduling",
      "Digital workflow automation",
      "Patient satisfaction insights",
    ],
  };

// testimonials component
export const testimonials = [
  {
    quote:
      "Booking has never been this easy! The clinic matching system found me the perfect dentist in minutes.",
    author: "Maria Dela Cruz",
    role: "Freelance Designer",
    stars: 5,
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
  },
  {
    quote:
      "As a senior citizen, I appreciate how user-friendly the platform is. Got my dental check-up booked without any hassle!",
    author: "Ricardo Santos",
    role: "Retired Teacher",
    stars: 4,
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
  },
  {
    quote:
      "Our clinic saw a 40% increase in new patients after joining the platform. The management tools are fantastic!",
    author: "Dr. Andrea Lim",
    role: "Dental Clinic Owner",
    stars: 5,
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
  },
];

// hero components
export const slides = [
  {
    src: "/assets/images/smiling.png",
    alt: "Professional dental care with smiling patient",
  },
  {
    src: "/assets/images/child.png",
    alt: "Gentle pediatric dental treatment",
  },
  { src: "/assets/images/smile.png", alt: "Beautiful healthy smile results" },
];

// footer component
export const footerColumns = [
  {
    title: "Company",
    links: [
      { text: "About Us", href: "/about" },
      { text: "Services", href: "/services" },
      { text: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { text: "Help Center", href: "#help" },
      { text: "Contact Us", href: "#contact" },
      { text: "FAQs", href: "#faq" },
      { text: "Patient Guides", href: "#guides" },
      { text: "Feedback", href: "#feedback" },
    ],
  },
];

// faq component
export const faqItems = [
  {
    id: 1,
    question: "Do I need an account to book?",
    answer:
      "No account required! Enjoy our guest booking feature for quick reservations. Optionally create an account to track your appointments and access exclusive features.",
  },
  {
    id: 2,
    question: "Is the booking free?",
    answer:
      "Our booking platform is completely free to use. You'll only be charged for services provided by the clinic, with full price transparency before confirmation.",
  },
  {
    id: 3,
    question: "Will I receive a confirmation?",
    answer:
      "Instant digital receipt! Receive SMS and email confirmation with appointment details, clinic location map, and preparation guidelines immediately after booking.",
    extraInfo: true,
  },
  {
    id: 4,
    question: "Can I reschedule or cancel appointments?",
    answer:
      "Flexible changes available! Modify or cancel appointments up to 24 hours prior through your confirmation link or patient dashboard, subject to clinic policies.",
  },
  {
    id: 5,
    question: "How do I know clinic availability?",
    answer:
      "Real-time availability updates! Color-coded indicators show clinic capacity: Green (Plenty), Amber (Limited), Red (Fully Booked).",
  },
  {
    id: 6,
    question: "What safety measures are in place?",
    answer:
      "All partner clinics maintain our strict Safety Certified standards. Look for the shield icon indicating enhanced sanitation protocols and staff certifications.",
  },
];

// collaboration component
export const stats = [
  { number: "42%", label: "Average increase in new patients" },
  { number: "87%", label: "Reduction in administrative time" },
  { number: "4.8/5", label: "Average partner satisfaction rating" },
];