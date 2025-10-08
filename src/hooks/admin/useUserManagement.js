import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { authService } from '@/auth/hooks/authService';

export const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [incompleteStaff, setIncompleteStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const { isAdmin } = useAuth();

  // Fetch users list
  const fetchUsers = useCallback(async (options = {}) => {
    if (!isAdmin) {
      const errorMsg = 'Access denied: Admin required';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.getUserList(options);
      
      if (result.success) {
        // ✅ The data structure from get_users_list is { users: [...], total_count: N }
        const usersData = result.data?.users || [];
        const count = result.data?.total_count || 0;
        
        setUsers(usersData);
        setTotalCount(count);
        
        return {
          success: true,
          data: usersData,
          total_count: count
        };
      } else {
        setError(result.error);
        return result;
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch users';
      setError(errorMessage);
      console.error('❌ Fetch Users Error:', err);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch incomplete staff signups
  const fetchIncompleteStaff = useCallback(async (limit = 50, offset = 0) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const result = await authService.getIncompleteStaffSignups(limit, offset);
      
      if (result.success) {
        setIncompleteStaff(result.data || []);
      } else {
        setError(result.error);
      }

      return result;

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch incomplete staff';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Cleanup incomplete staff 
  const cleanupIncompleteStaff = useCallback(async (invitationId, adminNotes = null) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const result = await authService.adminCleanupIncompleteStaff(invitationId, adminNotes);
      
      if (!result.success) {
        setError(result.error);
      } else {
        // Refresh incomplete staff list
        await fetchIncompleteStaff();
      }

      return result;

    } catch (err) {
      const errorMessage = err.message || 'Failed to cleanup staff';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchIncompleteStaff]);

  // Send profile completion reminder 
  const sendCompletionReminder = useCallback(async (invitationId) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const result = await authService.sendProfileCompletionReminder(invitationId);
      
      if (!result.success) {
        setError(result.error);
      }

      return result;

    } catch (err) {
      const errorMessage = err.message || 'Failed to send reminder';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Get user details by type
  const getUsersByType = useCallback(async (userType) => {
    return await fetchUsers({ userType });
  }, [fetchUsers]);

  // Search users
  const searchUsers = useCallback(async (searchTerm) => {
    return await fetchUsers({ searchTerm });
  }, [fetchUsers]);

  return {
    // State
    users,
    incompleteStaff,
    loading,
    error,
    totalCount,
    
    // Methods
    fetchUsers,
    getUsersByType,
    searchUsers,
    fetchIncompleteStaff,
    cleanupIncompleteStaff,
    sendCompletionReminder
  };
};