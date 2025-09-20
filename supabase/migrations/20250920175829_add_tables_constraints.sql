ALTER TABLE appointments ALTER COLUMN doctor_id SET NOT NULL;

ALTER TABLE patient_medical_history 
DROP CONSTRAINT IF EXISTS patient_medical_history_appointment_id_fkey;

ALTER TABLE patient_medical_history 
ADD CONSTRAINT patient_medical_history_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- Add tracking for deleted appointments
ALTER TABLE patient_medical_history 
ADD COLUMN IF NOT EXISTS appointment_deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Manila';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Manila';

ALTER TABLE services ADD CONSTRAINT valid_duration_check 
CHECK (duration_minutes > 0 AND duration_minutes <= 480); -- Max 8 hours

-- Default duration if not specified
ALTER TABLE services ALTER COLUMN duration_minutes SET DEFAULT 30;