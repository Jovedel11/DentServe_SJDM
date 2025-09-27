import { useState, useRef, useCallback } from 'react';
import { validateFile, compressImage, createImagePreview } from '@/utils/validation/file-validation';
import { imageService } from '@/services/imageService';
import { useAuth } from '@/auth/context/AuthProvider';

export const useClinicImageUpload = (clinicId, options = {}) => {
  const {
    onUploadSuccess,
    onUploadError,
    onUploadStart,
    onUploadProgress,
    autoCompress = true,
    maxSizeMB = 2,
    maxWidthOrHeight = 1200,
    quality = 0.8,
    allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxFileSize = 5 * 1024 * 1024, // 5MB
  } = options;

  const { session } = useAuth();
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    isCompressing: false,
    progress: 0,
    uploadId: null,
  });
  const [preview, setPreview] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const abortControllerRef = useRef(null);
  const access_token = session?.access_token;

  // Cleanup function
  const cleanup = useCallback(() => {
    setPreview(null);
    setOriginalFile(null);
    setCompressedFile(null);
    setError('');
    setSuccess('');
    setUploadState({
      isUploading: false,
      isCompressing: false,
      progress: 0,
      uploadId: null,
    });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Handle file selection
  const selectFile = useCallback(async (file) => {
    setError('');
    setSuccess('');

    if (!file) {
      cleanup();
      return { success: false, error: 'No file selected' };
    }

    // Validate file
    const validationError = validateFile(file, { allowedTypes, maxFileSize });
    if (validationError) {
      setError(validationError);
      return { success: false, error: validationError };
    }

    try {
      setOriginalFile(file);
      
      // Create preview
      const previewUrl = await createImagePreview(file);
      setPreview(previewUrl);

      if (autoCompress) {
        setUploadState(prev => ({ ...prev, isCompressing: true }));
        
        const compressed = await compressImage(file, {
          maxSizeMB,
          maxWidthOrHeight,
          quality,
        });
        
        setCompressedFile(compressed);
        setUploadState(prev => ({ ...prev, isCompressing: false }));
      }

      return { success: true, preview: previewUrl };
    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = 'Failed to process image. Please try again.';
      setError(errorMessage);
      cleanup();
      return { success: false, error: errorMessage };
    }
  }, [allowedTypes, maxFileSize, autoCompress, maxSizeMB, maxWidthOrHeight, quality, cleanup]);

  // Handle upload
  const uploadFile = useCallback(async () => {
    if (!compressedFile && !originalFile) {
      const error = 'Please select a file first';
      setError(error);
      return { success: false, error };
    }

    if (!access_token) {
      const error = 'Authentication required. Please log in again.';
      setError(error);
      return { success: false, error };
    }

    if (!clinicId) {
      const error = 'Clinic ID is required';
      setError(error);
      return { success: false, error };
    }

    const fileToUpload = compressedFile || originalFile;
    abortControllerRef.current = new AbortController();
    
    const uploadId = `clinic_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setUploadState({
      isUploading: true,
      isCompressing: false,
      progress: 0,
      uploadId,
    });
    setError('');
    setSuccess('');

    if (onUploadStart) {
      onUploadStart(fileToUpload);
    }

    try {
      // ✅ FIXED: Create fresh FormData and add clinic ID first
      const formData = new FormData();
      formData.append('clinicId', clinicId);
      formData.append('clinicImage', fileToUpload);

      console.log('🚀 Uploading clinic image:', {
        clinicId,
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size
      });

      const result = await imageService.uploadClinicImage(
        access_token,
        clinicId,
        formData,
        abortControllerRef.current.signal
      );

      setUploadState(prev => ({ ...prev, progress: 100 }));
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const successMessage = 'Clinic image uploaded successfully!';
      setSuccess(successMessage);

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

      setTimeout(() => cleanup(), 2000);
      
      return { success: true, data: result };

    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        errorMessage = 'Upload cancelled';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        progress: 0 
      }));

      if (onUploadError) {
        onUploadError(error);
      }

      return { success: false, error: errorMessage };
    }
  }, [compressedFile, originalFile, access_token, clinicId, onUploadStart, onUploadSuccess, onUploadError, cleanup]);

  // Cancel upload
  const cancelUpload = useCallback(async () => {
    if (uploadState.uploadId && abortControllerRef.current) {
      abortControllerRef.current.abort();
      
      try {
        await imageService.cancelUpload(access_token, uploadState.uploadId);
      } catch (error) {
        console.error('Cancel upload error:', error);
      }
    }
    
    cleanup();
  }, [uploadState.uploadId, access_token, cleanup]);

  // Reset state
  const reset = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    // State
    uploadState,
    preview,
    originalFile,
    compressedFile,
    error,
    success,
    
    // Computed
    isProcessing: uploadState.isUploading || uploadState.isCompressing,
    canUpload: (compressedFile || originalFile) && !uploadState.isUploading && access_token && clinicId,
    
    // Actions
    selectFile,
    uploadFile,
    cancelUpload,
    reset,
    cleanup,
  };
};