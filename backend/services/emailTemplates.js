const BRAND_COLOR = '#2563eb';
const LOGO_URL = 'https://dentserve-sjdm.me/assets/web-app-manifest-192x192.png';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dentserve-sjdm.vercel.app/';

// base email template wrapper
const baseTemplate = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>DentServe Notification</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .preheader { display: none; max-height: 0; overflow: hidden; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <span class="preheader" style="display: none; max-height: 0; overflow: hidden;">${preheader}</span>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px 40px; text-align: center;">
              <img src="${LOGO_URL}" alt="DentServe" style="max-height: 60px; margin-bottom: 10px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">DentServe</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                This email was sent by <strong>DentServe</strong> - Your Dental Care Partner
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} DentServe. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// button component
const button = (text, url, color = BRAND_COLOR) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="center">
        <a href="${url}" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

// info box component
const infoBox = (items, title = null) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    ${title ? `
    <tr>
      <td style="padding: 16px 20px; background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb;">
        <h3 style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 600;">${title}</h3>
      </td>
    </tr>
    ` : ''}
    <tr>
      <td style="padding: 20px;">
        ${items.map(item => `
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; color: #6b7280; font-size: 13px; min-width: 140px;">${item.label}:</span>
            <strong style="color: #1f2937; font-size: 14px;">${item.value}</strong>
          </div>
        `).join('')}
      </td>
    </tr>
  </table>
`;

// alert box component
const alertBox = (message, type = 'info') => {
  const colors = {
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }
  };
  const color = colors[type] || colors.info;
  
  return `
    <div style="margin: 20px 0; padding: 16px; background-color: ${color.bg}; border-left: 4px solid ${color.border}; border-radius: 6px;">
      <p style="margin: 0; color: ${color.text}; font-size: 14px; line-height: 1.6;">${message}</p>
    </div>
  `;
};

// appointment emails
const newAppointmentRequest = ({ patient, appointment, clinic, doctor, services, symptoms }) => {
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 22px;">[NEW REQUEST] Appointment Request</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      You have a new appointment request from <strong>${patient.name}</strong> that requires your review.
    </p>

    ${infoBox([
      { label: 'Patient Name', value: patient.name },
      { label: 'Email', value: patient.email },
      { label: 'Phone', value: patient.phone || 'Not provided' },
      { label: 'Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Time', value: appointment.time },
      { label: 'Doctor', value: doctor.name },
      { label: 'Booking Type', value: appointment.booking_type.replace(/_/g, ' ').toUpperCase() }
    ], 'Appointment Details')}

    ${services && services.length > 0 ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Requested Services:</h3>
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        ${services.map(s => `<li>${s.name}${s.requires_multiple_visits ? ' <span style="color: #7c3aed;">(Multi-visit)</span>' : ''}</li>`).join('')}
      </ul>
    ` : ''}

    ${symptoms ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Patient Symptoms/Concerns:</h3>
      <div style="background-color: #f9fafb; padding: 16px; border-left: 3px solid ${BRAND_COLOR}; border-radius: 4px;">
        <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">${symptoms}</p>
      </div>
    ` : ''}

    ${appointment.treatment_plan ? alertBox(
      `This is a follow-up appointment for treatment: <strong>${appointment.treatment_plan.treatment_name}</strong>`,
      'info'
    ) : ''}

    ${patient.reliability && patient.reliability.risk_level && patient.reliability.risk_level !== 'reliable' && patient.reliability.statistics ? alertBox(
      `NOTICE: Patient has ${patient.reliability.statistics.no_show_count || 0} no-shows and ${patient.reliability.statistics.completion_rate || 0}% completion rate.`,
      'warning'
    ) : ''}

    ${button('Review Appointment', `${FRONTEND_URL}/staff/appointments`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Please review and approve/reject this appointment as soon as possible.
    </p>
  `;

  return baseTemplate(content, `New appointment request from ${patient.name}`);
};

const appointmentConfirmed = ({ patient, appointment, clinic, doctor, services }) => {
  const content = `
    <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 22px;">[CONFIRMED] Appointment Confirmed</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Great news, <strong>${patient.first_name}</strong>! Your appointment has been confirmed.
    </p>

    ${infoBox([
      { label: 'Clinic', value: clinic.name },
      { label: 'Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Time', value: appointment.time },
      { label: 'Doctor', value: doctor.name },
      { label: 'Duration', value: `${appointment.duration_minutes || 30} minutes` }
    ], 'Appointment Details')}

    ${services && services.length > 0 ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Scheduled Services:</h3>
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        ${services.map(s => `<li>${s.name} (${s.duration_minutes} min)</li>`).join('')}
      </ul>
    ` : ''}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">CLINIC LOCATION:</h3>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
      ${clinic.address || 'Contact clinic for address'}<br>
      ${clinic.phone ? `Phone: ${clinic.phone}` : ''}
    </p>

    ${appointment.notes ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">SPECIAL INSTRUCTIONS:</h3>
      <div style="background-color: #fef3c7; padding: 16px; border-left: 3px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${appointment.notes}</p>
      </div>
    ` : ''}

    ${alertBox(
      `<strong>Cancellation Policy:</strong> Appointments must be cancelled at least ${clinic.cancellation_policy_hours || 24} hours in advance to avoid fees.`,
      'warning'
    )}

    ${button('View Appointment Details', `${FRONTEND_URL}/patient/appointments/upcoming`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      We look forward to seeing you! Please arrive 10 minutes early.
    </p>
  `;

  return baseTemplate(content, `Your appointment is confirmed for ${new Date(appointment.date).toLocaleDateString()}`);
};

const appointmentRejected = ({ patient, appointment, clinic, doctor, rejection }) => {
  const content = `
    <h2 style="color: #ef4444; margin: 0 0 10px 0; font-size: 22px;">[DECLINED] Appointment Request Declined</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, unfortunately your appointment request could not be approved at this time.
    </p>

    ${infoBox([
      { label: 'Requested Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Requested Time', value: appointment.time },
      { label: 'Clinic', value: clinic.name },
      { label: 'Doctor', value: doctor.name },
      { label: 'Reason', value: rejection.category.replace(/_/g, ' ').toUpperCase() }
    ], 'Original Request')}

    <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Reason for Decline:</h3>
    <div style="background-color: #fee2e2; padding: 16px; border-left: 3px solid #ef4444; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">${rejection.reason}</p>
    </div>

    ${alertBox(
      'We apologize for the inconvenience. Please try booking another time slot that better fits your schedule.',
      'info'
    )}

    ${button('Book Another Appointment', `${FRONTEND_URL}/patient/appointments/book`, '#10b981')}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      If you have questions, please contact the clinic directly at ${clinic.phone || clinic.email}.
    </p>
  `;

  return baseTemplate(content, `Appointment request declined - ${clinic.name}`);
};

const appointmentReminder = ({ patient, appointment, clinic, doctor, services }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[REMINDER] Appointment Reminder</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${patient.first_name}</strong>, this is a friendly reminder about your upcoming appointment <strong>tomorrow</strong>.
    </p>

    ${infoBox([
      { label: 'Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Time', value: appointment.time },
      { label: 'Clinic', value: clinic.name },
      { label: 'Doctor', value: doctor.name },
      { label: 'Address', value: clinic.address || 'Contact clinic for address' }
    ], 'Tomorrow\'s Appointment')}

    ${services && services.length > 0 ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Scheduled Services:</h3>
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        ${services.map(s => `<li>${s.name}</li>`).join('')}
      </ul>
    ` : ''}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">WHAT TO BRING:</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>Valid ID or insurance card</li>
      <li>Previous dental records (if first visit)</li>
      <li>List of current medications</li>
    </ul>

    ${alertBox(
      `<strong>Please arrive 10 minutes early</strong> to complete any necessary paperwork.`,
      'info'
    )}

    ${alertBox(
      `If you need to cancel or reschedule, please do so at least ${clinic.cancellation_policy_hours || 24} hours in advance.`,
      'warning'
    )}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${FRONTEND_URL}/patient/appointments/upcoming" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
            View Details
          </a>
          <a href="${FRONTEND_URL}/patient/appointments/upcoming" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Cancel Appointment
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      See you tomorrow! ${clinic.phone ? `Call us at ${clinic.phone} if you have any questions.` : ''}
    </p>
  `;

  return baseTemplate(content, `Reminder: Your appointment is tomorrow at ${appointment.time}`);
};

const appointmentCancelledByPatient = ({ patient, appointment, clinic, doctor, cancellation }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[CANCELLED] Appointment Cancelled by Patient</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>${patient.name}</strong> has cancelled their upcoming appointment.
    </p>

    ${infoBox([
      { label: 'Patient', value: patient.name },
      { label: 'Email', value: patient.email },
      { label: 'Phone', value: patient.phone || 'Not provided' },
      { label: 'Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Time', value: appointment.time },
      { label: 'Doctor', value: doctor.name },
      { label: 'Cancelled At', value: new Date(cancellation.cancelled_at).toLocaleString() }
    ], 'Cancelled Appointment')}

    <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Cancellation Reason:</h3>
    <div style="background-color: #fef3c7; padding: 16px; border-left: 3px solid #f59e0b; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${cancellation.reason}</p>
    </div>

    ${alertBox(
      `The time slot <strong>${appointment.time}</strong> on ${new Date(appointment.date).toLocaleDateString()} is now available for other patients.`,
      'info'
    )}

    ${button('View Schedule', `${FRONTEND_URL}/staff/appointments`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      You can now schedule another patient in this time slot.
    </p>
  `;

  return baseTemplate(content, `Cancellation: ${patient.name} - ${new Date(appointment.date).toLocaleDateString()}`);
};

const appointmentCancelledByStaff = ({ patient, appointment, clinic, doctor, cancellation }) => {
  const content = `
    <h2 style="color: #ef4444; margin: 0 0 10px 0; font-size: 22px;">[CANCELLED] Appointment Cancelled</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, we regret to inform you that your appointment has been cancelled by the clinic.
    </p>

    ${infoBox([
      { label: 'Original Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Original Time', value: appointment.time },
      { label: 'Clinic', value: clinic.name },
      { label: 'Doctor', value: doctor.name }
    ], 'Cancelled Appointment')}

    <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Reason for Cancellation:</h3>
    <div style="background-color: #fee2e2; padding: 16px; border-left: 3px solid #ef4444; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">${cancellation.reason}</p>
    </div>

    ${alertBox(
      'We sincerely apologize for any inconvenience. We value your time and would like to help you reschedule.',
      'info'
    )}

    ${button('Book New Appointment', `${FRONTEND_URL}/patient/appointments/book`, '#10b981')}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Please contact us at ${clinic.phone || clinic.email} if you have any questions.
    </p>
  `;

  return baseTemplate(content, `Appointment cancelled - ${clinic.name}`);
};

const appointmentCompleted = ({ patient, appointment, clinic, doctor, services, feedbackUrl }) => {
  const content = `
    <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 22px;">[COMPLETED] Thank You for Your Visit!</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, thank you for visiting <strong>${clinic.name}</strong>. We hope you had a great experience!
    </p>

    ${infoBox([
      { label: 'Visit Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Doctor', value: doctor.name },
      { label: 'Clinic', value: clinic.name }
    ], 'Visit Summary')}

    ${services && services.length > 0 ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Services Provided:</h3>
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        ${services.map(s => `<li>${s.name}</li>`).join('')}
      </ul>
    ` : ''}

    ${appointment.notes ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Post-Visit Notes:</h3>
      <div style="background-color: #dbeafe; padding: 16px; border-left: 3px solid ${BRAND_COLOR}; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">${appointment.notes}</p>
      </div>
    ` : ''}

    ${appointment.follow_up_required ? alertBox(
      '<strong>Follow-up Required:</strong> Please schedule a follow-up appointment as recommended by your doctor.',
      'warning'
    ) : ''}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0; text-align: center;">SHARE YOUR EXPERIENCE</h3>
    <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 10px 0 20px 0;">
      Your feedback helps us improve our service and helps other patients make informed decisions.
    </p>

    ${button('Leave Feedback', feedbackUrl || `${FRONTEND_URL}/patient/feedback`, '#10b981')}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      We appreciate your trust in our dental care services!
    </p>
  `;

  return baseTemplate(content, `Thank you for your visit to ${clinic.name}`);
};

const noShowNotice = ({ patient, appointment, clinic, doctor }) => {
  const content = `
    <h2 style="color: #ef4444; margin: 0 0 10px 0; font-size: 22px;">[NO SHOW] Missed Appointment Notice</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, we noticed that you missed your scheduled appointment.
    </p>

    ${infoBox([
      { label: 'Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Time', value: appointment.time },
      { label: 'Clinic', value: clinic.name },
      { label: 'Doctor', value: doctor.name }
    ], 'Missed Appointment')}

    ${alertBox(
      '<strong>Impact on Your Account:</strong> Missed appointments affect your booking privileges. Repeated no-shows may result in booking restrictions.',
      'warning'
    )}

    <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">What Happens Next?</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>Your reliability score has been updated</li>
      <li>This may affect future booking approvals</li>
      <li>We encourage you to reschedule if you still need care</li>
    </ul>

    ${alertBox(
      'Life happens - we understand! Please consider setting reminders or cancelling in advance if you can\'t make it.',
      'info'
    )}

    ${button('Book New Appointment', `${FRONTEND_URL}/patient/appointments/book`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      If this was an error, please contact ${clinic.name} at ${clinic.phone || clinic.email}.
    </p>
  `;

  return baseTemplate(content, `Missed appointment - ${clinic.name}`);
};

// treatment plan emails
const treatmentPlanCreated = ({ patient, treatmentPlan, clinic, doctor }) => {
  const content = `
    <h2 style="color: #7c3aed; margin: 0 0 10px 0; font-size: 22px;">[TREATMENT PLAN] Your Treatment Plan is Ready</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, your dentist has created a personalized treatment plan for you.
    </p>

    ${infoBox([
      { label: 'Treatment', value: treatmentPlan.treatment_name },
      { label: 'Category', value: treatmentPlan.treatment_category || 'General' },
      { label: 'Assigned Doctor', value: doctor.name },
      { label: 'Clinic', value: clinic.name },
      { label: 'Total Visits', value: treatmentPlan.total_visits_planned || 'To be determined' },
      { label: 'Duration', value: treatmentPlan.expected_end_date ? `Until ${new Date(treatmentPlan.expected_end_date).toLocaleDateString()}` : 'To be determined' }
    ], 'Treatment Plan Details')}

    ${treatmentPlan.description ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Treatment Description:</h3>
      <div style="background-color: #faf5ff; padding: 16px; border-left: 3px solid #7c3aed; border-radius: 4px;">
        <p style="margin: 0; color: #5b21b6; font-size: 14px; line-height: 1.6;">${treatmentPlan.description}</p>
      </div>
    ` : ''}

    ${treatmentPlan.diagnosis ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Diagnosis:</h3>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">${treatmentPlan.diagnosis}</p>
    ` : ''}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">NEXT STEPS:</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>Review your treatment plan details</li>
      <li>Schedule your follow-up appointments</li>
      <li>Follow any pre-treatment instructions</li>
      <li>Contact us if you have questions</li>
    </ul>

    ${alertBox(
      `<strong>Important:</strong> Regular attendance is crucial for treatment success. Please complete all scheduled visits.`,
      'warning'
    )}

    ${button('View Treatment Plan', `${FRONTEND_URL}/patient/appointments/upcoming`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Questions? Contact ${clinic.name} at ${clinic.phone || clinic.email}
    </p>
  `;

  return baseTemplate(content, `New treatment plan: ${treatmentPlan.treatment_name}`);
};

const treatmentFollowUpReminder = ({ patient, treatmentPlan, clinic, doctor, recommendedDate }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[FOLLOW-UP] Treatment Follow-up Reminder</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hi <strong>${patient.first_name}</strong>, it's time to schedule your next treatment visit.
    </p>

    ${infoBox([
      { label: 'Treatment', value: treatmentPlan.treatment_name },
      { label: 'Progress', value: `${treatmentPlan.progress_percentage || 0}% Complete` },
      { label: 'Visits Completed', value: `${treatmentPlan.visits_completed || 0} of ${treatmentPlan.total_visits_planned || '∞'}` },
      { label: 'Doctor', value: doctor.name },
      { label: 'Recommended Date', value: recommendedDate ? new Date(recommendedDate).toLocaleDateString() : 'As soon as possible' }
    ], 'Treatment Progress')}

    ${alertBox(
      `<strong>Next Visit Due:</strong> To stay on track with your treatment, please schedule your next appointment ${recommendedDate ? `around ${new Date(recommendedDate).toLocaleDateString()}` : 'soon'}.`,
      'warning'
    )}

    <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Why This Visit Matters:</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>Maintains treatment progress and effectiveness</li>
      <li>Prevents complications or setbacks</li>
      <li>Ensures optimal treatment outcomes</li>
      <li>Keeps you on schedule for completion</li>
    </ul>

    ${button('Schedule Follow-up', `${FRONTEND_URL}/patient/appointments/book`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Your health is our priority. Don't delay your treatment progress!
    </p>
  `;

  return baseTemplate(content, `Follow-up needed: ${treatmentPlan.treatment_name}`);
};

const treatmentPlanCompleted = ({ patient, treatmentPlan, clinic, doctor }) => {
  const content = `
    <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 22px;">[SUCCESS] Treatment Plan Completed!</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Congratulations, <strong>${patient.first_name}</strong>! You've successfully completed your treatment plan.
    </p>

    ${infoBox([
      { label: 'Treatment', value: treatmentPlan.treatment_name },
      { label: 'Started', value: new Date(treatmentPlan.start_date).toLocaleDateString() },
      { label: 'Completed', value: new Date(treatmentPlan.completed_at).toLocaleDateString() },
      { label: 'Total Visits', value: treatmentPlan.visits_completed },
      { label: 'Doctor', value: doctor.name },
      { label: 'Clinic', value: clinic.name }
    ], 'Treatment Summary')}

    ${alertBox(
      'EXCELLENT WORK! Your commitment to completing this treatment shows great dedication to your dental health.',
      'success'
    )}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">Post-Treatment Care:</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>Maintain regular dental checkups (every 6 months)</li>
      <li>Follow your dentist's oral hygiene recommendations</li>
      <li>Watch for any unusual symptoms</li>
      <li>Contact us if you have concerns</li>
    </ul>

    ${treatmentPlan.treatment_notes ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Final Notes:</h3>
      <div style="background-color: #d1fae5; padding: 16px; border-left: 3px solid #10b981; border-radius: 4px;">
        <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">${treatmentPlan.treatment_notes}</p>
      </div>
    ` : ''}

    ${button('View Treatment History', `${FRONTEND_URL}/patient/appointments/upcoming`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Thank you for trusting ${clinic.name} with your dental care!
    </p>
  `;

  return baseTemplate(content, `Congratulations! Treatment completed: ${treatmentPlan.treatment_name}`);
};

const newPartnershipRequest = ({ request }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[NEW PARTNERSHIP] New Clinic Partnership Request</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      A new clinic has applied to partner with DentServe and requires your review.
    </p>

    ${infoBox([
      { label: 'Clinic Name', value: request.clinic_name },
      { label: 'Contact Person', value: request.staff_name || 'Not provided' },
      { label: 'Email', value: request.email },
      { label: 'Phone', value: request.contact_number || 'Not provided' },
      { label: 'Submitted', value: new Date(request.created_at).toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) },
      { label: 'Security Score', value: request.recaptcha_score ? `${(request.recaptcha_score * 100).toFixed(0)}% ${request.recaptcha_score >= 0.7 ? '(High Trust ✅)' : request.recaptcha_score >= 0.5 ? '(Medium Trust ⚠️)' : '(Low Trust ❌)'}` : 'N/A' }
    ], 'Application Details')}

    <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Reason for Partnership:</h3>
    <div style="background-color: #fef3c7; padding: 16px; border-left: 3px solid #f59e0b; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${request.reason}</p>
    </div>

    ${request.address ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Address:</h3>
      <p style="color: #4b5563; font-size: 14px; margin: 0;">${request.address}</p>
    ` : ''}

    ${request.recaptcha_score && request.recaptcha_score < 0.5 ? alertBox(
      `<strong>⚠️ Security Notice:</strong> This application has a low trust score (${(request.recaptcha_score * 100).toFixed(0)}%). Please review carefully for potential spam.`,
      'warning'
    ) : ''}

    ${alertBox(
      'Please review this application in the admin dashboard and approve or reject it within 48 hours.',
      'info'
    )}

    ${button('Review in Admin Dashboard', `${FRONTEND_URL}/admin/partnerships`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Partnership requests are automatically reviewed and managed in your admin panel.
    </p>
  `;

  return baseTemplate(content, `New partnership request from ${request.clinic_name}`);
};

// Partnership rejection email
const partnershipRejected = ({ clinic_name, staff_name, admin_notes, rejected_at }) => {
  const content = `
    <h2 style="color: #ef4444; margin: 0 0 10px 0; font-size: 22px;">[DECLINED] Partnership Request Update</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello ${staff_name ? `<strong>${staff_name}</strong>` : 'there'},
    </p>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Thank you for your interest in partnering with <strong>DentServe</strong>. After careful review, we regret to inform you that we are unable to approve the partnership request for <strong>${clinic_name}</strong> at this time.
    </p>

    ${infoBox([
      { label: 'Clinic Name', value: clinic_name },
      { label: 'Reviewed Date', value: new Date(rejected_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }
    ], 'Application Details')}

    ${admin_notes ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Reason for Decline:</h3>
      <div style="background-color: #fee2e2; padding: 16px; border-left: 3px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">${admin_notes}</p>
      </div>
    ` : ''}

    ${alertBox(
      'If you believe this was an error or would like to discuss your application further, please feel free to contact us.',
      'info'
    )}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">Next Steps:</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>You may reapply after addressing the concerns mentioned above</li>
      <li>Contact our support team for more information</li>
      <li>Visit our website to learn more about partnership requirements</li>
    </ul>

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      We appreciate your interest in DentServe and wish you the best.
    </p>
  `;

  return baseTemplate(content, `Partnership request update for ${clinic_name}`);
};

// Partnership approved email (with invitation)
const partnershipApproved = ({ clinic_name, staff_name, email, invitation_link, position }) => {
  const content = `
    <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 22px;">[APPROVED] Welcome to DentServe!</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Congratulations ${staff_name ? `<strong>${staff_name}</strong>` : ''}! Your partnership request for <strong>${clinic_name}</strong> has been approved.
    </p>

    ${alertBox(
      '<strong>Next Step:</strong> Complete your registration to activate your clinic on DentServe.',
      'success'
    )}

    ${infoBox([
      { label: 'Clinic Name', value: clinic_name },
      { label: 'Your Role', value: position || 'Clinic Manager' },
      { label: 'Email', value: email }
    ], 'Partnership Details')}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">What's Next?</h3>
    <ol style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>Click the button below to complete your registration</li>
      <li>Create your clinic profile and add services</li>
      <li>Add your dentists and staff members</li>
      <li>Start accepting patient appointments</li>
    </ol>

    ${button('Complete Registration', invitation_link)}

    <p style="color: #6b7280; font-size: 13px; margin: 20px 0; text-align: center;">
      If the button doesn't work, copy and paste this link:<br>
      <span style="color: #3b82f6; word-break: break-all;">${invitation_link}</span>
    </p>

    ${alertBox(
      '<strong>Important:</strong> This invitation link will expire in 7 days. Please complete your registration soon.',
      'warning'
    )}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Welcome to the DentServe family! We're excited to have you on board.
    </p>
  `;

  return baseTemplate(content, `Welcome to DentServe - ${clinic_name}`);
};

// Appointment rescheduled by staff
const appointmentRescheduledByStaff = ({ patient, appointment, clinic, doctor, oldDate, oldTime, newDate, newTime, reason }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[RESCHEDULED] Appointment Time Changed</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, your appointment has been rescheduled by <strong>${clinic.name}</strong>.
    </p>

    ${infoBox([
      { label: 'Previous Date', value: `${new Date(oldDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${oldTime}` },
      { label: 'New Date', value: `${new Date(newDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${newTime}` },
      { label: 'Clinic', value: clinic.name },
      { label: 'Doctor', value: doctor.name }
    ], 'Schedule Change')}

    ${reason ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Reason for Reschedule:</h3>
      <div style="background-color: #fef3c7; padding: 16px; border-left: 3px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${reason}</p>
      </div>
    ` : ''}

    ${alertBox(
      'Please confirm your availability for the new time. If you cannot attend, please contact us immediately.',
      'warning'
    )}

    ${button('View Updated Appointment', `${FRONTEND_URL}/patient/appointments/upcoming`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Contact us at ${clinic.phone || clinic.email} if you have questions.
    </p>
  `;

  return baseTemplate(content, `Your appointment has been rescheduled to ${new Date(newDate).toLocaleDateString()}`);
};

// Appointment rescheduled by patient - notify staff
const appointmentRescheduledByPatient = ({ staff_email, patient, appointment, clinic, doctor, oldDate, oldTime, newDate, newTime, reason }) => {
  const content = `
    <h2 style="color: #2563eb; margin: 0 0 10px 0; font-size: 22px;">[PATIENT RESCHEDULED] Appointment Time Changed</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>${patient.name}</strong> has rescheduled their appointment.
    </p>

    ${infoBox([
      { label: 'Patient', value: patient.name },
      { label: 'Previous', value: `${new Date(oldDate).toLocaleDateString()} at ${oldTime}` },
      { label: 'New Schedule', value: `${new Date(newDate).toLocaleDateString()} at ${newTime}` },
      { label: 'Doctor', value: doctor.name }
    ], 'Reschedule Details')}

    ${reason ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Patient's Reason:</h3>
      <p style="color: #4b5563; font-size: 14px;">${reason}</p>
    ` : ''}

    ${button('View Schedule', `${FRONTEND_URL}/staff/appointments`)}
  `;

  return baseTemplate(content, `${patient.name} rescheduled appointment`);
};

// Reschedule reminder for cancelled appointment
const rescheduleReminder = ({ patient, appointment, clinic, doctor, cancellation, suggestedDates = [] }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[REMINDER] Please Reschedule Your Appointment</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, this is a friendly reminder to reschedule your cancelled appointment.
    </p>

    ${infoBox([
      { label: 'Cancelled Date', value: new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'Cancelled Time', value: appointment.time },
      { label: 'Clinic', value: clinic.name },
      { label: 'Doctor', value: doctor.name }
    ], 'Cancelled Appointment')}

    ${cancellation.reason ? `
      <p style="color: #6b7280; font-size: 14px; margin: 10px 0;"><strong>Cancellation Reason:</strong> ${cancellation.reason}</p>
    ` : ''}

    ${suggestedDates.length > 0 ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Suggested Available Dates:</h3>
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
        ${suggestedDates.map(date => `<li>${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</li>`).join('')}
      </ul>
    ` : ''}

    ${alertBox(
      'Please book a new appointment at your earliest convenience to maintain continuity of care.',
      'info'
    )}

    ${button('Book New Appointment', `${FRONTEND_URL}/patient/appointments/book`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Call us at ${clinic.phone || 'the clinic'} if you need assistance with booking.
    </p>
  `;

  return baseTemplate(content, `Reminder: Please reschedule your appointment`);
};

// Treatment plan paused
const treatmentPlanPaused = ({ patient, treatmentPlan, clinic, doctor, reason, expectedResumeDate }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[PAUSED] Treatment Plan Temporarily Paused</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, your treatment plan has been temporarily paused.
    </p>

    ${infoBox([
      { label: 'Treatment', value: treatmentPlan.treatment_name },
      { label: 'Progress', value: `${treatmentPlan.progress_percentage}% Complete` },
      { label: 'Visits Completed', value: `${treatmentPlan.visits_completed} of ${treatmentPlan.total_visits_planned || '∞'}` },
      { label: 'Paused Date', value: new Date().toLocaleDateString() },
      { label: 'Expected Resume', value: expectedResumeDate ? new Date(expectedResumeDate).toLocaleDateString() : 'To be determined' }
    ], 'Treatment Status')}

    ${reason ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Reason for Pause:</h3>
      <div style="background-color: #fef3c7; padding: 16px; border-left: 3px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${reason}</p>
      </div>
    ` : ''}

    ${alertBox(
      'Your treatment progress has been saved. You can resume when ready. No further appointments will be scheduled until treatment is resumed.',
      'info'
    )}

    ${button('View Treatment Details', `${FRONTEND_URL}/patient/appointments/upcoming`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Contact ${clinic.name} at ${clinic.phone || clinic.email} when you're ready to resume.
    </p>
  `;

  return baseTemplate(content, `Treatment plan paused: ${treatmentPlan.treatment_name}`);
};

// Treatment plan resumed
const treatmentPlanResumed = ({ patient, treatmentPlan, clinic, doctor, nextSteps }) => {
  const content = `
    <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 22px;">[RESUMED] Treatment Plan Resumed</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Great news, <strong>${patient.first_name}</strong>! Your treatment plan has been resumed.
    </p>

    ${infoBox([
      { label: 'Treatment', value: treatmentPlan.treatment_name },
      { label: 'Current Progress', value: `${treatmentPlan.progress_percentage}% Complete` },
      { label: 'Visits Completed', value: `${treatmentPlan.visits_completed} of ${treatmentPlan.total_visits_planned || '∞'}` },
      { label: 'Remaining Visits', value: treatmentPlan.total_visits_planned ? `${treatmentPlan.total_visits_planned - treatmentPlan.visits_completed}` : 'Ongoing' },
      { label: 'Doctor', value: doctor.name }
    ], 'Treatment Status')}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">Next Steps:</h3>
    ${nextSteps ? `
      <div style="background-color: #d1fae5; padding: 16px; border-left: 3px solid #10b981; border-radius: 4px;">
        <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">${nextSteps}</p>
      </div>
    ` : `
      <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Schedule your next appointment as soon as possible</li>
        <li>Continue with the treatment plan as originally outlined</li>
        <li>Maintain regular attendance for best results</li>
      </ul>
    `}

    ${alertBox(
      'IMPORTANT: Please schedule your next visit within the next 7 days to stay on track with your treatment.',
      'warning'
    )}

    ${button('Schedule Next Visit', `${FRONTEND_URL}/patient/appointments/book`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      We're glad to continue your care journey!
    </p>
  `;

  return baseTemplate(content, `Treatment resumed: ${treatmentPlan.treatment_name}`);
};

// Treatment plan cancelled
const treatmentPlanCancelled = ({ patient, treatmentPlan, clinic, doctor, cancellation }) => {
  const content = `
    <h2 style="color: #ef4444; margin: 0 0 10px 0; font-size: 22px;">[CANCELLED] Treatment Plan Cancelled</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, we're writing to inform you that your treatment plan has been cancelled.
    </p>

    ${infoBox([
      { label: 'Treatment', value: treatmentPlan.treatment_name },
      { label: 'Started', value: new Date(treatmentPlan.start_date).toLocaleDateString() },
      { label: 'Progress', value: `${treatmentPlan.progress_percentage}% (${treatmentPlan.visits_completed} visits completed)` },
      { label: 'Cancelled Date', value: new Date().toLocaleDateString() },
      { label: 'Clinic', value: clinic.name }
    ], 'Cancelled Treatment')}

    <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Reason for Cancellation:</h3>
    <div style="background-color: #fee2e2; padding: 16px; border-left: 3px solid #ef4444; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">${cancellation.reason}</p>
    </div>

    ${alertBox(
      'All scheduled appointments for this treatment plan have been cancelled. Your treatment history has been saved.',
      'info'
    )}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">What This Means:</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li>No further treatment appointments will be scheduled</li>
      <li>Your treatment progress records are preserved</li>
      <li>You can discuss alternative treatment options with your dentist</li>
      <li>A new treatment plan can be created if needed</li>
    </ul>

    ${button('View Treatment History', `${FRONTEND_URL}/patient/appointments/upcoming`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Please contact ${clinic.name} at ${clinic.phone || clinic.email} if you have questions.
    </p>
  `;

  return baseTemplate(content, `Treatment plan cancelled: ${treatmentPlan.treatment_name}`);
};

// Treatment plan visit cancelled (impacts treatment progress)
const treatmentVisitCancelled = ({ patient, treatmentPlan, appointment, clinic, doctor, cancellation, impactNotes }) => {
  const content = `
    <h2 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 22px;">[TREATMENT UPDATE] Treatment Visit Cancelled</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello <strong>${patient.first_name}</strong>, your treatment plan visit has been cancelled.
    </p>

    ${infoBox([
      { label: 'Treatment', value: treatmentPlan.treatment_name },
      { label: 'Visit Number', value: cancellation.visit_number ? `Visit ${cancellation.visit_number} of ${treatmentPlan.total_visits_planned || '∞'}` : 'Scheduled visit' },
      { label: 'Cancelled Date', value: new Date(appointment.date).toLocaleDateString() },
      { label: 'Cancelled Time', value: appointment.time },
      { label: 'Current Progress', value: `${treatmentPlan.progress_percentage}% (${treatmentPlan.visits_completed} visits completed)` }
    ], 'Cancelled Visit Details')}

    ${cancellation.reason ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Cancellation Reason:</h3>
      <div style="background-color: #fef3c7; padding: 16px; border-left: 3px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${cancellation.reason}</p>
      </div>
    ` : ''}

    ${alertBox(
      `<strong>Treatment Impact:</strong> ${impactNotes || 'This cancellation may delay your treatment completion. Please reschedule as soon as possible to stay on track.'}`,
      'warning'
    )}

    <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 10px 0;">IMPORTANT - Action Required:</h3>
    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li><strong>Reschedule immediately</strong> to avoid treatment delays</li>
      <li>Treatment effectiveness depends on regular visits</li>
      <li>Gaps in treatment may require restarting some procedures</li>
      <li>Contact your dentist if you need to adjust your treatment plan</li>
    </ul>

    ${button('Reschedule Treatment Visit', `${FRONTEND_URL}/patient/appointments/book`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Questions? Call ${clinic.phone || clinic.email} - we're here to help!
    </p>
  `;

  return baseTemplate(content, `Treatment visit cancelled - action needed`);
};

// staff emails
const dailyStaffDigest = ({ staff, clinic, todayAppointments, stats, pendingActions }) => {
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 22px;">[DAILY DIGEST] Good Morning, ${staff.first_name}!</h2>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      Here's your daily schedule and pending tasks for <strong>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>
    </p>

    <!-- Stats Cards -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
      <tr>
        <td width="48%" style="background-color: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #1e40af; margin-bottom: 5px;">${stats.total_today}</div>
          <div style="font-size: 13px; color: #3b82f6; font-weight: 600;">Total Appointments</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background-color: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #92400e; margin-bottom: 5px;">${stats.pending_review}</div>
          <div style="font-size: 13px; color: #f59e0b; font-weight: 600;">Pending Review</div>
        </td>
      </tr>
    </table>

    ${pendingActions && pendingActions.length > 0 ? alertBox(
      `ACTION REQUIRED: You have ${pendingActions.length} pending appointment${pendingActions.length > 1 ? 's' : ''} waiting for approval.`,
      'warning'
    ) : ''}

    ${todayAppointments && todayAppointments.length > 0 ? `
      <h3 style="color: #1f2937; font-size: 16px; margin: 30px 0 15px 0;">TODAY'S SCHEDULE:</h3>
      ${todayAppointments.map((apt, index) => `
        <div style="margin-bottom: 12px; padding: 16px; background-color: ${apt.status === 'confirmed' ? '#dbeafe' : '#fef3c7'}; border-left: 4px solid ${apt.status === 'confirmed' ? '#3b82f6' : '#f59e0b'}; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <strong style="font-size: 15px; color: #1f2937;">${formatTime(apt.appointment_time)}</strong>
              <span style="margin-left: 10px; font-size: 12px; padding: 3px 8px; background-color: ${apt.status === 'confirmed' ? '#3b82f6' : '#f59e0b'}; color: white; border-radius: 3px; text-transform: uppercase;">${apt.status}</span>
            </div>
          </div>
          <div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">
            <strong>Patient:</strong> ${apt.patient_name}
          </div>
          <div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">
            <strong>Doctor:</strong> ${apt.doctor_name}
          </div>
          ${apt.services && apt.services.length > 0 ? `
            <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">
              <strong>Services:</strong> ${apt.services.map(s => s.name).join(', ')}
            </div>
          ` : ''}
          ${apt.patient_reliability?.risk_level !== 'reliable' ? `
            <div style="margin-top: 8px; padding: 8px; background-color: #fee2e2; border-radius: 3px;">
              <span style="font-size: 12px; color: #991b1b;">NOTICE: High-risk patient: ${apt.patient_reliability.no_show_count || 0} no-shows</span>
            </div>
          ` : ''}
        </div>
      `).join('')}
    ` : `
      <div style="text-align: center; padding: 40px 20px; background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #9ca3af; font-size: 15px;">No appointments scheduled for today</p>
      </div>
    `}

    ${button('View Full Schedule', `${FRONTEND_URL}/staff/appointments`)}

    <p style="color: #9ca3af; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
      Have a productive day!
    </p>
  `;

  return baseTemplate(content, `Daily schedule for ${new Date().toLocaleDateString()}`);
};

export default {
  // Appointment emails
  newAppointmentRequest,
  appointmentConfirmed,
  appointmentRejected,
  appointmentReminder,
  appointmentCancelledByPatient,
  appointmentCancelledByStaff,
  appointmentCompleted,
  noShowNotice,
  
  // 🆕 NEW: Appointment rescheduling
  appointmentRescheduledByStaff,
  appointmentRescheduledByPatient,
  rescheduleReminder,
  
  // Treatment plan emails
  treatmentPlanCreated,
  treatmentFollowUpReminder,
  treatmentPlanCompleted,
  
  // 🆕 NEW: Treatment plan status changes
  treatmentPlanPaused,
  treatmentPlanResumed,
  treatmentPlanCancelled,
  treatmentVisitCancelled,
  
  // Staff emails
  dailyStaffDigest,

  // Partnership emails
  newPartnershipRequest,
  partnershipApproved,
  partnershipRejected,
};