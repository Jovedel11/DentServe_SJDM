import express from 'express';
import { Resend } from 'resend';
import rateLimit from 'express-rate-limit';
import emailTemplates from '../services/emailTemplates.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// rate limiting for email endpoints
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // increased for appointment notifications
  message: {
    success: false,
    error: 'Too many email requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// strict rate limiter for manual reminders
const reminderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    error: 'Too many reminder requests. Please wait before sending more.',
  },
});

// staff invitation email
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

    if (!to_email || !clinic_name || !invitation_id || !invitation_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const invitation_link = `${process.env.FRONTEND_URL}/auth/staff-signup?invitation=${invitation_id}&token=${invitation_token}`;

    const { data, error } = await resend.emails.send({
      from: 'DentServe <noreply@dentserve-sjdm.me>',
      to: [to_email],
      subject: `Invitation to Join ${clinic_name} on DentServe`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#333; max-width: 600px; margin:0 auto; padding:0; border:1px solid #e5e7eb; border-radius:8px; background:#fafafa;">
          <div style="background:#0f172a; padding:20px; border-radius:8px 8px 0 0; text-align:center;">
            <img src="https://dentserve-sjdm.me/assets/web-app-manifest-192x192.png" alt="DentServe Logo" style="max-height:50px; margin-bottom:8px;" />
            <h1 style="color:#fff; margin:0; font-size:20px;">DentServe</h1>
          </div>
          
          <div style="font-family: Arial, sans-serif; color:#333; max-width: 550px; margin:0 auto; padding:24px; border:1px solid #e5e7eb; border-radius:8px; background:#fafafa;">
            <h2 style="color:#0f172a; text-align:center; margin-bottom:20px;">Staff Invitation</h2>
            
            <p>Hello <strong>${first_name} ${last_name}</strong>,</p>
            <p>You have been invited to join <strong>${clinic_name}</strong> as <strong>${position}</strong> on the DentServe platform.</p>

            <p style="text-align:center; margin:32px 0;">
              <a href="${invitation_link}" style="background:#2563eb; color:#fff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                Accept Invitation
              </a>
            </p>

            <p>If the button doesn't work, copy and paste this link: ${invitation_link}</p>
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

// appointment notification emails
router.post('/new-appointment-notification', emailLimiter, async (req, res) => {
  try {
    const { staff_email, patient, appointment, clinic, doctor, services, symptoms } = req.body;

    if (!staff_email || !patient || !appointment || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.newAppointmentRequest({
      patient,
      appointment,
      clinic,
      doctor,
      services: services || [],
      symptoms: symptoms || null
    });

    const result = await sendEmail({
      to: staff_email,
      subject: `🔔 New Appointment Request - ${patient.name}`,
      html,
      replyTo: patient.email
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending new appointment notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification'
    });
  }
});

router.post('/appointment-confirmed', emailLimiter, async (req, res) => {
  try {
    const { patient, appointment, clinic, doctor, services } = req.body;

    if (!patient?.email || !appointment || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.appointmentConfirmed({
      patient,
      appointment,
      clinic,
      doctor,
      services: services || []
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `✅ Appointment Confirmed - ${clinic.name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending confirmation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/appointment-rejected', emailLimiter, async (req, res) => {
  try {
    const { patient, appointment, clinic, doctor, rejection } = req.body;

    if (!patient?.email || !appointment || !clinic || !doctor || !rejection) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.appointmentRejected({
      patient,
      appointment,
      clinic,
      doctor,
      rejection
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `Appointment Request Update - ${clinic.name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending rejection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/appointment-reminder', reminderLimiter, async (req, res) => {
  try {
    const { patient, appointment, clinic, doctor, services } = req.body;

    if (!patient?.email || !appointment || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.appointmentReminder({
      patient,
      appointment,
      clinic,
      doctor,
      services: services || []
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `⏰ Reminder: Appointment Tomorrow at ${appointment.time}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/appointment-cancelled-by-patient', emailLimiter, async (req, res) => {
  try {
    const { staff_email, patient, appointment, clinic, doctor, cancellation } = req.body;

    if (!staff_email || !patient || !appointment || !clinic || !doctor || !cancellation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.appointmentCancelledByPatient({
      patient,
      appointment,
      clinic,
      doctor,
      cancellation
    });

    const result = await sendEmail({
      to: staff_email,
      subject: `🚫 Appointment Cancelled - ${patient.name}`,
      html
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending cancellation notice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/appointment-cancelled-by-staff', emailLimiter, async (req, res) => {
  try {
    const { patient, appointment, clinic, doctor, cancellation } = req.body;

    if (!patient?.email || !appointment || !clinic || !doctor || !cancellation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.appointmentCancelledByStaff({
      patient,
      appointment,
      clinic,
      doctor,
      cancellation
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `Appointment Cancellation - ${clinic.name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending cancellation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/appointment-completed', emailLimiter, async (req, res) => {
  try {
    const { patient, appointment, clinic, doctor, services, feedbackUrl } = req.body;

    if (!patient?.email || !appointment || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.appointmentCompleted({
      patient,
      appointment,
      clinic,
      doctor,
      services: services || [],
      feedbackUrl: feedbackUrl || null
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `Thank You for Your Visit - ${clinic.name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending completion email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/no-show-notice', emailLimiter, async (req, res) => {
  try {
    const { patient, appointment, clinic, doctor } = req.body;

    if (!patient?.email || !appointment || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.noShowNotice({
      patient,
      appointment,
      clinic,
      doctor
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `Missed Appointment Notice - ${clinic.name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending no-show notice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// treatment plan emails
router.post('/treatment-plan-created', emailLimiter, async (req, res) => {
  try {
    const { patient, treatmentPlan, clinic, doctor } = req.body;

    if (!patient?.email || !treatmentPlan || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.treatmentPlanCreated({
      patient,
      treatmentPlan,
      clinic,
      doctor
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `💜 Your Treatment Plan: ${treatmentPlan.treatment_name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending treatment plan email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/treatment-followup-reminder', reminderLimiter, async (req, res) => {
  try {
    const { patient, treatmentPlan, clinic, doctor, recommendedDate } = req.body;

    if (!patient?.email || !treatmentPlan || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.treatmentFollowUpReminder({
      patient,
      treatmentPlan,
      clinic,
      doctor,
      recommendedDate: recommendedDate || null
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `⏰ Follow-up Needed: ${treatmentPlan.treatment_name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending treatment reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/treatment-plan-completed', emailLimiter, async (req, res) => {
  try {
    const { patient, treatmentPlan, clinic, doctor } = req.body;

    if (!patient?.email || !treatmentPlan || !clinic || !doctor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.treatmentPlanCompleted({
      patient,
      treatmentPlan,
      clinic,
      doctor
    });

    const result = await sendEmail({
      to: patient.email,
      subject: `🎉 Treatment Completed: ${treatmentPlan.treatment_name}`,
      html,
      replyTo: clinic.email || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending completion email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// staff digest email
router.post('/daily-staff-digest', reminderLimiter, async (req, res) => {
  try {
    const { staff, clinic, todayAppointments, stats, pendingActions } = req.body;

    if (!staff?.email || !clinic || !stats) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const html = emailTemplates.dailyStaffDigest({
      staff,
      clinic,
      todayAppointments: todayAppointments || [],
      stats,
      pendingActions: pendingActions || []
    });

    const result = await sendEmail({
      to: staff.email,
      subject: `☀️ Daily Schedule - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending staff digest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/new-partnership-request', emailLimiter, async (req, res) => {
  try {
    const { adminEmail, request } = req.body;

    if (!adminEmail || !request) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: adminEmail and request'
      });
    }

    const html = emailTemplates.newPartnershipRequest({ request });

    const result = await sendEmail({
      to: adminEmail,
      subject: `🤝 [NEW PARTNERSHIP] ${request.clinic_name} - Partnership Request`,
      html,
      replyTo: request.email // Allow admin to reply directly
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Partnership notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send partnership notification'
    });
  }
});

// Partnership rejection email
router.post('/partnership-rejected', emailLimiter, async (req, res) => {
  try {
    const { clinic_name, email, staff_name, admin_notes, rejected_at } = req.body;

    if (!email || !clinic_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and clinic_name'
      });
    }

    const html = emailTemplates.partnershipRejected({
      clinic_name,
      staff_name: staff_name || 'Applicant',
      admin_notes: admin_notes || 'After careful review, we are unable to proceed with your application at this time.',
      rejected_at: rejected_at || new Date().toISOString()
    });

    const result = await sendEmail({
      to: email,
      subject: `Partnership Request Update - ${clinic_name}`,
      html
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Partnership rejection email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send partnership rejection email'
    });
  }
});

// Partnership approved email (sent after staff invitation is created)
router.post('/partnership-approved', emailLimiter, async (req, res) => {
  try {
    const { 
      clinic_name, 
      email, 
      staff_name, 
      position,
      invitation_id,
      invitation_token 
    } = req.body;

    if (!email || !clinic_name || !invitation_id || !invitation_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const invitation_link = `${process.env.FRONTEND_URL}/auth/staff-signup?invitation=${invitation_id}&token=${invitation_token}`;

    const html = emailTemplates.partnershipApproved({
      clinic_name,
      staff_name: staff_name || 'there',
      email,
      invitation_link,
      position: position || 'Clinic Manager'
    });

    const result = await sendEmail({
      to: email,
      subject: `🎉 Partnership Approved - Welcome to DentServe!`,
      html
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Partnership approval email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send partnership approval email'
    });
  }
});

// bulk reminder endpoint (for staff to send multiple)
router.post('/bulk-appointment-reminders', reminderLimiter, async (req, res) => {
  try {
    const { appointments } = req.body;

    if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No appointments provided'
      });
    }

    if (appointments.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 reminders per request'
      });
    }

    const results = await Promise.allSettled(
      appointments.map(async (apt) => {
        const html = emailTemplates.appointmentReminder({
          patient: apt.patient,
          appointment: apt.appointment,
          clinic: apt.clinic,
          doctor: apt.doctor,
          services: apt.services || []
        });

        return sendEmail({
          to: apt.patient.email,
          subject: `Reminder: Appointment Tomorrow at ${apt.appointment.time}`,
          html,
          replyTo: apt.clinic.email || null
        });
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      total: appointments.length,
      successful,
      failed,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    });

  } catch (error) {
    console.error('❌ Error sending bulk reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Email Service',
    status: 'OK',
    resend_configured: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString(),
    endpoints: {
      appointment: [
        'new-appointment-notification',
        'appointment-confirmed',
        'appointment-rejected',
        'appointment-reminder',
        'appointment-cancelled-by-patient',
        'appointment-cancelled-by-staff',
        'appointment-completed',
        'no-show-notice'
      ],
      treatment: [
        'treatment-plan-created',
        'treatment-followup-reminder',
        'treatment-plan-completed'
      ],
      staff: [
        'daily-staff-digest',
        'send-staff-invitation'
      ],
      partnership: [
        'new-partnership-request',
        'partnership-approved',
        'partnership-rejected'
      ],
      bulk: [
        'bulk-appointment-reminders'
      ]
    }
  });
});

export default router;