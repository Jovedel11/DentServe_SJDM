import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

/**
 * Core File Management Hook
 * Handles database operations using Supabase functions
 * Works with any external storage (Cloudinary, S3, etc.)
 */
export const useFileManager = () => {
  const { user, session } = useAuth();
  
  const [state, setState] = useState({
    files: [],
    loading: false,
    error: null,
    stats: null,
    pagination: {
      limit: 50,
      offset: 0,
      totalCount: 0,
      hasMore: false
    }
  });

  // ✅ ALIGNED: Record file upload using database function
  const recordFileUpload = useCallback(async (fileData) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const { data, error } = await supabase.rpc('create_file_upload_record', {
        p_file_name: fileData.fileName,
        p_file_type: fileData.fileType,
        p_file_size: fileData.fileSize,
        p_storage_path: fileData.storagePath,
        p_bucket_name: fileData.bucketName || 'cloudinary',
        p_content_type: fileData.contentType,
        p_upload_purpose: fileData.uploadPurpose || 'general',
        p_related_id: fileData.relatedId || null,
        p_metadata: fileData.metadata || {}
      });

      if (error) throw error;

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to record file upload');
      }

      return {
        success: true,
        uploadId: data.upload_id,
        message: data.message
      };

    } catch (err) {
      console.error('Record file upload error:', err);
      return { success: false, error: err.message };
    }
  }, [user]);

  // ✅ ALIGNED: Get user files using database function
  const fetchUserFiles = useCallback(async (options = {}) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const {
        uploadPurpose = null,
        fileType = null,
        limit = state.pagination.limit,
        offset = state.pagination.offset,
        refresh = false
      } = options;

      const { data, error } = await supabase.rpc('get_user_file_uploads', {
        p_user_id: null, // Uses current user context
        p_upload_purpose: uploadPurpose,
        p_file_type: fileType,
        p_limit: limit,
        p_offset: refresh ? 0 : offset
      });

      if (error) throw error;

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch files');
      }

      const fileData = data.data;
      const newFiles = fileData.files || [];
      const paginationData = fileData.pagination || {};

      setState(prev => ({
        ...prev,
        files: refresh || offset === 0 ? newFiles : [...prev.files, ...newFiles],
        pagination: {
          limit: paginationData.limit || limit,
          offset: refresh ? newFiles.length : prev.pagination.offset + newFiles.length,
          totalCount: paginationData.total_count || 0,
          hasMore: paginationData.has_more || false
        },
        loading: false
      }));

      return {
        success: true,
        files: newFiles,
        pagination: paginationData
      };

    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch files';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [user, state.pagination.limit, state.pagination.offset]);

  // ✅ ALIGNED: Delete file using database function
  const deleteFile = useCallback(async (uploadId) => {
    if (!user || !uploadId) {
      return { success: false, error: 'Upload ID required' };
    }

    try {
      const { data, error } = await supabase.rpc('delete_file_upload', {
        p_upload_id: uploadId
      });

      if (error) throw error;

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete file');
      }

      // Remove from local state
      setState(prev => ({
        ...prev,
        files: prev.files.filter(file => file.id !== uploadId)
      }));

      return {
        success: true,
        message: data.message,
        affectedCount: data.affected_count
      };

    } catch (err) {
      console.error('Delete file error:', err);
      return { success: false, error: err.message };
    }
  }, [user]);

  // ✅ ALIGNED: Get file statistics using database function
  const fetchFileStats = useCallback(async (userId = null) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const { data, error } = await supabase.rpc('get_file_upload_stats', {
        p_user_id: userId
      });

      if (error) throw error;

      if (data?.authenticated === false) {
        throw new Error('Authentication required');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch statistics');
      }

      setState(prev => ({ ...prev, stats: data.data }));
      return { success: true, stats: data.data };

    } catch (err) {
      console.error('Fetch stats error:', err);
      return { success: false, error: err.message };
    }
  }, [user]);

  // ✅ ENHANCED: Filter files by purpose
  const getFilesByPurpose = useCallback((purpose) => {
    return state.files.filter(file => file.upload_purpose === purpose);
  }, [state.files]);

  // ✅ ENHANCED: Filter files by type
  const getFilesByType = useCallback((type) => {
    return state.files.filter(file => file.file_type === type || file.content_type === type);
  }, [state.files]);

  // ✅ COMPUTED: File statistics
  const computedStats = useMemo(() => {
    if (!state.files.length) {
      return {
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: 0,
        byPurpose: {},
        byType: {},
        recentFiles: []
      };
    }

    const totalSize = state.files.reduce((sum, file) => sum + (file.file_size || 0), 0);
    
    // Group by purpose
    const byPurpose = state.files.reduce((acc, file) => {
      const purpose = file.upload_purpose || 'general';
      acc[purpose] = (acc[purpose] || 0) + 1;
      return acc;
    }, {});

    // Group by type
    const byType = state.files.reduce((acc, file) => {
      const type = file.file_type || file.content_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Recent files (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentFiles = state.files.filter(file => 
      new Date(file.uploaded_at) > sevenDaysAgo
    );

    return {
      totalFiles: state.files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      byPurpose,
      byType,
      recentFiles
    };
  }, [state.files]);

  // ✅ AUTO-FETCH: Load files on mount
  useEffect(() => {
    if (user) {
      fetchUserFiles();
      fetchFileStats();
    }
  }, [user]);

  return {
    // State
    files: state.files,
    loading: state.loading,
    error: state.error,
    stats: state.stats,
    pagination: state.pagination,
    computedStats,

    // Actions
    recordFileUpload,
    fetchUserFiles,
    deleteFile,
    fetchFileStats,
    
    // Filtering
    getFilesByPurpose,
    getFilesByType,

    // Convenience methods
    refreshFiles: () => fetchUserFiles({ refresh: true }),
    loadMoreFiles: () => {
      if (!state.loading && state.pagination.hasMore) {
        fetchUserFiles({ offset: state.pagination.offset });
      }
    },

    // Utilities
    isEmpty: state.files.length === 0,
    hasMore: state.pagination.hasMore,
    clearError: () => setState(prev => ({ ...prev, error: null }))
  };
};