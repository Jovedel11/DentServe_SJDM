const IMAGE_SERVER_URL = import.meta.env.VITE_API_URL; 

export const imageService = {
  async uploadImage(access_token, formData, onProgress = null, signal = null) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/profile-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        'X-Upload-Id': uploadId,
      },
      body: formData,
      signal,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 499) {
        throw new Error("Upload cancelled");
      }
      throw new Error(data.error || "Upload failed");
    }

    return { ...data, uploadId };
  },

  async uploadClinicImage(access_token, clinicId, formData, signal = null) {
    const uploadId = `clinic_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ✅ FIXED: Add clinic ID to form data BEFORE sending
    formData.append('clinicId', clinicId);
    
    const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/clinic-image`, {
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
      throw new Error(errorData.error || "Clinic image upload failed");
    }

    const data = await response.json();
    return { ...data, uploadId };
  },

  async uploadDoctorImage(access_token, doctorId, formData, signal = null) {
    const uploadId = `doctor_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ✅ FIXED: Add doctor ID to form data BEFORE sending
    formData.append('doctorId', doctorId);
    
    const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/doctor-image`, {
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
      throw new Error(errorData.error || "Doctor image upload failed");
    }

    const data = await response.json();
    return { ...data, uploadId };
  },

  async cancelUpload(access_token, uploadId) {
    try {
      const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/profile-image/${uploadId}`, {
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