import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'DentServe <noreply@dentserve-sjdm.me>';

// send email using Resend
export const sendEmail = async ({ to, subject, html, replyTo = null }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    if (!to || !subject || !html) {
      throw new Error('Missing required email parameters');
    }

    const emailOptions = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (replyTo) {
      emailOptions.replyTo = replyTo;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('❌ Resend error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    console.log('✅ Email sent successfully:', {
      to,
      subject,
      resend_id: data.id,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      email_id: data.id,
      sent_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return {
      success: false,
      error: error.message || 'Internal email service error',
    };
  }
};


 // send bulk emails (for staff digest, reminders, etc.)
export const sendBulkEmails = async (emails) => {
  try {
    const results = await Promise.allSettled(
      emails.map((email) => sendEmail(email))
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter((r) => r.status === 'rejected' || !r.value.success);

    return {
      success: true,
      total: emails.length,
      successful: successful.length,
      failed: failed.length,
      results,
    };
  } catch (error) {
    console.error('❌ Bulk email error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  sendEmail,
  sendBulkEmails,
};