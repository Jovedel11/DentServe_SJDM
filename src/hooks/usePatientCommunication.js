import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseStorage } from './file_upload/useSupabaseStorage';

/**
 * Patient Communication Hook
 * For sending condition reports with attachments
 */
export const usePatientCommunication = () => {
  const { isPatient } = useAuth();
  const documentUpload = useSupabaseStorage({
    folder: 'condition-reports',
    uploadPurpose: 'condition_report',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ ALIGNED: Send condition report using database function
  const sendConditionReport = useCallback(async (reportData) => {
    if (!isPatient) {
      return { success: false, error: 'Patient access required' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('send_condition_report', {
        p_clinic_id: reportData.clinicId,
        p_subject: reportData.subject,
        p_message: reportData.message,
        p_attachment_urls: reportData.attachmentUrls || null
      });

      if (rpcError) throw rpcError;

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send condition report');
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to send condition report';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [isPatient]);

  return {
    // State
    loading: loading || documentUpload.loading,
    error: error || documentUpload.error,
    
    // Document upload functionality
    uploadAttachment: documentUpload.uploadFile,
    attachments: documentUpload.files,
    
    // Communication functionality
    sendConditionReport,
    
    // Utilities
    clearError: () => {
      setError(null);
      documentUpload.clearError();
    }
  };
};