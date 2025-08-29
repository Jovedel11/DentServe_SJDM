// Mock data perfectly aligned with your Supabase tables
export const mockAppointments = [
  {
    // From appointments table
    id: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    patient_id: "p1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    doctor_id: "d1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p", 
    clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    appointment_date: "2025-08-25",
    appointment_time: "09:00:00",
    duration_minutes: 60,
    status: "pending", // appointment_status enum
    service_type: "Dental Cleaning & Checkup",
    symptoms: "Regular checkup and cleaning, patient reports no pain",
    notes: "Patient prefers morning appointments, first visit to clinic",
    cancellation_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    reminder_sent: false,
    created_at: "2025-08-22T10:30:00Z",
    updated_at: "2025-08-22T10:30:00Z",

    // Joined data from related tables
    patient: {
      // From users table
      id: "p1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      auth_user_id: "auth_1a2b3c4d-5e6f-7g8h-9i0j",
      email: "maria.santos@email.com",
      user_type: "patient",
      is_active: true,
      created_at: "2025-07-15T08:20:00Z",
      
      // From user_profiles table
      user_profile: {
        id: "up1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
        first_name: "Maria",
        last_name: "Santos",
        phone: "+639171234567",
        address: "456 Bonifacio Street, Barangay San Antonio, Quezon City",
        date_of_birth: "1985-03-15",
        gender: "female"
      },
      
      // From patient_profiles table  
      patient_profile: {
        id: "pp1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
        emergency_contact_name: "Juan Santos",
        emergency_contact_phone: "+639281234567",
        insurance_provider: "PhilHealth",
        medical_conditions: ["Hypertension"],
        allergies: ["Penicillin"],
        email_notifications: true,
        sms_notifications: false
      }
    },

    doctor: {
      // From doctors table
      id: "d1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      user_id: "du1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      license_number: "DDS-2018-001234",
      specialization: "General Dentistry",
      education: "Doctor of Dental Surgery - University of Santo Tomas (2018), Fellowship in Restorative Dentistry - Asian Institute of Dentistry (2020)",
      experience_years: 6,
      bio: "Dr. Juan specializes in comprehensive dental care with expertise in restorative procedures and patient comfort.",
      consultation_fee: 1500.00,
      profile_image_url: "/api/placeholder/150/150",
      languages_spoken: ["English", "Filipino"],
      certifications: {
        "Advanced Restorative Dentistry": "2021",
        "Sedation Dentistry": "2020"
      },
      awards: ["Excellence in Patient Care 2023"],
      is_available: true,
      rating: 4.8,
      total_reviews: 156,
      
      // From users table (for doctor)
      user: {
        email: "dr.juan.delacruz@brightsmile.ph",
        user_profile: {
          first_name: "Juan",
          last_name: "Dela Cruz",
          phone: "+639191234567"
        }
      }
    },

    clinic: {
      // From clinics table
      id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      name: "Bright Smile Dental Clinic",
      description: "Premier family dental practice providing comprehensive oral healthcare in a comfortable, modern environment.",
      address: "123 Rizal Street, Salcedo Village",
      city: "Makati City",
      province: "Metro Manila",
      zip_code: "1227",
      country: "Philippines",
      phone: "+63 2 8123 4567",
      email: "info@brightsmile.ph",
      website_url: "https://brightsmile.ph",
      operating_hours: {
        monday: { open: "08:00", close: "18:00" },
        tuesday: { open: "08:00", close: "18:00" },
        wednesday: { open: "08:00", close: "18:00" },
        thursday: { open: "08:00", close: "18:00" },
        friday: { open: "08:00", close: "18:00" },
        saturday: { open: "08:00", close: "14:00" },
        sunday: { closed: true }
      },
      services_offered: {
        "general": ["Cleaning", "Checkup", "Fillings"],
        "cosmetic": ["Whitening", "Veneers"],
        "restorative": ["Crowns", "Bridges", "Implants"]
      },
      appointment_limit_per_patient: 5,
      cancellation_policy_hours: 48,
      is_active: true,
      rating: 4.7,
      total_reviews: 89
    }
  },

  // Additional appointment with different status
  {
    id: "2a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    patient_id: "p2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    doctor_id: "d1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    appointment_date: "2025-08-23",
    appointment_time: "14:30:00",
    duration_minutes: 90,
    status: "confirmed",
    service_type: "Root Canal Treatment",
    symptoms: "Severe tooth pain in upper right molar, sensitivity to hot/cold",
    notes: "Patient has dental anxiety, prefers sedation dentistry",
    cancellation_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    reminder_sent: true,
    created_at: "2025-08-20T14:15:00Z",
    updated_at: "2025-08-21T09:30:00Z",

    patient: {
      id: "p2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      email: "jose.rizal@email.com",
      user_type: "patient",
      user_profile: {
        first_name: "Jose",
        last_name: "Rizal", 
        phone: "+639281234567",
        address: "789 Kalayaan Avenue, Diliman, Quezon City",
        date_of_birth: "1990-06-12",
        gender: "male"
      },
      patient_profile: {
        emergency_contact_name: "Maria Rizal",
        emergency_contact_phone: "+639351234567",
        insurance_provider: null,
        medical_conditions: [],
        allergies: ["Latex"],
        email_notifications: true,
        sms_notifications: true
      }
    },

    doctor: {
      id: "d1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      license_number: "DDS-2018-001234",
      specialization: "General Dentistry",
      user: {
        user_profile: {
          first_name: "Juan",
          last_name: "Dela Cruz"
        }
      }
    },

    clinic: {
      id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      name: "Bright Smile Dental Clinic",
      address: "123 Rizal Street, Salcedo Village, Makati City"
    }
  }
];

// Mock current staff user (who's viewing the appointments)
export const mockCurrentStaff = {
  id: "staff1-2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
  auth_user_id: "nads-dotcom", // Your current login
  email: "staff@brightsmile.ph",
  user_type: "staff",
  user_profile: {
    first_name: "Nads",
    last_name: "Administrator",
    phone: "+639171234567"
  },
  staff_profile: {
    clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    position: "Clinic Manager",
    can_manage_appointments: true,
    can_manage_doctors: false,
    can_view_reports: true
  }
};