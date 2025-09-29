import { useState, useRef, useCallback } from 'react';
import { validateFile, compressImage, createImagePreview } from '@/utils/validation/file-validation';
import { imageService } from '@/services/imageService';
import { useAuth } from '@/auth/context/AuthProvider';

export const useImageUpload = (options = {}) => {
  const {
    // Upload configuration
    uploadType = 'profile', // 'profile', 'clinic', 'doctor', 'general'
    entityId = null, // clinicId, doctorId, etc.
    fieldName = 'image', // Form field name
    
    // Callbacks
    onUploadSuccess,
    onUploadError,
    onUploadStart,
    onUploadProgress,
    
    // File processing options
    autoCompress = true,
    maxSizeMB = 1,
    maxWidthOrHeight = 800,
    quality = 0.8,
    allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxFileSize = 5 * 1024 * 1024, // Default 5MB
    
    // Cloudinary options
    folder = null,
    transformations = null,
    publicIdPrefix = null,
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

  // 🔥 **IMPROVED: Get default configurations with higher limits for clinic**
  const getUploadConfig = useCallback(() => {
    const configs = {
      profile: {
        endpoint: 'profile-image',
        folder: 'profiles',
        fieldName: 'profileImage',
        transformations: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        publicIdPrefix: 'user',
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      },
      clinic: {
        endpoint: 'clinic-image',
        folder: 'clinics',
        fieldName: 'clinicImage',
        transformations: [
          { width: 1200, height: 800, crop: 'fill' },
          { quality: 'auto:good', fetch_format: 'auto' } // 🔥 Better quality for clinic images
        ],
        publicIdPrefix: 'clinic',
        maxSizeMB: 5, // 🔥 Increased compression target but allow larger input
        maxWidthOrHeight: 1200,
        maxFileSize: 50 * 1024 * 1024, // 🔥 50MB input allowed
      },
      doctor: {
        endpoint: 'doctor-image',
        folder: 'doctors',
        fieldName: 'doctorImage',
        transformations: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        publicIdPrefix: 'doctor',
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      },
      general: {
        endpoint: 'general-image',
        folder: 'general',
        fieldName: 'image',
        transformations: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        publicIdPrefix: 'img',
        maxSizeMB: 3,
        maxWidthOrHeight: 1500,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      }
    };

    const defaultConfig = configs[uploadType] || configs.general;
    
    return {
      endpoint: defaultConfig.endpoint,
      folder: folder || defaultConfig.folder,
      fieldName: fieldName !== 'image' ? fieldName : defaultConfig.fieldName,
      transformations: transformations || defaultConfig.transformations,
      publicIdPrefix: publicIdPrefix || defaultConfig.publicIdPrefix,
      maxSizeMB: maxSizeMB || defaultConfig.maxSizeMB,
      maxWidthOrHeight: maxWidthOrHeight || defaultConfig.maxWidthOrHeight,
      maxFileSize: maxFileSize || defaultConfig.maxFileSize,
    };
  }, [uploadType, folder, fieldName, transformations, publicIdPrefix, maxSizeMB, maxWidthOrHeight, maxFileSize]);

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

  // Progress simulation
  const simulateProgress = useCallback((uploadId) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10; // 🔥 Slower progress for large files
      if (progress > 90) {
        progress = 90;
        clearInterval(interval);
      }
      
      setUploadState(prev => 
        prev.uploadId === uploadId ? { ...prev, progress: Math.min(progress, 90) } : prev
      );
      
      if (onUploadProgress) {
        onUploadProgress(Math.min(progress, 90));
      }
    }, 300); // 🔥 Slower updates for large files

    return interval;
  }, [onUploadProgress]);

  // Handle file selection
  const selectFile = useCallback(async (file) => {
    setError('');
    setSuccess('');

    if (!file) {
      cleanup();
      return { success: false, error: 'No file selected' };
    }

    const config = getUploadConfig();

    // 🔥 **IMPROVED: Use config-specific file size validation**
    const validationError = validateFile(file, { 
      allowedTypes, 
      maxFileSize: config.maxFileSize 
    });
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
        // Start compression
        setUploadState(prev => ({ ...prev, isCompressing: true }));
        
        // 🔥 **IMPROVED: Use less aggressive compression for clinic images**
        const compressionSettings = uploadType === 'clinic' ? {
          maxSizeMB: config.maxSizeMB,
          maxWidthOrHeight: config.maxWidthOrHeight,
          quality: 0.85, // Higher quality for clinic images
          alwaysKeepResolution: false,
          useWebWorker: true,
        } : {
          maxSizeMB: config.maxSizeMB,
          maxWidthOrHeight: config.maxWidthOrHeight,
          quality,
        };

        const compressed = await compressImage(file, compressionSettings);
        
        setCompressedFile(compressed);
        setUploadState(prev => ({ ...prev, isCompressing: false }));
        
        console.log(`🔧 Compression complete: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
      }

      return { success: true, preview: previewUrl };
    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = 'Failed to process image. Please try again.';
      setError(errorMessage);
      cleanup();
      return { success: false, error: errorMessage };
    }
  }, [allowedTypes, autoCompress, quality, cleanup, getUploadConfig, uploadType]);

  // 🔥 **IMPROVED: Handle upload with better validation and error handling**
  const uploadFile = useCallback(async (customOptions = {}) => {
    const fileToUpload = compressedFile || originalFile;
    
    if (!fileToUpload) {
      const error = 'Please select a file first';
      setError(error);
      return { success: false, error };
    }

    if (!access_token) {
      const error = 'Authentication required. Please log in again.';
      setError(error);
      return { success: false, error };
    }

    // 🔥 **IMPROVED: Better entity validation**
    if (uploadType === 'clinic' && !entityId) {
      const error = 'Clinic ID is required for clinic image uploads';
      setError(error);
      return { success: false, error };
    }

    if (uploadType === 'doctor' && (!entityId || entityId.toString().startsWith('new_'))) {
      const error = 'Doctor must be saved before uploading image';
      setError(error);
      return { success: false, error };
    }

    const config = getUploadConfig();
    const uploadOptions = { ...config, ...customOptions };
    
    abortControllerRef.current = new AbortController();
    
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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

    const progressInterval = simulateProgress(uploadId);

    try {
      const formData = new FormData();
      formData.append(uploadOptions.fieldName, fileToUpload);
      
      // Add entity ID for non-profile uploads
      if (entityId) {
        const idFieldName = uploadType === 'clinic' ? 'clinicId' : 
                           uploadType === 'doctor' ? 'doctorId' : 
                           `${uploadType}Id`;
        formData.append(idFieldName, entityId);
      }

      // Add custom upload options to form data if needed
      if (customOptions.folder) formData.append('folder', customOptions.folder);
      if (customOptions.transformations) {
        formData.append('transformations', JSON.stringify(customOptions.transformations));
      }

      console.log(`🚀 Uploading ${uploadType} image: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);

      const result = await imageService.uploadGenericImage(
        access_token,
        formData,
        uploadOptions.endpoint,
        null,
        abortControllerRef.current.signal
      );

      clearInterval(progressInterval);
      setUploadState(prev => ({ ...prev, progress: 100 }));
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const successMessage = `${uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} image uploaded successfully!`;
      setSuccess(successMessage);

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

      setTimeout(() => cleanup(), 2000);
      
      return { success: true, data: result };

    } catch (error) {
      clearInterval(progressInterval);
      console.error(`❌ ${uploadType} upload error:`, error);
      
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        errorMessage = 'Upload cancelled';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = `File too large. Maximum size for ${uploadType} images is ${Math.round(config.maxFileSize / 1024 / 1024)}MB.`;
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
  }, [compressedFile, originalFile, access_token, uploadType, entityId, simulateProgress, onUploadStart, onUploadSuccess, onUploadError, cleanup, getUploadConfig]);

  // 🔥 **AUTO UPLOAD: Select and upload in one go**
  const selectAndUpload = useCallback(async (file) => {
    const selectResult = await selectFile(file);
    if (selectResult.success) {
      return await uploadFile();
    }
    return selectResult;
  }, [selectFile, uploadFile]);

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
    canUpload: (compressedFile || originalFile) && !uploadState.isUploading && access_token,
    uploadConfig: getUploadConfig(),
    
    // Actions
    selectFile,
    uploadFile,
    selectAndUpload,
    cancelUpload,
    reset,
    cleanup,
  };
};

// Legacy compatibility hooks
export const useProfileImageUpload = (options = {}) => {
  return useImageUpload({ ...options, uploadType: 'profile' });
};

export const useClinicImageUpload = (clinicId, options = {}) => {
  return useImageUpload({ ...options, uploadType: 'clinic', entityId: clinicId });
};

export const useDoctorImageUpload = (doctorId, options = {}) => {
  return useImageUpload({ ...options, uploadType: 'doctor', entityId: doctorId });
};