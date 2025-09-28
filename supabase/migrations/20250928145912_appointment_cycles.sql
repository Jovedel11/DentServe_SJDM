-- ========================================
-- DENTSERVE APPOINTMENT CYCLE ANALYSIS
-- ========================================
-- This file contains all appointment-related database objects extracted from the main schema
-- for easier understanding and hook/function evaluation.

-- ========================================
-- APPOINTMENT-RELATED TYPES & ENUMS
-- ========================================

-- Main appointment status enum
create type "public"."appointment_status" as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- Rejection categories for appointment rejections
create type "public"."rejection_category" as enum ('doctor_unavailable', 'overbooked', 'patient_request', 'system_error', 'other', 'staff_decision');

-- ========================================
-- APPOINTMENT-RELATED TABLES
-- ========================================

-- Core appointments table
create table "public"."appointments" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "patient_id" uuid not null,
  "doctor_id" uuid not null,
  "clinic_id" uuid not null,
  "appointment_date" date not null,
  "appointment_time" time without time zone not null,
  "duration_minutes" integer,
  "status" appointment_status default 'pending'::appointment_status,
  "symptoms" text,
  "notes" text,
  "cancellation_reason" text,
  "cancelled_by" uuid,
  "cancelled_at" timestamp with time zone,
  "reminder_sent" boolean default false,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "timezone" character varying(50) default 'Asia/Manila'::character varying
);

-- Junction table for appointment services (many-to-many)
create table "public"."appointment_services" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "appointment_id" uuid not null,
  "service_id" uuid not null
);

-- Patient appointment limits tracking
create table "public"."patient_appointment_limits" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "patient_id" uuid not null,
  "clinic_id" uuid not null,
  "current_count" integer default 0,
  "limit_count" integer not null,
  "reset_date" date,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- ========================================
-- APPOINTMENT CYCLE FUNCTIONS
-- ========================================

-- 1. APPOINTMENT BOOKING FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_clinic_id uuid, 
  p_doctor_id uuid, 
  p_appointment_date date, 
  p_appointment_time time without time zone, 
  p_service_ids uuid[], 
  p_symptoms text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    patient_id_val UUID;
    user_email VARCHAR(255);
    appointment_id UUID;
    validation_result RECORD;
    appointment_limit_check JSONB;
    reliability_check JSONB;
    cancellation_deadline TIMESTAMP;
BEGIN
    current_context := get_current_user_context();

    -- Authentication check
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;

    -- Only patients can book
    IF (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only patients can book appointments');
    END IF;

    patient_id_val := (current_context->>'user_id')::UUID;

    -- Input validation
    IF p_clinic_id IS NULL OR p_doctor_id IS NULL OR 
       p_appointment_date IS NULL OR p_appointment_time IS NULL OR
       p_service_ids IS NULL OR array_length(p_service_ids, 1) < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'All fields required: clinic, doctor, date, time, and at least 1 service');
    END IF;

    -- Business rule validations
    IF array_length(p_service_ids, 1) > 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum 3 services allowed per appointment');
    END IF;

    IF p_appointment_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment must be scheduled for a future date');
    END IF;

    -- Rate limiting
    SELECT email INTO user_email FROM users WHERE id = patient_id_val;
    
    IF NOT check_rate_limit_unified(user_email, 'appointment_booking', 5, 60) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Maximum 5 bookings per hour.');
    END IF;

    -- Check appointment limits with all rules
    appointment_limit_check := check_appointment_limit(patient_id_val, p_clinic_id, p_appointment_date);
    
    IF NOT (appointment_limit_check->>'allowed')::boolean THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', appointment_limit_check->>'message',
            'reason', appointment_limit_check->>'reason',
            'data', appointment_limit_check->'data'
        );
    END IF;

    -- Enhanced validation with cancellation policy
    WITH comprehensive_validation AS (
        SELECT 
            c.id as clinic_id,
            c.name as clinic_name,
            c.appointment_limit_per_patient,
            c.cancellation_policy_hours,
            c.is_active as clinic_active,
            
            d.id as doctor_id,
            d.specialization,
            d.first_name as doctor_first_name,
            d.last_name as doctor_last_name,
            d.is_available as doctor_available,
            dc.is_active as doctor_clinic_active,
            
            (SELECT COUNT(*) FROM appointments 
             WHERE patient_id = patient_id_val
             AND appointment_date = p_appointment_date
             AND appointment_time = p_appointment_time
             AND status NOT IN ('cancelled', 'completed', 'no_show')) as patient_conflicts,
            
            services_data.total_duration,
            services_data.total_min_price,
            services_data.total_max_price,
            services_data.service_details,
            services_data.valid_service_count
            
        FROM clinics c
        JOIN doctors d ON d.id = p_doctor_id
        JOIN doctor_clinics dc ON d.id = dc.doctor_id AND c.id = dc.clinic_id
        CROSS JOIN (
            SELECT 
                COALESCE(SUM(duration_minutes), 0)::INTEGER AS total_duration,
                COALESCE(SUM(min_price), 0) AS total_min_price,
                COALESCE(SUM(max_price), 0) AS total_max_price,
                COUNT(*) as valid_service_count,
                jsonb_agg(jsonb_build_object(
                    'id', s.id,
                    'name', s.name,
                    'duration_minutes', s.duration_minutes,
                    'min_price', s.min_price,
                    'max_price', s.max_price,
                    'category', s.category
                )) AS service_details
            FROM services s
            WHERE s.id = ANY(p_service_ids)
            AND s.clinic_id = p_clinic_id
            AND s.is_active = true
        ) services_data
        WHERE c.id = p_clinic_id
    )
    SELECT * INTO validation_result FROM comprehensive_validation;
    
    -- Comprehensive validation checks
    IF validation_result.clinic_id IS NULL OR NOT validation_result.clinic_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found or inactive');
    END IF;
    
    IF validation_result.doctor_id IS NULL OR NOT validation_result.doctor_available OR NOT validation_result.doctor_clinic_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor not available at this clinic');
    END IF;
    
    IF validation_result.patient_conflicts > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have an appointment at this time');
    END IF;

    IF validation_result.valid_service_count != array_length(p_service_ids, 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'One or more selected services are not available at this clinic');
    END IF;
    
    -- Duration validation
    IF validation_result.total_duration > 480 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Total service duration exceeds maximum allowed (8 hours)',
            'data', jsonb_build_object(
                'total_duration', validation_result.total_duration,
                'max_allowed', 480
            )
        );
    END IF;

    IF validation_result.total_duration < 15 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Minimum appointment duration is 15 minutes');
    END IF;

    -- Check doctor availability
    IF NOT check_appointment_availability(
        p_doctor_id, 
        p_appointment_date, 
        p_appointment_time, 
        validation_result.total_duration
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor is not available at this time');
    END IF;

    -- Get patient reliability
    reliability_check := check_patient_reliability(patient_id_val, p_clinic_id);

    -- Calculate cancellation deadline
    cancellation_deadline := (p_appointment_date + p_appointment_time) - 
                            (validation_result.cancellation_policy_hours || ' hours')::INTERVAL;

    -- Create appointment atomically
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

        -- Create notification
        PERFORM create_appointment_notification(
            patient_id_val,
            'appointment_confirmed',
            appointment_id,
            format('Your appointment request has been submitted to %s for %s at %s', 
                   validation_result.clinic_name, 
                   p_appointment_date, 
                   p_appointment_time)
        );

        -- Return enhanced data with cross-clinic info and cancellation policy
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment request submitted successfully',
            'data', jsonb_build_object(
                'appointment_id', appointment_id,
                'status', 'pending',
                'requires_approval', true,
                'next_step', 'Wait for clinic staff approval',
                'appointment_details', jsonb_build_object(
                    'date', p_appointment_date,
                    'time', p_appointment_time,
                    'duration_minutes', validation_result.total_duration,
                    'symptoms', p_symptoms
                ),
                'clinic', jsonb_build_object(
                    'id', validation_result.clinic_id,
                    'name', validation_result.clinic_name,
                    'cancellation_policy_hours', validation_result.cancellation_policy_hours
                ),
                'doctor', jsonb_build_object(
                    'id', validation_result.doctor_id,
                    'name', validation_result.doctor_first_name || ' ' || validation_result.doctor_last_name,
                    'specialization', validation_result.specialization
                ),
                'services', validation_result.service_details,
                'pricing_estimate', jsonb_build_object(
                    'min_total', validation_result.total_min_price,
                    'max_total', validation_result.total_max_price,
                    'currency', 'PHP',
                    'note', 'Final price may vary based on actual services provided'
                ),
                'patient_info', jsonb_build_object(
                    'reliability_score', reliability_check
                ),
                'cancellation_policy', jsonb_build_object(
                    'deadline', cancellation_deadline,
                    'hours_notice_required', validation_result.cancellation_policy_hours,
                    'note', format('You can cancel this appointment until %s (%s hours before)', 
                                   cancellation_deadline, validation_result.cancellation_policy_hours)
                ),
                'cross_clinic_context', appointment_limit_check->'data'->'cross_clinic_appointments',
                'important_notice', CASE 
                    WHEN jsonb_array_length(COALESCE(appointment_limit_check->'data'->'cross_clinic_appointments', '[]'::jsonb)) > 0 THEN
                        'Note: You have appointments at other clinics around this time. Please inform your healthcare providers for better care coordination.'
                    ELSE NULL
                END
            )
        );

    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'book_appointment error for patient %: %', patient_id_val, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Booking failed. Please try again.');
    END;
END;
$function$;

-- ========================================
-- 2. APPOINTMENT APPROVAL FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.approve_appointment(p_appointment_id uuid, p_staff_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    appointment_record RECORD;
    v_current_role TEXT;
    clinic_id_val UUID;
    doctor_availability BOOLEAN;
    patient_reliability JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    
    -- Only staff can approve appointments
    IF v_current_role != 'staff' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff only');
    END IF;
    
    clinic_id_val := (current_context->>'clinic_id')::UUID;
    
    -- Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;
    
    -- Get appointment details
    SELECT 
        a.*,
        c.name as clinic_name,
        c.appointment_limit_per_patient,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        u.phone as patient_phone,
        CASE 
            WHEN d.id IS NOT NULL THEN COALESCE(d.first_name, '') || ' ' || COALESCE(d.last_name, '')
            ELSE NULL
        END as doctor_name,
        d.specialization as doctor_specialization
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    JOIN users u ON a.patient_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = p_appointment_id
    AND a.clinic_id = clinic_id_val;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment not found or access denied');
    END IF;
    
    -- Check if appointment can be approved
    IF appointment_record.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Cannot approve appointment with status: %s. Only pending appointments can be approved.', appointment_record.status),
            'data', jsonb_build_object(
                'current_status', appointment_record.status,
                'appointment_id', p_appointment_id
            )
        );
    END IF;
    
    -- Validate appointment is still in future
    IF appointment_record.appointment_date < CURRENT_DATE OR 
       (appointment_record.appointment_date = CURRENT_DATE AND appointment_record.appointment_time <= CURRENT_TIME) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot approve past appointments');
    END IF;
    
    -- Re-check doctor availability if doctor assigned
    IF appointment_record.doctor_id IS NOT NULL THEN
        doctor_availability := check_appointment_availability(
            appointment_record.doctor_id, 
            appointment_record.appointment_date, 
            appointment_record.appointment_time, 
            appointment_record.duration_minutes,
            p_appointment_id -- Exclude this appointment from conflict check
        );
        
        IF NOT doctor_availability THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Doctor is no longer available at this time. Please reschedule.',
                'data', jsonb_build_object(
                    'suggested_action', 'reschedule',
                    'doctor_name', appointment_record.doctor_name
                )
            );
        END IF;
    END IF;
    
    -- Check patient reliability
    patient_reliability := check_patient_reliability(
        appointment_record.patient_id, 
        clinic_id_val, 
        6  -- 6 months lookback
    );
    
    -- Transaction: Atomic approval process
    BEGIN
        -- Update appointment with reliability notes
        UPDATE appointments 
        SET 
            status = 'confirmed',
            notes = CASE 
                WHEN p_staff_notes IS NOT NULL THEN 
                    COALESCE(notes, '') || 
                    CASE WHEN notes IS NOT NULL AND LENGTH(TRIM(notes)) > 0 THEN E'\n---\n' ELSE '' END || 
                    'Staff Notes: ' || p_staff_notes
                ELSE notes
            END ||
            -- Add reliability assessment to notes
            CASE 
                WHEN (patient_reliability->>'risk_level') IN ('high_risk', 'moderate_risk') THEN
                    E'\n---\nPATIENT RELIABILITY: ' || UPPER(patient_reliability->>'risk_level') || 
                    ' (' || (patient_reliability->'statistics'->>'completion_rate') || '% completion rate)' ||
                    E'\nSTAFF ACTIONS: ' || array_to_string(
                        ARRAY(SELECT jsonb_array_elements_text(patient_reliability->'recommendations')), 
                        '; '
                    )
                ELSE ''
            END,
            updated_at = NOW()
        WHERE id = p_appointment_id;
        
        -- Create confirmation notification for patient
        INSERT INTO notifications (
            user_id, 
            notification_type, 
            title, 
            message, 
            related_appointment_id,
            scheduled_for
        ) VALUES (
            appointment_record.patient_id,
            'appointment_confirmed',
            'Appointment Confirmed',
            format('Your appointment on %s at %s has been confirmed at %s. Doctor: %s',
                   appointment_record.appointment_date,
                   appointment_record.appointment_time,
                   appointment_record.clinic_name,
                   COALESCE(appointment_record.doctor_name, 'To be assigned')),
            p_appointment_id,
            NOW()
        );
        
        -- Create appointment reminder notification (24 hours before)
        IF appointment_record.appointment_date > CURRENT_DATE + INTERVAL '1 day' THEN
            INSERT INTO notifications (
                user_id, 
                notification_type, 
                title, 
                message, 
                related_appointment_id,
                scheduled_for
            ) VALUES (
                appointment_record.patient_id,
                'appointment_reminder',
                'Appointment Reminder',
                format('Reminder: You have an appointment tomorrow at %s with %s at %s',
                       appointment_record.appointment_time,
                       COALESCE(appointment_record.doctor_name, 'your assigned doctor'),
                       appointment_record.clinic_name),
                p_appointment_id,
                (appointment_record.appointment_date - INTERVAL '1 day')::timestamp + TIME '09:00:00'
            );
        END IF;
        
        -- Return comprehensive approval data with reliability
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment approved successfully',
            'data', jsonb_build_object(
                'appointment_id', p_appointment_id,
                'new_status', 'confirmed',
                'approved_at', NOW(),
                'approved_by', current_context->>'full_name',
                'appointment_details', jsonb_build_object(
                    'appointment_date', appointment_record.appointment_date,
                    'appointment_time', appointment_record.appointment_time,
                    'duration_minutes', appointment_record.duration_minutes,
                    'patient', jsonb_build_object(
                        'id', appointment_record.patient_id,
                        'name', appointment_record.patient_name,
                        'email', appointment_record.patient_email,
                        'phone', appointment_record.patient_phone
                    ),
                    'doctor', CASE 
                        WHEN appointment_record.doctor_id IS NOT NULL THEN
                            jsonb_build_object(
                                'id', appointment_record.doctor_id,
                                'name', appointment_record.doctor_name,
                                'specialization', appointment_record.doctor_specialization
                            )
                        ELSE NULL
                    END,
                    'clinic_name', appointment_record.clinic_name,
                    'symptoms', appointment_record.symptoms,
                    'staff_notes', p_staff_notes
                ),
                'patient_reliability', patient_reliability,
                'staff_recommendations', patient_reliability->'recommendations',
                'approval_flags', patient_reliability->'approval_flags',
                'notifications_sent', jsonb_build_object(
                    'confirmation_sent', true,
                    'reminder_scheduled', appointment_record.appointment_date > CURRENT_DATE + INTERVAL '1 day'
                ),
                'next_actions', jsonb_build_array(
                    'Send confirmation email',
                    'Update clinic calendar',
                    'Prepare patient file'
                ) || CASE 
                    WHEN (patient_reliability->'approval_flags'->>'require_confirmation')::boolean THEN
                        jsonb_build_array('REQUIRED: Call patient 24h before appointment')
                    ELSE jsonb_build_array()
                END || CASE 
                    WHEN (patient_reliability->'approval_flags'->>'extra_reminders')::boolean THEN
                        jsonb_build_array('Send additional appointment reminders')
                    ELSE jsonb_build_array()
                END
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'approve_appointment error for appointment %: %', p_appointment_id, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Approval failed. Please try again.');
    END;
END;
$function$;

-- ========================================
-- 3. APPOINTMENT VALIDATION FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.check_appointment_limit(p_patient_id uuid, p_clinic_id uuid, p_appointment_date date DEFAULT NULL::date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    clinic_current_count INTEGER := 0;
    clinic_limit INTEGER;
    daily_appointment_count INTEGER := 0;
    future_appointments_count INTEGER := 0;
    existing_appointment RECORD;
    cross_clinic_appointments JSONB;
    max_future_appointments INTEGER := 3; -- Rule 2: Global limit
    strict_policy BOOLEAN := false; -- Rule 5: Can be enabled per clinic
BEGIN
    -- Input validation
    IF p_patient_id IS NULL OR p_clinic_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'invalid_parameters',
            'message', 'Patient ID and Clinic ID are required'
        );
    END IF;
    
    -- Get clinic's appointment limit and policies
    SELECT 
        appointment_limit_per_patient,
        COALESCE((services_offered->>'strict_booking_policy')::boolean, false)
    INTO clinic_limit, strict_policy
    FROM public.clinics 
    WHERE id = p_clinic_id AND is_active = true;
    
    IF clinic_limit IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'clinic_not_found',
            'message', 'Clinic not found or inactive'
        );
    END IF;
    
    -- RULE 1: Check daily limit (1 appointment per day across ALL clinics)
    IF p_appointment_date IS NOT NULL THEN
        SELECT COUNT(*) INTO daily_appointment_count
        FROM public.appointments 
        WHERE patient_id = p_patient_id 
        AND appointment_date = p_appointment_date
        AND status NOT IN ('cancelled', 'no_show');
        
        IF daily_appointment_count > 0 THEN
            SELECT 
                a.id,
                a.appointment_time,
                COALESCE(c.name, 'Unknown Clinic') as clinic_name,
                a.status
            INTO existing_appointment
            FROM public.appointments a
            JOIN public.clinics c ON a.clinic_id = c.id
            WHERE a.patient_id = p_patient_id 
            AND a.appointment_date = p_appointment_date
            AND a.status NOT IN ('cancelled', 'no_show')
            LIMIT 1;
            
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'daily_limit_exceeded',
                'message', 'You already have an appointment on this date',
                'data', jsonb_build_object(
                    'existing_appointment', jsonb_build_object(
                        'id', existing_appointment.id,
                        'time', existing_appointment.appointment_time,
                        'clinic_name', existing_appointment.clinic_name,
                        'status', existing_appointment.status
                    ),
                    'policy', 'Rule 1: One appointment per day limit'
                )
            );
        END IF;
    END IF;
    
    -- RULE 2: Check future appointments limit (across all clinics)
    SELECT COUNT(*) INTO future_appointments_count
    FROM public.appointments 
    WHERE patient_id = p_patient_id 
    AND appointment_date > CURRENT_DATE
    AND status IN ('pending', 'confirmed');
    
    IF future_appointments_count >= max_future_appointments THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'future_appointments_limit_exceeded',
            'message', format('Maximum %s future appointments allowed across all clinics', max_future_appointments),
            'data', jsonb_build_object(
                'current_future_appointments', future_appointments_count,
                'max_allowed', max_future_appointments,
                'policy', 'Rule 2: Prevents booking excessive future appointments'
            )
        );
    END IF;
    
    -- RULE 5: Strict policy check (only 1 active future appointment)
    IF strict_policy AND future_appointments_count >= 1 THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'strict_booking_policy',
            'message', 'This clinic requires you to complete or cancel existing appointments before booking new ones',
            'data', jsonb_build_object(
                'current_future_appointments', future_appointments_count,
                'policy', 'Rule 5: Strict rebooking policy - attend or cancel before new booking'
            )
        );
    END IF;
    
    -- Get current appointment count per clinic
    SELECT COALESCE(current_count, 0) INTO clinic_current_count
    FROM public.patient_appointment_limits
    WHERE patient_id = p_patient_id AND clinic_id = p_clinic_id;
    
    -- If no record exists, count actual appointments as fallback
    IF NOT FOUND OR clinic_current_count IS NULL THEN
        SELECT COUNT(*) INTO clinic_current_count
        FROM public.appointments
        WHERE patient_id = p_patient_id 
        AND clinic_id = p_clinic_id
        AND status IN ('pending', 'confirmed', 'completed')
        AND appointment_date >= CURRENT_DATE - INTERVAL '6 months'; -- Reasonable time window
        
        -- Initialize the patient_appointment_limits record if it doesn't exist
        INSERT INTO public.patient_appointment_limits (
            patient_id, 
            clinic_id, 
            current_count, 
            limit_count,
            reset_date
        ) VALUES (
            p_patient_id,
            p_clinic_id,
            clinic_current_count,
            clinic_limit,
            CURRENT_DATE + INTERVAL '1 year'
        )
        ON CONFLICT (patient_id, clinic_id) DO UPDATE SET
            current_count = EXCLUDED.current_count,
            updated_at = NOW();
    END IF;
    
    -- Check clinic-specific limit
    IF clinic_current_count >= clinic_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'clinic_limit_exceeded', 
            'message', format('Maximum %s appointments allowed at this clinic', clinic_limit),
            'data', jsonb_build_object(
                'current_count', clinic_current_count,
                'limit_count', clinic_limit,
                'clinic_id', p_clinic_id
            )
        );
    END IF;
    
    -- RULE 6: Get cross-clinic appointments for transparency
    WITH cross_clinic_data AS (
        SELECT 
            COALESCE(c.name, 'Unknown Clinic') as clinic_name,
            c.id as clinic_id,
            a.appointment_date,
            a.appointment_time,
            a.status,
            CASE 
                WHEN d.first_name IS NOT NULL AND d.last_name IS NOT NULL THEN
                    TRIM(d.first_name || ' ' || d.last_name)
                WHEN d.first_name IS NOT NULL THEN
                    TRIM(d.first_name)
                WHEN d.last_name IS NOT NULL THEN
                    TRIM(d.last_name)
                ELSE 'Doctor TBA'
            END as doctor_name,
            COALESCE(d.specialization, 'General') as specialization,
            (a.appointment_date - CURRENT_DATE) as days_from_today
        FROM appointments a
        JOIN clinics c ON a.clinic_id = c.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = p_patient_id
        AND a.appointment_date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days'
        AND a.status IN ('pending', 'confirmed', 'completed')
        AND a.clinic_id != p_clinic_id
        AND c.is_active = true  -- Only show active clinics
        ORDER BY a.appointment_date, a.appointment_time
        LIMIT 20  -- Prevent excessive data
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'clinic_name', clinic_name,
                'clinic_id', clinic_id,
                'appointment_date', appointment_date,
                'appointment_time', appointment_time,
                'status', status,
                'doctor_name', doctor_name,
                'specialization', specialization,
                'days_from_today', days_from_today
            )
        ),
        '[]'::jsonb
    ) INTO cross_clinic_appointments
    FROM cross_clinic_data;
    
    -- SUCCESS: Return comprehensive data including cross-clinic info
    RETURN jsonb_build_object(
        'allowed', true,
        'message', 'Appointment booking allowed',
        'data', jsonb_build_object(
            'clinic_appointments', clinic_current_count,
            'clinic_limit', clinic_limit,
            'daily_appointments', daily_appointment_count,
            'future_appointments_count', future_appointments_count,
            'max_future_appointments', max_future_appointments,
            'strict_policy_active', strict_policy,
            'cross_clinic_appointments', cross_clinic_appointments,
            'cross_clinic_visibility_note', 'Rule 6: Other clinic appointments for care coordination'
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in check_appointment_limit for patient % at clinic %: %', 
                  p_patient_id, p_clinic_id, SQLERRM;
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'system_error',
            'message', 'Unable to verify appointment limits',
            'error_details', SQLSTATE || ': ' || SQLERRM
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_appointment_availability(p_doctor_id uuid, p_appointment_date date, p_appointment_time time without time zone, p_duration_minutes integer DEFAULT NULL::integer, p_exclude_appointment_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    conflict_count INTEGER := 0;
    duration_to_check INTEGER := COALESCE(p_duration_minutes, 30); -- Default 30 minutes
    appointment_end_time TIME;
BEGIN
    -- Input validation
    IF p_doctor_id IS NULL OR p_appointment_date IS NULL OR p_appointment_time IS NULL THEN
        RETURN false;
    END IF;
    
    -- Calculate appointment end time
    appointment_end_time := p_appointment_time + (duration_to_check || ' minutes')::INTERVAL;
    
    -- Check for conflicts with existing appointments
    SELECT COUNT(*) INTO conflict_count
    FROM appointments a
    WHERE a.doctor_id = p_doctor_id
    AND a.appointment_date = p_appointment_date
    AND a.status IN ('pending', 'confirmed')
    AND (
        -- New appointment starts during existing appointment
        (p_appointment_time >= a.appointment_time AND 
         p_appointment_time < (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)) OR
        -- New appointment ends during existing appointment
        (appointment_end_time > a.appointment_time AND 
         appointment_end_time <= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL)) OR
        -- New appointment completely encompasses existing appointment
        (p_appointment_time <= a.appointment_time AND 
         appointment_end_time >= (a.appointment_time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL))
    )
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id);
    
    RETURN conflict_count = 0;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in check_appointment_availability: %', SQLERRM;
        RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_appointment_duration(p_service_ids uuid[], p_clinic_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    total_duration INTEGER := 0;
    service_count INTEGER := 0;
BEGIN
    -- Input validation
    IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
        RETURN 0;
    END IF;
    
    IF p_clinic_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate total duration from active services
    SELECT 
        COALESCE(SUM(duration_minutes), 0),
        COUNT(*)
    INTO total_duration, service_count
    FROM services 
    WHERE id = ANY(p_service_ids) 
    AND clinic_id = p_clinic_id 
    AND is_active = true
    AND duration_minutes > 0;
    
    -- Validate all services were found
    IF service_count != array_length(p_service_ids, 1) THEN
        RETURN 0; -- Some services not found or inactive
    END IF;
    
    RETURN total_duration;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in calculate_appointment_duration: %', SQLERRM;
        RETURN 0;
END;
$function$;

-- ========================================
-- 4. APPOINTMENT CANCELLATION FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.can_cancel_appointment(p_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    appointment_record RECORD;
    current_context JSONB;
    current_user_role TEXT;
    hours_until_appointment NUMERIC;
    cancellation_policy_hours INTEGER;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN false;
    END IF;
    
    current_user_role := current_context->>'user_type';
    
    -- Get appointment with cancellation policy
    SELECT 
        a.*,
        c.cancellation_policy_hours,
        EXTRACT(EPOCH FROM 
            ((a.appointment_date + a.appointment_time) - NOW())
        ) / 3600 as hours_until_appointment
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    WHERE a.id = p_appointment_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Already cancelled appointments cannot be cancelled again
    IF appointment_record.status = 'cancelled' THEN
        RETURN false;
    END IF;
    
    -- Completed appointments cannot be cancelled
    IF appointment_record.status = 'completed' THEN
        RETURN false;
    END IF;
    
    -- Staff and admin can always cancel (within reason)
    IF current_user_role IN ('staff', 'admin') THEN
        RETURN true;
    END IF;
    
    -- For patients, check cancellation policy
    IF current_user_role = 'patient' THEN
        -- Check if patient owns the appointment
        IF appointment_record.patient_id != (current_context->>'user_id')::UUID THEN
            RETURN false;
        END IF;
        
        -- Check cancellation deadline
        cancellation_policy_hours := COALESCE(appointment_record.cancellation_policy_hours, 24);
        hours_until_appointment := appointment_record.hours_until_appointment;
        
        -- Allow cancellation if enough notice is given
        RETURN hours_until_appointment >= cancellation_policy_hours;
    END IF;
    
    RETURN false;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in can_cancel_appointment: %', SQLERRM;
        RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_appointment(p_appointment_id uuid, p_cancellation_reason text, p_cancelled_by uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    current_user_id UUID;
    current_user_role TEXT;
    appointment_record RECORD;
    can_cancel BOOLEAN;
    cancelling_user_name TEXT;
    notification_recipients UUID[];
    hours_until_appointment NUMERIC;
    is_late_cancellation BOOLEAN := false;
    cancellation_deadline TIMESTAMP;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    current_user_id := (current_context->>'user_id')::UUID;
    current_user_role := current_context->>'user_type';
    
    -- Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;
    
    IF p_cancellation_reason IS NULL OR TRIM(p_cancellation_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cancellation reason is required');
    END IF;
    
    -- Determine who is cancelling
    p_cancelled_by := COALESCE(p_cancelled_by, current_user_id);
    cancelling_user_name := current_context->>'full_name';
    
    -- Get appointment details with all related info
    SELECT 
        a.*,
        c.name as clinic_name,
        c.cancellation_policy_hours,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        d.first_name || ' ' || d.last_name as doctor_name,
        EXTRACT(EPOCH FROM 
            ((a.appointment_date + a.appointment_time) - NOW())
        ) / 3600 as hours_until_appointment
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    JOIN users u ON a.patient_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = p_appointment_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
    END IF;
    
    -- Access control validation
    CASE current_user_role
        WHEN 'patient' THEN
            IF appointment_record.patient_id != current_user_id THEN
                RETURN jsonb_build_object('success', false, 'error', 'You can only cancel your own appointments');
            END IF;
        WHEN 'staff' THEN
            IF appointment_record.clinic_id != (current_context->>'clinic_id')::UUID THEN
                RETURN jsonb_build_object('success', false, 'error', 'You can only cancel appointments at your clinic');
            END IF;
        WHEN 'admin' THEN
            NULL; -- Admin can cancel any appointment
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END CASE;
    
    -- Check if already cancelled
    IF appointment_record.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Appointment already cancelled',
            'data', jsonb_build_object(
                'appointment_id', p_appointment_id,
                'current_status', 'cancelled',
                'cancelled_at', appointment_record.cancelled_at,
                'cancellation_reason', appointment_record.cancellation_reason
            )
        );
    END IF;
    
    -- Enhanced cancellation policy enforcement
    hours_until_appointment := appointment_record.hours_until_appointment;
    is_late_cancellation := hours_until_appointment < COALESCE(appointment_record.cancellation_policy_hours, 24);
    cancellation_deadline := (appointment_record.appointment_date + appointment_record.appointment_time) - 
                            (COALESCE(appointment_record.cancellation_policy_hours, 24) || ' hours')::INTERVAL;
    
    -- Only enforce policy for patients
    IF current_user_role = 'patient' AND appointment_record.status NOT IN ('completed') THEN
        IF is_late_cancellation THEN
            RETURN jsonb_build_object(
                'success', false, 
                'reason', 'cancellation_policy_violation',
                'error', format('Cannot cancel within %s hours of appointment. Deadline was: %s', 
                              COALESCE(appointment_record.cancellation_policy_hours, 24),
                              cancellation_deadline),
                'data', jsonb_build_object(
                    'cancellation_deadline', cancellation_deadline,
                    'hours_until_appointment', ROUND(hours_until_appointment, 1),
                    'policy_hours', COALESCE(appointment_record.cancellation_policy_hours, 24),
                    'late_cancellation', true,
                    'reliability_impact', 'This late cancellation will affect your booking privileges'
                )
            );
        END IF;
    END IF;
    
    -- Transaction: Atomic cancellation
    BEGIN
        -- Update appointment with enhanced notes
        UPDATE appointments 
        SET 
            status = 'cancelled',
            cancellation_reason = p_cancellation_reason,
            cancelled_by = p_cancelled_by,
            cancelled_at = NOW(),
            notes = COALESCE(notes, '') || 
                   E'\n---\nCANCELLED: ' || NOW()::text ||
                   format(' (%s hours notice)', ROUND(hours_until_appointment, 1)) ||
                   CASE 
                       WHEN is_late_cancellation AND current_user_role = 'patient' THEN 
                           E'\nLATE CANCELLATION - Policy requires ' || COALESCE(appointment_record.cancellation_policy_hours, 24) || ' hours notice'
                       ELSE ''
                   END ||
                   E'\nCancelled by: ' || current_user_role || 
                   E'\nReason: ' || p_cancellation_reason,
            updated_at = NOW()
        WHERE id = p_appointment_id;
        
        -- Smart notification system
        notification_recipients := ARRAY[]::UUID[];
        
        IF current_user_role = 'patient' THEN
            -- Patient cancelled - notify clinic staff
            SELECT ARRAY_AGG(u.id) INTO notification_recipients
            FROM staff_profiles sp
            JOIN user_profiles up ON sp.user_profile_id = up.id
            JOIN users u ON up.user_id = u.id
            WHERE sp.clinic_id = appointment_record.clinic_id 
            AND sp.is_active = true;
            
            INSERT INTO notifications (user_id, notification_type, title, message, related_appointment_id)
            SELECT 
                unnest(notification_recipients), 
                'appointment_cancelled', 
                CASE 
                    WHEN is_late_cancellation THEN 'LATE CANCELLATION - Patient Cancelled'
                    ELSE 'Patient Cancelled Appointment'
                END,
                format('%sPatient %s cancelled appointment on %s at %s (%s hours notice). Reason: %s',
                       CASE WHEN is_late_cancellation THEN '⚠️ LATE CANCELLATION: ' ELSE '' END,
                       appointment_record.patient_name,
                       appointment_record.appointment_date,
                       appointment_record.appointment_time,
                       ROUND(hours_until_appointment, 1),
                       p_cancellation_reason),
                p_appointment_id;
                
        ELSIF current_user_role IN ('staff', 'admin') THEN
            -- Staff/admin cancelled - notify patient
            INSERT INTO notifications (user_id, notification_type, title, message, related_appointment_id)
            VALUES (
                appointment_record.patient_id,
                'appointment_cancelled',
                'Appointment Cancelled by Clinic',
                format('Your appointment on %s at %s has been cancelled by %s. Reason: %s',
                       appointment_record.appointment_date,
                       appointment_record.appointment_time,
                       cancelling_user_name,
                       p_cancellation_reason),
                p_appointment_id
            );
        END IF;
        
        -- Return comprehensive cancellation data
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment cancelled successfully',
            'data', jsonb_build_object(
                'appointment_id', p_appointment_id,
                'cancelled_at', NOW(),
                'cancelled_by', p_cancelled_by,
                'cancellation_reason', p_cancellation_reason,
                'appointment_details', jsonb_build_object(
                    'appointment_date', appointment_record.appointment_date,
                    'appointment_time', appointment_record.appointment_time,
                    'clinic_name', appointment_record.clinic_name,
                    'patient_name', appointment_record.patient_name,
                    'doctor_name', appointment_record.doctor_name
                ),
                'cancellation_policy', jsonb_build_object(
                    'hours_notice_given', ROUND(hours_until_appointment, 1),
                    'policy_hours_required', COALESCE(appointment_record.cancellation_policy_hours, 24),
                    'was_late_cancellation', is_late_cancellation,
                    'cancellation_deadline', cancellation_deadline,
                    'policy_compliant', NOT is_late_cancellation OR current_user_role != 'patient'
                ),
                'notifications_sent', array_length(notification_recipients, 1),
                'cancelled_by_role', current_user_role,
                'refund_eligible', (current_user_role != 'patient' OR NOT is_late_cancellation),
                'reliability_impact', CASE 
                    WHEN current_user_role = 'patient' AND is_late_cancellation THEN
                        jsonb_build_object(
                            'warning', 'Late cancellation recorded',
                            'impact', 'This will affect your booking privileges',
                            'recommendation', 'Cancel earlier to avoid restrictions'
                        )
                    ELSE 
                        jsonb_build_object('impact', 'minimal')
                END
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'cancel_appointment error for appointment %: %', p_appointment_id, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Cancellation failed. Please try again.');
    END;
END;
$function$;

-- ========================================
-- 5. APPOINTMENT COMPLETION FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.complete_appointment(p_appointment_id uuid, p_completion_notes text DEFAULT NULL::text, p_services_completed uuid[] DEFAULT NULL::uuid[], p_follow_up_required boolean DEFAULT false, p_follow_up_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    appointment_record RECORD;
    v_current_role TEXT;
    clinic_id_val UUID;
    completed_services JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();

    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;

    v_current_role := current_context->>'user_type';

    -- Only staff can complete appointments
    IF v_current_role != 'staff' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff only');
    END IF;

    clinic_id_val := (current_context->>'clinic_id')::UUID;

    -- Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;

    -- Get appointment
    SELECT 
        a.*,
        c.name as clinic_name,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        d.first_name || ' ' || d.last_name as doctor_name,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'duration_minutes', s.duration_minutes,
                'min_price', s.min_price,
                'max_price', s.max_price
            ))
            FROM appointment_services aps
            JOIN services s ON aps.service_id = s.id
            WHERE aps.appointment_id = a.id),
            '[]'::jsonb
        ) as appointment_services
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    JOIN users u ON a.patient_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = p_appointment_id
    AND a.clinic_id = clinic_id_val;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment not found or access denied');
    END IF;

    -- Status validation
    IF appointment_record.status NOT IN ('confirmed', 'pending') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Cannot complete appointment with status: %s. Only confirmed or pending appointments can be completed.', appointment_record.status),
            'data', jsonb_build_object(
                'current_status', appointment_record.status,
                'appointment_id', p_appointment_id
            )
        );
    END IF;

    -- Date validation
    IF appointment_record.appointment_date > CURRENT_DATE THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Cannot complete future appointments',
            'data', jsonb_build_object(
                'appointment_date', appointment_record.appointment_date,
                'suggestion', 'Wait until appointment date or reschedule if needed'
            )
        );
    END IF;

    -- Validate services completed
    IF p_services_completed IS NOT NULL THEN
        SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'was_scheduled', s.id = ANY(
                ARRAY(
                    SELECT (elem->>'id')::UUID
                    FROM jsonb_array_elements(appointment_record.appointment_services) elem
                )
            )
        )) INTO completed_services
        FROM services s 
        WHERE s.id = ANY(p_services_completed)
        AND s.clinic_id = clinic_id_val;
    END IF;

    -- Transaction
    BEGIN
        -- Update appointment
        UPDATE appointments 
        SET 
            status = 'completed',
            notes = COALESCE(
                CASE 
                    WHEN p_completion_notes IS NOT NULL THEN 
                        COALESCE(notes, '') || CASE WHEN notes IS NOT NULL THEN E'\n---\n' ELSE '' END || 
                        'Completion Notes: ' || p_completion_notes
                    ELSE notes
                END, 
                notes
            ),
            updated_at = NOW()
        WHERE id = p_appointment_id;

        -- Insert medical history
        IF p_completion_notes IS NOT NULL OR p_services_completed IS NOT NULL THEN
            INSERT INTO patient_medical_history (
                patient_id,
                appointment_id,
                created_by,
                conditions,
                allergies,
                medications,
                treatment_notes,
                follow_up_required,
                follow_up_date
            ) VALUES (
                appointment_record.patient_id,
                p_appointment_id,
                (current_context->>'user_id')::UUID,
                NULL, -- conditions handled separately
                NULL, -- allergies handled separately
                NULL, -- medications handled separately
                CASE 
                    WHEN p_services_completed IS NOT NULL THEN
                        'Services completed: ' || (SELECT string_agg(name, ', ') FROM services WHERE id = ANY(p_services_completed))
                    ELSE p_completion_notes
                END,
                p_follow_up_required,
                CASE 
                    WHEN p_follow_up_required THEN CURRENT_DATE + INTERVAL '7 days'
                    ELSE NULL
                END
            );
        END IF;

        -- Feedback request notification
        INSERT INTO notifications (
            user_id, 
            notification_type, 
            title, 
            message, 
            related_appointment_id,
            scheduled_for
        ) VALUES (
            appointment_record.patient_id,
            'feedback_request',
            'Share Your Experience',
            format('Your appointment at %s has been completed. Please share your feedback to help us improve our service.',
                   appointment_record.clinic_name),
            p_appointment_id,
            NOW() + INTERVAL '2 hours'
        );

        -- Follow-up reminder notification
        IF p_follow_up_required THEN
            INSERT INTO notifications (
                user_id, 
                notification_type, 
                title, 
                message, 
                related_appointment_id,
                scheduled_for
            ) VALUES (
                (current_context->>'user_id')::UUID,
                'follow_up_reminder',
                'Follow-up Required',
                format('Patient %s requires follow-up after appointment on %s. Notes: %s',
                       appointment_record.patient_name,
                       appointment_record.appointment_date,
                       COALESCE(p_follow_up_notes, 'No specific notes')),
                p_appointment_id,
                NOW() + INTERVAL '1 week'
            );
        END IF;

        -- Final return
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment completed successfully',
            'data', jsonb_build_object(
                'appointment_id', p_appointment_id,
                'completed_at', NOW(),
                'completed_by', current_context->>'full_name',
                'appointment_details', jsonb_build_object(
                    'patient_name', appointment_record.patient_name,
                    'appointment_date', appointment_record.appointment_date,
                    'appointment_time', appointment_record.appointment_time,
                    'doctor_name', appointment_record.doctor_name,
                    'clinic_name', appointment_record.clinic_name
                ),
                'completion_summary', jsonb_build_object(
                    'services_scheduled', appointment_record.appointment_services,
                    'services_completed', completed_services,
                    'completion_notes', p_completion_notes,
                    'follow_up_required', p_follow_up_required,
                    'follow_up_notes', p_follow_up_notes
                ),
                'notifications_scheduled', jsonb_build_object(
                    'feedback_request', jsonb_build_object(
                        'scheduled_for', NOW() + INTERVAL '2 hours',
                        'type', 'feedback_request'
                    ),
                    'follow_up_reminder', CASE 
                        WHEN p_follow_up_required THEN
                            jsonb_build_object(
                                'scheduled_for', NOW() + INTERVAL '1 week',
                                'type', 'follow_up_reminder'
                            )
                        ELSE NULL
                    END
                )
            )
        );

    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'complete_appointment error for appointment %: %', p_appointment_id, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Completion failed. Please try again.');
    END;
END;
$function$;

-- ========================================
-- 6. APPOINTMENT STATUS MANAGEMENT
-- ========================================

CREATE OR REPLACE FUNCTION public.mark_appointment_no_show(p_appointment_id uuid, p_staff_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    appointment_record RECORD;
    current_user_role TEXT;
    clinic_id_val UUID;
    reliability_impact JSONB;
    no_show_count INTEGER;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    current_user_role := current_context->>'user_type';
    
    -- Only staff can mark no-show
    IF current_user_role != 'staff' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff only');
    END IF;
    
    clinic_id_val := (current_context->>'clinic_id')::UUID;
    
    -- Get appointment details
    SELECT 
        a.*,
        c.name as clinic_name,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        d.first_name || ' ' || d.last_name as doctor_name
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    JOIN users u ON a.patient_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = p_appointment_id
    AND a.clinic_id = clinic_id_val;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment not found or access denied');
    END IF;
    
    -- Only confirmed appointments can be marked as no-show
    IF appointment_record.status != 'confirmed' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Cannot mark as no-show. Current status: %s. Only confirmed appointments can be marked as no-show.', appointment_record.status)
        );
    END IF;
    
    -- Validate appointment time has passed (grace period: 15 minutes)
    IF appointment_record.appointment_date > CURRENT_DATE OR 
       (appointment_record.appointment_date = CURRENT_DATE AND 
        appointment_record.appointment_time > (CURRENT_TIME - INTERVAL '15 minutes')) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Cannot mark as no-show until 15 minutes after appointment time',
            'data', jsonb_build_object(
                'appointment_time', appointment_record.appointment_time,
                'grace_period_ends', appointment_record.appointment_time + INTERVAL '15 minutes'
            )
        );
    END IF;
    
    -- Get patient's no-show history
    SELECT COUNT(*) INTO no_show_count
    FROM appointments
    WHERE patient_id = appointment_record.patient_id
    AND status = 'no_show'
    AND appointment_date >= CURRENT_DATE - INTERVAL '6 months';
    
    BEGIN
        -- Update appointment status
        UPDATE appointments 
        SET 
            status = 'no_show',
            notes = COALESCE(notes, '') || 
                   E'\n---\nMARKED NO-SHOW: ' || NOW()::text ||
                   CASE 
                       WHEN p_staff_notes IS NOT NULL THEN 
                           E'\nStaff Notes: ' || p_staff_notes
                       ELSE ''
                   END,
            updated_at = NOW()
        WHERE id = p_appointment_id;
        
        -- Get updated reliability assessment
        reliability_impact := check_patient_reliability(appointment_record.patient_id, clinic_id_val);
        
        -- Create notification for patient
        INSERT INTO notifications (
            user_id, 
            notification_type, 
            title, 
            message, 
            related_appointment_id,
            scheduled_for
        ) VALUES (
            appointment_record.patient_id,
            'appointment_cancelled', -- Using cancelled type for no-show
            'Missed Appointment',
            format('You missed your appointment on %s at %s with %s. This affects your reliability score.',
                   appointment_record.appointment_date,
                   appointment_record.appointment_time,
                   appointment_record.clinic_name),
            p_appointment_id,
            NOW()
        );
        
        -- Return comprehensive no-show data
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment marked as no-show successfully',
            'data', jsonb_build_object(
                'appointment_id', p_appointment_id,
                'marked_no_show_at', NOW(),
                'marked_by', current_context->>'full_name',
                'patient_impact', jsonb_build_object(
                    'total_no_shows', no_show_count + 1,
                    'reliability_score', reliability_impact->'statistics'->'completion_rate',
                    'risk_level', reliability_impact->>'risk_level',
                    'booking_restrictions', CASE 
                        WHEN (no_show_count + 1) >= 3 THEN 'High-risk patient - require confirmation'
                        WHEN (no_show_count + 1) >= 2 THEN 'Moderate risk - extra reminders recommended'
                        ELSE 'Standard procedures'
                    END
                ),
                'appointment_details', jsonb_build_object(
                    'appointment_date', appointment_record.appointment_date,
                    'appointment_time', appointment_record.appointment_time,
                    'patient_name', appointment_record.patient_name,
                    'doctor_name', appointment_record.doctor_name,
                    'clinic_name', appointment_record.clinic_name
                ),
                'staff_notes', p_staff_notes,
                'next_actions', jsonb_build_array(
                    'Patient notified of missed appointment',
                    'Reliability score updated',
                    'Slot now available for rebooking'
                ) || CASE 
                    WHEN (reliability_impact->>'risk_level') = 'high_risk' THEN
                        jsonb_build_array('ALERT: Patient now high-risk - review booking privileges')
                    ELSE jsonb_build_array()
                END
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'mark_appointment_no_show error for appointment %: %', p_appointment_id, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Failed to mark as no-show. Please try again.');
    END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_appointment(p_appointment_id uuid, p_rejection_reason text, p_rejection_category rejection_category DEFAULT 'other'::rejection_category, p_suggest_reschedule boolean DEFAULT true, p_alternative_dates date[] DEFAULT NULL::date[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    appointment_record RECORD;
    v_current_role TEXT;
    clinic_id_val UUID;
    alternative_slots JSONB;
    rejection_stats RECORD;
    current_user_id UUID;
BEGIN
    
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    current_user_id := (current_context->>'user_id')::UUID;
    
    -- Only staff can reject appointments
    IF v_current_role != 'staff' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff only');
    END IF;
    
    clinic_id_val := (current_context->>'clinic_id')::UUID;
    
    -- Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;
    
    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required');
    END IF;
    
    -- Get comprehensive appointment details
    SELECT 
        a.*,
        c.name as clinic_name,
        c.phone as clinic_phone,
        c.email as clinic_email,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        u.phone as patient_phone,
        COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization) as doctor_name,
        d.specialization as doctor_specialization,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'duration_minutes', s.duration_minutes
            ))
            FROM appointment_services aps
            JOIN services s ON aps.service_id = s.id
            WHERE aps.appointment_id = a.id),
            '[]'::jsonb
        ) as requested_services
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    JOIN users u ON a.patient_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = p_appointment_id
    AND a.clinic_id = clinic_id_val;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment not found or access denied');
    END IF;
    
    -- Check if appointment can be rejected
    IF appointment_record.status NOT IN ('pending', 'confirmed') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Cannot reject appointment with status: %s', appointment_record.status),
            'data', jsonb_build_object(
                'current_status', appointment_record.status,
                'appointment_id', p_appointment_id
            )
        );
    END IF;
    
    -- Get clinic rejection statistics
    SELECT 
        COUNT(*) as total_rejections_this_month
    INTO rejection_stats
    FROM appointments 
    WHERE clinic_id = clinic_id_val 
    AND status = 'cancelled'
    AND cancelled_at >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Skip alternative slots for now to avoid complexity
    alternative_slots := '[]'::jsonb;
    
    -- Transaction: Atomic rejection process
    BEGIN
        -- Update appointment with rejection details
        UPDATE appointments 
        SET 
            status = 'cancelled',
            cancellation_reason = p_rejection_reason,
            cancelled_by = current_user_id,
            cancelled_at = NOW(),
            notes = COALESCE(
                notes || E'\n---\n' || 'REJECTED: ' || p_rejection_reason,
                'REJECTED: ' || p_rejection_reason
            ),
            updated_at = NOW()
        WHERE id = p_appointment_id;
        
        -- Check if the update affected any rows
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Failed to update appointment status');
        END IF;
        
        -- Create basic rejection notification
        INSERT INTO notifications (
            user_id, 
            notification_type, 
            title, 
            message, 
            related_appointment_id,
            scheduled_for
        ) VALUES (
            appointment_record.patient_id,
            'appointment_cancelled',
            'Appointment Cancelled',
            format('Your appointment on %s at %s has been cancelled. Reason: %s. Please contact us at %s to reschedule.',
                   appointment_record.appointment_date::text,
                   appointment_record.appointment_time::text,
                   p_rejection_reason,
                   COALESCE(appointment_record.clinic_phone, 'the clinic')),
            p_appointment_id,
            NOW()
        );
        
        -- Basic analytics logging
        BEGIN
            INSERT INTO analytics_events (
                clinic_id,
                user_id,
                event_type,
                event_data
            ) VALUES (
                clinic_id_val,
                appointment_record.patient_id,
                'appointment_rejected',
                jsonb_build_object(
                    'appointment_id', p_appointment_id,
                    'rejection_reason', p_rejection_reason,
                    'rejection_category', COALESCE(p_rejection_category, 'other'),
                    'rejected_by', current_user_id,
                    'original_date', appointment_record.appointment_date,
                    'original_time', appointment_record.appointment_time
                )
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Log analytics failure but don't fail the whole operation
                RAISE LOG 'Analytics insert failed: %', SQLERRM;
        END;
        
        -- Return comprehensive rejection data
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment rejected successfully',
            'data', jsonb_build_object(
                'appointment_id', p_appointment_id,
                'rejected_at', NOW(),
                'rejected_by', current_context->>'full_name',
                'rejection_details', jsonb_build_object(
                    'reason', p_rejection_reason,
                    'category', COALESCE(p_rejection_category, 'other')
                ),
                'appointment_details', jsonb_build_object(
                    'patient_name', appointment_record.patient_name,
                    'appointment_date', appointment_record.appointment_date,
                    'appointment_time', appointment_record.appointment_time,
                    'doctor_name', appointment_record.doctor_name
                )
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'reject_appointment transaction error for appointment %: % (SQLSTATE: %)', 
                      p_appointment_id, SQLERRM, SQLSTATE;
            RETURN jsonb_build_object('success', false, 'error', 
                format('Rejection failed: %s (State: %s)', SQLERRM, SQLSTATE));
    END;
END;
$function$;

-- ========================================
-- 7. APPOINTMENT RETRIEVAL FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.get_user_appointments(p_status text[] DEFAULT NULL::text[], p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    result_data JSONB;
    user_role TEXT;
    clinic_id_val UUID;
    patient_id_val UUID;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    user_role := current_context->>'user_type';
    
    -- Set date defaults if not provided
    p_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
    p_date_to := COALESCE(p_date_to, CURRENT_DATE + INTERVAL '30 days');
    
    -- Build query based on user role
    CASE user_role
        WHEN 'patient' THEN
            patient_id_val := (current_context->>'user_id')::UUID;
            
            WITH appointment_data AS (
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.duration_minutes,
                    a.status,
                    a.symptoms,
                    a.notes,
                    a.created_at,
                    c.name as clinic_name,
                    c.address as clinic_address,
                    d.first_name || ' ' || d.last_name as doctor_name,
                    d.specialization,
                    COALESCE(
                        (SELECT jsonb_agg(jsonb_build_object(
                            'id', s.id,
                            'name', s.name,
                            'duration_minutes', s.duration_minutes
                        ))
                        FROM appointment_services aps
                        JOIN services s ON aps.service_id = s.id
                        WHERE aps.appointment_id = a.id),
                        '[]'::jsonb
                    ) as services
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.patient_id = patient_id_val
                AND a.appointment_date BETWEEN p_date_from AND p_date_to
                AND (p_status IS NULL OR a.status::text = ANY(p_status))
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT p_limit OFFSET p_offset
            )
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'appointment_date', appointment_date,
                    'appointment_time', appointment_time,
                    'duration_minutes', duration_minutes,
                    'status', status,
                    'symptoms', symptoms,
                    'notes', notes,
                    'created_at', created_at,
                    'clinic', jsonb_build_object(
                        'name', clinic_name,
                        'address', clinic_address
                    ),
                    'doctor', jsonb_build_object(
                        'name', doctor_name,
                        'specialization', specialization
                    ),
                    'services', services
                )
            ) INTO result_data
            FROM appointment_data;
            
        WHEN 'staff' THEN
            clinic_id_val := (current_context->>'clinic_id')::UUID;
            
            WITH appointment_data AS (
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.duration_minutes,
                    a.status,
                    a.symptoms,
                    a.notes,
                    a.created_at,
                    up.first_name || ' ' || up.last_name as patient_name,
                    u.phone as patient_phone,
                    d.first_name || ' ' || d.last_name as doctor_name,
                    d.specialization,
                    COALESCE(
                        (SELECT jsonb_agg(jsonb_build_object(
                            'id', s.id,
                            'name', s.name,
                            'duration_minutes', s.duration_minutes
                        ))
                        FROM appointment_services aps
                        JOIN services s ON aps.service_id = s.id
                        WHERE aps.appointment_id = a.id),
                        '[]'::jsonb
                    ) as services
                FROM appointments a
                JOIN users u ON a.patient_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.clinic_id = clinic_id_val
                AND a.appointment_date BETWEEN p_date_from AND p_date_to
                AND (p_status IS NULL OR a.status::text = ANY(p_status))
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT p_limit OFFSET p_offset
            )
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'appointment_date', appointment_date,
                    'appointment_time', appointment_time,
                    'duration_minutes', duration_minutes,
                    'status', status,
                    'symptoms', symptoms,
                    'notes', notes,
                    'created_at', created_at,
                    'patient', jsonb_build_object(
                        'name', patient_name,
                        'phone', patient_phone
                    ),
                    'doctor', jsonb_build_object(
                        'name', doctor_name,
                        'specialization', specialization
                    ),
                    'services', services
                )
            ) INTO result_data
            FROM appointment_data;
            
        WHEN 'admin' THEN
            WITH appointment_data AS (
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.duration_minutes,
                    a.status,
                    a.symptoms,
                    a.notes,
                    a.created_at,
                    c.name as clinic_name,
                    up.first_name || ' ' || up.last_name as patient_name,
                    u.phone as patient_phone,
                    d.first_name || ' ' || d.last_name as doctor_name,
                    d.specialization,
                    COALESCE(
                        (SELECT jsonb_agg(jsonb_build_object(
                            'id', s.id,
                            'name', s.name,
                            'duration_minutes', s.duration_minutes
                        ))
                        FROM appointment_services aps
                        JOIN services s ON aps.service_id = s.id
                        WHERE aps.appointment_id = a.id),
                        '[]'::jsonb
                    ) as services
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                JOIN users u ON a.patient_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.appointment_date BETWEEN p_date_from AND p_date_to
                AND (p_status IS NULL OR a.status::text = ANY(p_status))
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT p_limit OFFSET p_offset
            )
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'appointment_date', appointment_date,
                    'appointment_time', appointment_time,
                    'duration_minutes', duration_minutes,
                    'status', status,
                    'symptoms', symptoms,
                    'notes', notes,
                    'created_at', created_at,
                    'clinic', jsonb_build_object(
                        'name', clinic_name
                    ),
                    'patient', jsonb_build_object(
                        'name', patient_name,
                        'phone', patient_phone
                    ),
                    'doctor', jsonb_build_object(
                        'name', doctor_name,
                        'specialization', specialization
                    ),
                    'services', services
                )
            ) INTO result_data
            FROM appointment_data;
            
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END CASE;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(result_data, '[]'::jsonb),
        'metadata', jsonb_build_object(
            'user_role', user_role,
            'date_range', jsonb_build_object(
                'from', p_date_from,
                'to', p_date_to
            ),
            'filters', jsonb_build_object(
                'status', p_status
            ),
            'pagination', jsonb_build_object(
                'limit', p_limit,
                'offset', p_offset
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_user_appointments: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to retrieve appointments');
END;
$function$;

-- ========================================
-- 8. UTILITY FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.create_appointment_notification(p_user_id uuid, p_notification_type notification_type, p_appointment_id uuid, p_custom_message text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    notification_id UUID;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Generate appropriate title and message based on type
    CASE p_notification_type
        WHEN 'appointment_confirmed' THEN
            notification_title := 'Appointment Confirmed';
            notification_message := COALESCE(p_custom_message, 'Your appointment has been confirmed.');
        WHEN 'appointment_cancelled' THEN
            notification_title := 'Appointment Cancelled';
            notification_message := COALESCE(p_custom_message, 'Your appointment has been cancelled.');
        WHEN 'appointment_reminder' THEN
            notification_title := 'Appointment Reminder';
            notification_message := COALESCE(p_custom_message, 'You have an upcoming appointment.');
        WHEN 'feedback_request' THEN
            notification_title := 'Share Your Experience';
            notification_message := COALESCE(p_custom_message, 'Please share your feedback about your recent appointment.');
        ELSE
            notification_title := 'Appointment Update';
            notification_message := COALESCE(p_custom_message, 'Your appointment has been updated.');
    END CASE;
    
    -- Insert notification
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        related_appointment_id,
        scheduled_for
    ) VALUES (
        p_user_id,
        p_notification_type,
        notification_title,
        notification_message,
        p_appointment_id,
        NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'notification_id', notification_id,
        'message', 'Notification created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating appointment notification: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to create notification');
END;
$function$;

-- ========================================
-- APPOINTMENT CYCLE SUMMARY
-- ========================================

/*
APPOINTMENT LIFECYCLE:

1. BOOKING PHASE
   - book_appointment(): Patient requests appointment
   - check_appointment_limit(): Validates booking rules
   - check_appointment_availability(): Ensures doctor availability
   - calculate_appointment_duration(): Calculates total time needed

2. APPROVAL PHASE
   - approve_appointment(): Staff approves pending appointment
   - reject_appointment(): Staff rejects appointment with reason
   - create_appointment_notification(): Sends notifications

3. MANAGEMENT PHASE
   - can_cancel_appointment(): Checks if cancellation is allowed
   - cancel_appointment(): Cancels appointment (patient or staff)
   - mark_appointment_no_show(): Marks patient as no-show

4. COMPLETION PHASE
   - complete_appointment(): Marks appointment as completed
   - Creates medical history records
   - Triggers feedback requests

5. RETRIEVAL PHASE
   - get_user_appointments(): Gets appointments based on user role
   - Supports filtering by status, date range, pagination

KEY BUSINESS RULES:
- Rule 1: One appointment per day per patient (across all clinics)
- Rule 2: Maximum 3 future appointments per patient
- Rule 3: Cancellation policy enforcement (24-48 hours notice)
- Rule 5: Strict rebooking policy (some clinics)
- Rule 6: Cross-clinic appointment visibility for care coordination

APPOINTMENT STATUSES:
- 'pending': Awaiting staff approval
- 'confirmed': Approved and scheduled
- 'completed': Successfully completed
- 'cancelled': Cancelled by patient or staff
- 'no_show': Patient didn't attend

TABLES INVOLVED:
- appointments: Core appointment data
- appointment_services: Services linked to appointments
- patient_appointment_limits: Tracks booking limits
- notifications: Appointment-related notifications
- patient_medical_history: Post-appointment records
*/