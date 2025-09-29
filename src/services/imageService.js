const IMAGE_SERVER_URL = import.meta.env.VITE_API_URL; 

export const imageService = {
  // Generic upload method with better error handling
  async uploadGenericImage(access_token, formData, endpoint, onProgress = null, signal = null) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📤 Starting upload to: ${IMAGE_SERVER_URL}/api/upload/${endpoint}`);
    console.log(`📤 Upload ID: ${uploadId}`);
    
    try {
      const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          'X-Upload-Id': uploadId,
        },
        body: formData,
        signal,
      });

      console.log(`📤 Upload response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`📤 Upload failed with status ${response.status}:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        
        if (response.status === 499) {
          throw new Error("Upload cancelled by client");
        }
        if (response.status === 413) {
          throw new Error("File too large for server");
        }
        if (response.status === 408) {
          throw new Error("Upload timeout - please try again");
        }
        if (response.status >= 500) {
          throw new Error("Server error - please try again later");
        }
        
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log(`📤 Upload successful:`, data);
      return { ...data, uploadId };
      
    } catch (error) {
      console.error(`📤 Upload exception:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error("Upload cancelled");
      }
      
      if (error.message.includes('fetch')) {
        throw new Error("Network error - please check your connection");
      }
      
      throw error;
    }
  },

  // Legacy profile image upload (for backward compatibility)
  async uploadImage(access_token, formData, onProgress = null, signal = null) {
    return this.uploadGenericImage(access_token, formData, 'profile-image', onProgress, signal);
  },

  // Legacy clinic image upload
  async uploadClinicImage(access_token, clinicId, formData, signal = null) {
    formData.append('clinicId', clinicId);
    return this.uploadGenericImage(access_token, formData, 'clinic-image', null, signal);
  },

  // Legacy doctor image upload
  async uploadDoctorImage(access_token, doctorId, formData, signal = null) {
    formData.append('doctorId', doctorId);
    return this.uploadGenericImage(access_token, formData, 'doctor-image', null, signal);
  },

  async cancelUpload(access_token, uploadId) {
    try {
      const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/cancel/${uploadId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Cancel upload error:', error);
      return { success: false, error: error.message };
    }
  }
};