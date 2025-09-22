import express from 'express';
import { Resend } from 'resend';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limiting for email endpoints
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many email requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email templates
const getStaffInvitationTemplate = (data) => {
  const { first_name, last_name, clinic_name, position, invitation_link } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DentServe</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6; 
                color: #333; 
                margin: 0;
                padding: 0;
                background-color: #f8fafc;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            .header { 
                background: linear-gradient(135deg, #10b981, #059669); 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }
            .header p {
                margin: 10px 0 0 0;
                font-size: 16px;
                opacity: 0.9;
            }
            .content { 
                padding: 40px 30px; 
            }
            .content h2 {
                color: #1f2937;
                font-size: 24px;
                margin: 0 0 20px 0;
            }
            .content p {
                font-size: 16px;
                line-height: 1.6;
                color: #4b5563;
                margin: 0 0 16px 0;
            }
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #10b981, #059669);
                color: white; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600;
                font-size: 16px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
            }
            .info-box {
                background: #f3f4f6;
                border-left: 4px solid #10b981;
                padding: 16px;
                margin: 24px 0;
                border-radius: 0 8px 8px 0;
            }
            .link-backup {
                word-break: break-all;
                background: #f9fafb;
                padding: 12px;
                border-radius: 6px;
                font-family: 'Monaco', 'Menlo', monospace;
                font-size: 14px;
                border: 1px solid #e5e7eb;
                margin: 16px 0;
            }
            .footer { 
                background: #f9fafb; 
                padding: 30px; 
                text-align: center; 
                font-size: 14px; 
                color: #6b7280; 
                border-top: 1px solid #e5e7eb;
            }
            .footer p {
                margin: 0 0 8px 0;
            }
            .logo {
                font-size: 32px;
                margin-bottom: 8px;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 0 16px;
                }
                .header, .content, .footer {
                    padding: 24px 20px;
                }
                .header h1 {
                    font-size: 24px;
                }
                .content h2 {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🦷</div>
                <h1>Welcome to DentServe</h1>
                <p>You've been invited to join our dental care platform</p>
            </div>
            <div class="content">
                <h2>Hello ${first_name} ${last_name}!</h2>
                <p>You have been invited to join <strong>${clinic_name}</strong> as a <strong>${position}</strong>.</p>
                
                <p>We're excited to have you on board! Click the button below to complete your registration and set up your account:</p>
                
                <div class="button-container">
                    <a href="${invitation_link}" class="button">Complete Registration</a>
                </div>
                
                <div class="info-box">
                    <p><strong>⏰ Important:</strong> This invitation expires in 7 days. Please complete your registration as soon as possible.</p>
                </div>
                
                <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
                <div class="link-backup">${invitation_link}</div>
                
                <p>Once you complete your registration, you'll be able to:</p>
                <ul style="color: #4b5563; padding-left: 20px;">
                    <li>Access your clinic dashboard</li>
                    <li>Manage appointments</li>
                    <li>Communicate with patients</li>
                    <li>View clinic analytics</li>
                </ul>
            </div>
            <div class="footer">
                <p><strong>Need help?</strong> Contact our support team if you have any questions.</p>
                <p>&copy; 2024 DentServe. All rights reserved.</p>
                <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
                    This email was sent to ${data.email} because you were invited to join DentServe.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Send staff invitation email
router.post('/send-staff-invitation', emailLimiter, async (req, res) => {
  try {
    const { 
      to_email, 
      subject, 
      clinic_name, 
      position, 
      first_name, 
      last_name, 
      invitation_id, 
      invitation_token 
    } = req.body;

    // Validate required fields
    if (!to_email || !subject || !clinic_name || !invitation_id || !invitation_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to_email, subject, clinic_name, invitation_id, invitation_token'
      });
    }

    // Build invitation link
    const invitation_link = `${process.env.FRONTEND_URL}/auth/staff-signup?invitation=${invitation_id}&token=${invitation_token}`;

    // Generate HTML content
    const html_content = getStaffInvitationTemplate({
      first_name: first_name || '',
      last_name: last_name || '',
      clinic_name,
      position: position || 'Staff',
      invitation_link,
      email: to_email
    });

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'DentServe <onboarding@resend.dev>',
      to: [to_email],
      subject,
      html: html_content,
    });

    if (error) {
      console.error('Resend API error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send email'
      });
    }

    console.log('✅ Email sent successfully:', { 
      to: to_email, 
      subject, 
      resend_id: data.id 
    });

    res.json({
      success: true,
      data: {
        email_id: data.id,
        to: to_email,
        subject,
        sent_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Email service error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Send general email
router.post('/send-email', emailLimiter, async (req, res) => {
  try {
    const { to, subject, html, from = 'DentServe <onboarding@resend.dev>' } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, html'
      });
    }

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend API error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send email'
      });
    }

    res.json({
      success: true,
      data: {
        email_id: data.id,
        to,
        subject,
        sent_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Email service error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Health check for email service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Email Service',
    status: 'OK',
    resend_configured: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString()
  });
});

export default router;