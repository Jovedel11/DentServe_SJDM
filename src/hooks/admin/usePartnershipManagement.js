import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';
import { authService } from '@/auth/hooks/authService';

export const usePartnershipManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const { isAdmin } = useAuth();

  // Fetch partnership requests
  const fetchRequests = useCallback(async (options = {}) => {
    if (!isAdmin) {
      const errorMsg = 'Access denied: Admin required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setLoading(true);
      setError(null);
      
      const {
        status = null,
        limit = 20,
        offset = 0
      } = options;

      const { data, error: rpcError } = await supabase.rpc('get_partnership_requests', {
        p_status: status,
        p_limit: limit,
        p_offset: offset
      });

      if (rpcError) throw new Error(rpcError.message);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch partnership requests');
      }

      setRequests(data.data || []);
      setTotalCount(data.total || 0);

      return {
        success: true,
        data: data.data,
        total: data.total
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch partnership requests';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Approve partnership request
  const approveRequest = useCallback(async (requestId, adminNotes = null) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      // Use authService which has proper error handling
      const result = await authService.approvePartnershipRequestV2(requestId, adminNotes);
      
      if (!result.success) {
        setError(result.error);
      } else {
        // Refresh requests list
        await fetchRequests();
      }

      return result;

    } catch (err) {
      const errorMessage = err.message || 'Failed to approve request';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchRequests]);

  // Reject partnership request
  const rejectRequest = useCallback(async (requestId, adminNotes = null) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('reject_partnership_request', {
        p_request_id: requestId,
        p_admin_notes: adminNotes
      });

      if (rpcError) throw new Error(rpcError.message);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reject request');
      }

      // Refresh requests list
      await fetchRequests();

      return {
        success: true,
        message: 'Partnership request rejected successfully',
        data: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to reject request';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchRequests]);

  // Manage partnership request
  const manageRequest = useCallback(async (requestId, action, adminNotes = null, clinicData = null) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('manage_partnership_request', {
        p_request_id: requestId,
        p_action: action,
        p_admin_notes: adminNotes,
        p_clinic_data: clinicData
      });

      if (rpcError) throw new Error(rpcError.message);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to manage request');
      }

      // Refresh requests list
      await fetchRequests();

      return {
        success: true,
        message: data.message || 'Request managed successfully',
        data: data
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to manage request';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchRequests]);

  return {
    // State
    requests,
    loading,
    error,
    totalCount,
    
    // Methods
    fetchRequests,
    approveRequest,
    rejectRequest,
    manageRequest
  };
};