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

// Send staff invitation email
router.post('/send-staff-invitation', emailLimiter, async (req, res) => {
  try {
    const { 
      to_email, 
      clinic_name, 
      position, 
      first_name, 
      last_name, 
      invitation_id, 
      invitation_token 
    } = req.body;

    // Validate required fields
    if (!to_email || !clinic_name || !invitation_id || !invitation_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Build invitation link
    const invitation_link = `${process.env.FRONTEND_URL}/auth/staff-signup?invitation=${invitation_id}&token=${invitation_token}`;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'DentServe <noreply@dentserve-sjdm.me>', // Use your verified domain
      to: [to_email],
      subject: `Invitation to Join ${clinic_name} on DentServe`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#333; max-width: 600px; margin:0 auto; padding:0; border:1px solid #e5e7eb; border-radius:8px; background:#fafafa;">

          <!-- Header -->
          <div style="background:#0f172a; padding:20px; border-radius:8px 8px 0 0; text-align:center;">
            <img src="https://dentserve-sjdm.me/assets/web-app-manifest-192x192.png" alt="DentServe Logo" style="max-height:50px; margin-bottom:8px;" />
            <h1 style="color:#fff; margin:0; font-size:20px;">DentServe</h1>
          </div>
          
          <div style="font-family: Arial, sans-serif; color:#333; max-width: 550px; margin:0 auto; padding:24px; border:1px solid #e5e7eb; border-radius:8px; background:#fafafa;">
            <h2 style="color:#0f172a; text-align:center; margin-bottom:20px;">Staff Invitation</h2>
            
            <p>Hello <strong>${first_name} ${last_name}</strong>,</p>
            <p>
              You have been invited to join <strong>${clinic_name}</strong> as <strong>${position}</strong> 
              on the DentServe platform.  
              To activate your staff account, please confirm your invitation by clicking the button below:
            </p>

            <p style="text-align:center; margin:32px 0;">
              <a href="${invitation_link}" 
                style="background:#2563eb; color:#fff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                Accept Invitation
              </a>
            </p>

            <p>After accepting the invitation, you will be asked to complete your staff profile.  
            This includes entering your clinic details and, if applicable, your doctor information.  
            Please ensure that the information provided is accurate to help us keep our records up to date.</p>

            <p>If the button above does not work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color:#2563eb;">${invitation_link}</p>

            <hr style="margin:32px 0; border:none; border-top:1px solid #ddd;" />

            <p style="font-size:12px; color:#555;">
              This Magic Link will expire shortly for your security.  
              If you did not expect this invitation, you can safely ignore this email.  
            </p>
          </div>

          <!-- Footer -->
          <div style="background:#f3f4f6; padding:16px; text-align:center; border-top:1px solid #e5e7eb; border-radius:0 0 8px 8px;">
            <p style="font-size:12px; color:#555; margin:0;">
              This email was sent by <strong>DentServe</strong>.  
              If you did not request this action, please ignore this message.
            </p>
            <p style="font-size:12px; color:#aaa; margin-top:6px;">
              © 2025 DentServe. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send email'
      });
    }

    console.log('✅ Email sent successfully:', { 
      to: to_email, 
      resend_id: data.id 
    });

    res.json({
      success: true,
      data: {
        email_id: data.id,
        to: to_email,
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