import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const usePartnershipManager = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAdmin } = useAuth();

  // Submit partnership request (public access)
  const submitPartnershipRequest = useCallback(async (requestData) => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['clinic_name', 'email', 'address', 'reason'];
      const missingFields = requiredFields.filter(field => !requestData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(requestData.email)) {
        throw new Error('Invalid email format');
      }

      // ✅ Content validation
      if (requestData.reason.length < 50) {
        throw new Error('Reason must be at least 50 characters long');
      }

      const { data, error: rpcError } = await supabase.rpc('submit_partnership_request', {
        p_clinic_name: requestData.clinic_name,
        p_email: requestData.email,
        p_address: requestData.address,
        p_reason: requestData.reason,
        p_contact_person: requestData.contact_person || null,
        p_phone: requestData.phone || null,
        p_website: requestData.website || null
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to submit partnership request');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Partnership request submitted successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to submit partnership request';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get partnership requests (admin only)
  const getPartnershipRequests = useCallback(async (filters = {}) => {
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_partnership_requests', {
        p_status: filters.status || null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_limit: filters.limit || 50,
        p_offset: filters.offset || 0
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch partnership requests');
      }

      return {
        success: true,
        requests: data.data.requests || [],
        totalCount: data.data.total_count || 0
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch partnership requests';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Review partnership request (admin only)
  const reviewPartnershipRequest = useCallback(async (requestId, action, adminNotes = '') => {
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Action validation
      if (!['approve', 'reject'].includes(action)) {
        throw new Error('Action must be either "approve" or "reject"');
      }

      const { data, error: rpcError } = await supabase.rpc('review_partnership_request', {
        p_request_id: requestId,
        p_action: action,
        p_admin_notes: adminNotes
      });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || `Failed to ${action} partnership request`);
      }

      return {
        success: true,
        data: data.data,
        message: data.message || `Partnership request ${action}d successfully`
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to review partnership request';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Get partnership request details
  const getPartnershipRequestDetails = useCallback(async (requestId) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clinic_partnership_requests')
        .select(`
          *,
          reviewed_by_user:reviewed_by(
            id,
            user_profiles(first_name, last_name, email)
          )
        `)
        .eq('id', requestId)
        .single();

      if (error) throw new Error(error.message);

      return {
        success: true,
        request: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch request details';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,

    // Actions
    submitPartnershipRequest,
    getPartnershipRequests,
    reviewPartnershipRequest,
    getPartnershipRequestDetails,

    // Utilities
    clearError: () => setError(null),
    canReview: isAdmin
  };
};
