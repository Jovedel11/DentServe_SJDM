const IMAGE_SERVER_URL = import.meta.env.VITE_API_URL; 

export const imageService = {
  // Generic upload method
  async uploadGenericImage(access_token, formData, endpoint, onProgress = null, signal = null) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        'X-Upload-Id': uploadId,
      },
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Unknown error' };
      }
      
      if (response.status === 499) {
        throw new Error("Upload cancelled");
      }
      throw new Error(errorData.error || "Upload failed");
    }

    const data = await response.json();
    return { ...data, uploadId };
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