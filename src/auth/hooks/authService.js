import { supabase } from "../../lib/supabaseClient";
import { phoneUtils } from "@/utils/phoneUtils";
import { validatePassword } from "@/utils/validation/auth-validation";

const generateTempPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

const getRedirectURL = (path = '/auth-callback?type=patient') => {
  // Use environment variable for production
  if (import.meta.env.PROD && import.meta.env.VITE_SITE_URL) {
    return `${import.meta.env.VITE_SITE_URL}${path}`;
  }
  // Fallback for development
  return `${window.location.origin}${path}`;
};

export const authService = {
  // sign up new user
  async signUpUser(userData) {
    try {
      validatePassword(userData.password);

      let normalizedPhone = null;
      if (userData.phone) {
        normalizedPhone = phoneUtils.normalizePhilippinePhone(userData.phone);
        if (!phoneUtils.isValidPhilippinePhone(normalizedPhone)) {
          throw new Error('Invalid Philippine phone number format');
        }
      }

      if (!userData.email || !userData.password || !userData.first_name || !userData.last_name) {
        throw new Error('Please fill in all required fields')
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userData.email)) {
        throw new Error('Please enter a valid email address')
      }

      const redirectURL = getRedirectURL('/auth-callback?type=patient');
      console.log('📧 Email redirect URL:', redirectURL);

      const { data, error: signupError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            user_type: 'patient',
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: normalizedPhone,
            date_of_birth: userData.date_of_birth,
            gender: userData.gender,
            emergency_contact_name: userData.emergency_contact_name,
            emergency_contact_phone: userData.emergency_contact_phone,
            insurance_provider: userData.insurance_provider,
            medical_conditions: userData.medical_conditions || [],
            allergies: userData.allergies || [],
            recaptcha_token: userData.recaptchaToken
          },
          emailRedirectTo: redirectURL
        }
      })

      if (signupError) throw new Error(signupError.message || 'Signup failed')

      return {
        success: true,
        user: data.user,
        message: 'Please check your email to verify your account.'
      }

    } catch (error) {
      console.error('Patient signup error:', error)
      return { success: false, error: error.message || 'Patient signup failed' }
    }
  },

  // for staff invitation
  async validateAndSignupStaffV2(invitationId, email, firstName, lastName, phone = null) {
    try {
      const { data, error } = await supabase.rpc('validate_and_signup_staff_v2', {
        p_invitation_id: invitationId,
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      return { 
        success: true, 
        data,
        message: 'Invitation validated. Clinic created. Please complete your profile.'
      };
    } catch (error) {
      console.error('Validate staff signup v2 error:', error);
      return { success: false, error: error.message || 'Failed to validate invitation' };
    }
  },

  // Complete staff profile (v2 - creates services in services table)
  async updateStaffCompleteProfileV2(profileData, clinicData, servicesData = [], doctorsData = []) {
    try {
      const { data, error } = await supabase.rpc('update_staff_complete_profile_v2', {
        p_profile_data: profileData,
        p_clinic_data: clinicData,
        p_services_data: servicesData,
        p_doctors_data: doctorsData  // 🆕 ADD BACK
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to update staff profile');

      return data;
    } catch (error) {
      console.error('Update staff complete profile v2 error:', error);
      throw error;
    }
  },

  // Check staff profile completion status
  async checkStaffProfileCompletionStatus(userId = null) {
    try {
      const { data, error } = await supabase.rpc('check_staff_profile_completion_status', {
        p_user_id: userId
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      return { success: true, data };
    } catch (error) {
      console.error('Check staff profile completion error:', error);
      return { success: false, error: error.message || 'Failed to check completion status' };
    }
  },

  // Get incomplete staff signups (Admin only)
  async getIncompleteStaffSignups(limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase.rpc('get_incomplete_staff_signups', {
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      return { success: true, data: data.data || [], total: data.total_count || 0 };
    } catch (error) {
      console.error('Get incomplete staff signups error:', error);
      return { success: false, error: error.message || 'Failed to get incomplete signups' };
    }
  },

  // Send profile completion reminder (Admin only)
  async sendProfileCompletionReminder(invitationId) {
    try {
      const { data, error } = await supabase.rpc('send_profile_completion_reminder', {
        p_invitation_id: invitationId
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      return { success: true, data, message: 'Reminder sent successfully' };
    } catch (error) {
      console.error('Send reminder error:', error);
      return { success: false, error: error.message || 'Failed to send reminder' };
    }
  },

  // Admin cleanup specific incomplete staff
  async adminCleanupIncompleteStaff(invitationId, adminNotes = null) {
    try {
      const { data, error } = await supabase.rpc('admin_cleanup_specific_incomplete_staff', {
        p_invitation_id: invitationId,
        p_admin_notes: adminNotes
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      return { success: true, data, message: 'Cleanup completed successfully' };
    } catch (error) {
      console.error('Admin cleanup error:', error);
      return { success: false, error: error.message || 'Failed to cleanup' };
    }
  },

  // Approve partnership request v2 (Admin only - no immediate clinic creation)
  async approvePartnershipRequestV2(requestId, adminNotes = null) {
    try {
      const { data, error } = await supabase.rpc('approve_partnership_request_v2', {
        p_request_id: requestId,
        p_admin_notes: adminNotes
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      return { 
        success: true, 
        data: data  // This should contain email_data
      };
    } catch (error) {
      console.error('Approve partnership v2 error:', error);
      return { success: false, error: error.message || 'Failed to approve partnership request' };
    }
  },

  // Manual cleanup trigger (runs cleanup function)
  async runManualCleanup(daysThreshold = 7, dryRun = false) {
    try {
      const { data, error } = await supabase.rpc('cleanup_incomplete_staff_profiles', {
        p_days_threshold: daysThreshold,
        p_dry_run: dryRun
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      return { success: true, data };
    } catch (error) {
      console.error('Manual cleanup error:', error);
      return { success: false, error: error.message || 'Failed to run cleanup' };
    }
  },

  async completeStaffSignupFromInvitation(invitationId, email, password, firstName, lastName, phone = null) {
    try {
      const { data, error } = await supabase.rpc('complete_staff_signup_from_invitation', {
        p_invitation_id: invitationId,
        p_email: email,
        p_password: password,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create account');
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Complete staff signup error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create account'
      };
    }
  },

  // get auth status
  async getAuthStatus (authUserId = null) {
    try {
      const { data, error } = await supabase.rpc('get_user_auth_status', {
        p_auth_user_id: authUserId
      })

      if (error) throw new Error(error.message || 'Failed to fetch auth status')

      return { success: true, data }
    } catch (error) {
      console.error('Get auth status error:', error)
      const errorMsg = error?.message || String(error) || 'Get auth status failed'
      return { success: false, error: errorMsg }
    }
  },

  // reset pass
  async resetPassword(email) {
    try {

      const redirectURL = getRedirectURL('/reset-password');
      console.log('📧 Reset redirect URL:', redirectURL);

      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: redirectURL
        }
      )

      if (resetError) throw new Error(resetError?.message || 'Failed to send reset email')

      return {
        success: true,
        message: 'Password reset link sent to your email'
      }

    } catch (error) {
      console.error('Password reset request error:', error)
      const errorMsg = error?.message || String(error) || 'Password reset failed'
      return { success: false, error: errorMsg }
    }
  },

  // update pass
  async updatePassword(newPassword) {
    try {
      console.log('🔄 Updating password...');
      
      validatePassword(newPassword);

      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('❌ Update password error:', updateError);
        throw new Error(updateError?.message || 'Failed to update password');
      }

      console.log('✅ Password updated successfully');

      return {
        success: true,
        message: 'Password updated successfully'
      }

    } catch (error) {
      console.error('❌ Password update error:', error)
      return { success: false, error: error.message || 'Password update failed' }
    }
  },

  // get user profile
  async getCompleteProfile(userId = null){
    try {
      const { data, error } = await supabase.rpc('get_user_complete_profile', { p_user_id: userId });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to fetch complete profile'}
    }
  },

  // Patient profile update
  async updatePatientProfile(profileData, patientData) {
    try {
      const { data, error } = await supabase.rpc('update_patient_profile', {
        p_profile_data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          date_of_birth: profileData.dateOfBirth,
          gender: profileData.gender,
          phone: profileData.phone,
          profile_image_url: profileData.profileImageUrl
        },
        p_patient_data: {
          emergency_contact_name: patientData.emergencyContactName,
          emergency_contact_phone: patientData.emergencyContactPhone,
          insurance_provider: patientData.insuranceProvider,
          medical_conditions: patientData.medicalConditions,
          allergies: patientData.allergies,
          preferred_doctors: patientData.preferredDoctors
        }
      });

      if (error) {
        console.error('Update patient profile error:', error);
        return { success: false, error: error.message || 'Failed to update profile' };
      }
      
      if (data && !data.success) {
        return { success: false, error: data.error || 'Failed to update profile' };
      }

      return { success: true, data, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Update patient profile error:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  },

  // 🔥 FIXED: Staff profile update with proper parameter structure
  async updateStaffProfile(profileData, staffData, clinicData, servicesData, doctorsData) {
    try {
      // Format services data for CRUD operations
      const formattedServicesData = Array.isArray(servicesData) ? servicesData.map(service => ({
        id: service.id || null,
        name: service.name,
        description: service.description,
        category: service.category,
        duration_minutes: service.duration_minutes,
        min_price: service.min_price,
        max_price: service.max_price,
        priority: service.priority,
        is_active: service.is_active,
        _action: service._action || (service.id ? 'update' : 'create')
      })) : [];

      // Format doctors data for CRUD operations
      const formattedDoctorsData = Array.isArray(doctorsData) ? doctorsData.map(doctor => ({
        id: doctor.id || null,
        user_id: doctor.user_id || null,
        license_number: doctor.license_number,
        specialization: doctor.specialization,
        first_name: doctor.first_name,
        last_name: doctor.last_name,
        education: doctor.education,
        experience_years: doctor.experience_years,
        bio: doctor.bio,
        consultation_fee: doctor.consultation_fee,
        image_url: doctor.image_url,
        languages_spoken: doctor.languages_spoken,
        certifications: doctor.certifications,
        awards: doctor.awards,
        is_available: doctor.is_available,
        schedule: doctor.schedule,
        _action: doctor._action || (doctor.id ? 'update' : 'create')
      })) : [];

      const { data, error } = await supabase.rpc('update_staff_profile', {
        p_profile_data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          profile_image_url: profileData.profileImageUrl,
          date_of_birth: profileData.dateOfBirth,
          gender: profileData.gender
        },
        p_staff_data: {
          position: staffData.position,
          department: staffData.department
        },
        p_clinic_data: {
          name: clinicData.name,
          description: clinicData.description,
          address: clinicData.address,
          city: clinicData.city,
          province: clinicData.province,
          zip_code: clinicData.zipCode,
          phone: clinicData.phone,
          email: clinicData.email,
          website_url: clinicData.websiteUrl,
          image_url: clinicData.imageUrl,
          appointment_limit_per_patient: clinicData.appointmentLimitPerPatient,
          cancellation_policy_hours: clinicData.cancellationPolicyHours
        },
        p_services_data: formattedServicesData,
        p_doctors_data: formattedDoctorsData
      });
      
      if (error) {
        console.error('Update staff profile error:', error);
        return { success: false, error: error.message || 'Failed to update profile' };
      }
      
      if (data && !data.success) {
        return { success: false, error: data.error || 'Failed to update profile' };
      }

      return { success: true, data, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Update staff profile error:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  },

  async updateAdminProfile(profileData) {
    try {
      const { data, error } = await supabase.rpc('update_admin_profile', {
        p_profile_data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          profile_image_url: profileData.profileImageUrl,
          date_of_birth: profileData.dateOfBirth,
          gender: profileData.gender
        }
      });
      
      if (error) {
        console.error('Update admin profile error:', error);
        return { success: false, error: error.message || 'Failed to update profile' };
      }
      
      if (data && !data.success) {
        return { success: false, error: data.error || 'Failed to update profile' };
      }

      return { success: true, data, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Update admin profile error:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  },

  // dashboard data
  async getDashboardData(userId = null) {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_data', { p_user_id: userId })

      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to fetch dashboard data' }
    }
  },

  // User list function
  async getUserList(filter = {}) {
    const { userType = null, clinicId = null, searchTerm = null, limit = 50, offset = 0 } = filter

    try {
      const { data, error } = await supabase.rpc('get_users_list', {
        p_user_type: userType,
        p_clinic_id: clinicId,
        p_search_term: searchTerm,
        p_limit: limit,
        p_offset: offset
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to fetch user list' }
    }
  }
}