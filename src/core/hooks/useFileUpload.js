import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/context/AuthProvider';

export const useFileUpload = () => {
  const { session } = useAuth();
  
  const [state, setState] = useState({
    uploading: false,
    progress: 0,
    error: null,
    uploadedFiles: []
  });

  // 🎯 UPLOAD FILE (Generic)
  const uploadFile = useCallback(async (file, options = {}) => {
    if (!file) return { success: false, error: 'No file provided' };
    if (!session?.access_token) return { success: false, error: 'Authentication required' };

    try {
      setState(prev => ({ ...prev, uploading: true, progress: 0, error: null }));

      const {
        bucket = 'public',
        folder = 'uploads',
        maxSize = 5 * 1024 * 1024, // 5MB
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      } = options;

      // Validate file
      if (file.size > maxSize) {
        throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
      }

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const fileName = `${folder}/${timestamp}_${randomString}.${extension}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Save file record to database
      const { data: fileRecord, error: dbError } = await supabase
        .from('file_uploads')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: fileName,
          bucket_name: bucket,
          content_type: file.type,
          upload_purpose: options.purpose || 'general',
          related_id: options.relatedId || null,
          metadata: {
            original_name: file.name,
            uploaded_at: new Date().toISOString(),
            public_url: publicUrl
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setState(prev => ({
        ...prev,
        uploading: false,
        progress: 100,
        uploadedFiles: [...prev.uploadedFiles, { ...fileRecord, publicUrl }]
      }));

      return {
        success: true,
        file: { ...fileRecord, publicUrl },
        url: publicUrl
      };

    } catch (err) {
      setState(prev => ({ ...prev, uploading: false, progress: 0, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [session]);

  // 🎯 DELETE FILE
  const deleteFile = useCallback(async (fileId, storagePath) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('public')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('file_uploads')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      setState(prev => ({
        ...prev,
        uploadedFiles: prev.uploadedFiles.filter(f => f.id !== fileId)
      }));

      return { success: true };
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }));
      return { success: false, error: err.message };
    }
  }, []);

  // 🎯 GET USER FILES
  const getUserFiles = useCallback(async (options = {}) => {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);

      if (error) throw error;

      setState(prev => ({ ...prev, uploadedFiles: data || [] }));
      return { success: true, files: data || [] };
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [session]);

  return {
    // State
    ...state,
    
    // Actions
    uploadFile,
    deleteFile,
    getUserFiles,
    
    // Utilities
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Computed
    canUpload: !!session?.access_token,
    hasFiles: state.uploadedFiles.length > 0
  };
};