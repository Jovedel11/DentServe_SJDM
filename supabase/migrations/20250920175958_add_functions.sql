CREATE OR REPLACE FUNCTION validate_doctor_clinic_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Verify doctor works at this clinic and is active
    IF NOT EXISTS (
        SELECT 1 FROM doctor_clinics dc 
        WHERE dc.doctor_id = NEW.doctor_id 
        AND dc.clinic_id = NEW.clinic_id 
        AND dc.is_active = true
    ) THEN
        RAISE EXCEPTION 'Doctor % does not work at clinic % or is not active', NEW.doctor_id, NEW.clinic_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_appointment_services()
RETURNS TRIGGER AS $$
DECLARE
    appointment_clinic_id UUID;
    service_clinic_id UUID;
    service_name VARCHAR;
BEGIN
    -- Get the clinic ID from the appointment
    SELECT clinic_id INTO appointment_clinic_id 
    FROM appointments 
    WHERE id = NEW.appointment_id;
    
    -- Get the clinic ID and name from the service
    SELECT clinic_id, name INTO service_clinic_id, service_name
    FROM services 
    WHERE id = NEW.service_id AND is_active = true;
    
    -- Check if service exists and is active
    IF service_clinic_id IS NULL THEN
        RAISE EXCEPTION 'Service % does not exist or is not active', NEW.service_id;
    END IF;
    
    -- Verify clinic match
    IF appointment_clinic_id != service_clinic_id THEN
        RAISE EXCEPTION 'Service "%" does not belong to the appointment clinic', service_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_feedback_appointment()
RETURNS TRIGGER AS $$
DECLARE
    appointment_exists BOOLEAN := false;
BEGIN
    -- If appointment_id is provided, verify comprehensive validation
    IF NEW.appointment_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.id = NEW.appointment_id 
            AND a.patient_id = NEW.patient_id
            AND a.clinic_id = NEW.clinic_id
            AND a.status = 'completed' -- Only allow feedback for completed appointments
        ) INTO appointment_exists;
        
        IF NOT appointment_exists THEN
            RAISE EXCEPTION 'Invalid appointment reference: appointment must exist, belong to the patient, be at the correct clinic, and be completed';
        END IF;
    END IF;
    
    -- Ensure clinic feedback has valid clinic
    IF NEW.clinic_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM clinics WHERE id = NEW.clinic_id AND is_active = true) THEN
            RAISE EXCEPTION 'Invalid or inactive clinic reference';
        END IF;
    END IF;
    
    -- Ensure doctor feedback references doctor from the same clinic
    IF NEW.doctor_id IS NOT NULL AND NEW.clinic_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM doctor_clinics dc 
            WHERE dc.doctor_id = NEW.doctor_id 
            AND dc.clinic_id = NEW.clinic_id 
            AND dc.is_active = true
        ) THEN
            RAISE EXCEPTION 'Doctor does not work at the specified clinic';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_rate_limit_unified(
    p_user_email VARCHAR,
    p_action_type VARCHAR,
    p_max_attempts INTEGER,
    p_window_minutes INTEGER DEFAULT 1440, -- 24 hours default
    p_is_success BOOLEAN DEFAULT false     -- ✅ dagdag param, false = wrong attempt
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP;
    is_blocked BOOLEAN := false;
BEGIN
    -- Kung success ang login, huwag i-log as attempt
    IF p_is_success THEN
        RETURN true; -- ✅ laging true kung tama login
    END IF;

    window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Check if user is currently blocked
    SELECT blocked_until > NOW() INTO is_blocked
    FROM rate_limits
    WHERE user_identifier = p_user_email
      AND action_type = p_action_type;
    
    IF is_blocked THEN
        RETURN false;
    END IF;
    
    -- Count recent wrong attempts
    SELECT COUNT(*) INTO current_count
    FROM rate_limits
    WHERE user_identifier = p_user_email
      AND action_type = p_action_type
      AND last_attempt >= window_start;
    
    -- Update or insert rate limit record for wrong attempt only
    INSERT INTO rate_limits (user_identifier, action_type, attempt_count, last_attempt, blocked_until)
    VALUES (
        p_user_email, 
        p_action_type, 
        1, 
        NOW(),
        CASE WHEN current_count + 1 > p_max_attempts 
             THEN NOW() + INTERVAL '1 hour' 
             ELSE NULL END
    )
    ON CONFLICT (user_identifier, action_type)
    DO UPDATE SET 
        attempt_count = CASE 
            WHEN rate_limits.last_attempt < window_start THEN 1
            ELSE rate_limits.attempt_count + 1
        END,
        last_attempt = NOW(),
        blocked_until = CASE 
            WHEN rate_limits.attempt_count + 1 > p_max_attempts 
            THEN NOW() + INTERVAL '1 hour'
            ELSE rate_limits.blocked_until
        END;
    
    RETURN (current_count + 1) <= p_max_attempts;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_feedback_submission()
RETURNS TRIGGER AS $$
DECLARE
    user_email VARCHAR(255);
BEGIN
    -- Get user email
    SELECT email INTO user_email 
    FROM users WHERE id = NEW.patient_id;
    
    -- Use unified rate limiting
    IF NOT check_rate_limit_unified(user_email, 'feedback_submission', 3, 1440) THEN
        RAISE EXCEPTION 'Rate limit exceeded. Maximum 3 feedbacks per day. Please try again later.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "public"."book_appointment"(
    "p_clinic_id" "uuid", 
    "p_doctor_id" "uuid", 
    "p_appointment_date" "date", 
    "p_appointment_time" time without time zone, 
    "p_service_ids" "uuid"[], 
    "p_symptoms" "text" DEFAULT NULL::"text"
) RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public', 'pg_catalog', 'extensions'
AS $$
DECLARE
    current_context JSONB;
    patient_id_val UUID;
    user_email VARCHAR(255);
    appointment_id UUID;
    validation_result RECORD;
    reliability_check JSONB;
    clinic_info RECORD;
    doctor_info RECORD;
    service_details JSONB;
BEGIN
    -- Get current user context (assuming staff is booking for patient)
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- STAFF ONLY: Verify current user is staff at this clinic
    IF (current_context->>'user_type') != 'staff' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff only');
    END IF;
    
    IF (current_context->>'clinic_id')::UUID != p_clinic_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Can only book appointments for your clinic');
    END IF;
    
    -- Input validation
    IF p_clinic_id IS NULL OR p_doctor_id IS NULL OR p_service_ids IS NULL OR array_length(p_service_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic, doctor, and services are required');
    END IF;
    
    IF p_appointment_date IS NULL OR p_appointment_time IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment date and time are required');
    END IF;
    
    -- Validate future appointment
    IF p_appointment_date < CURRENT_DATE OR 
       (p_appointment_date = CURRENT_DATE AND p_appointment_time <= CURRENT_TIME) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot book appointments in the past');
    END IF;
    
    -- Get patient ID (this should be passed as parameter or determined by staff)
    -- For now, assuming it's passed through context or another parameter
    -- You'll need to modify this based on how staff selects the patient
    patient_id_val := (current_context->>'patient_id')::UUID; -- Modify this line based on your needs
    
    IF patient_id_val IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient ID is required');
    END IF;
    
    -- Get user email for rate limiting
    SELECT email INTO user_email FROM users WHERE id = patient_id_val;
    
    -- Rate limiting check
    IF NOT check_rate_limit_unified(user_email, 'appointment_booking', 5, 60) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Maximum 5 bookings per hour.');
    END IF;
    
    -- Validate clinic exists and is active
    SELECT name, appointment_limit_per_patient, timezone, is_active
    INTO clinic_info
    FROM clinics 
    WHERE id = p_clinic_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found or inactive');
    END IF;
    
    -- Validate doctor works at this clinic
    SELECT d.first_name, d.last_name, d.specialization, d.is_available
    INTO doctor_info
    FROM doctors d
    JOIN doctor_clinics dc ON d.id = dc.doctor_id
    WHERE d.id = p_doctor_id 
    AND dc.clinic_id = p_clinic_id 
    AND d.is_available = true 
    AND dc.is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor not found, not available, or does not work at this clinic');
    END IF;
    
    -- Validate and calculate services duration
    SELECT 
        SUM(COALESCE(duration_minutes, 30)) as total_duration,
        jsonb_agg(jsonb_build_object(
            'id', id,
            'name', name,
            'duration_minutes', COALESCE(duration_minutes, 30),
            'min_price', min_price,
            'max_price', max_price
        )) as services_data
    INTO validation_result
    FROM services 
    WHERE id = ANY(p_service_ids) 
    AND clinic_id = p_clinic_id 
    AND is_active = true;
    
    IF validation_result.total_duration IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No valid services found for this clinic');
    END IF;
    
    -- Check appointment limit for patient at this clinic
    DECLARE
        limit_check JSONB;
    BEGIN
        limit_check := check_appointment_limit(patient_id_val, p_clinic_id, p_appointment_date);
        IF NOT (limit_check->>'success')::boolean THEN
            RETURN limit_check;
        END IF;
    END;
    
    -- Final availability check
    IF NOT check_appointment_availability(
        p_doctor_id, 
        p_appointment_date, 
        p_appointment_time, 
        validation_result.total_duration
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor is not available at this time - please select another time slot');
    END IF;

    -- Get patient reliability assessment
    reliability_check := check_patient_reliability(patient_id_val, p_clinic_id);
    
    -- Create appointment (TRANSACTION)
    BEGIN
        INSERT INTO appointments (
            patient_id, 
            doctor_id, 
            clinic_id, 
            appointment_date,
            appointment_time, 
            duration_minutes,
            symptoms,
            status
        ) VALUES (
            patient_id_val, 
            p_doctor_id,
            p_clinic_id, 
            p_appointment_date,
            p_appointment_time, 
            validation_result.total_duration,
            p_symptoms,
            'pending'
        ) RETURNING id INTO appointment_id;

        -- Insert appointment services
        INSERT INTO appointment_services (appointment_id, service_id)
        SELECT appointment_id, unnest(p_service_ids);

        -- Create appointment notification
        PERFORM create_appointment_notification(
            patient_id_val,
            'appointment_confirmed',
            appointment_id,
            format('Your appointment has been booked at %s for %s', 
                   clinic_info.name, 
                   p_appointment_date || ' ' || p_appointment_time)
        );

        -- Return success with complete appointment details
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment booked successfully',
            'data', jsonb_build_object(
                'appointment_id', appointment_id,
                'clinic', jsonb_build_object(
                    'id', p_clinic_id,
                    'name', clinic_info.name
                ),
                'doctor', jsonb_build_object(
                    'id', p_doctor_id,
                    'name', doctor_info.first_name || ' ' || doctor_info.last_name,
                    'specialization', doctor_info.specialization
                ),
                'services', validation_result.services_data,
                'appointment_details', jsonb_build_object(
                    'date', p_appointment_date,
                    'time', p_appointment_time,
                    'duration_minutes', validation_result.total_duration,
                    'symptoms', p_symptoms,
                    'status', 'pending'
                ),
                'patient_reliability', reliability_check
            )
        );

    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Failed to create appointment: ' || SQLERRM
            );
    END;
END;
$$;

CREATE OR REPLACE FUNCTION track_appointment_deletion_in_history()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE patient_medical_history 
    SET appointment_deleted_at = NOW()
    WHERE appointment_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_clinic_timezone(p_clinic_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    clinic_tz VARCHAR(50);
BEGIN
    SELECT timezone INTO clinic_tz FROM clinics WHERE id = p_clinic_id;
    RETURN COALESCE(clinic_tz, 'Asia/Manila');
END;
$$ LANGUAGE plpgsql;


