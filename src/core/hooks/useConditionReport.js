import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/context/AuthProvider';

export const useConditionReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isPatient, profile } = useAuth();

  const sendConditionReport = useCallback(async (reportData) => {
    // ✅ Role validation
    if (!isPatient) {
      const error = 'Only patients can send condition reports';
      setError(error);
      return { success: false, error };
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ Input validation
      const requiredFields = ['clinic_id', 'subject', 'message'];
      const missingFields = requiredFields.filter(field => !reportData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // ✅ Content validation
      if (reportData.subject.length > 200) {
        throw new Error('Subject must be under 200 characters');
      }

      if (reportData.message.length > 2000) {
        throw new Error('Message must be under 2000 characters');
      }

      if (reportData.message.trim().length < 10) {
        throw new Error('Message must be at least 10 characters long');
      }

      // ✅ Validate urgency level
      const validUrgencyLevels = ['normal', 'high', 'urgent'];
      const urgencyLevel = reportData.urgency_level || 'normal';
      
      if (!validUrgencyLevels.includes(urgencyLevel)) {
        throw new Error('Invalid urgency level');
      }

      // ✅ Validate attachment URLs if provided
      if (reportData.attachment_urls && Array.isArray(reportData.attachment_urls)) {
        if (reportData.attachment_urls.length > 5) {
          throw new Error('Maximum 5 attachments allowed');
        }
        
        for (const url of reportData.attachment_urls) {
          try {
            new URL(url);
          } catch {
            throw new Error('Invalid attachment URL format');
          }
        }
      }

      const { data, error: rpcError } = await supabase.rpc('send_condition_report', {
        p_clinic_id: reportData.clinic_id,
        p_subject: reportData.subject,
        p_message: reportData.message,
        p_urgency_level: urgencyLevel,
        p_attachment_urls: reportData.attachment_urls || null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // ✅ Handle function response structure
      if (!data.success) {
        throw new Error(data.error || 'Failed to send condition report');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Condition report sent successfully'
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to send condition report';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  // ✅ Helper to check rate limit status
  const checkReportLimit = useCallback(async () => {
    try {
      // This would require a helper function or could be built into the main function
      // For now, we'll return optimistic data
      return {
        can_send: true,
        reports_today: 0,
        limit: 5,
        reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };
    } catch (err) {
      console.error('Error checking report limit:', err);
      return {
        can_send: true,
        reports_today: 0,
        limit: 5
      };
    }
  }, []);

  return {
    // State
    loading,
    error,
    
    // Actions
    sendConditionReport,
    checkReportLimit
  };
};