import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useClinicManagement = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [performance, setPerformance] = useState(null);
  
  const { isAdmin } = useAuth();

  // Fetch all clinics (READ ONLY)
  const fetchClinics = useCallback(async (options = {}) => {
    if (!isAdmin) {
      const error = 'Access denied: Admin required';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);
      
      const {
        isActive = null,
        searchTerm = null,
        limit = 50,
        offset = 0
      } = options;

      let query = supabase
        .from('clinics')
        .select('*, services:services(id, name, is_active, category)', { count: 'exact' });

      if (isActive !== null) {
        query = query.eq('is_active', isActive);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) throw new Error(queryError.message);

      setClinics(data || []);

      return {
        success: true,
        data: data,
        count: count
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch clinics';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const getPerformanceRanking = useCallback(async (daysPeriod = 30, resultLimit = 10) => {
    console.log("🔍 [Clinic Hook] isAdmin:", isAdmin);
    
    if (!isAdmin) {
      console.error("❌ [Clinic Hook] Not admin!");
      return { success: false, error: 'Access denied: Admin required' };
    }
  
    try {
      setLoading(true);
      setError(null);
  
      console.log("📡 [Clinic Hook] Calling RPC with:", { daysPeriod, resultLimit });
  
      const { data, error: rpcError } = await supabase.rpc('get_clinic_performance_ranking', {
        days_period: daysPeriod,
        result_limit: resultLimit
      });
  
      console.log("📊 [Clinic Hook] RPC Response:", { data, error: rpcError });
  
      if (rpcError) throw new Error(rpcError.message);
  
      setPerformance(data || []);
  
      return {
        success: true,
        data: data || []
      };
  
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch performance ranking';
      console.error("❌ [Clinic Hook] Error:", err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  return {
    // State
    clinics,
    loading,
    error,
    performance,
    
    // Methods
    fetchClinics,
    getPerformanceRanking
  };
};