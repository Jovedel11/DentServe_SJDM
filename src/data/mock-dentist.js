  export const mockDentists = [
    {
      id: "1",
      user_id: "user_1",
      name: "Dr. Maria Santos",
      email: "maria.santos@dentcare.com",
      phone: "+63 917 123 4567",
      license_number: "PRC-12345678",
      specialization: "General Dentistry, Cosmetic Dentistry",
      education: "DDS - University of the Philippines Manila, Certificate in Cosmetic Dentistry - NYU",
      experience_years: 8,
      bio: "Passionate about creating beautiful smiles through comprehensive dental care. Specializes in cosmetic procedures and general dentistry with a gentle approach.",
      consultation_fee: 2500.00,
      profile_image_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      languages_spoken: ["English", "Filipino", "Tagalog"],
      certifications: {
        "Invisalign Certified": "2023",
        "Digital Smile Design": "2022",
        "Advanced Periodontics": "2021"
      },
      awards: ["Best Young Dentist 2023", "Excellence in Patient Care 2022"],
      is_available: true,
      rating: 4.9,
      total_reviews: 247,
      clinic_locations: [
        {
          clinic_id: "clinic_1",
          clinic_name: "SmileCare Dental Center",
          address: "123 Katipunan Ave, Quezon City",
          schedule: "Mon-Fri: 9AM-6PM, Sat: 9AM-2PM"
        },
        {
          clinic_id: "clinic_2",
          clinic_name: "Elite Dental Clinic",
          address: "456 Ortigas Center, Pasig City",
          schedule: "Tue-Thu: 1PM-9PM, Sat: 10AM-4PM"
        }
      ],
      next_available: "Tomorrow 2:00 PM",
      total_patients: 1250,
      years_practicing: 8,
      patient_satisfaction: 98,
    },
    {
      id: "2",
      user_id: "user_2",
      name: "Dr. Roberto Cruz",
      email: "roberto.cruz@dental.com",
      phone: "+63 917 987 6543",
      license_number: "PRC-87654321",
      specialization: "Orthodontics, Pediatric Dentistry",
      education: "DDS - Ateneo School of Medicine, MS Orthodontics - Boston University",
      experience_years: 15,
      bio: "Dedicated orthodontist with over 15 years of experience in creating perfect smiles for patients of all ages. Specializes in modern braces and Invisalign treatments.",
      consultation_fee: 3500.00,
      profile_image_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
      languages_spoken: ["English", "Filipino", "Spanish"],
      certifications: {
        "Invisalign Diamond Provider": "2024",
        "Damon System Certified": "2020",
        "Pediatric Orthodontics": "2019"
      },
      awards: ["Top Orthodontist Manila 2024", "Patient Choice Award 2023", "Innovation in Orthodontics 2022"],
      is_available: true,
      rating: 4.8,
      total_reviews: 389,
      clinic_locations: [
        {
          clinic_id: "clinic_3",
          clinic_name: "Cruz Orthodontic Center",
          address: "789 Ayala Ave, Makati City",
          schedule: "Mon-Wed-Fri: 8AM-5PM, Sat: 9AM-3PM"
        }
      ],
      next_available: "Next Week Monday",
      total_patients: 2100,
      years_practicing: 15,
      patient_satisfaction: 97,
    },
    {
      id: "3",
      user_id: "user_3",
      name: "Dr. Jennifer Lim",
      email: "jennifer.lim@smile.ph",
      phone: "+63 917 555 0123",
      license_number: "PRC-11223344",
      specialization: "Oral Surgery, Dental Implantology",
      education: "DDS - Far Eastern University, Certificate in Oral Surgery - University of California",
      experience_years: 12,
      bio: "Expert oral surgeon specializing in complex extractions, dental implants, and reconstructive procedures. Known for painless surgical techniques.",
      consultation_fee: 4000.00,
      profile_image_url: "https://images.unsplash.com/photo-1594824797384-5ee1ec5d9e3b?w=400&h=400&fit=crop&crop=face",
      languages_spoken: ["English", "Filipino", "Mandarin"],
      certifications: {
        "Advanced Implantology": "2023",
        "Bone Grafting Techniques": "2022",
        "Sedation Dentistry": "2021"
      },
      awards: ["Excellence in Oral Surgery 2023"],
      is_available: false,
      rating: 4.7,
      total_reviews: 156,
      clinic_locations: [
        {
          clinic_id: "clinic_4",
          clinic_name: "Advanced Oral Surgery Center",
          address: "321 BGC, Taguig City",
          schedule: "Tue-Thu: 10AM-7PM, Sat: 8AM-2PM"
        },
        {
          clinic_id: "clinic_5",
          clinic_name: "Lim Dental Specialists",
          address: "654 Shaw Blvd, Mandaluyong",
          schedule: "Mon-Wed-Fri: 9AM-6PM"
        }
      ],
      next_available: "Next Friday 10:00 AM",
      total_patients: 890,
      years_practicing: 12,
      patient_satisfaction: 95,
    },
    {
      id: "4",
      user_id: "user_4",
      name: "Dr. Michael Tan",
      email: "michael.tan@perio.com",
      phone: "+63 917 444 5555",
      license_number: "PRC-99887766",
      specialization: "Periodontics, Prosthodontics",
      education: "DDS - University of Santo Tomas, MS Periodontics - University of Michigan",
      experience_years: 20,
      bio: "Seasoned periodontist with two decades of experience in treating gum diseases and providing comprehensive prosthodontic solutions.",
      consultation_fee: 3000.00,
      profile_image_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
      languages_spoken: ["English", "Filipino", "Hokkien"],
      certifications: {
        "Advanced Periodontal Surgery": "2023",
        "Full Mouth Reconstruction": "2022",
        "Laser Therapy": "2021"
      },
      awards: ["Lifetime Achievement Award 2024", "Best Periodontist 2023", "Research Excellence 2022"],
      is_available: true,
      rating: 4.9,
      total_reviews: 523,
      clinic_locations: [
        {
          clinic_id: "clinic_6",
          clinic_name: "Tan Periodontal Center",
          address: "987 Alabang Hills, Muntinlupa",
          schedule: "Mon-Fri: 8AM-6PM, Sat: 9AM-1PM"
        }
      ],
      next_available: "Today 4:00 PM",
      total_patients: 3200,
      years_practicing: 20,
      patient_satisfaction: 99,
    },
    {
      id: "5",
      user_id: "user_5",
      name: "Dr. Sarah Kim",
      email: "sarah.kim@pediatric.ph",
      phone: "+63 917 333 2222",
      license_number: "PRC-55667788",
      specialization: "Pediatric Dentistry, Preventive Care",
      education: "DDS - Yonsei University, Certificate in Pediatric Dentistry - Children's Hospital Philadelphia",
      experience_years: 6,
      bio: "Gentle pediatric dentist who makes dental visits fun and comfortable for children. Focuses on preventive care and early intervention.",
      consultation_fee: 2000.00,
      profile_image_url: "https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&h=400&fit=crop&crop=face",
      languages_spoken: ["English", "Filipino", "Korean"],
      certifications: {
        "Pediatric Sedation": "2023",
        "Special Needs Dentistry": "2022",
        "Child Psychology in Dentistry": "2021"
      },
      awards: ["Rising Star in Pediatric Dentistry 2024"],
      is_available: true,
      rating: 4.8,
      total_reviews: 189,
      clinic_locations: [
        {
          clinic_id: "clinic_7",
          clinic_name: "Little Smiles Dental",
          address: "123 Timog Ave, Quezon City",
          schedule: "Mon-Sat: 9AM-6PM"
        }
      ],
      next_available: "Thursday 11:00 AM",
      total_patients: 650,
      years_practicing: 6,
      patient_satisfaction: 96,
    },
    {
    id: "6",
    user_id: "user_6",
    name: "Dr. Miguel Santos",
    email: "miguel.santos@ortho.ph",
    phone: "+63 917 444 5555",
    license_number: "PRC-66778899",
    specialization: "Orthodontics, Invisalign, Braces",
    education: "DMD - University of the Philippines, MS Orthodontics - University of Hong Kong",
    experience_years: 12,
    bio: "Passionate orthodontist helping patients achieve confident smiles through modern and minimally invasive treatments.",
    consultation_fee: 2500.00,
    profile_image_url: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&h=400&fit=crop&crop=face",
    languages_spoken: ["English", "Filipino"],
    certifications: {
      "Invisalign Platinum Provider": "2023",
      "Lingual Braces Specialist": "2021"
    },
    awards: ["Top Orthodontist Manila 2022"],
    is_available: true,
    rating: 4.9,
    total_reviews: 320,
    clinic_locations: [
      {
        clinic_id: "clinic_8",
        clinic_name: "Smile Align Dental",
        address: "456 Ayala Ave, Makati City",
        schedule: "Tue-Sat: 10AM-7PM"
      }
    ],
    next_available: "Friday 3:00 PM",
    total_patients: 1200,
    years_practicing: 12,
    patient_satisfaction: 98
    },
    {
    id: "7",
    user_id: "user_7",
    name: "Dr. Angela Reyes",
    email: "angela.reyes@cosmetic.ph",
    phone: "+63 917 222 7777",
    license_number: "PRC-77889900",
    specialization: "Cosmetic Dentistry, Veneers, Teeth Whitening",
    education: "DDS - Ateneo School of Medicine & Dentistry, Fellowship in Cosmetic Dentistry - UCLA",
    experience_years: 9,
    bio: "Dedicated to enhancing smiles with natural-looking cosmetic treatments, blending art and science in dentistry.",
    consultation_fee: 3000.00,
    profile_image_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face",
    languages_spoken: ["English", "Filipino", "Spanish"],
    certifications: {
      "Advanced Veneers": "2022",
      "Laser Teeth Whitening": "2020"
    },
    awards: ["Best Cosmetic Dentist 2023"],
    is_available: false,
    rating: 4.7,
    total_reviews: 210,
    clinic_locations: [
      {
        clinic_id: "clinic_9",
        clinic_name: "Pearl White Dental Aesthetics",
        address: "789 Bonifacio High Street, Taguig",
        schedule: "Mon-Fri: 11AM-8PM"
      }
    ],
    next_available: "Monday 1:00 PM",
    total_patients: 850,
    years_practicing: 9,
    patient_satisfaction: 94
    },
    {
    id: "8",
    user_id: "user_8",
    name: "Dr. Kenji Tanaka",
    email: "kenji.tanaka@implants.ph",
    phone: "+63 917 555 8888",
    license_number: "PRC-88990011",
    specialization: "Implant Dentistry, Oral Surgery",
    education: "DDS - Tokyo Medical and Dental University, MSc Implantology - King's College London",
    experience_years: 15,
    bio: "Expert implant dentist with over a thousand successful cases, committed to restoring function and aesthetics with precision.",
    consultation_fee: 4000.00,
    profile_image_url: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&h=400&fit=crop&crop=face",
    languages_spoken: ["English", "Filipino", "Japanese"],
    certifications: {
      "Advanced Implantology": "2023",
      "Oral Surgery Fellowship": "2019"
    },
    awards: ["Excellence in Implant Dentistry 2021"],
    is_available: true,
    rating: 5.0,
    total_reviews: 540,
    clinic_locations: [
      {
        clinic_id: "clinic_10",
        clinic_name: "Precision Dental Implants Center",
        address: "101 Greenhills, San Juan",
        schedule: "Mon-Sat: 9AM-7PM"
      }
    ],
    next_available: "Saturday 10:30 AM",
    total_patients: 2000,
    years_practicing: 15,
    patient_satisfaction: 99
    },
  ];


    export const doctors = [
    {
      id: 1,
      name: "Dr. Sarah Martinez",
      specialty: "General Dentistry",
      rating: 4.9,
      experience: "12 years",
      education: "DDS, University of California",
      image:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
      clinicId: 1,
      specializations: [
        "Preventive Care",
        "Restorative Dentistry",
        "Cosmetic Procedures",
      ],
      languages: ["English", "Spanish"],
      availability: "Mon-Fri: 9AM-5PM",
    },
    {
      id: 2,
      name: "Dr. Michael Johnson",
      specialty: "Orthodontics",
      rating: 4.8,
      experience: "15 years",
      education: "DDS, MSD, Harvard University",
      image:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
      clinicId: 1,
      specializations: ["Braces", "Invisalign", "Jaw Alignment"],
      languages: ["English"],
      availability: "Tue-Sat: 8AM-6PM",
    },
    {
      id: 3,
      name: "Dr. Emily Smith",
      specialty: "Cosmetic Dentistry",
      rating: 4.7,
      experience: "8 years",
      education: "DDS, New York University",
      image:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
      clinicId: 2,
      specializations: ["Veneers", "Teeth Whitening", "Smile Makeovers"],
      languages: ["English", "French"],
      availability: "Mon-Thu: 10AM-7PM",
    },
    {
      id: 4,
      name: "Dr. James Brown",
      specialty: "Oral Surgery",
      rating: 4.9,
      experience: "20 years",
      education: "DDS, MD, Johns Hopkins",
      image:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
      clinicId: 3,
      specializations: [
        "Dental Implants",
        "Wisdom Teeth",
        "Complex Extractions",
      ],
      languages: ["English"],
      availability: "Mon-Fri: 8AM-4PM",
    },
  ];