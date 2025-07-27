import { FaTeeth, FaTeethOpen, FaXRay, FaSmile, FaTooth } from "react-icons/fa";

//service page
export const serviceCategories = [
  { id: "preventive", name: "Preventive Care", icon: <FaTooth /> },
  { id: "restorative", name: "Restorative", icon: <FaTeeth /> },
  { id: "cosmetic", name: "Cosmetic", icon: <FaSmile /> },
  { id: "orthodontic", name: "Orthodontic", icon: <FaTeethOpen /> },
  { id: "surgical", name: "Surgical", icon: <FaXRay /> },
];

export const dentalServices = [
  {
    id: 1,
    title: "Comprehensive Dental Checkup",
    description: "Complete oral examination and professional cleaning",
    category: "preventive",
    duration: "30-60 mins",
    details:
      "Our comprehensive checkup includes digital X-rays, oral cancer screening, periodontal assessment, and fluoride treatment. Our dentists use advanced diagnostic tools to detect issues at their earliest stages.",
    benefits: [
      "Early cavity detection",
      "Plaque and tartar removal",
      "Personalized oral hygiene guidance",
      "Digital X-ray analysis",
    ],
    popular: true,
    locations: 12,
    icon: <FaTooth />,
  },
  {
    id: 2,
    title: "Professional Teeth Whitening",
    description: "Advanced whitening for a radiant smile",
    category: "cosmetic",
    duration: "60-90 mins",
    details:
      "Experience our state-of-the-art whitening system using advanced LED technology with immediate, dramatic results. Includes custom-fitted trays and professional-grade whitening gel for maintenance.",
    benefits: [
      "Immediate visible results",
      "Stain removal from coffee, tea, and tobacco",
      "Custom shade matching",
      "Long-lasting brightness",
    ],
    popular: true,
    locations: 8,
    icon: <FaSmile />,
  },
  {
    id: 3,
    title: "Dental Implant Solutions",
    description: "Permanent restoration for missing teeth",
    category: "surgical",
    duration: "Multiple visits",
    details:
      "Premium titanium implants fused with jawbone to provide stable foundation for custom-crafted crowns. Includes 3D imaging, surgical planning, and follow-up care with a 10-year warranty.",
    benefits: [
      "Natural look and feel",
      "Prevents bone loss",
      "Long-lasting solution",
      "Restores full chewing function",
    ],
    locations: 6,
    icon: <FaXRay />,
  },
  {
    id: 4,
    title: "Invisalign Clear Aligners",
    description: "Discreet orthodontic treatment",
    category: "orthodontic",
    duration: "12-18 months",
    details:
      "Custom-made clear aligners that gradually shift teeth into proper position using advanced 3D imaging technology. Includes virtual treatment planning and progress monitoring.",
    benefits: [
      "Virtually invisible",
      "Removable for eating",
      "Smooth comfortable fit",
      "Predictable results",
    ],
    locations: 10,
    icon: <FaTeethOpen />,
  },
  {
    id: 5,
    title: "Porcelain Veneers",
    description: "Transform your smile with custom veneers",
    category: "cosmetic",
    duration: "2-3 visits",
    details:
      "Thin, custom-crafted ceramic shells bonded to the front surface of teeth to correct chips, gaps, discoloration, and minor misalignments. Made from premium dental ceramics for natural translucency.",
    benefits: [
      "Stain-resistant surface",
      "Natural appearance",
      "Minimal tooth preparation",
      "10+ year lifespan",
    ],
    locations: 7,
    icon: <FaSmile />,
  },
  {
    id: 6,
    title: "Root Canal Therapy",
    description: "Advanced endodontic treatment",
    category: "restorative",
    duration: "60-90 mins",
    details:
      "Precision treatment using rotary instruments and digital imaging to remove infected pulp, disinfect root canals, and seal the tooth to prevent reinfection. Performed under local anesthesia for comfort.",
    benefits: [
      "Pain relief",
      "Tooth preservation",
      "Prevents infection spread",
      "Same-day crown placement",
    ],
    locations: 9,
    icon: <FaTeeth />,
  },
  {
    id: 7,
    title: "Pediatric Dentistry",
    description: "Specialized care for children",
    category: "preventive",
    duration: "30-45 mins",
    details:
      "Our child-friendly environment focuses on prevention, education, and creating positive dental experiences. Includes fun educational tools, gentle cleanings, and age-appropriate treatments.",
    benefits: [
      "Child-friendly environment",
      "Preventive education",
      "Growth monitoring",
      "Behavior management",
    ],
    locations: 5,
    icon: <FaTooth />,
  },
  {
    id: 8,
    title: "Crowns & Bridges",
    description: "Premium restorations for damaged teeth",
    category: "restorative",
    duration: "2 visits",
    details:
      "Custom-made ceramic restorations crafted using CAD/CAM technology for perfect fit and natural appearance. Strengthens weakened teeth and replaces missing teeth with lifelike prosthetics.",
    benefits: [
      "Strengthens weak teeth",
      "Natural appearance",
      "Restores chewing function",
      "Precision digital design",
    ],
    locations: 11,
    icon: <FaTeeth />,
  },
  {
    id: 9,
    title: "Periodontal Treatment",
    description: "Specialized care for gum disease",
    category: "preventive",
    duration: "60-90 mins",
    details:
      "Advanced deep cleaning procedures including scaling and root planing to treat gum disease and prevent tooth loss. Includes laser therapy for minimally invasive treatment of periodontal pockets.",
    benefits: [
      "Halts gum disease progression",
      "Reduces pocket depth",
      "Prevents bone loss",
      "Promotes tissue regeneration",
    ],
    locations: 7,
    icon: <FaTooth />,
  },
];
