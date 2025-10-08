import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useBadgeManagement = () => {
  const [badges, setBadges] = useState([]);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { isAdmin } = useAuth();

  // Evaluate and award clinic badges
  const evaluateBadges = useCallback(async (options = {}) => {
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);
      
      const {
        clinicId = null,
        evaluationPeriodDays = 90,
        autoAward = false,
        badgeTypes = null
      } = options;

      const { data, error: rpcError } = await supabase.rpc('evaluate_clinic_badges', {
        p_clinic_id: clinicId,
        p_evaluation_period_days: evaluationPeriodDays,
        p_auto_award: autoAward,
        p_badge_types: badgeTypes
      });

      if (rpcError) throw new Error(rpcError.message);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to evaluate badges');
      }

      setEvaluationResults(data);

      return {
        success: true,
        data: data.data,
        message: data.message,
        summary: data.summary
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to evaluate badges';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch all badge awards
// Fetch all badge awards
const fetchBadgeAwards = useCallback(async (clinicId = null) => {
  console.log("🔍 [Badge Hook] isAdmin:", isAdmin);
  
  if (!isAdmin) {
    console.error("❌ [Badge Hook] Not admin!");
    return { success: false, error: 'Access denied: Admin required' };
  }

  try {
    setLoading(true);
    setError(null);

    console.log("📡 [Badge Hook] Querying clinic_badge_awards...");

    let query = supabase
      .from('clinic_badge_awards')
      .select(`
        *,
        clinic:clinics(id, name),
        badge:clinic_badges(badge_name, badge_description, badge_color),
        awarded_by_user:users!clinic_badge_awards_awarded_by_fkey(email)
      `)
      .eq('is_current', true)
      .order('award_date', { ascending: false }); // ✅ FIXED: changed from 'awarded_at' to 'award_date'

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error: queryError } = await query;

    console.log("📊 [Badge Hook] Query Response:", { data, error: queryError, count: data?.length });

    if (queryError) throw new Error(queryError.message);

    setBadges(data || []);

    return {
      success: true,
      data: data
    };

  } catch (err) {
    const errorMessage = err.message || 'Failed to fetch badge awards';
    console.error("❌ [Badge Hook] Error:", err);
    setError(errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  } finally {
    setLoading(false);
  }
}, [isAdmin]);

  // Award badge to clinic
  const awardBadge = useCallback(async (clinicId, badgeId, reason = null) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_award_badge', {
        p_clinic_id: clinicId,
        p_badge_id: badgeId,
        p_reason: reason
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to award badge');

      await fetchBadgeAwards();

      return data;

    } catch (err) {
      const errorMessage = err.message || 'Failed to award badge';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchBadgeAwards]);

  // Remove badge from clinic
  const removeBadge = useCallback(async (awardId, removalReason = null) => {
    if (!isAdmin) {
      return { success: false, error: 'Access denied: Admin required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_remove_badge', {
        p_award_id: awardId,
        p_removal_reason: removalReason
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to remove badge');

      await fetchBadgeAwards();

      return data;

    } catch (err) {
      const errorMessage = err.message || 'Failed to remove badge';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin, fetchBadgeAwards]);

  return {
    // State
    badges,
    evaluationResults,
    loading,
    error,
    
    // Methods
    evaluateBadges,
    fetchBadgeAwards,
    awardBadge,
    removeBadge,
  };
};