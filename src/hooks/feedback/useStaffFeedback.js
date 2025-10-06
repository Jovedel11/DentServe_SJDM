import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export const useStaffFeedback = (options = {}) => {
  const { isStaff, isAdmin, profile, user } = useAuth();
  
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
      responseStatus: defaultFilters.responseStatus || 'all',
      ratingType: defaultFilters.ratingType || 'all',
      ...defaultFilters
    },
    pagination: {
      limit: 50,
      offset: 0,
      totalCount: 0,
      hasMore: false
    }
  });

  // ✅ USE REF TO PREVENT INFINITE LOOPS
  const fetchedRef = useRef(false);

  // ✅ UNIFIED FETCH - Get feedback list with analytics
  const fetchFeedbacks = useCallback(async (customFilters = {}, loadMore = false) => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return { success: false, error: 'User not authenticated' };
    }

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

      const offset = loadMore ? state.pagination.offset : 0;

      console.log('🔄 Fetching staff feedback...', { 
        offset, 
        limit: state.pagination.limit,
        user: user?.id,
        isStaff,
        isAdmin 
      });
      
      // Check auth session first
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Auth Session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      const { data, error } = await supabase.rpc('get_staff_feedback_list', {
        p_clinic_id: null,
        p_include_responses: true,
        p_limit: state.pagination.limit,
        p_offset: offset
      });
      
      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }
      
      console.log('📦 RPC Response (FULL):', JSON.stringify(data, null, 2));

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch feedback');
      }

      const feedbackData = data.data;
      const feedbacks = feedbackData.feedback_list || [];
      const statistics = feedbackData.statistics || {};
      const pagination = feedbackData.pagination || {};

      console.log('✅ Feedback loaded:', {
        count: feedbacks.length,
        total: pagination.total_count,
        stats: statistics
      });

      setState(prev => ({
        ...prev,
        loading: false,
        feedbacks: loadMore ? [...prev.feedbacks, ...feedbacks] : feedbacks,
        analytics: statistics,
        pagination: {
          ...prev.pagination,
          offset: offset + feedbacks.length,
          totalCount: pagination.total_count || 0,
          hasMore: pagination.has_more || false
        }
      }));

      return { 
        success: true, 
        feedbacks, 
        statistics
      };

    } catch (err) {
      console.error('❌ Fetch feedback error:', err);
      const errorMessage = err?.message || 'Failed to fetch feedback';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, [user, isStaff, isAdmin, state.pagination.limit, state.pagination.offset]); // ✅ FIXED DEPENDENCIES

  // ✅ RESPOND TO FEEDBACK
  const respondToFeedback = useCallback(async (feedbackId, response) => {
    if (!isStaff && !isAdmin) return { success: false, error: 'Access denied' };
  
    try {
      setState(prev => ({ ...prev, loading: true }));
  
      console.log('🔄 Responding to feedback:', { feedbackId, responseLength: response?.length });
  
      const { data, error } = await supabase.rpc('respond_to_feedback', {
        p_feedback_id: feedbackId,
        p_response: response
      });
  
      console.log('📦 Response RPC Result:', { data, error });
  
      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }
  
      if (!data?.success) {
        console.error('❌ Function returned error:', data);
        throw new Error(data?.error || data?.details || 'Failed to respond');
      }
  
      console.log('✅ Response sent successfully:', data);
  
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
                responder_name: profile?.first_name && profile?.last_name 
                  ? `${profile.first_name} ${profile.last_name}` 
                  : 'Staff'
              }
            : feedback
        )
      }));
  
      return { 
        success: true, 
        message: data.message,
        patient_notified: data.patient_notified || false
      };
  
    } catch (err) {
      console.error('❌ Response error (full):', {
        message: err.message,
        error: err,
        feedbackId
      });
      setState(prev => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [isStaff, isAdmin, profile]);
  // ✅ FILTER MANAGEMENT
  const updateFilters = useCallback((newFilters) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, offset: 0 }
    }));
  }, []);

  const loadMore = useCallback(() => {
    if (!state.pagination.hasMore || state.loading) return;
    return fetchFeedbacks({}, true);
  }, [fetchFeedbacks, state.pagination.hasMore, state.loading]);

  // ✅ COMPUTED VALUES with dual ratings
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

      // ✅ Rating type filter
      if (filters.ratingType === 'clinic' && !feedback.clinic_rating) return false;
      if (filters.ratingType === 'doctor' && !feedback.doctor_rating) return false;

      // Rating filter (legacy average rating)
      if (filters.rating !== 'all') {
        const ratingValue = parseInt(filters.rating);
        if (feedback.rating !== ratingValue) return false;
      }

      // Response status filter
      if (filters.responseStatus !== 'all') {
        const hasResponse = !!feedback.response;
        if (filters.responseStatus === 'responded' && !hasResponse) return false;
        if (filters.responseStatus === 'pending' && hasResponse) return false;
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
      // ✅ Separate averages for dual ratings
      avgClinicRating: feedbacks.filter(f => f.clinic_rating).length > 0
        ? (feedbacks.reduce((sum, f) => sum + (f.clinic_rating || 0), 0) / 
           feedbacks.filter(f => f.clinic_rating).length).toFixed(1)
        : '0.0',
      avgDoctorRating: feedbacks.filter(f => f.doctor_rating).length > 0
        ? (feedbacks.reduce((sum, f) => sum + (f.doctor_rating || 0), 0) / 
           feedbacks.filter(f => f.doctor_rating).length).toFixed(1)
        : '0.0',
      responseRate: feedbacks.length > 0 
        ? ((feedbacks.filter(f => f.response).length / feedbacks.length) * 100).toFixed(1)
        : '0.0',
      ratingDistribution: {
        5: feedbacks.filter(f => Math.round(f.rating) === 5).length,
        4: feedbacks.filter(f => Math.round(f.rating) === 4).length,
        3: feedbacks.filter(f => Math.round(f.rating) === 3).length,
        2: feedbacks.filter(f => Math.round(f.rating) === 2).length,
        1: feedbacks.filter(f => Math.round(f.rating) === 1).length,
      },
      urgentFeedbacks: feedbacks.filter(f => 
        (f.rating && f.rating <= 2) || 
        (f.clinic_rating && f.clinic_rating <= 2) || 
        (f.doctor_rating && f.doctor_rating <= 2)
      ).filter(f => !f.response).length,
      // ✅ Group by doctor
      feedbackByDoctor: feedbacks.reduce((acc, fb) => {
        if (fb.doctor_id) {
          if (!acc[fb.doctor_id]) {
            acc[fb.doctor_id] = {
              doctor_name: fb.doctor_name,
              feedbacks: [],
              avg_doctor_rating: 0
            };
          }
          acc[fb.doctor_id].feedbacks.push(fb);
          // Calculate average doctor rating
          const doctorFeedbacks = acc[fb.doctor_id].feedbacks.filter(f => f.doctor_rating);
          if (doctorFeedbacks.length > 0) {
            acc[fb.doctor_id].avg_doctor_rating = (
              doctorFeedbacks.reduce((sum, f) => sum + f.doctor_rating, 0) / doctorFeedbacks.length
            ).toFixed(1);
          }
        }
        return acc;
      }, {})
    };
  }, [state.feedbacks, state.filters]);

  // ✅ AUTO-FETCH ON MOUNT - FIXED WITH REF
  useEffect(() => {
    if (autoFetch && (isStaff || isAdmin) && user && !fetchedRef.current) {
      console.log('🔄 Auto-fetching feedback on mount...');
      fetchedRef.current = true;
      fetchFeedbacks();
    }
  }, [autoFetch, isStaff, isAdmin, user, fetchFeedbacks]);

  return {
    // State
    ...state,
    ...computedData,

    // Actions
    fetchFeedbacks,
    respondToFeedback,
    updateFilters,
    loadMore,

    // Utilities
    refreshData: () => {
      fetchedRef.current = false;
      return fetchFeedbacks({}, false);
    },
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Computed
    isEmpty: computedData.filteredFeedbacks.length === 0,
    hasMore: state.pagination.hasMore,
    canModerate: isAdmin,
    canRespond: isStaff || isAdmin
  };
};