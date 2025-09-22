import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useBadgeSystem = () => {
  const [badges, setBadges] = useState([]);
  const [clinicBadges, setClinicBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAdmin } = useAuth();

  // Fetch all available badges
  const fetchBadges = useCallback(async (includeInactive = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('clinic_badges')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      setBadges(data || []);

      return {
        success: true,
        badges: data || [],
        count: data?.length || 0
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch badges';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clinic badges with awards
  const fetchClinicBadges = useCallback(async (clinicId) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clinic_badge_awards')
        .select(`
          *,
          clinic_badges (
            id,
            badge_name,
            badge_description,
            badge_icon_url,
            badge_color,
            criteria
          ),
          awarded_by_user:awarded_by (
            id,
            user_profiles (first_name, last_name)
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_current', true)
        .order('award_date', { ascending: false });

      if (error) throw new Error(error.message);

      setClinicBadges(data || []);

      return {
        success: true,
        clinicBadges: data || [],
        count: data?.length || 0
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch clinic badges';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new badge (admin only)
  const createBadge = useCallback(async (badgeData) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['badge_name', 'badge_description'];
      const missingFields = requiredFields.filter(field => !badgeData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ Badge name validation
      if (badgeData.badge_name.length < 3) {
        throw new Error('Badge name must be at least 3 characters long');
      }

      // ✅ Color validation
      if (badgeData.badge_color && !/^#[0-9A-F]{6}$/i.test(badgeData.badge_color)) {
        throw new Error('Badge color must be a valid hex color (e.g., #FF5733)');
      }

      const { data, error } = await supabase
        .from('clinic_badges')
        .insert({
          badge_name: badgeData.badge_name,
          badge_description: badgeData.badge_description,
          badge_icon_url: badgeData.badge_icon_url || null,
          criteria: badgeData.criteria || null,
          badge_color: badgeData.badge_color || '#3B82F6',
          is_active: badgeData.is_active !== false
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setBadges(prev => [data, ...prev]);

      return {
        success: true,
        badge: data,
        message: 'Badge created successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to create badge';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Award badge to clinic (admin only)
  const awardBadge = useCallback(async (clinicId, badgeId, awardData = {}) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Check if clinic already has this badge
      const { data: existingAward, error: checkError } = await supabase
        .from('clinic_badge_awards')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('badge_id', badgeId)
        .eq('is_current', true)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(checkError.message);
      }

      if (existingAward) {
        throw new Error('Clinic already has this badge');
      }

      const { data, error } = await supabase
        .from('clinic_badge_awards')
        .insert({
          clinic_id: clinicId,
          badge_id: badgeId,
          awarded_by: awardData.awarded_by || null,
          award_date: awardData.award_date || new Date().toISOString().split('T')[0],
          notes: awardData.notes || null,
          is_current: true
        })
        .select(`
          *,
          clinic_badges (
            id,
            badge_name,
            badge_description,
            badge_icon_url,
            badge_color
          )
        `)
        .single();

      if (error) throw new Error(error.message);

      return {
        success: true,
        award: data,
        message: 'Badge awarded successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to award badge';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Revoke badge from clinic (admin only)
  const revokeBadge = useCallback(async (clinicId, badgeId, reason = '') => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('clinic_badge_awards')
        .update({ 
          is_current: false,
          notes: reason ? `Revoked: ${reason}` : 'Badge revoked'
        })
        .eq('clinic_id', clinicId)
        .eq('badge_id', badgeId)
        .eq('is_current', true);

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setClinicBadges(prev => prev.filter(award => 
        !(award.clinic_id === clinicId && award.badge_id === badgeId)
      ));

      return {
        success: true,
        message: 'Badge revoked successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to revoke badge';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Update badge (admin only)
  const updateBadge = useCallback(async (badgeId, updates) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Validation for updates
      if (updates.badge_name && updates.badge_name.length < 3) {
        throw new Error('Badge name must be at least 3 characters long');
      }

      if (updates.badge_color && !/^#[0-9A-F]{6}$/i.test(updates.badge_color)) {
        throw new Error('Badge color must be a valid hex color');
      }

      const { data, error } = await supabase
        .from('clinic_badges')
        .update(updates)
        .eq('id', badgeId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setBadges(prev => prev.map(badge => 
        badge.id === badgeId ? data : badge
      ));

      return {
        success: true,
        badge: data,
        message: 'Badge updated successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update badge';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Toggle badge status (admin only)
  const toggleBadgeStatus = useCallback(async (badgeId, isActive) => {
    if (!isAdmin()) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clinic_badges')
        .update({ is_active: isActive })
        .eq('id', badgeId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // ✅ Update local state
      setBadges(prev => prev.map(badge => 
        badge.id === badgeId ? data : badge
      ));

      return {
        success: true,
        badge: data,
        message: `Badge ${isActive ? 'activated' : 'deactivated'} successfully`
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to update badge status';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Get badge statistics
  const getBadgeStats = useCallback(() => {
    const totalBadges = badges.length;
    const activeBadges = badges.filter(b => b.is_active).length;
    const inactiveBadges = badges.filter(b => !b.is_active).length;

    // Calculate award distribution
    const awardCounts = {};
    clinicBadges.forEach(award => {
      const badgeName = award.clinic_badges?.badge_name;
      if (badgeName) {
        awardCounts[badgeName] = (awardCounts[badgeName] || 0) + 1;
      }
    });

    return {
      totalBadges,
      activeBadges,
      inactiveBadges,
      totalAwards: clinicBadges.length,
      awardDistribution: awardCounts,
      mostPopularBadge: Object.keys(awardCounts).reduce((a, b) => 
        awardCounts[a] > awardCounts[b] ? a : b, ''
      )
    };
  }, [badges, clinicBadges]);

  // Check if clinic has specific badge
  const clinicHasBadge = useCallback((clinicId, badgeId) => {
    return clinicBadges.some(award => 
      award.clinic_id === clinicId && 
      award.badge_id === badgeId && 
      award.is_current
    );
  }, [clinicBadges]);

  return {
    // State
    badges,
    clinicBadges,
    loading,
    error,

    // Actions
    fetchBadges,
    fetchClinicBadges,
    createBadge,
    awardBadge,
    revokeBadge,
    updateBadge,
    toggleBadgeStatus,

    // Computed
    activeBadges: badges.filter(b => b.is_active),
    inactiveBadges: badges.filter(b => !b.is_active),
    stats: getBadgeStats(),

    // Utilities
    clearError: () => setError(null),
    canManageBadges: isAdmin(),
    clinicHasBadge,

    // Helpers
    getBadgeById: (id) => badges.find(b => b.id === id),
    getBadgesByColor: (color) => badges.filter(b => b.badge_color === color),
    searchBadges: (query) => badges.filter(b => 
      b.badge_name.toLowerCase().includes(query.toLowerCase()) ||
      b.badge_description.toLowerCase().includes(query.toLowerCase())
    ),
    
    // Award helpers
    getClinicAwards: (clinicId) => clinicBadges.filter(a => a.clinic_id === clinicId),
    getAwardsByBadge: (badgeId) => clinicBadges.filter(a => a.badge_id === badgeId),
    getRecentAwards: (limit = 5) => clinicBadges.slice(0, limit)
  };
};
