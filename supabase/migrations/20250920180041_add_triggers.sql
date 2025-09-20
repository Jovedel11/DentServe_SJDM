CREATE TRIGGER validate_doctor_clinic_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION validate_doctor_clinic_assignment();

CREATE TRIGGER validate_appointment_services_trigger
    BEFORE INSERT OR UPDATE ON appointment_services
    FOR EACH ROW EXECUTE FUNCTION validate_appointment_services();

CREATE TRIGGER validate_feedback_appointment_trigger
    BEFORE INSERT OR UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION validate_feedback_appointment();

DROP TRIGGER IF EXISTS track_appointment_deletion_trigger ON appointments;
CREATE TRIGGER track_appointment_deletion_trigger
    BEFORE DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION track_appointment_deletion_in_history();