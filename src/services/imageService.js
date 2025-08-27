// react and express communication 
const RECAPTCHA_SERVER_URL = import.meta.env.VITE_RECAPTCHA_SERVER_URL || 'http://localhost:3001';

export const imageService = {
  async uploadImage(access_token, formData) {
      const response = await fetch(`${RECAPTCHA_SERVER_URL}/api/upload/profile-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Upload failed")

      return data
  }
}