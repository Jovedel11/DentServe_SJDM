CREATE INDEX IF NOT EXISTS idx_appointments_doctor_datetime_availability 
ON appointments (doctor_id, appointment_date, appointment_time, status)
WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_appointments_patient_reliability 
ON appointments (patient_id, clinic_id, status, appointment_date)
WHERE status IN ('completed', 'no_show', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_feedback_patient_daily_limit 
ON feedback (patient_id, created_at);

CREATE INDEX IF NOT EXISTS idx_services_clinic_active_duration
ON services (clinic_id, is_active) INCLUDE (duration_minutes, name)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_doctor_clinics_booking_lookup
ON doctor_clinics (clinic_id, is_active) INCLUDE (doctor_id)
WHERE is_active = true;

-- Index for staff clinic context
CREATE INDEX IF NOT EXISTS idx_staff_clinic_context
ON staff_profiles (user_profile_id, clinic_id, is_active)
WHERE is_active = true;