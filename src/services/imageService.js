const IMAGE_SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'; 

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
      signal, // Support for AbortController
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