// react and express communication
const RECAPTCHA_SERVER_URL = import.meta.env.VITE_CUSTOM_SERVER_URL || 'http://localhost:3001';

export const recaptchaService = {
  async verifyToken(token, action, expectedAction = null) {
    try {
      console.log('Sending token to server for verification');
      
      const response = await fetch(`${RECAPTCHA_SERVER_URL}/api/recaptcha/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          action,
          expectedAction
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'recaptcha verification failed');

      console.log('Verified token', { score: data.score, action: data.action });

      return {
        success: true,
        score: data.score,
        action: data.action,
        timestamp: data.timestamp
      };

    } catch (error) {
      console.error('❌ reCAPTCHA verification error:', error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Unable to connect to security verification service. Please check your connection.',
          code: 'CONNECTION_ERROR'
        };
      }

        return {
          success: false,
          error: error.message || 'Security verification failed',
          code: 'VERIFICATION_ERROR'
      };
    }
  }
};