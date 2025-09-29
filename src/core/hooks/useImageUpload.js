import { useState, useRef, useCallback } from 'react';
import { validateFile, compressImage, createImagePreview } from '@/utils/validation/file-validation';
import { imageService } from '@/services/imageService';
import { useAuth } from '@/auth/context/AuthProvider';

export const useImageUpload = (options = {}) => {
  const {
    // Upload configuration
    uploadType = 'profile',
    entityId = null,
    fieldName = 'image',
    
    // Callbacks
    onUploadSuccess,
    onUploadError,
    onUploadStart,
    onUploadProgress,
    
    // File processing options
    autoCompress = true,
    quality = 0.8,
    allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    
    // Cloudinary options
    folder = null,
    transformations = null,
    publicIdPrefix = null,
    
    // 🔥 **REMOVED: Don't use default values that override config**
    // maxSizeMB = 1,  // REMOVED - will use config values
    // maxWidthOrHeight = 800,  // REMOVED - will use config values  
    // maxFileSize = 5 * 1024 * 1024,  // REMOVED - will use config values
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
  const isProcessingRef = useRef(false);
  const access_token = session?.access_token;

  // 🔥 **FIXED: Get upload configurations with proper values**
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
        maxFileSize: 5 * 1024 * 1024,
      },
      clinic: {
        endpoint: 'clinic-image',
        folder: 'clinics',
        fieldName: 'clinicImage',
        transformations: [
          { width: 1200, height: 800, crop: 'fill' },
          { quality: 'auto:good', fetch_format: 'auto' }
        ],
        publicIdPrefix: 'clinic',
        maxSizeMB: 10, // 🔥 Higher compression limit for clinic images
        maxWidthOrHeight: 1600, // 🔥 Higher resolution for clinic images
        maxFileSize: 50 * 1024 * 1024, // 🔥 50MB max file size for clinic images
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
        maxFileSize: 5 * 1024 * 1024,
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
        maxFileSize: 10 * 1024 * 1024,
      }
    };

    const defaultConfig = configs[uploadType] || configs.general;
    
    // 🔥 **FIXED: Use config values, allow options to override if provided**
    return {
      endpoint: defaultConfig.endpoint,
      folder: folder || defaultConfig.folder,
      fieldName: fieldName !== 'image' ? fieldName : defaultConfig.fieldName,
      transformations: transformations || defaultConfig.transformations,
      publicIdPrefix: publicIdPrefix || defaultConfig.publicIdPrefix,
      maxSizeMB: options.maxSizeMB || defaultConfig.maxSizeMB, // Use config value
      maxWidthOrHeight: options.maxWidthOrHeight || defaultConfig.maxWidthOrHeight, // Use config value
      maxFileSize: options.maxFileSize || defaultConfig.maxFileSize, // Use config value
    };
  }, [uploadType, folder, fieldName, transformations, publicIdPrefix, options.maxSizeMB, options.maxWidthOrHeight, options.maxFileSize]);

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
    isProcessingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Progress simulation
  const simulateProgress = useCallback((uploadId) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8;
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
    }, 400);

    return interval;
  }, [onUploadProgress]);

  // 🔥 **FIXED: Handle file selection with proper config values**
  const selectFile = useCallback(async (file) => {
    if (isProcessingRef.current) {
      console.log('⏳ Already processing, ignoring new file selection');
      return { success: false, error: 'Already processing a file' };
    }

    setError('');
    setSuccess('');

    if (!file) {
      cleanup();
      return { success: false, error: 'No file selected' };
    }

    const config = getUploadConfig();

    console.log(`📁 Processing ${uploadType} file:`, {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type,
      maxAllowed: `${(config.maxFileSize / 1024 / 1024).toFixed(0)}MB`
    });

    // 🔥 **FIXED: Use the correct validation with proper config**
    const validationError = validateFile(file, { 
      allowedTypes, 
      maxFileSize: config.maxFileSize
    });
    
    if (validationError) {
      setError(validationError);
      return { success: false, error: validationError };
    }

    try {
      isProcessingRef.current = true;
      
      setOriginalFile(file);
      
      // Create preview
      const previewUrl = await createImagePreview(file);
      setPreview(previewUrl);

      if (autoCompress) {
        setUploadState(prev => ({ ...prev, isCompressing: true }));
        
        // 🔥 **FIXED: Use config values for compression settings**
        const compressionSettings = {
          maxSizeMB: config.maxSizeMB, // Use config value
          maxWidthOrHeight: config.maxWidthOrHeight, // Use config value
          quality: uploadType === 'clinic' ? 0.9 : quality, // Higher quality for clinic images
          alwaysKeepResolution: uploadType === 'clinic', // Keep resolution for clinic images
          useWebWorker: true,
          fileType: uploadType === 'clinic' ? 'image/jpeg' : undefined, // Force JPEG for better compression
        };

        console.log(`🔧 Compressing ${uploadType} image with settings:`, compressionSettings);
        const compressed = await compressImage(file, compressionSettings);
        
        setCompressedFile(compressed);
        setUploadState(prev => ({ ...prev, isCompressing: false }));
        
        console.log(`✅ Compression complete: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
      }

      return { success: true, preview: previewUrl };
    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = 'Failed to process image. Please try again.';
      setError(errorMessage);
      cleanup();
      return { success: false, error: errorMessage };
    } finally {
      isProcessingRef.current = false;
    }
  }, [allowedTypes, autoCompress, quality, cleanup, getUploadConfig, uploadType]);

  const uploadFile = useCallback(async (customOptions = {}) => {
    if (isProcessingRef.current || uploadState.isUploading) {
      console.log('⏳ Upload already in progress');
      return { success: false, error: 'Upload already in progress' };
    }

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

    // Validate entity requirements
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
    
    // 🔥 **FIXED: Create abort controller OUTSIDE try block to prevent premature cleanup**
    abortControllerRef.current = new AbortController();
    
    try {
      isProcessingRef.current = true;
      
      // 🔥 **FIXED: Much longer timeout and no automatic abort**
      const timeout = uploadType === 'clinic' ? 300000 : 120000; // 5 minutes for clinic, 2 minutes for others
      let timeoutId;
      
      // Only set timeout if upload takes too long
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          console.log(`⏰ ${uploadType} upload timeout after ${timeout}ms`);
          if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
            abortControllerRef.current.abort();
          }
          reject(new Error(`Upload timeout after ${timeout/1000} seconds`));
        }, timeout);
      });
      
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

      const formData = new FormData();
      formData.append(uploadOptions.fieldName, fileToUpload);
      
      // Add entity ID for non-profile uploads
      if (entityId) {
        const idFieldName = uploadType === 'clinic' ? 'clinicId' : 
                           uploadType === 'doctor' ? 'doctorId' : 
                           `${uploadType}Id`;
        formData.append(idFieldName, entityId);
      }

      // Add custom upload options
      if (customOptions.folder) formData.append('folder', customOptions.folder);
      if (customOptions.transformations) {
        formData.append('transformations', JSON.stringify(customOptions.transformations));
      }

      console.log(`🚀 Uploading ${uploadType} image: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB to ${uploadOptions.endpoint}`);
      console.log(`🚀 Using timeout: ${timeout/1000} seconds`);

      // 🔥 **FIXED: Race between upload and timeout**
      const uploadPromise = imageService.uploadGenericImage(
        access_token,
        formData,
        uploadOptions.endpoint,
        null,
        abortControllerRef.current.signal
      );

      // Wait for either upload to complete or timeout
      const result = await Promise.race([uploadPromise, timeoutPromise]);

      // Clear timeout if upload completed
      clearTimeout(timeoutId);
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
      console.error(`❌ ${uploadType} upload error:`, error);
      
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.name === 'AbortError' || error.message.includes('Upload cancelled')) {
        errorMessage = `Upload cancelled. This might be due to network issues or the file being too large for your connection.`;
      } else if (error.message.includes('timeout')) {
        errorMessage = `Upload timeout. Please try with a smaller image or check your connection.`;
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = `File too large. Maximum size for ${uploadType} images is ${Math.round(config.maxFileSize / 1024 / 1024)}MB.`;
      } else if (error.message.includes('Server error')) {
        errorMessage = 'Server error. Please try again in a few moments.';
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
    } finally {
      isProcessingRef.current = false;
      // Don't clear abort controller here - let it be cleared in cleanup
    }
  }, [compressedFile, originalFile, access_token, uploadType, entityId, simulateProgress, onUploadStart, onUploadSuccess, onUploadError, cleanup, getUploadConfig, uploadState.isUploading]);


  // 🔥 **FIXED: Properly synchronized auto upload**
  const selectAndUpload = useCallback(async (file) => {
    try {
      console.log(`🔄 Starting selectAndUpload for ${uploadType}`);
      
      // Step 1: Select and process the file
      const selectResult = await selectFile(file);
      if (!selectResult.success) {
        console.error('❌ File selection failed:', selectResult.error);
        return selectResult;
      }

      // Step 2: Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Upload the processed file
      const uploadResult = await uploadFile();
      return uploadResult;
    } catch (error) {
      console.error('❌ selectAndUpload error:', error);
      return { success: false, error: error.message };
    }
  }, [selectFile, uploadFile, uploadType]);

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
    isProcessing: uploadState.isUploading || uploadState.isCompressing || isProcessingRef.current,
    canUpload: (compressedFile || originalFile) && !uploadState.isUploading && access_token && !isProcessingRef.current,
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