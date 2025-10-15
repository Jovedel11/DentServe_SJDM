import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useTreatmentPlanHistory = () => {
  const { isPatient, isStaff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);

  const fetchHistory = useCallback(async (treatmentPlanId) => {
    if (!isPatient && !isStaff) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase.rpc('get_treatment_plan_history', {
        p_treatment_plan_id: treatmentPlanId
      });

      if (dbError) throw dbError;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch history');
      }

      const historyData = {
        completed: data.data?.completed_visits || [],
        pending: data.data?.pending_visits || [],
        cancelled: data.data?.cancelled_attempts || []
      };

      setHistory(historyData);

      return {
        success: true,
        history: historyData,
        stats: {
          totalCompleted: historyData.completed.length,
          totalPending: historyData.pending.length,
          totalCancelled: historyData.cancelled.length,
          patientCancellations: historyData.cancelled.filter(c => c.cancelled_by_role === 'patient').length,
          staffRejections: historyData.cancelled.filter(c => c.cancelled_by_role === 'staff').length
        }
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch history';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient, isStaff]);

  const clearHistory = useCallback(() => {
    setHistory(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    history,
    fetchHistory,
    clearHistory,
    hasHistory: history !== null,
    hasCompletedVisits: history?.completed?.length > 0,
    hasPendingVisits: history?.pending?.length > 0,
    hasCancellations: history?.cancelled?.length > 0
  };
};