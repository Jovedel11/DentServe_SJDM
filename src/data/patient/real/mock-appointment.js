import { Stethoscope, Heart, Sparkles, Wrench, Zap } from "lucide-react";

// Mock data aligned with your Supabase tables
export const clinics = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "SmileCare Dental Clinic",
    description: "Premier dental clinic specializing in comprehensive oral healthcare with state-of-the-art technology and experienced professionals.",
    address: "123 Ayala Avenue, Salcedo Village",
    city: "Makati City",
    province: "Metro Manila",
    zip_code: "1227",
    country: "Philippines",
    phone: "+63 2 8123 4567",
    email: "info@smilecare.ph",
    website_url: "https://smilecare.ph",
    rating: 4.8,
    total_reviews: 124,
    appointment_limit_per_patient: 5,
    cancellation_policy_hours: 48,
    is_active: true,
    operating_hours: {
      monday: { open: "08:00", close: "18:00" },
      tuesday: { open: "08:00", close: "18:00" },
      wednesday: { open: "08:00", close: "18:00" },
      thursday: { open: "08:00", close: "18:00" },
      friday: { open: "08:00", close: "18:00" },
      saturday: { open: "08:00", close: "14:00" },
      sunday: { closed: true }
    },
    services_offered: [
      "General Dentistry",
      "Cosmetic Dentistry", 
      "Orthodontics",
      "Oral Surgery",
      "Pediatric Dentistry"
    ],
    // UI-specific data (not in DB but computed)
    location: "Makati City, Metro Manila",
    specialties: ["General Dentistry", "Cosmetic Dentistry", "Orthodontics"],
    features: ["Digital X-Ray", "Laser Treatment", "Same Day Service", "Insurance Accepted"],
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop",
    recentReviews: [{
      rating: 5,
      patient: "Maria Santos",
      comment: "Excellent service! Dr. Martinez was very gentle and professional. The facility is modern and clean."
    }]
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440001", 
    name: "Bright Smile Dental Center",
    description: "Family-friendly dental practice offering personalized care in a comfortable, welcoming environment.",
    address: "456 Ortigas Avenue, Pasig Heights",
    city: "Pasig City",
    province: "Metro Manila", 
    zip_code: "1605",
    country: "Philippines",
    phone: "+63 2 8234 5678",
    email: "hello@brightsmile.ph",
    rating: 4.6,
    total_reviews: 89,
    appointment_limit_per_patient: 3,
    cancellation_policy_hours: 24,
    is_active: true,
    operating_hours: {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: { open: "09:00", close: "13:00" },
      sunday: { closed: true }
    },
    services_offered: [
      "General Dentistry",
      "Restorative Dentistry",
      "Endodontics"
    ],
    location: "Pasig City, Metro Manila",
    specialties: ["General Dentistry", "Restorative Dentistry", "Root Canal"],
    features: ["Family Practice", "Emergency Care", "Flexible Payment"],
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop",
    recentReviews: [{
      rating: 4,
      patient: "John Rivera",
      comment: "Great experience with the team. Very accommodating and the treatment was painless."
    }]
  }
];

export const doctors = [
  {
    id: "770e8400-e29b-41d4-a716-446655440002",
    user_id: "880e8400-e29b-41d4-a716-446655440003",
    license_number: "DDS-2019-001234",
    specialization: "General Dentistry & Cosmetic Dentistry",
    education: "Doctor of Dental Surgery - University of Santo Tomas (2019), Fellowship in Cosmetic Dentistry - Asian Institute of Dentistry (2021)",
    experience_years: 5,
    bio: "Dr. Martinez specializes in pain-free dental procedures and cosmetic treatments. She is passionate about helping patients achieve their best smile while ensuring comfort throughout the process.",
    consultation_fee: 1500.00,
    profile_image_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
    languages_spoken: ["English", "Filipino", "Spanish"],
    certifications: {
      "Invisalign Certified": "2022",
      "Laser Dentistry": "2023",
      "Sedation Dentistry": "2021"
    },
    awards: ["Best Young Dentist 2023", "Patient Choice Award 2022"],
    is_available: true,
    rating: 4.9,
    total_reviews: 87,
    // UI-specific computed fields
    name: "Dr. Sarah Martinez",
    specialty: "General & Cosmetic Dentistry",
    experience: "5 years experience",
    specializations: ["Teeth Whitening", "Veneers", "Invisalign"],
    availability: "Mon-Fri: 9AM-5PM, Sat: 9AM-2PM",
    clinicId: "550e8400-e29b-41d4-a716-446655440000", // For filtering
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop"
  },
  {
    id: "990e8400-e29b-41d4-a716-446655440004",
    user_id: "aa0e8400-e29b-41d4-a716-446655440005", 
    license_number: "DDS-2015-005678",
    specialization: "Orthodontics & Pediatric Dentistry",
    education: "Doctor of Dental Surgery - University of the Philippines (2015), Master in Orthodontics - De La Salle University (2018)",
    experience_years: 9,
    bio: "Dr. Chen focuses on orthodontic treatments and pediatric care, creating positive dental experiences for patients of all ages.",
    consultation_fee: 2000.00,
    profile_image_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
    languages_spoken: ["English", "Filipino", "Mandarin"],
    is_available: true,
    rating: 4.7,
    total_reviews: 156,
    name: "Dr. Michael Chen",
    specialty: "Orthodontics & Pediatric Dentistry", 
    experience: "9 years experience",
    specializations: ["Braces", "Invisalign", "Pediatric Care"],
    availability: "Mon-Sat: 8AM-6PM",
    clinicId: "550e8400-e29b-41d4-a716-446655440000",
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop"
  },
  {
    id: "bb0e8400-e29b-41d4-a716-446655440006",
    user_id: "cc0e8400-e29b-41d4-a716-446655440007",
    license_number: "DDS-2017-009876", 
    specialization: "Endodontics & Restorative Dentistry",
    education: "Doctor of Dental Surgery - Ateneo de Manila University (2017), Residency in Endodontics - Manila Central University (2020)",
    experience_years: 7,
    bio: "Dr. Reyes specializes in root canal therapy and complex restorative procedures, ensuring patients receive the highest quality care.",
    consultation_fee: 1800.00,
    profile_image_url: "https://images.unsplash.com/photo-1594824804732-ca8db5ac6b9e?w=400&h=400&fit=crop&crop=face",
    is_available: true,
    rating: 4.8,
    total_reviews: 92,
    name: "Dr. Anna Reyes",
    specialty: "Endodontics & Restorative",
    experience: "7 years experience", 
    specializations: ["Root Canal", "Crowns", "Bridges"],
    availability: "Tue-Sat: 10AM-6PM",
    clinicId: "660e8400-e29b-41d4-a716-446655440001",
    image: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=300&fit=crop"
  }
];

export const services = [
  {
    id: 1,
    name: "Dental Cleaning & Checkup",
    description: "Comprehensive oral examination with professional teeth cleaning, plaque removal, and oral health assessment.",
    category: "General",
    price: "₱2,500",
    duration: "60 minutes",
    popular: true,
    priority: 1,
    icon: Stethoscope
  },
  {
    id: 2,
    name: "Teeth Whitening Treatment",
    description: "Professional whitening procedure to brighten your smile by several shades using advanced bleaching technology.",
    category: "Cosmetic", 
    price: "₱8,000",
    duration: "90 minutes",
    popular: true,
    priority: 2,
    icon: Sparkles
  },
  {
    id: 3,
    name: "Dental Filling",
    description: "Restoration of cavities using high-quality composite materials that match your natural tooth color.",
    category: "Restorative",
    price: "₱3,500",
    duration: "45 minutes",
    popular: true,
    priority: 3,
    icon: Wrench
  },
  {
    id: 4,
    name: "Root Canal Treatment",
    description: "Advanced endodontic therapy to save infected or severely damaged teeth with modern pain-free techniques.",
    category: "Endodontic",
    price: "₱12,000",
    duration: "120 minutes", 
    popular: false,
    priority: 4,
    icon: Heart
  },
  {
    id: 5,
    name: "Tooth Extraction",
    description: "Safe and comfortable tooth removal procedure with proper anesthesia and post-operative care instructions.",
    category: "General",
    price: "₱4,000",
    duration: "30 minutes",
    popular: false,
    priority: 5,
    icon: Zap
  }
];

export const serviceCategories = [
  { id: "all", name: "All Services" },
  { id: "General", name: "General" },
  { id: "Cosmetic", name: "Cosmetic" }, 
  { id: "Restorative", name: "Restorative" },
  { id: "Endodontic", name: "Endodontic" }
];

export const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", 
  "11:00 AM", "11:30 AM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"
];

export const userProfile = {
  id: "dd0e8400-e29b-41d4-a716-446655440008",
  name: "Juan Dela Cruz",
  email: "juan.delacruz@email.com",
  phone: "+63 917 123 4567",
  address: "789 Bonifacio Street, Barangay San Antonio, Quezon City, Metro Manila 1105"
};