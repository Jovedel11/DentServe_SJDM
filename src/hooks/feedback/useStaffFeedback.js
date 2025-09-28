import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useStaffFeedback = (options = {}) => {
  const { isStaff, isAdmin, profile } = useAuth();
  
  const {
    autoFetch = true,
    includeAnalytics = true,
    defaultFilters = {}
  } = options;

  const [state, setState] = useState({
    loading: false,
    error: null,
    feedbacks: [],
    analytics: null,
    filters: {
      period: defaultFilters.period || 'week',
      type: defaultFilters.type || 'all',
      rating: defaultFilters.rating || 'all',
      searchTerm: defaultFilters.searchTerm || '',
      responseStatus: defaultFilters.responseStatus || 'all',
      ...defaultFilters
    },
    pagination: {
      limit: 50,
      offset: 0,
      totalCount: 0,
      hasMore: false
    }
  });

  // ✅ Get clinic ID from profile
  const clinicId = useMemo(() => {
    return profile?.role_specific_data?.clinic_id;
  }, [profile]);

  // ✅ UNIFIED FETCH - Get feedback list with analytics
  const fetchFeedbacks = useCallback(async (customFilters = {}, loadMore = false) => {
    if (!isStaff && !isAdmin) {
      setState(prev => ({ ...prev, error: 'Access denied: Staff or Admin required' }));
      return { success: false, error: 'Access denied' };
    }

    try {
      setState(prev => ({ 
        ...prev, 
        loading: !loadMore, 
        error: null 
      }));

      const filters = { ...state.filters, ...customFilters };
      const offset = loadMore ? state.pagination.offset : 0;

      // ✅ PARALLEL - Fetch both list and analytics
      const promises = [
        supabase.rpc('get_staff_feedback_list', {
          p_clinic_id: clinicId,
          p_include_responses: true,
          p_limit: state.pagination.limit,
          p_offset: offset
        })
      ];

      if (includeAnalytics && !loadMore) {
        promises.push(
          supabase.rpc('get_clinic_feedback_analytics', {
            p_clinic_id: clinicId,
            p_date_from: null,
            p_date_to: null
          })
        );
      }

      const results = await Promise.all(promises);
      const [feedbackResult, analyticsResult] = results;

      if (feedbackResult.error) throw feedbackResult.error;
      if (!feedbackResult.data?.success) {
        throw new Error(feedbackResult.data?.error || 'Failed to fetch feedback');
      }

      const feedbackData = feedbackResult.data.data;
      const feedbacks = feedbackData.feedback_list || [];
      const pagination = feedbackData.pagination || {};
      const statistics = feedbackData.statistics || {};

      let analytics = null;
      if (analyticsResult && !analyticsResult.error && analyticsResult.data?.success) {
        analytics = analyticsResult.data.data;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        feedbacks: loadMore ? [...prev.feedbacks, ...feedbacks] : feedbacks,
        analytics: analytics || prev.analytics,
        pagination: {
          ...prev.pagination,
          offset: offset + feedbacks.length,
          totalCount: pagination.total_count || 0,
          hasMore: pagination.total_count > (offset + feedbacks.length)
        }
      }));

      return { 
        success: true, 
        feedbacks, 
        analytics,
        statistics: {
          ...statistics,
          total: feedbacks.length,
          pending_responses: feedbacks.filter(f => !f.response).length,
          avg_rating: feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length || 0
        }
      };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [state.filters, state.pagination.limit, state.pagination.offset, isStaff, isAdmin, clinicId, includeAnalytics]);

  // ✅ RESPOND TO FEEDBACK
  const respondToFeedback = useCallback(async (feedbackId, response) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };

    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.rpc('respond_to_feedback', {
        p_feedback_id: feedbackId,
        p_response: response
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to respond');

      // ✅ Optimistic update
      setState(prev => ({
        ...prev,
        loading: false,
        feedbacks: prev.feedbacks.map(feedback => 
          feedback.id === feedbackId 
            ? { 
                ...feedback, 
                response: response,
                responded_at: new Date().toISOString(),
                responder: { name: profile?.first_name + ' ' + profile?.last_name }
              }
            : feedback
        )
      }));

      return { success: true, data: data.data, message: data.message };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, profile]);

  // ✅ BULK RESPOND
  const bulkRespondToFeedback = useCallback(async (feedbackIds, responseTemplate, personalize = true) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };

    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.rpc('bulk_respond_to_feedback', {
        p_feedback_ids: feedbackIds,
        p_response_template: responseTemplate,
        p_personalize: personalize
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Bulk response failed');

      // ✅ Refresh data after bulk operation
      await fetchFeedbacks({}, false);

      return { success: true, data: data.data, message: data.message };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, fetchFeedbacks]);

  // ✅ ADMIN: MODERATE FEEDBACK
  const moderateFeedback = useCallback(async (feedbackId, action, moderatorNotes = '') => {
    if (!isAdmin) return { success: false, error: 'Admin access required' };

    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.rpc('moderate_feedback', {
        p_feedback_id: feedbackId,
        p_action: action,
        p_moderator_notes: moderatorNotes
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Moderation failed');

      // ✅ Handle different moderation actions
      setState(prev => ({
        ...prev,
        loading: false,
        feedbacks: action === 'delete' 
          ? prev.feedbacks.filter(f => f.id !== feedbackId)
          : prev.feedbacks.map(f => 
              f.id === feedbackId 
                ? { 
                    ...f, 
                    is_public: action === 'approve',
                    moderated: true,
                    moderation_action: action
                  }
                : f
            )
      }));

      return { success: true, data: data.data, message: data.message };

    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isAdmin]);

  // ✅ FILTER MANAGEMENT
  const updateFilters = useCallback((newFilters) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, offset: 0 } // Reset pagination
    }));
  }, []);

  const loadMore = useCallback(() => {
    if (!state.pagination.hasMore || state.loading) return;
    return fetchFeedbacks({}, true);
  }, [fetchFeedbacks, state.pagination.hasMore, state.loading]);

  // ✅ COMPUTED VALUES
  const computedData = useMemo(() => {
    const { feedbacks, filters } = state;
    
    // Apply client-side filters
    const filteredFeedbacks = feedbacks.filter(feedback => {
      // Period filter
      if (filters.period !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filters.period) {
          case 'day':
            startDate.setDate(now.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        if (new Date(feedback.created_at) < startDate) return false;
      }

      // Type filter
      if (filters.type !== 'all' && feedback.feedback_type !== filters.type) {
        return false;
      }

      // Rating filter
      if (filters.rating !== 'all' && feedback.rating !== parseInt(filters.rating)) {
        return false;
      }

      // Response status filter
      if (filters.responseStatus !== 'all') {
        const hasResponse = !!feedback.response;
        if (filters.responseStatus === 'responded' && !hasResponse) return false;
        if (filters.responseStatus === 'pending' && hasResponse) return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        const searchableText = [
          feedback.comment || '',
          !feedback.is_anonymous ? (feedback.patient?.name || '') : '',
          feedback.doctor?.name || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(search)) return false;
      }

      return true;
    });

    return {
      filteredFeedbacks,
      totalFeedbacks: feedbacks.length,
      pendingResponses: feedbacks.filter(f => !f.response).length,
      avgRating: feedbacks.length > 0 
        ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : '0.0',
      responseRate: feedbacks.length > 0 
        ? ((feedbacks.filter(f => f.response).length / feedbacks.length) * 100).toFixed(1)
        : '0.0',
      ratingDistribution: {
        5: feedbacks.filter(f => f.rating === 5).length,
        4: feedbacks.filter(f => f.rating === 4).length,
        3: feedbacks.filter(f => f.rating === 3).length,
        2: feedbacks.filter(f => f.rating === 2).length,
        1: feedbacks.filter(f => f.rating === 1).length,
      },
      urgentFeedbacks: feedbacks.filter(f => f.rating <= 2 && !f.response).length
    };
  }, [state.feedbacks, state.filters]);

  // ✅ AUTO-FETCH ON MOUNT
  useEffect(() => {
    if (autoFetch && (isStaff || isAdmin) && clinicId) {
      fetchFeedbacks();
    }
  }, [autoFetch, isStaff, isAdmin, clinicId]);

  return {
    // State
    ...state,
    ...computedData,

    // Actions
    fetchFeedbacks,
    respondToFeedback,
    bulkRespondToFeedback,
    moderateFeedback,
    updateFilters,
    loadMore,

    // Utilities
    refreshData: () => fetchFeedbacks({}, false),
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Computed
    isEmpty: computedData.filteredFeedbacks.length === 0,
    hasMore: state.pagination.hasMore,
    canModerate: isAdmin,
    canRespond: isStaff || isAdmin
  };
};