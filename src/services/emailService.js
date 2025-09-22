const API_BASE_URL = import.meta.env.VITE_API_URL

export const sendStaffInvitation = async (emailData) => {
  try {
    console.log('📧 Sending staff invitation email:', emailData);

    const response = await fetch(`${API_BASE_URL}/api/email/send-staff-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: emailData.to_email,
        subject: emailData.subject,
        clinic_name: emailData.clinic_name,
        position: emailData.position,
        first_name: emailData.first_name,
        last_name: emailData.last_name,
        invitation_id: emailData.invitation_id,
        invitation_token: emailData.invitation_token,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }

    console.log('✅ Email sent successfully:', result);
    return { success: true, data: result.data };

  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};

export const sendEmail = async ({ to, subject, html, from }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html, from }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }

    return { success: true, data: result.data };

  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: error.message };
  }
};

// Test email service connection
export const testEmailService = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/health`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Email service health check failed:', error);
    return { success: false, error: error.message };
  }
};