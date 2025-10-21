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

  async staffInvitation(invitationData) {
    try {
      const { data, error } = await supabase.rpc('create_staff_invitation', {
        p_email: invitationData.email,
        p_clinic_id: invitationData.clinicId,
        p_position: invitationData.position,
        p_department: invitationData.department,
        p_invited_by: invitationData.invitedBy
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send invitation');

      return { success: true, data, message: 'Invitation sent successfully' };
    } catch (error) {
      console.error('Staff invitation error:', error);
      return { success: false, error: error.message || 'Failed to send invitation' };
    }
  },

  // Admin invitation
  async adminInvitation(invitationData) {
    try {
      const { data, error } = await supabase.rpc('create_admin_invitation', {
        p_email: invitationData.email,
        p_access_level: invitationData.accessLevel,
        p_invited_by: invitationData.invitedBy
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send invitation');

      return { success: true, data, message: 'Admin invitation sent successfully' };
    } catch (error) {
      console.error('Admin invitation error:', error);
      return { success: false, error: error.message || 'Failed to send invitation' };
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

    async adminChangeUserPassword(userId, newPassword) {
    try {
      console.log('🔐 Admin changing user password...', { userId });

      // Validate password on client side first
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Get current admin's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call backend endpoint
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/admin/change-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword,
          adminToken: session.access_token
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to change password');
      }

      console.log('✅ Admin password change successful');

      return {
        success: true,
        message: result.message,
        userEmail: result.userEmail
      };

    } catch (error) {
      console.error('❌ Admin password change error:', error);
      return {
        success: false,
        error: error.message || 'Failed to change user password'
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
  
      if (resetError) {
        // Only throw on actual errors (rate limit, network, etc.)
        throw new Error(resetError?.message || 'Failed to send reset email')
      }
  
      return {
        success: true,
        // ✅ Use ambiguous messaging
        message: 'If an account exists with this email, you will receive a password reset link'
      }
  
    } catch (error) {
      console.error('❌ Password reset request error:', error)
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
// 🔥 FIXED: Staff profile update with proper parameter structure
async updateStaffProfile(profileData, staffData, clinicData, servicesData, doctorsData) {
  try {
    // Format services data for CRUD operations
    const formattedServicesData = Array.isArray(servicesData) 
    ? servicesData
        .filter(s => s.name && s.name.trim())
        .map(service => {
          const isNewService = !service.id || service.id.toString().startsWith('new_');
          return {
            id: isNewService ? null : service.id, 
            name: service.name.trim(),
            description: service.description?.trim() || null,
            category: service.category || 'General',
            duration_minutes: parseInt(service.duration_minutes) || 30,
            min_price: parseFloat(service.min_price) || null,
            max_price: parseFloat(service.max_price) || null,
            priority: parseInt(service.priority) || 10,
            is_active: Boolean(service.is_active),
            requires_multiple_visits: Boolean(service.requires_multiple_visits),
            typical_visit_count: parseInt(service.typical_visit_count) || 1,
            requires_consultation: service.requires_consultation !== false, // default true
            _action: service._action || (isNewService ? 'create' : 'update')
          };
        }) 
    : [];

    // ✅ FIX: Format doctors data for CRUD operations - REMOVE user_id, clean extra fields
    const formattedDoctorsData = Array.isArray(doctorsData) 
    ? doctorsData.map(doctor => {
        const isNewDoctor = !doctor.id || doctor.id.toString().startsWith('new_');
        
        // ✅ FIX: Clean language_spoken array handling
        let cleanLanguages = null;
        if (doctor.languages_spoken) {
          if (Array.isArray(doctor.languages_spoken)) {
            cleanLanguages = doctor.languages_spoken.filter(Boolean);
          } else if (typeof doctor.languages_spoken === 'string') {
            cleanLanguages = doctor.languages_spoken.split(',').map(l => l.trim()).filter(Boolean);
          }
        }

        // ✅ FIX: Clean awards array handling
        let cleanAwards = null;
        if (doctor.awards) {
          if (Array.isArray(doctor.awards)) {
            cleanAwards = doctor.awards.filter(Boolean);
          } else if (typeof doctor.awards === 'string') {
            cleanAwards = doctor.awards.split(',').map(a => a.trim()).filter(Boolean);
          }
        }

        return {
          id: isNewDoctor ? null : doctor.id,
          // ❌ REMOVE: user_id field (doesn't exist in doctors table)
          license_number: doctor.license_number?.trim() || '', 
          specialization: doctor.specialization?.trim() || '',
          first_name: doctor.first_name?.trim() || '',
          last_name: doctor.last_name?.trim() || '',
          education: doctor.education?.trim() || null,
          experience_years: doctor.experience_years ? parseInt(doctor.experience_years) : null,
          bio: doctor.bio?.trim() || null,
          consultation_fee: doctor.consultation_fee ? parseFloat(doctor.consultation_fee) : null,
          image_url: doctor.image_url || null,
          languages_spoken: cleanLanguages,  // ✅ FIX: Clean array
          certifications: doctor.certifications || null,
          awards: cleanAwards,  // ✅ FIX: Clean array
          is_available: doctor.is_available !== undefined ? doctor.is_available : true,
          schedule: doctor.schedule || doctor.clinic_schedule || null,  // ✅ FIX: Handle both field names
          _action: doctor._action || (isNewDoctor ? 'create' : 'update')
        };
      }) 
    : [];

    console.log('📤 Sending doctors data:', formattedDoctorsData);  // ✅ ADD: Debug log

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
        operating_hours: clinicData.operatingHours,
        appointment_limit_per_patient: clinicData.appointmentLimitPerPatient,
        cancellation_policy_hours: clinicData.cancellationPolicyHours
      },
      p_services_data: formattedServicesData,
      p_doctors_data: formattedDoctorsData
    });
    
    if (error) {
      console.error('❌ Update staff profile error:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
    
    if (data && !data.success) {
      console.error('❌ Update staff profile failed:', data.error);
      return { success: false, error: data.error || 'Failed to update profile' };
    }

    console.log('✅ Staff profile updated:', data);  // ✅ ADD: Success log
    return { success: true, data, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('❌ Update staff profile exception:', error);
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

  async changePassword(currentPassword, newPassword) {
    try {
      console.log('🔄 Changing password with verification...');
      
      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // First, verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password');
      }

      // Log the password change
      await supabase.rpc('verify_and_change_password', {
        p_current_password: '***', // Don't log actual passwords
        p_new_password: '***'
      });

      console.log('✅ Password changed successfully');

      return {
        success: true,
        message: 'Password changed successfully. Please sign in with your new password.'
      };

    } catch (error) {
      console.error('❌ Password change error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to change password' 
      };
    }
  },

  // Deactivate or delete account
  async deactivateAccount(password, reason = null, permanentDelete = false) {
    try {
      console.log('🗑️ Deactivating account...', { permanentDelete });

      // Verify password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        throw new Error('Password is incorrect. Please verify your password.');
      }

      // Call the deactivation function
      const { data, error } = await supabase.rpc('deactivate_account', {
        p_password: '***',
        p_reason: reason,
        p_permanent_delete: permanentDelete
      });

      if (error) {
        throw new Error(error.message || 'Failed to deactivate account');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to deactivate account');
      }

      // If permanent delete, also delete from auth
      if (permanentDelete) {
        // Note: This requires admin privileges, so it might not work
        // In production, you'd want a backend admin endpoint for this
        try {
          await supabase.auth.admin.deleteUser(user.id);
        } catch (adminError) {
          console.warn('Could not delete auth user, but database cleanup succeeded');
        }
      }

      // Sign out the user
      await supabase.auth.signOut();

      console.log('✅ Account deactivated successfully');

      return {
        success: true,
        message: data.message,
        permanent: data.permanent
      };

    } catch (error) {
      console.error('❌ Account deactivation error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to deactivate account' 
      };
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