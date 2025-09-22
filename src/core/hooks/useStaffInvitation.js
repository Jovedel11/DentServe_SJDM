import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useStaffInvitation = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAdmin, profile } = useAuth();

  // Send staff invitation (admin only)
  const sendStaffInvitation = useCallback(async (invitationData) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['email', 'clinic_id', 'position'];
      const missingFields = requiredFields.filter(field => !invitationData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invitationData.email)) {
        throw new Error('Invalid email format');
      }

      const { data, error: rpcError } = await supabase.rpc('create_staff_invitation', {
        p_email: invitationData.email,
        p_clinic_id: invitationData.clinic_id,
        p_position: invitationData.position,
        p_department: invitationData.department || null,
        p_first_name: invitationData.first_name || null,
        p_last_name: invitationData.last_name || null
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send staff invitation');
      }

      return {
        success: true,
        invitation: data.data,
        message: data.message || 'Staff invitation sent successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to send staff invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Get staff invitations (admin only)
  const getStaffInvitations = useCallback(async (filters = {}) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('staff_invitations')
        .select(`
          *,
          clinic:clinic_id(
            id,
            name,
            address,
            city
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.clinic_id) {
        query = query.eq('clinic_id', filters.clinic_id);
      }

      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      setInvitations(data || []);

      return {
        success: true,
        invitations: data || [],
        count: data?.length || 0
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch staff invitations';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Resend staff invitation (admin only)
  const resendStaffInvitation = useCallback(async (invitationId) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('resend_staff_invitation', {
        p_invitation_id: invitationId
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to resend invitation');
      }

      // ✅ Update local state
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId 
          ? { ...inv, ...data.data }
          : inv
      ));

      return {
        success: true,
        invitation: data.data,
        message: data.message || 'Invitation resent successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to resend invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Cancel staff invitation (admin only)
  const cancelStaffInvitation = useCallback(async (invitationId) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('staff_invitations')
        .delete()
        .eq('id', invitationId);

      if (deleteError) throw new Error(deleteError.message);

      // ✅ Update local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      return {
        success: true,
        message: 'Invitation cancelled successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to cancel invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Accept staff invitation (public - for invited users)
  const acceptStaffInvitation = useCallback(async (invitationToken, userData) => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['first_name', 'last_name', 'password'];
      const missingFields = requiredFields.filter(field => !userData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ Password validation
      if (userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const { data, error: rpcError } = await supabase.rpc('accept_staff_invitation', {
        p_invitation_token: invitationToken,
        p_user_data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          password: userData.password,
          phone: userData.phone || null,
          date_of_birth: userData.date_of_birth || null,
          gender: userData.gender || null
        }
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to accept invitation');
      }

      return {
        success: true,
        user: data.data.user,
        session: data.data.session,
        message: data.message || 'Invitation accepted successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to accept invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate invitation token (public)
  const validateInvitationToken = useCallback(async (invitationToken) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('validate_staff_invitation', {
        p_invitation_token: invitationToken
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Invalid invitation token');
      }

      return {
        success: true,
        invitation: data.data,
        isValid: true
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to validate invitation';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage,
        isValid: false
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get invitation statistics (admin only)
  const getInvitationStats = useCallback(() => {
    if (!isAdmin()) return null;

    const total = invitations.length;
    const pending = invitations.filter(inv => inv.status === 'pending').length;
    const accepted = invitations.filter(inv => inv.status === 'accepted').length;
    const expired = invitations.filter(inv => inv.status === 'expired').length;

    const thisMonth = invitations.filter(inv => {
      const invDate = new Date(inv.created_at);
      const now = new Date();
      return invDate.getMonth() === now.getMonth() && 
             invDate.getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      pending,
      accepted,
      expired,
      thisMonth,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0
    };
  }, [invitations, isAdmin]);

  return {
    // State
    invitations,
    loading,
    error,

    // Actions
    sendStaffInvitation,
    getStaffInvitations,
    resendStaffInvitation,
    cancelStaffInvitation,
    acceptStaffInvitation,
    validateInvitationToken,

    // Computed
    pendingInvitations: invitations.filter(inv => inv.status === 'pending'),
    acceptedInvitations: invitations.filter(inv => inv.status === 'accepted'),
    expiredInvitations: invitations.filter(inv => inv.status === 'expired'),
    stats: getInvitationStats(),

    // Utilities
    clearError: () => setError(null),
    canManageInvitations: isAdmin(),

    // Helpers
    getInvitationById: (id) => invitations.find(inv => inv.id === id),
    getInvitationsByClinic: (clinicId) => invitations.filter(inv => inv.clinic_id === clinicId),
    getInvitationsByStatus: (status) => invitations.filter(inv => inv.status === status),
    searchInvitations: (query) => invitations.filter(inv =>
      inv.email.toLowerCase().includes(query.toLowerCase()) ||
      inv.position.toLowerCase().includes(query.toLowerCase()) ||
      inv.clinic?.name?.toLowerCase().includes(query.toLowerCase())
    )
  };
};
