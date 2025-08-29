        export const mockFeedbacks = [
          {
            id: "f1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            patient_id: "p1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            doctor_id: "d1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            appointment_id: "a1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            feedback_type: "doctor",
            rating: 5,
            comment:
              "Dr. Juan was extremely professional and gentle during my root canal procedure. The staff was also very accommodating and made me feel comfortable throughout the entire visit.",
            is_anonymous: false,
            is_public: true,
            response: null,
            responded_by: null,
            responded_at: null,
            created_at: "2025-01-20T14:30:00Z",
            patient: {
              id: "p1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
              full_name: "Maria Santos",
              profile_image_url:
                "https://images.unsplash.com/photo-1494790108755-2616b612d5c8?w=400&h=400&fit=crop&crop=face",
              email: "maria.santos@email.com",
            },
            doctor: {
              id: "d1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
              user: {
                full_name: "Dr. Juan Dela Cruz",
                profile_image_url:
                  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
              },
            },
            appointment: {
              id: "a1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
              appointment_date: "2025-01-20T10:00:00Z",
            },
            responder: null,
          },
          {
            id: "f2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            patient_id: null,
            clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            doctor_id: null,
            appointment_id: null,
            feedback_type: "service",
            rating: 4,
            comment:
              "The dental cleaning service was good, but I had to wait longer than expected. The facilities are clean and modern though.",
            is_anonymous: true,
            is_public: false,
            response:
              "Thank you for your feedback. We're working on improving our scheduling to reduce waiting times.",
            responded_by: "s1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            responded_at: "2025-01-19T16:20:00Z",
            created_at: "2025-01-19T15:45:00Z",
            patient: null,
            doctor: null,
            appointment: null,
            responder: {
              full_name: "Maria Santos (Staff)",
            },
          },
          {
            id: "f3a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            patient_id: "p2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            doctor_id: "d2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            appointment_id: "a2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            feedback_type: "doctor",
            rating: 3,
            comment:
              "The treatment was okay but I felt rushed. Dr. Maria was knowledgeable but could have explained the procedure better.",
            is_anonymous: false,
            is_public: true,
            response: null,
            responded_by: null,
            responded_at: null,
            created_at: "2025-01-18T11:15:00Z",
            patient: {
              id: "p2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
              full_name: "John Cruz",
              profile_image_url:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
              email: "john.cruz@email.com",
            },
            doctor: {
              id: "d2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
              user: {
                full_name: "Dr. Maria Lopez",
                profile_image_url:
                  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
              },
            },
            appointment: {
              id: "a2a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
              appointment_date: "2025-01-18T09:30:00Z",
            },
            responder: null,
          },
          {
            id: "f4a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            patient_id: "p3a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            doctor_id: null,
            appointment_id: null,
            feedback_type: "facility",
            rating: 5,
            comment:
              "Excellent facilities! The clinic is very clean, modern, and well-equipped. Staff are friendly and professional.",
            is_anonymous: false,
            is_public: true,
            response:
              "Thank you for your wonderful feedback! We're glad you had a great experience at our clinic.",
            responded_by: "s1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            responded_at: "2025-01-17T14:10:00Z",
            created_at: "2025-01-17T13:20:00Z",
            patient: {
              id: "p3a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
              full_name: "Anna Reyes",
              profile_image_url:
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
              email: "anna.reyes@email.com",
            },
            doctor: null,
            appointment: null,
            responder: {
              full_name: "Maria Santos (Staff)",
            },
          },
          {
            id: "f5a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            patient_id: null,
            clinic_id: "c1a2b3c4-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            doctor_id: null,
            appointment_id: null,
            feedback_type: "general",
            rating: 2,
            comment:
              "Had to reschedule multiple times due to doctor availability. The booking system needs improvement.",
            is_anonymous: true,
            is_public: false,
            response: null,
            responded_by: null,
            responded_at: null,
            created_at: "2025-01-16T16:45:00Z",
            patient: null,
            doctor: null,
            appointment: null,
            responder: null,
          },
        ];