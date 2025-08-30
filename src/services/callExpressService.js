const TWILIO_SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'; 

export const callExpressService = {
  async callExpressApi (endpoint, data, token = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`🌐 Calling API: ${TWILIO_SERVER_URL}/api/sms/${endpoint}`);
    console.log('📝 Request data:', data);

    const response = await fetch(`${TWILIO_SERVER_URL}/api/sms/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    console.log(`📡 API Response (${response.status}):`, result);
    
    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }

    return result;
  }
}