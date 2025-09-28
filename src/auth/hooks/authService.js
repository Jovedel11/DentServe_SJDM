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
          emailRedirectTo: `${window.location.origin}/auth-callback?type=patient`
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
  async staffInvitation(inviteData) {
    try {
      if (!inviteData.email || !inviteData.first_name || !inviteData.last_name || !inviteData.clinic_id) {
        throw new Error('Please fill in all required fields')
      }
      const tempPassword = generateTempPassword()

      const { data, error: signupError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: tempPassword,
        options: {
          data: {
            user_type: 'staff',
            first_name: inviteData.first_name,
            last_name: inviteData.last_name,
            clinic_id: inviteData.clinic_id,
            position: inviteData.position || 'Staff',
            department: inviteData.department,
            employee_id: inviteData.employee_id,
            hire_date: inviteData.hire_date || new Date().toISOString().split('T')[0],
            phone: inviteData.phone,
            temp_password: tempPassword,
            invited_by: 'admin'
          },
          emailRedirectTo: `${window.location.origin}/auth-callback?type=staff&temp_password=${encodeURIComponent(tempPassword)}`
        }
      })

      if (signupError) throw new Error(signupError?.message || 'Staff signup failed')

      return {
        success: true,
        tempPassword,
        message: `Staff invitation sent to ${inviteData.email}. Temporary password: ${tempPassword}`
      }

    } catch (error) {
      console.error('Staff invitation error:', error)
      const errorMsg = error?.message || String(error) || 'Staff invitation failed'
      return { success: false, error: errorMsg }
    }
  },

  // admin invitation
  async adminInvitation(inviteData) {
    try {
      const tempPassword = generateTempPassword()

      const { data, error: signupError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: tempPassword,
        options: {
          data: {
            user_type: 'admin',
            first_name: inviteData.first_name,
            last_name: inviteData.last_name,
            access_level: inviteData.access_level || 1,
            temp_password: tempPassword,
            phone: inviteData.phone,
            invited_by: 'super_admin'
          },
          emailRedirectTo: `${window.location.origin}/auth-callback?type=admin&temp_password=${encodeURIComponent(tempPassword)}`
        }
      })

      if (signupError) throw new Error(signupError?.message || 'Admin signup failed')

      return {
        success: true,
        tempPassword,
        message: `Admin invitation sent. Temporary password: ${tempPassword}`
      }

    } catch (error) {
      console.error('Admin invitation error:', error)
      const errorMsg = error?.message || String(error) || 'Admin invitation failed'
      return { success: false, error: errorMsg }
    }
  },

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
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`
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
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw new Error(updateError?.message || 'Password update failed')

      return { success: true, message: 'Password updated successfully' }

    } catch (error) {
      console.error('Password update error:', error)
      const errorMsg = error?.message || String(error) || 'Password update failed'
      return { success: false, error: errorMsg }
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

  // 🔥 FIXED: Patient profile update
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

  // 🔥 FIXED: User list function
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