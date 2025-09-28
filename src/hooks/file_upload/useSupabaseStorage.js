import { useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useFileManager } from './useFileManager';

/**
 * Supabase Storage Upload Hook
 * For direct client-side uploads to Supabase Storage
 */
export const useSupabaseStorage = (options = {}) => {
  const { session } = useAuth();
  const fileManager = useFileManager();
  
  const {
    bucket = 'public',
    folder = 'uploads',
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    uploadPurpose = 'general'
  } = options;

  const [uploadState, setUploadState] = useState({
    uploading: false,
    progress: 0,
    error: null
  });

  // ✅ ENHANCED: Upload file to Supabase Storage
  const uploadFile = useCallback(async (file, customOptions = {}) => {
    if (!file) return { success: false, error: 'No file provided' };
    if (!session?.access_token) return { success: false, error: 'Authentication required' };

    try {
      setUploadState({ uploading: true, progress: 0, error: null });

      const finalOptions = { ...options, ...customOptions };
      
      // Validate file
      if (file.size > (finalOptions.maxSize || maxSize)) {
        throw new Error(`File size exceeds ${((finalOptions.maxSize || maxSize) / 1024 / 1024).toFixed(1)}MB limit`);
      }

      if (!(finalOptions.allowedTypes || allowedTypes).includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const fileName = `${finalOptions.folder || folder}/${timestamp}_${randomString}.${extension}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 15, 90)
        }));
      }, 200);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setUploadState(prev => ({ ...prev, progress: 95 }));

      // ✅ ALIGNED: Record in database using file manager
      const recordResult = await fileManager.recordFileUpload({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: fileName,
        bucketName: bucket,
        contentType: file.type,
        uploadPurpose: finalOptions.uploadPurpose || uploadPurpose,
        relatedId: finalOptions.relatedId || null,
        metadata: {
          original_name: file.name,
          public_url: publicUrl,
          upload_method: 'supabase_storage',
          ...finalOptions.metadata
        }
      });

      if (!recordResult.success) {
        // Clean up storage if database recording fails
        await supabase.storage.from(bucket).remove([fileName]);
        throw new Error(recordResult.error);
      }

      setUploadState({ uploading: false, progress: 100, error: null });

      // Refresh file manager
      await fileManager.refreshFiles();

      return {
        success: true,
        file: {
          id: recordResult.uploadId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: publicUrl,
          storagePath: fileName
        },
        url: publicUrl
      };

    } catch (err) {
      setUploadState({ uploading: false, progress: 0, error: err.message });
      return { success: false, error: err.message };
    }
  }, [session, bucket, folder, maxSize, allowedTypes, uploadPurpose, fileManager]);

  // ✅ ENHANCED: Delete file from storage and database
  const deleteFile = useCallback(async (fileId, storagePath) => {
    try {
      setUploadState(prev => ({ ...prev, error: null }));

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database using file manager
      const result = await fileManager.deleteFile(fileId);
      
      return result;
    } catch (err) {
      setUploadState(prev => ({ ...prev, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [bucket, fileManager]);

  return {
    // State
    ...uploadState,
    
    // File manager state
    files: fileManager.files,
    loading: uploadState.uploading || fileManager.loading,
    error: uploadState.error || fileManager.error,
    
    // Actions
    uploadFile,
    deleteFile,
    
    // File manager actions
    refreshFiles: fileManager.refreshFiles,
    getFilesByPurpose: fileManager.getFilesByPurpose,
    
    // Utilities
    clearError: () => {
      setUploadState(prev => ({ ...prev, error: null }));
      fileManager.clearError();
    },
    canUpload: !!session?.access_token,
    hasFiles: fileManager.files.length > 0
  };
};