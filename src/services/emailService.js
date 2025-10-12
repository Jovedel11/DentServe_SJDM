const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const sendEmail = async (endpoint, payload) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Email API error [${endpoint}]:`, data);
      return {
        success: false,
        error: data.error || 'Failed to send email',
      };
    }

    console.log(`Email sent [${endpoint}]:`, data);
    return { success: true, data };
  } catch (error) {
    console.error(`Email service error [${endpoint}]:`, error);
    return {
      success: false,
      error: error.message || 'Network error sending email',
    };
  }
};

 // notification to staff when patient books appointment
export const notifyStaffNewAppointment = async ({
  staff_email,
  patient,
  appointment,
  clinic,
  doctor,
  services = [],
  symptoms = null,
}) => {
  return sendEmail('new-appointment-notification', {
    staff_email,
    patient,
    appointment,
    clinic,
    doctor,
    services,
    symptoms,
  });
};

 // notify patient when appointment is confirmed
export const notifyPatientAppointmentConfirmed = async ({
  patient,
  appointment,
  clinic,
  doctor,
  services = [],
}) => {
  return sendEmail('appointment-confirmed', {
    patient,
    appointment,
    clinic,
    doctor,
    services,
  });
};

 // notify patient when appointment is rejected
export const notifyPatientAppointmentRejected = async ({
  patient,
  appointment,
  clinic,
  doctor,
  rejection,
}) => {
  return sendEmail('appointment-rejected', {
    patient,
    appointment,
    clinic,
    doctor,
    rejection,
  });
};

 // send appointment reminder to patient (manual trigger)
export const sendAppointmentReminder = async ({
  patient,
  appointment,
  clinic,
  doctor,
  services = [],
}) => {
  return sendEmail('appointment-reminder', {
    patient,
    appointment,
    clinic,
    doctor,
    services,
  });
};

 // notify staff when patient cancels
export const notifyStaffAppointmentCancelled = async ({
  staff_email,
  patient,
  appointment,
  clinic,
  doctor,
  cancellation,
}) => {
  return sendEmail('appointment-cancelled-by-patient', {
    staff_email,
    patient,
    appointment,
    clinic,
    doctor,
    cancellation,
  });
};

 // notify patient when staff cancels
export const notifyPatientAppointmentCancelled = async ({
  patient,
  appointment,
  clinic,
  doctor,
  cancellation,
}) => {
  return sendEmail('appointment-cancelled-by-staff', {
    patient,
    appointment,
    clinic,
    doctor,
    cancellation,
  });
};

 // notify patient when appointment is completed
export const notifyPatientAppointmentCompleted = async ({
  patient,
  appointment,
  clinic,
  doctor,
  services = [],
  feedbackUrl = null,
}) => {
  return sendEmail('appointment-completed', {
    patient,
    appointment,
    clinic,
    doctor,
    services,
    feedbackUrl,
  });
};

 // notify patient of no-show
export const notifyPatientNoShow = async ({
  patient,
  appointment,
  clinic,
  doctor,
}) => {
  return sendEmail('no-show-notice', {
    patient,
    appointment,
    clinic,
    doctor,
  });
};

 // notify patient of new treatment plan
export const notifyPatientTreatmentPlanCreated = async ({
  patient,
  treatmentPlan,
  clinic,
  doctor,
}) => {
  return sendEmail('treatment-plan-created', {
    patient,
    treatmentPlan,
    clinic,
    doctor,
  });
};

 // send treatment follow-up reminder (manual trigger)
export const sendTreatmentFollowUpReminder = async ({
  patient,
  treatmentPlan,
  clinic,
  doctor,
  recommendedDate = null,
}) => {
  return sendEmail('treatment-followup-reminder', {
    patient,
    treatmentPlan,
    clinic,
    doctor,
    recommendedDate,
  });
};

 // notify patient of treatment plan completion
export const notifyPatientTreatmentCompleted = async ({
  patient,
  treatmentPlan,
  clinic,
  doctor,
}) => {
  return sendEmail('treatment-plan-completed', {
    patient,
    treatmentPlan,
    clinic,
    doctor,
  });
};

 // send daily digest to staff (manual trigger)
export const sendDailyStaffDigest = async ({
  staff,
  clinic,
  todayAppointments,
  stats,
  pendingActions = [],
}) => {
  return sendEmail('daily-staff-digest', {
    staff,
    clinic,
    todayAppointments,
    stats,
    pendingActions,
  });
};

 // send bulk appointment reminders (manual trigger)
export const sendBulkAppointmentReminders = async (appointments) => {
  return sendEmail('bulk-appointment-reminders', {
    appointments,
  });
};

export default {
  notifyStaffNewAppointment,
  notifyPatientAppointmentConfirmed,
  notifyPatientAppointmentRejected,
  sendAppointmentReminder,
  notifyStaffAppointmentCancelled,
  notifyPatientAppointmentCancelled,
  notifyPatientAppointmentCompleted,
  notifyPatientNoShow,
  notifyPatientTreatmentPlanCreated,
  sendTreatmentFollowUpReminder,
  notifyPatientTreatmentCompleted,
  sendDailyStaffDigest,
  sendBulkAppointmentReminders,
};