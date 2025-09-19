

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."appointment_status" AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE TYPE "public"."feedback_type" AS ENUM (
    'general',
    'service',
    'doctor',
    'facility'
);


ALTER TYPE "public"."feedback_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'appointment_reminder',
    'appointment_confirmed',
    'appointment_cancelled',
    'feedback_request',
    'partnership_request'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."partnership_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."partnership_status" OWNER TO "postgres";


CREATE TYPE "public"."rejection_category" AS ENUM (
    'doctor_unavailable',
    'overbooked',
    'patient_request',
    'system_error',
    'other',
    'staff_decision'
);


ALTER TYPE "public"."rejection_category" OWNER TO "postgres";


CREATE TYPE "public"."urgency_level" AS ENUM (
    'normal',
    'high',
    'urgent'
);


ALTER TYPE "public"."urgency_level" OWNER TO "postgres";


CREATE TYPE "public"."user_type" AS ENUM (
    'patient',
    'staff',
    'admin'
);


ALTER TYPE "public"."user_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_appointment"("p_appointment_id" "uuid", "p_staff_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    appointment_record RECORD;
    v_current_role TEXT;
    clinic_id_val UUID;
    doctor_availability BOOLEAN;
    patient_reliability JSONB;  -- ✅ CRITICAL: Missing reliability check
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
    
    -- ✅ FIXED: Proper NULL-safe string concatenation
    SELECT 
        a.*,
        c.name as clinic_name,
        c.appointment_limit_per_patient,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        u.phone as patient_phone,
        -- ✅ FIXED: Handle NULL doctor names safely
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
    
    -- ✅ CRITICAL: Check patient reliability (was completely missing!)
    patient_reliability := check_patient_reliability(
        appointment_record.patient_id, 
        clinic_id_val, 
        6  -- 6 months lookback
    );
    
    -- Transaction: Atomic approval process
    BEGIN
        -- ✅ ENHANCED: Update appointment with reliability notes
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
            -- ✅ CRITICAL: Add reliability assessment to notes
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
        
        -- ✅ ENHANCED: Return comprehensive approval data with reliability
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
                -- ✅ CRITICAL: Include patient reliability data for staff
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
$$;


ALTER FUNCTION "public"."approve_appointment"("p_appointment_id" "uuid", "p_staff_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."book_appointment"("p_clinic_id" "uuid", "p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_ids" "uuid"[], "p_symptoms" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    patient_id_val UUID;
    appointment_id UUID;
    validation_result RECORD;
    appointment_limit_check JSONB;
    reliability_check JSONB;
    rate_limit_key TEXT;
    patient_email TEXT;
BEGIN
    
    current_context := get_current_user_context();

    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;

    IF (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only patients can book appointments');
    END IF;

    patient_id_val := (current_context->>'user_id')::UUID;
    rate_limit_key := patient_id_val::text;

    -- Rate limiting
    IF NOT check_rate_limit(rate_limit_key, 'appointment_booking', 5, 60) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Too many booking attempts. Please wait before trying again.',
            'retry_after_minutes', 60
        );
    END IF;

    -- ✅ FIXED: Input validation - Doctor is NOW REQUIRED
    IF p_clinic_id IS NULL OR p_doctor_id IS NULL OR 
       p_appointment_date IS NULL OR p_appointment_time IS NULL OR
       p_service_ids IS NULL OR array_length(p_service_ids, 1) < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'All fields required: clinic, doctor, date, time, and at least 1 service');
    END IF;

    IF array_length(p_service_ids, 1) > 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum 3 services allowed per appointment');
    END IF;

    IF p_appointment_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment must be scheduled for a future date');
    END IF;

    -- ✅ CRITICAL: Check appointment limits (1 per day rule with cancellation logic)
    appointment_limit_check := check_appointment_limit(patient_id_val, p_clinic_id, p_appointment_date);
    
    IF NOT (appointment_limit_check->>'allowed')::boolean THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', appointment_limit_check->>'message',
            'error_code', appointment_limit_check->>'reason',
            'data', appointment_limit_check->'data'
        );
    END IF;

    -- Get patient email
    SELECT u.email INTO patient_email
    FROM users u WHERE u.id = patient_id_val;

    -- ✅ ENHANCED: Validation query with REQUIRED doctor
    WITH comprehensive_validation AS (
        SELECT 
            c.id as clinic_id,
            c.name as clinic_name,
            c.appointment_limit_per_patient,
            c.cancellation_policy_hours,
            c.is_active as clinic_active,
            
            -- ✅ FIXED: Doctor is REQUIRED, so INNER JOIN
            d.id as doctor_id,
            d.specialization,
            d.first_name as doctor_first_name,
            d.last_name as doctor_last_name,
            d.is_available as doctor_available,
            dc.is_active as doctor_clinic_active,
            
            -- Check for existing patient conflicts at same time
            (SELECT COUNT(*) FROM appointments 
             WHERE patient_id = patient_id_val
             AND appointment_date = p_appointment_date
             AND appointment_time = p_appointment_time
             AND status NOT IN ('cancelled', 'completed')) as patient_time_conflicts,
            
            -- ✅ NEW: Check for doctor conflicts
            (SELECT COUNT(*) FROM appointments
             WHERE doctor_id = p_doctor_id
             AND appointment_date = p_appointment_date
             AND appointment_time <= p_appointment_time + (services_data.total_duration || ' minutes')::INTERVAL
             AND (appointment_time + (duration_minutes || ' minutes')::INTERVAL) > p_appointment_time
             AND status NOT IN ('cancelled', 'completed')) as doctor_conflicts,
            
            services_data.total_duration,
            services_data.total_min_price,
            services_data.total_max_price,
            services_data.service_details,
            services_data.valid_service_count
            
        FROM clinics c
        INNER JOIN doctors d ON d.id = p_doctor_id  -- ✅ INNER JOIN - doctor required
        INNER JOIN doctor_clinics dc ON d.id = dc.doctor_id AND c.id = dc.clinic_id
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
    
    -- ✅ Validation checks
    IF validation_result.clinic_id IS NULL OR NOT validation_result.clinic_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found or inactive');
    END IF;
    
    -- ✅ FIXED: Doctor validation (now required)
    IF validation_result.doctor_id IS NULL OR NOT validation_result.doctor_available OR NOT validation_result.doctor_clinic_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected doctor is not available at this clinic');
    END IF;
    
    IF validation_result.patient_time_conflicts > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have an appointment at this exact time');
    END IF;

    -- ✅ NEW: Check doctor availability conflicts
    IF validation_result.doctor_conflicts > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor is not available at this time slot');
    END IF;

    -- Service validation
    IF validation_result.valid_service_count != array_length(p_service_ids, 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'One or more selected services are not available');
    END IF;
    
    IF validation_result.total_duration > 480 THEN  -- 8 hours max
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Total service duration exceeds maximum allowed (8 hours)',
            'data', jsonb_build_object(
                'total_duration', validation_result.total_duration,
                'max_allowed', 480
            )
        );
    END IF;

    IF validation_result.total_duration < 15 THEN  -- 15 minutes minimum
        RETURN jsonb_build_object('success', false, 'error', 'Minimum appointment duration is 15 minutes');
    END IF;

    -- ✅ ENHANCED: Final availability check using helper function
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
    
    -- ✅ Create appointment with REQUIRED doctor
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
            p_doctor_id,  -- ✅ REQUIRED: Always has a doctor
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

        -- ✅ ENHANCED: Return with required doctor data
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Appointment booked successfully with Dr. ' || validation_result.doctor_first_name || ' ' || validation_result.doctor_last_name,
            'data', jsonb_build_object(
                'appointment_id', appointment_id,
                'appointment_date', p_appointment_date,
                'appointment_time', p_appointment_time,
                'status', 'pending',
                'duration_minutes', validation_result.total_duration,
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
                'pricing', jsonb_build_object(
                    'total_min_price', validation_result.total_min_price,
                    'total_max_price', validation_result.total_max_price,
                    'currency', 'PHP'
                ),
                'patient', jsonb_build_object(
                    'id', patient_id_val,
                    'name', current_context->>'full_name',
                    'email', patient_email
                ),
                'booking_details', jsonb_build_object(
                    'booked_at', NOW(),
                    'symptoms', p_symptoms,
                    'requires_approval', true,
                    'next_step', 'Wait for clinic approval',
                    'estimated_approval_time', '24 hours'
                ),
                'reliability_assessment', reliability_check,
                'booking_tips', jsonb_build_array(
                    'You will receive a confirmation notification once approved',
                    format('Your appointment is with Dr. %s (%s)', 
                           validation_result.doctor_first_name || ' ' || validation_result.doctor_last_name,
                           validation_result.specialization),
                    'Please arrive 15 minutes before your appointment',
                    format('Cancellation must be made at least %s hours in advance', 
                           validation_result.cancellation_policy_hours)
                )
            )
        );

    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object('success', false, 'error', 'Appointment time conflict detected');
        WHEN OTHERS THEN
            RAISE LOG 'book_appointment error for patient %: %', patient_id_val, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Booking failed. Please try again.');
    END;
END;
$$;


ALTER FUNCTION "public"."book_appointment"("p_clinic_id" "uuid", "p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_ids" "uuid"[], "p_symptoms" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_appointment_duration"("p_service_ids" "uuid"[], "p_clinic_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_appointment_duration"("p_service_ids" "uuid"[], "p_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_cancel_appointment"("p_appointment_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    appointment_record RECORD;
    hours_until NUMERIC;
BEGIN
    -- Get appointment with policy in one query
    SELECT 
        a.*,
        COALESCE(c.cancellation_policy_hours, 24) as policy_hours,
        EXTRACT(EPOCH FROM (
            (a.appointment_date + a.appointment_time) - NOW()
        )) / 3600 as hours_until_appointment
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    WHERE a.id = p_appointment_id;

    -- Check if found and valid status
    IF NOT FOUND OR appointment_record.status NOT IN ('pending', 'confirmed') THEN
        RETURN FALSE;
    END IF;

    -- Log for debugging
    RAISE LOG 'Appointment %: Hours until = %, Policy = %', 
              p_appointment_id, appointment_record.hours_until_appointment, appointment_record.policy_hours;

    -- Return true if enough time remains
    RETURN appointment_record.hours_until_appointment >= appointment_record.policy_hours;

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in can_cancel_appointment: %', SQLERRM;
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_cancel_appointment"("p_appointment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_appointment"("p_appointment_id" "uuid", "p_cancellation_reason" "text", "p_cancelled_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    current_user_id UUID;
    current_user_role TEXT;
    appointment_record RECORD;
    can_cancel BOOLEAN;
    cancelling_user_name TEXT;
    notification_recipients UUID[];
BEGIN
    
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    current_user_id := (current_context->>'user_id')::UUID;
    current_user_role := current_context->>'user_type';
    
    -- ✅ ENHANCED: Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;
    
    IF p_cancellation_reason IS NULL OR TRIM(p_cancellation_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cancellation reason is required');
    END IF;
    
    -- Determine who is cancelling
    p_cancelled_by := COALESCE(p_cancelled_by, current_user_id);
    cancelling_user_name := current_context->>'full_name';
    
    -- ✅ OPTIMIZED: Get appointment details with all related info in one query
    SELECT 
        a.*,
        c.name as clinic_name,
        c.cancellation_policy_hours,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        d.first_name || ' ' || d.last_name as doctor_name
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
    
    -- ✅ ENHANCED: Access control validation
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
            -- Admin can cancel any appointment
            NULL;
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
    
    -- ✅ ENHANCED: Policy validation (only for patients and non-completed appointments)
    IF current_user_role = 'patient' AND appointment_record.status NOT IN ('completed') THEN
        can_cancel := can_cancel_appointment(p_appointment_id);
        
        IF NOT can_cancel THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', format('Cancellation not allowed. Must cancel at least %s hours before appointment', 
                              COALESCE(appointment_record.cancellation_policy_hours, 24)),
                'data', jsonb_build_object(
                    'policy_hours', COALESCE(appointment_record.cancellation_policy_hours, 24),
                    'appointment_datetime', appointment_record.appointment_date || ' ' || appointment_record.appointment_time
                )
            );
        END IF;
    END IF;
    
    -- ✅ TRANSACTION: Atomic cancellation
    BEGIN
        -- Update appointment
        UPDATE appointments 
        SET 
            status = 'cancelled',
            cancellation_reason = p_cancellation_reason,
            cancelled_by = p_cancelled_by,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = p_appointment_id;
        
        -- ✅ ENHANCED: Smart notification system
        notification_recipients := ARRAY[]::UUID[];
        
        IF current_user_role = 'patient' THEN
            -- Patient cancelled - notify clinic staff
            SELECT ARRAY_AGG(u.id) INTO notification_recipients
            FROM staff_profiles sp
            JOIN user_profiles up ON sp.user_profile_id = up.id
            JOIN users u ON up.user_id = u.id
            WHERE sp.clinic_id = appointment_record.clinic_id 
            AND sp.is_active = true;
            
            -- Insert notifications for all active staff
            INSERT INTO notifications (user_id, notification_type, title, message, related_appointment_id)
            SELECT 
                unnest(notification_recipients), 
                'appointment_cancelled', 
                'Patient Cancelled Appointment',
                format('Patient %s cancelled appointment on %s at %s. Reason: %s',
                       appointment_record.patient_name,
                       appointment_record.appointment_date,
                       appointment_record.appointment_time,
                       p_cancellation_reason),
                p_appointment_id;
                
        ELSIF current_user_role IN ('staff', 'admin') THEN
            -- Staff/admin cancelled - notify patient
            INSERT INTO notifications (user_id, notification_type, title, message, related_appointment_id)
            VALUES (
                appointment_record.patient_id,
                'appointment_cancelled',
                'Appointment Cancelled',
                format('Your appointment on %s at %s has been cancelled by %s. Reason: %s',
                       appointment_record.appointment_date,
                       appointment_record.appointment_time,
                       cancelling_user_name,
                       p_cancellation_reason),
                p_appointment_id
            );
        END IF;
        
        -- ✅ ENHANCED: Return comprehensive cancellation details
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
                'notifications_sent', array_length(notification_recipients, 1),
                'cancelled_by_role', current_user_role,
                'refund_eligible', (current_user_role != 'patient'), -- Staff/admin cancellations eligible for refund
                'policy_compliant', CASE 
                    WHEN current_user_role = 'patient' THEN can_cancel 
                    ELSE true 
                END
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'cancel_appointment error for appointment %: %', p_appointment_id, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Cancellation failed. Please try again.');
    END;
END;
$$;


ALTER FUNCTION "public"."cancel_appointment"("p_appointment_id" "uuid", "p_cancellation_reason" "text", "p_cancelled_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_appointment_availability"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration_minutes" integer DEFAULT NULL::integer, "p_exclude_appointment_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    conflict_count INTEGER;
    end_time TIME;
    clinic_operating_hours JSONB;
    is_within_hours BOOLEAN := false;
BEGIN
    -- Input validation
    IF p_doctor_id IS NULL OR p_appointment_date IS NULL OR p_appointment_time IS NULL THEN
        RETURN FALSE;
    END IF;

    -- ✅ Validate appointment is in future
    IF p_appointment_date < CURRENT_DATE OR 
       (p_appointment_date = CURRENT_DATE AND p_appointment_time <= CURRENT_TIME) THEN
        RETURN FALSE;
    END IF;

    -- ✅ Duration check (now NULL by default if not provided)
    IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
        p_duration_minutes := 30; -- fallback default
    END IF;

    end_time := p_appointment_time + (p_duration_minutes || ' minutes')::INTERVAL;

    -- ✅ Check clinic operating hours
    SELECT c.operating_hours INTO clinic_operating_hours
    FROM clinics c
    JOIN doctor_clinics dc ON c.id = dc.clinic_id
    WHERE dc.doctor_id = p_doctor_id AND dc.is_active = true
    LIMIT 1;

    IF clinic_operating_hours IS NOT NULL THEN
        -- Simplified hours check (you can enhance this based on your JSON structure)
        is_within_hours := true; -- Placeholder
    ELSE
        is_within_hours := true; -- Default to available if no hours set
    END IF;

    IF NOT is_within_hours THEN
        RETURN FALSE;
    END IF;

    -- ✅ Check for appointment conflicts
    SELECT COUNT(*) INTO conflict_count
    FROM public.appointments
    WHERE 
        doctor_id = p_doctor_id AND
        appointment_date = p_appointment_date AND
        status NOT IN ('cancelled', 'no_show') AND
        (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id) AND
        (
            -- New appointment starts during existing appointment
            (appointment_time <= p_appointment_time AND 
             (appointment_time + (duration_minutes || ' minutes')::INTERVAL) > p_appointment_time) OR
            -- New appointment ends during existing appointment  
            (appointment_time < end_time AND appointment_time >= p_appointment_time) OR
            -- New appointment completely contains existing appointment
            (p_appointment_time <= appointment_time AND end_time >= (appointment_time + (duration_minutes || ' minutes')::INTERVAL))
        );

    RETURN conflict_count = 0;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in check_appointment_availability: %', SQLERRM;
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."check_appointment_availability"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration_minutes" integer, "p_exclude_appointment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_appointment_limit"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    clinic_current_count INTEGER := 0;
    clinic_limit INTEGER;
    daily_appointment_count INTEGER := 0;
    existing_appointment RECORD;
BEGIN
    -- Input validation
    IF p_patient_id IS NULL OR p_clinic_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'invalid_parameters',
            'message', 'Patient ID and Clinic ID are required'
        );
    END IF;
    
    -- Get clinic's appointment limit
    SELECT appointment_limit_per_patient INTO clinic_limit
    FROM public.clinics 
    WHERE id = p_clinic_id AND is_active = true;
    
    IF clinic_limit IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'clinic_not_found',
            'message', 'Clinic not found or inactive'
        );
    END IF;
    
    -- ✅ NEW: Check daily limit (1 appointment per day across ALL clinics)
    IF p_appointment_date IS NOT NULL THEN
        SELECT COUNT(*) INTO daily_appointment_count
        FROM public.appointments 
        WHERE patient_id = p_patient_id 
        AND appointment_date = p_appointment_date
        AND status NOT IN ('cancelled', 'no_show');
        
        IF daily_appointment_count > 0 THEN
            -- Get existing appointment details
            SELECT 
                a.id,
                a.appointment_time,
                c.name as clinic_name,
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
                    'policy', 'One appointment per day limit'
                )
            );
        END IF;
    END IF;
    
    -- ✅ FIXED: Get current appointment count per clinic
    SELECT COALESCE(pal.current_count, 0) INTO clinic_current_count
    FROM public.patient_appointment_limits pal
    WHERE pal.patient_id = p_patient_id AND pal.clinic_id = p_clinic_id;
    
    -- If no record found, default to 0
    IF NOT FOUND THEN
        clinic_current_count := 0;
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
    
    -- ✅ SUCCESS: Patient can book
    RETURN jsonb_build_object(
        'allowed', true,
        'message', 'Appointment booking allowed',
        'data', jsonb_build_object(
            'clinic_appointments', clinic_current_count,
            'clinic_limit', clinic_limit,
            'daily_appointments', daily_appointment_count
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in check_appointment_limit: %', SQLERRM;
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'system_error',
            'message', 'Unable to verify appointment limits'
        );
END;
$$;


ALTER FUNCTION "public"."check_appointment_limit"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_patient_reliability"("p_patient_id" "uuid", "p_clinic_id" "uuid" DEFAULT NULL::"uuid", "p_lookback_months" integer DEFAULT 6) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_catalog'
    AS $$
DECLARE
    reliability_stats RECORD;
    risk_level TEXT;
    recommendations TEXT[];
    lookback_date DATE;
BEGIN
    -- Input validation
    IF p_patient_id IS NULL THEN
        RETURN jsonb_build_object(
            'reliable', true,
            'risk_level', 'unknown',
            'message', 'Invalid patient ID'
        );
    END IF;
    
    lookback_date := CURRENT_DATE - (p_lookback_months || ' months')::INTERVAL;
    
    -- ✅ COMPREHENSIVE: Get patient appointment statistics
    WITH appointment_stats AS (
        SELECT 
            COUNT(*) as total_appointments,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
            COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
            COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = p_patient_id) as patient_cancelled_count,
            COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by != p_patient_id) as clinic_cancelled_count,
            
            -- Recent pattern (last 30 days)
            COUNT(*) FILTER (WHERE appointment_date >= CURRENT_DATE - INTERVAL '30 days') as recent_appointments,
            COUNT(*) FILTER (WHERE appointment_date >= CURRENT_DATE - INTERVAL '30 days' AND status = 'no_show') as recent_no_shows,
            COUNT(*) FILTER (WHERE appointment_date >= CURRENT_DATE - INTERVAL '30 days' AND status = 'cancelled' AND cancelled_by = p_patient_id) as recent_cancellations,
            
            -- Late cancellations (within policy hours)
            COUNT(*) FILTER (WHERE 
                status = 'cancelled' 
                AND cancelled_by = p_patient_id
                AND cancelled_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (cancelled_at - (appointment_date + appointment_time))) / 3600 < 24  -- Less than 24h notice
            ) as late_cancellations
            
        FROM public.appointments a
        WHERE a.patient_id = p_patient_id
        AND a.appointment_date >= lookback_date
        AND (p_clinic_id IS NULL OR a.clinic_id = p_clinic_id)
    )
    SELECT 
        *,
        CASE 
            WHEN total_appointments = 0 THEN 0
            ELSE ROUND((completed_appointments::NUMERIC / total_appointments * 100), 1)
        END as completion_rate,
        
        CASE 
            WHEN total_appointments = 0 THEN 0
            ELSE ROUND(((no_show_count + patient_cancelled_count)::NUMERIC / total_appointments * 100), 1) 
        END as unreliability_rate
        
    INTO reliability_stats FROM appointment_stats;
    
    -- ✅ RISK ASSESSMENT: Determine risk level and recommendations
    IF reliability_stats.total_appointments = 0 THEN
        risk_level := 'new_patient';
        recommendations := ARRAY['New patient - monitor first few appointments'];
        
    ELSIF reliability_stats.unreliability_rate >= 50 THEN
        risk_level := 'high_risk';
        recommendations := ARRAY[
            'Require confirmation call 24h before appointment',
            'Consider requiring deposit for future appointments', 
            'Recommend shorter booking window',
            'Flag for clinic manager review'
        ];
        
    ELSIF reliability_stats.unreliability_rate >= 30 OR reliability_stats.recent_no_shows >= 2 THEN
        risk_level := 'moderate_risk';
        recommendations := ARRAY[
            'Send extra appointment reminders',
            'Confirm appointment 24h in advance',
            'Review cancellation policy with patient'
        ];
        
    ELSIF reliability_stats.completion_rate >= 90 THEN
        risk_level := 'reliable';
        recommendations := ARRAY['Reliable patient - standard procedures'];
        
    ELSE
        risk_level := 'low_risk';
        recommendations := ARRAY['Standard appointment procedures'];
    END IF;
    
    RETURN jsonb_build_object(
        'reliable', risk_level IN ('reliable', 'low_risk', 'new_patient'),
        'risk_level', risk_level,
        'message', format('Patient reliability: %s (%s%% completion rate)', 
                         risk_level, reliability_stats.completion_rate),
        'statistics', jsonb_build_object(
            'total_appointments', reliability_stats.total_appointments,
            'completed_appointments', reliability_stats.completed_appointments,
            'completion_rate', reliability_stats.completion_rate,
            'no_show_count', reliability_stats.no_show_count,
            'patient_cancellations', reliability_stats.patient_cancelled_count,
            'clinic_cancellations', reliability_stats.clinic_cancelled_count,
            'late_cancellations', reliability_stats.late_cancellations,
            'unreliability_rate', reliability_stats.unreliability_rate,
            'lookback_period_months', p_lookback_months
        ),
        'recent_pattern', jsonb_build_object(
            'last_30_days_appointments', reliability_stats.recent_appointments,
            'recent_no_shows', reliability_stats.recent_no_shows,
            'recent_cancellations', reliability_stats.recent_cancellations
        ),
        'recommendations', recommendations,
        'approval_flags', jsonb_build_object(
            'require_confirmation', risk_level IN ('high_risk', 'moderate_risk'),
            'require_deposit', risk_level = 'high_risk',
            'manager_review', risk_level = 'high_risk',
            'extra_reminders', risk_level IN ('high_risk', 'moderate_risk')
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in check_patient_reliability: %', SQLERRM;
        RETURN jsonb_build_object(
            'reliable', true,  -- Fail open for availability
            'risk_level', 'unknown',
            'message', 'Unable to assess patient reliability'
        );
END;
$$;


ALTER FUNCTION "public"."check_patient_reliability"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_lookback_months" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_user_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_time_window_minutes" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_attempts INTEGER;
    time_window_start TIMESTAMP WITH TIME ZONE;
    rate_record RECORD;
BEGIN
    -- Compute cutoff time window
    time_window_start := NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;

    -- ✅ FIXED: Clean up old entries first
    DELETE FROM rate_limits 
    WHERE last_attempt < time_window_start
      AND blocked_until IS NULL;

    -- ✅ FIXED: Use UPSERT to handle concurrent inserts
    INSERT INTO rate_limits (user_identifier, action_type, attempt_count, first_attempt, last_attempt)
    VALUES (p_user_identifier, p_action_type, 1, NOW(), NOW())
    ON CONFLICT (user_identifier, action_type) 
    DO UPDATE SET 
        last_attempt = NOW(),
        attempt_count = CASE 
            WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW() THEN
                rate_limits.attempt_count -- Keep existing count if still blocked
            WHEN rate_limits.last_attempt < time_window_start THEN
                1 -- Reset if outside time window
            ELSE
                rate_limits.attempt_count + 1 -- Increment if within window
        END,
        blocked_until = CASE
            WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW() THEN
                rate_limits.blocked_until -- Keep existing block
            WHEN rate_limits.last_attempt < time_window_start THEN
                NULL -- Clear block if outside time window
            ELSE
                rate_limits.blocked_until -- Keep existing state
        END
    RETURNING attempt_count, blocked_until INTO rate_record;

    -- ✅ Check if currently blocked
    IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > NOW() THEN
        RETURN FALSE;
    END IF;

    -- ✅ Check if we've exceeded attempts
    IF rate_record.attempt_count >= p_max_attempts THEN
        -- ✅ Block the user
        UPDATE rate_limits 
        SET blocked_until = CASE p_action_type
            WHEN 'login' THEN NOW() + INTERVAL '15 minutes'
            WHEN 'appointment_booking' THEN NOW() + INTERVAL '1 hour'
            WHEN 'feedback_submission' THEN NOW() + INTERVAL '24 hours'
            WHEN 'clinic_search' THEN NOW() + INTERVAL '5 minutes'
            ELSE NOW() + INTERVAL '1 hour'
        END
        WHERE user_identifier = p_user_identifier
          AND action_type = p_action_type;
        
        RETURN FALSE;
    END IF;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        -- ✅ Log error and fail open for availability
        RAISE LOG 'Rate limit error for % %: %', p_user_identifier, p_action_type, SQLERRM;
        RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_user_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_time_window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_appointment"("p_appointment_id" "uuid", "p_completion_notes" "text" DEFAULT NULL::"text", "p_services_completed" "uuid"[] DEFAULT NULL::"uuid"[], "p_follow_up_required" boolean DEFAULT false, "p_follow_up_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    appointment_record RECORD;
    v_current_role TEXT;
    clinic_id_val UUID;
    completed_services JSONB;
BEGIN
    
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
    
    -- ✅ ENHANCED: Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;
    
    -- ✅ OPTIMIZED: Get appointment with all related service data
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
    
    -- ✅ ENHANCED: Status validation
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
    
    -- ✅ ENHANCED: Validate appointment date/time logic
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
    
    -- ✅ ENHANCED: Validate services completed against appointment services
    IF p_services_completed IS NOT NULL THEN
        -- Get details of completed services for validation
        SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'was_scheduled', s.id = ANY(
                SELECT (jsonb_array_elements(appointment_record.appointment_services)->>'id')::UUID
            )
        )) INTO completed_services
        FROM services s 
        WHERE s.id = ANY(p_services_completed)
        AND s.clinic_id = clinic_id_val;
    END IF;
    
    -- ✅ TRANSACTION: Atomic completion process
    BEGIN
        -- Update appointment status with completion details
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
        
        -- ✅ ENHANCED: Create medical history entry if services were provided
        IF p_completion_notes IS NOT NULL OR p_services_completed IS NOT NULL THEN
            INSERT INTO patient_medical_history (
                patient_id,
                appointment_id,
                created_by,
                visit_date,
                diagnosis,
                treatment_provided,
                medications,
                follow_up_required,
                follow_up_notes,
                visit_notes
            ) VALUES (
                appointment_record.patient_id,
                p_appointment_id,
                (current_context->>'user_id')::UUID,
                appointment_record.appointment_date,
                NULL, -- Diagnosis can be updated separately
                CASE 
                    WHEN p_services_completed IS NOT NULL THEN
                        (SELECT string_agg(name, ', ') FROM services WHERE id = ANY(p_services_completed))
                    ELSE 'General consultation'
                END,
                NULL, -- Medications can be added separately
                p_follow_up_required,
                p_follow_up_notes,
                p_completion_notes
            );
        END IF;
        
        -- ✅ ENHANCED: Create feedback request notification with delay
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
            NOW() + INTERVAL '2 hours' -- Delay feedback request
        );
        
        -- ✅ ENHANCED: If follow-up required, create reminder for staff
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
                NOW() + INTERVAL '1 week' -- Follow-up reminder in 1 week
            );
        END IF;
        
        -- ✅ ENHANCED: Return comprehensive completion data
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
                    'follow_up_notes', p_follow_up_notes,
                    'medical_history_created', (p_completion_notes IS NOT NULL OR p_services_completed IS NOT NULL)
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
                ),
                'next_actions', CASE 
                    WHEN p_follow_up_required THEN
                        jsonb_build_array(
                            'Schedule follow-up appointment',
                            'Monitor patient feedback',
                            'Update medical records'
                        )
                    ELSE
                        jsonb_build_array(
                            'Monitor patient feedback',
                            'Archive appointment records'
                        )
                END
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'complete_appointment error for appointment %: %', p_appointment_id, SQLERRM;
            RETURN jsonb_build_object('success', false, 'error', 'Completion failed. Please try again.');
    END;
END;
$$;


ALTER FUNCTION "public"."complete_appointment"("p_appointment_id" "uuid", "p_completion_notes" "text", "p_services_completed" "uuid"[], "p_follow_up_required" boolean, "p_follow_up_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_appointment_notification"("p_user_id" "uuid", "p_notification_type" "public"."notification_type", "p_appointment_id" "uuid", "p_custom_message" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    appointment_info RECORD;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Get appointment info for context
    SELECT 
        a.appointment_date,
        a.appointment_time,
        c.name as clinic_name
    INTO appointment_info
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    WHERE a.id = p_appointment_id;
    
    -- Build notification content based on type
    CASE p_notification_type
        WHEN 'appointment_reminder' THEN
            notification_title := 'Appointment Reminder';
            notification_message := 'Your appointment is tomorrow at ' || 
                appointment_info.clinic_name || ' on ' || 
                appointment_info.appointment_date || ' at ' || 
                appointment_info.appointment_time;
                
        WHEN 'appointment_confirmed' THEN
            notification_title := 'Appointment Confirmed';
            notification_message := 'Your appointment has been confirmed for ' || 
                appointment_info.appointment_date || ' at ' || 
                appointment_info.appointment_time;
                
        WHEN 'appointment_cancelled' THEN
            notification_title := 'Appointment Cancelled';
            notification_message := COALESCE(p_custom_message, 
                'Your appointment on ' || appointment_info.appointment_date || ' has been cancelled.');
                
        WHEN 'feedback_request' THEN
            notification_title := 'Please Share Your Feedback';
            notification_message := 'How was your appointment? Your feedback helps us improve our service.';
            
        ELSE
            notification_title := 'Appointment Update';
            notification_message := COALESCE(p_custom_message, 'Your appointment has been updated.');
    END CASE;
    
    -- Create notification
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        related_appointment_id,
        scheduled_for,
        created_at
    ) VALUES (
        p_user_id,
        p_notification_type,
        notification_title,
        notification_message,
        p_appointment_id,
        CASE 
            WHEN p_notification_type = 'appointment_reminder' 
            THEN appointment_info.appointment_date - INTERVAL '1 day'
            ELSE NOW()
        END,
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Notification created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_appointment_notification"("p_user_id" "uuid", "p_notification_type" "public"."notification_type", "p_appointment_id" "uuid", "p_custom_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_appointment_with_validation"("p_doctor_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_type" character varying DEFAULT NULL::character varying, "p_symptoms" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    patient_id_val UUID;
    appointment_id UUID;
    user_email VARCHAR(255);
BEGIN
    -- Input validation
    IF p_doctor_id IS NULL OR p_clinic_id IS NULL OR p_appointment_date IS NULL OR p_appointment_time IS NULL THEN
        RAISE EXCEPTION 'Required appointment parameters cannot be null';
    END IF;
    
    -- Get current user info
    SELECT id, email INTO patient_id_val, user_email
    FROM public.users WHERE auth_user_id = auth.uid();
    
    IF patient_id_val IS NULL THEN
        RAISE EXCEPTION 'User not found or not authenticated';
    END IF;
    
    -- Rate limiting check
    IF NOT public.check_rate_limit(user_email, 'appointment_booking', 5, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded. Maximum 5 bookings per hour.';
    END IF;
    
    -- Check appointment limit
    IF NOT public.check_appointment_limit(patient_id_val, p_clinic_id) THEN
        RAISE EXCEPTION 'Appointment limit reached for this clinic.';
    END IF;
    
    -- Check availability
    IF NOT public.check_appointment_availability(p_doctor_id, p_appointment_date, p_appointment_time) THEN
        RAISE EXCEPTION 'Doctor is not available at this time.';
    END IF;
    
    -- Create appointment
    INSERT INTO public.appointments (
        patient_id, doctor_id, clinic_id, appointment_date, 
        appointment_time, service_type, symptoms
    ) VALUES (
        patient_id_val, p_doctor_id, p_clinic_id, p_appointment_date,
        p_appointment_time, p_service_type, p_symptoms
    ) RETURNING id INTO appointment_id;
    
    RETURN appointment_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating appointment: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_appointment_with_validation"("p_doctor_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_type" character varying, "p_symptoms" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_staff_invitation"("p_email" character varying, "p_clinic_id" "uuid", "p_position" character varying, "p_department" character varying DEFAULT NULL::character varying, "p_first_name" character varying DEFAULT NULL::character varying, "p_last_name" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    invitation_id UUID;
    temp_password TEXT;
    invitation_token TEXT;
    result JSONB;
    current_user_context JSONB;
    clinic_name VARCHAR;
BEGIN
    -- ✅ SECURITY: Get current user context
    current_user_context := get_current_user_context();
    
    IF NOT (current_user_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF (current_user_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only admins can invite staff');
    END IF;
    
    -- Validate required fields
    IF p_email IS NULL OR p_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email is required');
    END IF;
    
    IF p_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic ID is required');
    END IF;
    
    -- Check if clinic exists
    SELECT name INTO clinic_name FROM clinics WHERE id = p_clinic_id;
    IF clinic_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found');
    END IF;
    
    -- Check if invitation already exists and is pending
    IF EXISTS (
        SELECT 1 FROM staff_invitations 
        WHERE email = p_email 
        AND status = 'pending' 
        AND expires_at > NOW()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending invitation already exists for this email');
    END IF;
    
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User with this email already exists');
    END IF;
    
    -- Generate temporary password and invitation token
    temp_password := encode(gen_random_bytes(12), 'base64');
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create invitation record
    INSERT INTO staff_invitations (
        email,
        clinic_id,
        position,
        department,
        temp_password,
        expires_at,
        status
    ) VALUES (
        p_email,
        p_clinic_id,
        COALESCE(p_position, 'Staff'),
        p_department,
        temp_password,
        NOW() + INTERVAL '7 days',
        'pending'
    ) RETURNING id INTO invitation_id;
    
    -- Return invitation details
    SELECT jsonb_build_object(
        'success', true,
        'invitation_id', invitation_id,
        'email', p_email,
        'clinic_name', clinic_name,
        'temp_password', temp_password,
        'invitation_token', invitation_token,
        'expires_at', NOW() + INTERVAL '7 days',
        'invitation_link', format(
            '%s/staff-signup?invitation=%s&token=%s', 
            'https://yourdomain.com', -- Replace with your domain
            invitation_id::text,
            invitation_token
        ),
        'message', format(
            'Staff invitation created for %s at %s. Expires in 7 days.',
            p_email,
            clinic_name
        )
    ) INTO result;
    
    RAISE LOG 'Staff invitation created: ID=%, Email=%, Clinic=%s', invitation_id, p_email, clinic_name;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating staff invitation: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to create staff invitation: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_staff_invitation"("p_email" character varying, "p_clinic_id" "uuid", "p_position" character varying, "p_department" character varying, "p_first_name" character varying, "p_last_name" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    new_user_id UUID;
    new_profile_id UUID;
    user_type_val user_type := 'patient';
    user_phone VARCHAR(20);
    cleaned_phone VARCHAR(20);
    user_first_name VARCHAR(100) := 'User';
    user_last_name VARCHAR(100) := 'Name';
BEGIN
    -- Enhanced input validation
    IF NEW.id IS NULL THEN
        RAISE LOG 'Skipping user creation: auth user ID is NULL';
        RETURN NEW;
    END IF;
    
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RAISE LOG 'Skipping user creation: email is NULL or empty for user %', NEW.id;
        RETURN NEW;
    END IF;

    -- Check if user already exists (prevent duplicate creation)
    IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
        RAISE LOG 'User already exists for auth_user_id: %', NEW.id;
        RETURN NEW;
    END IF;

    -- Extract metadata with safe error handling
    BEGIN
        -- Get user type
        IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data ? 'user_type' THEN
            user_type_val := (NEW.raw_user_meta_data->>'user_type')::user_type;
        END IF;
        
        -- Get names
        IF NEW.raw_user_meta_data IS NOT NULL THEN
            user_first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'User');
            user_last_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), 'Name');
        END IF;
        
        -- ✅ REFACTOR: Phone is now completely optional - no blocking on invalid/missing phone
        user_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
        
        IF user_phone IS NOT NULL AND user_phone != '' THEN
            -- Clean phone: remove all non-digits except +
            cleaned_phone := REGEXP_REPLACE(TRIM(user_phone), '[^0-9+]', '', 'g');
            
            -- Validate phone length (optional validation - doesn't block signup)
            IF LENGTH(REGEXP_REPLACE(cleaned_phone, '[^0-9]', '', 'g')) BETWEEN 10 AND 15 THEN
                user_phone := cleaned_phone;
                RAISE LOG 'Phone provided and valid for user %: %', NEW.email, cleaned_phone;
            ELSE
                RAISE LOG 'Phone provided but invalid format, setting to NULL for user %: %', NEW.email, user_phone;
                user_phone := NULL;
            END IF;
        ELSE
            RAISE LOG 'No phone provided for user % - proceeding with email-only signup', NEW.email;
            user_phone := NULL;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Error extracting metadata for user %, using defaults: %', NEW.email, SQLERRM;
            user_type_val := 'patient';
            user_first_name := 'User';
            user_last_name := 'Name';
            user_phone := NULL; -- ✅ REFACTOR: Default to NULL instead of NEW.phone
    END;

    -- Insert user record (STEP 1) - ✅ REFACTOR: Email-first, phone optional
    BEGIN
        INSERT INTO public.users (
            auth_user_id, 
            email, 
            phone, 
            phone_verified, 
            email_verified,
            is_active
        )
        VALUES (
            NEW.id, 
            NEW.email, 
            user_phone, -- Can be NULL
            false, -- Phone verification not required for signup
            COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            true
        )
        RETURNING id INTO new_user_id;
        
        RAISE LOG 'SUCCESS: Created public.users record - ID: %, Type: %, Email: %, Phone: %', 
                  new_user_id, user_type_val, NEW.email, COALESCE(user_phone, 'NULL (email-only signup)');
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE LOG 'User already exists for auth_user_id: %, skipping', NEW.id;
            RETURN NEW;
        WHEN OTHERS THEN
            RAISE LOG 'CRITICAL: Failed to create public.users record for %: %', NEW.email, SQLERRM;
            RETURN NEW;
    END;

    -- Create user profile (STEP 2)
    BEGIN
        INSERT INTO public.user_profiles (
            user_id, 
            user_type, 
            first_name, 
            last_name,
            date_of_birth,
            gender
        )
        VALUES (
            new_user_id,
            user_type_val,
            user_first_name,
            user_last_name,
            CASE 
                WHEN NEW.raw_user_meta_data ? 'date_of_birth' AND NEW.raw_user_meta_data->>'date_of_birth' != ''
                THEN (NEW.raw_user_meta_data->>'date_of_birth')::DATE 
                ELSE NULL 
            END,
            NULLIF(NEW.raw_user_meta_data->>'gender', '')
        )
        RETURNING id INTO new_profile_id;
        
        RAISE LOG 'Created user_profiles record - ID: %, Name: % %', 
                  new_profile_id, user_first_name, user_last_name;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'CRITICAL: Failed to create user_profiles for user_id %: %', new_user_id, SQLERRM;
            DELETE FROM public.users WHERE id = new_user_id;
            RETURN NEW;
    END;

    -- Create role-specific profiles (STEP 3)
    IF user_type_val = 'patient' THEN
        BEGIN
            INSERT INTO public.patient_profiles (
                user_profile_id,
                emergency_contact_name, 
                emergency_contact_phone,
                email_notifications,
                sms_notifications
            ) VALUES (
                new_profile_id,
                NEW.raw_user_meta_data->>'emergency_contact_name',
                NEW.raw_user_meta_data->>'emergency_contact_phone',
                true, -- ✅ REFACTOR: Email notifications always enabled
                CASE WHEN user_phone IS NOT NULL THEN true ELSE false END -- SMS only if phone provided
            );
            
            RAISE LOG 'Created patient_profiles record for profile_id: % (email-first signup)', new_profile_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'CRITICAL: Failed to create patient_profiles for profile_id %: %', new_profile_id, SQLERRM;
                DELETE FROM public.user_profiles WHERE id = new_profile_id;
                DELETE FROM public.users WHERE id = new_user_id;
                RETURN NEW;
        END;
        
    ELSIF user_type_val = 'staff' THEN
        BEGIN
            INSERT INTO public.staff_profiles (
                user_profile_id,
                clinic_id,
                employee_id,
                position,
                hire_date,
                department,
                is_active
            ) VALUES (
                new_profile_id,
                CASE 
                    WHEN NEW.raw_user_meta_data ? 'clinic_id' AND NEW.raw_user_meta_data->>'clinic_id' != ''
                    THEN (NEW.raw_user_meta_data->>'clinic_id')::UUID 
                    ELSE NULL 
                END,
                NULLIF(NEW.raw_user_meta_data->>'employee_id', ''),
                COALESCE(NULLIF(NEW.raw_user_meta_data->>'position', ''), 'Staff'),
                CASE 
                    WHEN NEW.raw_user_meta_data ? 'hire_date' AND NEW.raw_user_meta_data->>'hire_date' != ''
                    THEN (NEW.raw_user_meta_data->>'hire_date')::DATE 
                    ELSE CURRENT_DATE 
                END,
                NULLIF(NEW.raw_user_meta_data->>'department', ''),
                false -- ✅ REFACTOR: Staff inactive by default, activation via admin (not phone verification)
            );
            
            RAISE LOG 'Created staff_profiles record for profile_id: % (requires admin activation, not phone verification)', new_profile_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'CRITICAL: Failed to create staff_profiles for profile_id %: %', new_profile_id, SQLERRM;
                DELETE FROM public.user_profiles WHERE id = new_profile_id;
                DELETE FROM public.users WHERE id = new_user_id;
                RETURN NEW;
        END;
        
    ELSIF user_type_val = 'admin' THEN
        BEGIN
            INSERT INTO public.admin_profiles (
                user_profile_id,
                access_level
            ) VALUES (
                new_profile_id,
                CASE 
                    WHEN NEW.raw_user_meta_data ? 'access_level' AND NEW.raw_user_meta_data->>'access_level' != ''
                    THEN (NEW.raw_user_meta_data->>'access_level')::INTEGER 
                    ELSE 1 
                END
            );
            
            RAISE LOG 'Created admin_profiles record for profile_id: % (email-first admin)', new_profile_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'CRITICAL: Failed to create admin_profiles for profile_id %: %', new_profile_id, SQLERRM;
                DELETE FROM public.user_profiles WHERE id = new_profile_id;
                DELETE FROM public.users WHERE id = new_user_id;
                RETURN NEW;
        END;
    END IF;

    -- ✅ REFACTOR: Optional phone sync - only runs if phone exists
    IF user_phone IS NOT NULL AND (NEW.phone IS NULL OR NEW.phone = '') THEN
        BEGIN
            UPDATE auth.users 
            SET 
                phone = user_phone,
                raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
                                   jsonb_build_object('phone_synced_on_signup', true, 'signup_method', 'email_first'),
                updated_at = NOW()
            WHERE id = NEW.id;
            
            RAISE LOG 'Synced optional phone to auth.users: % for user: %', user_phone, NEW.email;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'Warning: Failed to sync optional phone to auth.users for %: %', NEW.email, SQLERRM;
        END;
    END IF;

    RAISE LOG 'SUCCESS: Complete email-first user creation for % (%) with profile_id: %', 
              NEW.email, user_type_val, new_profile_id;

    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'FATAL ERROR in create_user_profile_on_signup for %: %', 
                  COALESCE(NEW.email, 'unknown'), SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_patient_profile_update_constraints"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
  -- Staff restrictions
  IF get_current_user_role() = 'staff'::user_type THEN
    -- staff cannot change identity fields
    IF NEW.user_profile_id <> OLD.user_profile_id THEN
      RAISE EXCEPTION 'Staff cannot change profile link';
    END IF;
    IF NEW.date_of_birth <> OLD.date_of_birth THEN
      RAISE EXCEPTION 'Staff cannot change patient date of birth';
    END IF;
    IF NEW.gender <> OLD.gender THEN
      RAISE EXCEPTION 'Staff cannot change gender';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_patient_profile_update_constraints"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_staff_profile_update_constraints"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
  IF get_current_user_role() = 'staff'::user_type THEN
    IF NEW.clinic_id <> OLD.clinic_id THEN
      RAISE EXCEPTION 'Staff cannot change their clinic';
    END IF;
    IF NEW.is_active <> OLD.is_active THEN
      RAISE EXCEPTION 'Staff cannot change active status';
    END IF;
    IF NEW.hire_date <> OLD.hire_date THEN
      RAISE EXCEPTION 'Staff cannot change hire date';
    END IF;
    IF NEW.user_profile_id <> OLD.user_profile_id THEN
      RAISE EXCEPTION 'Staff cannot change profile link';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_staff_profile_update_constraints"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."evaluate_clinic_badges"("p_clinic_id" "uuid" DEFAULT NULL::"uuid", "p_evaluation_period_days" integer DEFAULT 90, "p_auto_award" boolean DEFAULT false, "p_badge_types" "text"[] DEFAULT NULL::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    evaluation_date DATE;
    evaluation_results JSONB;
    awarded_badges UUID[];
    clinic_scores RECORD;
    badge_criteria RECORD;
BEGIN
    
    current_context := get_current_user_context();
    
    -- Admin-only access
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
    END IF;
    
    evaluation_date := CURRENT_DATE;
    awarded_badges := ARRAY[]::UUID[];
    
    -- ✅ ENHANCED: Define comprehensive badge criteria
    WITH badge_definitions AS (
        SELECT * FROM (VALUES 
            ('excellence', 'Excellence Award', 'Outstanding overall performance', '#FFD700', 4.5, 50, 85.0),
            ('growth', 'Growth Champion', 'Exceptional growth in patient base', '#32CD32', 4.0, 30, 80.0),
            ('reliability', 'Reliability Star', 'Consistent service delivery', '#4169E1', 4.2, 20, 90.0),
            ('innovation', 'Innovation Leader', 'Innovative service offerings', '#FF6347', 4.0, 25, 75.0),
            ('community', 'Community Choice', 'High patient satisfaction', '#9370DB', 4.3, 100, 80.0)
        ) AS t(badge_type, badge_name, description, color, min_rating, min_reviews, min_completion_rate)
    ),
    -- ✅ OPTIMIZED: Calculate clinic performance scores
    clinic_performance AS (
        SELECT 
            c.id as clinic_id,
            c.name,
            c.rating,
            c.total_reviews,
            -- Appointment metrics
            COUNT(a.id) as total_appointments_period,
            COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
            COUNT(a.id) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
            COUNT(DISTINCT a.patient_id) as unique_patients,
            -- Growth metrics
            COUNT(a.id) FILTER (WHERE a.created_at >= evaluation_date - INTERVAL '30 days') as recent_appointments,
            COUNT(a.id) FILTER (WHERE a.created_at >= evaluation_date - INTERVAL '60 days' 
                               AND a.created_at < evaluation_date - INTERVAL '30 days') as previous_month_appointments,
            -- Service quality metrics
            COUNT(DISTINCT aps.service_id) as service_variety,
            AVG(a.duration_minutes) as avg_duration,
            -- Staff and doctor count
            COUNT(DISTINCT sp.user_profile_id) as active_staff,
            COUNT(DISTINCT dc.doctor_id) as active_doctors,
            -- Calculated scores
            ROUND((COUNT(a.id) FILTER (WHERE a.status = 'completed')::NUMERIC / 
                   NULLIF(COUNT(a.id), 0) * 100), 1) as completion_rate,
            ROUND((COUNT(a.id) FILTER (WHERE a.created_at >= evaluation_date - INTERVAL '30 days')::NUMERIC / 
                   NULLIF(COUNT(a.id) FILTER (WHERE a.created_at >= evaluation_date - INTERVAL '60 days' 
                                              AND a.created_at < evaluation_date - INTERVAL '30 days'), 0) * 100), 1) as growth_rate
        FROM clinics c
LEFT JOIN appointments a ON c.id = a.clinic_id 
    AND a.created_at >= evaluation_date - make_interval(days => p_evaluation_period_days)
        LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
        LEFT JOIN staff_profiles sp ON c.id = sp.clinic_id AND sp.is_active = true
        LEFT JOIN doctor_clinics dc ON c.id = dc.clinic_id AND dc.is_active = true
        WHERE c.is_active = true
        AND (p_clinic_id IS NULL OR c.id = p_clinic_id)
        GROUP BY c.id, c.name, c.rating, c.total_reviews
    ),
    -- ✅ ENHANCED: Badge eligibility evaluation
    badge_evaluations AS (
        SELECT 
            cp.clinic_id,
            cp.name as clinic_name,
            bd.badge_type,
            bd.badge_name,
            bd.description,
            bd.color,
            CASE bd.badge_type
                WHEN 'excellence' THEN (
                    cp.rating >= bd.min_rating AND 
                    cp.total_reviews >= bd.min_reviews AND 
                    cp.completion_rate >= bd.min_completion_rate
                )
                WHEN 'growth' THEN (
                    cp.rating >= bd.min_rating AND 
                    cp.growth_rate >= 20.0 AND  -- 20% growth minimum
                    cp.recent_appointments >= 15  -- Minimum volume
                )
                WHEN 'reliability' THEN (
                    cp.rating >= bd.min_rating AND 
                    cp.completion_rate >= bd.min_completion_rate AND
                    cp.cancelled_appointments::NUMERIC / NULLIF(cp.total_appointments_period, 0) <= 0.10  -- Less than 10% cancellation
                )
                WHEN 'innovation' THEN (
                    cp.rating >= bd.min_rating AND 
                    cp.service_variety >= 5 AND  -- At least 5 different services
                    cp.active_doctors >= 2  -- Multi-doctor clinic
                )
                WHEN 'community' THEN (
                    cp.rating >= bd.min_rating AND 
                    cp.total_reviews >= bd.min_reviews AND
                    cp.unique_patients >= 50  -- Strong patient base
                )
                ELSE false
            END as eligible,
            -- Performance scores for ranking
            jsonb_build_object(
                'rating_score', cp.rating,
                'completion_rate', cp.completion_rate,
                'growth_rate', COALESCE(cp.growth_rate, 0),
                'service_variety', cp.service_variety,
                'patient_base', cp.unique_patients,
                'total_score', (
                    cp.rating * 20 +  -- Rating weight: 20%
                    cp.completion_rate * 0.3 +  -- Completion weight: 30%
                    COALESCE(cp.growth_rate, 0) * 0.2 +  -- Growth weight: 20%
                    cp.service_variety * 2 +  -- Service variety: 2 points per service
                    (cp.unique_patients / 10.0)  -- Patient base: 0.1 per patient
                )
            ) as performance_scores
        FROM clinic_performance cp
        CROSS JOIN badge_definitions bd
        WHERE (p_badge_types IS NULL OR bd.badge_type = ANY(p_badge_types))
    ),
    eligible_awards AS (
        SELECT 
            clinic_id,
            clinic_name,
            badge_type,
            badge_name,
            description,
            color,
            performance_scores,
            ROW_NUMBER() OVER (PARTITION BY badge_type ORDER BY (performance_scores->>'total_score')::NUMERIC DESC) as ranking
        FROM badge_evaluations
        WHERE eligible = true
    )
    SELECT jsonb_build_object(
        'eligible_clinics', jsonb_agg(
            jsonb_build_object(
                'clinic_id', clinic_id,
                'clinic_name', clinic_name,
                'eligible_badges', array_agg(
                    jsonb_build_object(
                        'badge_type', badge_type,
                        'badge_name', badge_name,
                        'description', description,
                        'color', color,
                        'ranking', ranking,
                        'performance_scores', performance_scores
                    )
                ),
                'top_badge', (
                    SELECT jsonb_build_object(
                        'badge_type', badge_type,
                        'badge_name', badge_name,
                        'ranking', ranking
                    )
                    FROM eligible_awards ea2 
                    WHERE ea2.clinic_id = ea.clinic_id
                    ORDER BY ranking
                    LIMIT 1
                )
            )
        ),
        'evaluation_summary', jsonb_build_object(
            'total_clinics_evaluated', COUNT(DISTINCT clinic_id),
            'total_eligible_awards', COUNT(*),
            'evaluation_date', evaluation_date,
            'evaluation_period_days', p_evaluation_period_days,
            'badge_types_evaluated', array_agg(DISTINCT badge_type)
        )
    ) INTO evaluation_results
    FROM eligible_awards ea
    GROUP BY clinic_id, clinic_name;
    
    -- ✅ ENHANCED: Auto-award badges if requested
    IF p_auto_award AND evaluation_results IS NOT NULL THEN
        WITH awards_to_create AS (
            SELECT DISTINCT
                clinic_data->>'clinic_id' as clinic_id,
                badge_data->>'badge_type' as badge_type,
                badge_data->>'badge_name' as badge_name
            FROM jsonb_array_elements(evaluation_results->'eligible_clinics') as clinic_data
            CROSS JOIN jsonb_array_elements(clinic_data->'eligible_badges') as badge_data
            WHERE (badge_data->>'ranking')::INTEGER = 1  -- Only award top performers
        ),
        badge_inserts AS (
            INSERT INTO clinic_badge_awards (clinic_id, badge_id, award_date, awarded_by, is_current)
            SELECT 
                atc.clinic_id::UUID,
                cb.id,
                evaluation_date,
                (current_context->>'user_id')::UUID,
                true
            FROM awards_to_create atc
            JOIN clinic_badges cb ON cb.badge_name = atc.badge_name
            WHERE NOT EXISTS (
                -- Don't duplicate current awards
                SELECT 1 FROM clinic_badge_awards cba 
                WHERE cba.clinic_id = atc.clinic_id::UUID 
                AND cba.badge_id = cb.id 
                AND cba.is_current = true
            )
            RETURNING badge_id
        )
        SELECT array_agg(badge_id) INTO awarded_badges FROM badge_inserts;
    END IF;
    
    -- ✅ ENHANCED: Return comprehensive evaluation results
    RETURN jsonb_build_object(
        'success', true,
        'evaluation_results', evaluation_results,
        'awards_processed', jsonb_build_object(
            'auto_award_enabled', p_auto_award,
            'badges_awarded', COALESCE(array_length(awarded_badges, 1), 0),
            'awarded_badge_ids', awarded_badges
        ),
        'metadata', jsonb_build_object(
            'evaluation_date', evaluation_date,
            'evaluation_period', p_evaluation_period_days || ' days',
            'clinic_filter', CASE WHEN p_clinic_id IS NOT NULL THEN 'single_clinic' ELSE 'all_clinics' END,
            'badge_types_filter', p_badge_types
        ),
        'next_steps', CASE 
            WHEN p_auto_award THEN jsonb_build_array(
                'Badges automatically awarded to top performers',
                'Review clinic performance trends',
                'Schedule next evaluation cycle'
            )
            ELSE jsonb_build_array(
                'Review eligible clinics and manually award badges',
                'Consider enabling auto-award for future evaluations',
                'Communicate awards to clinics'
            )
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Badge evaluation failed');
END;
$$;


ALTER FUNCTION "public"."evaluate_clinic_badges"("p_clinic_id" "uuid", "p_evaluation_period_days" integer, "p_auto_award" boolean, "p_badge_types" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_nearest_clinics"("user_location" "extensions"."geography" DEFAULT NULL::"extensions"."geography", "max_distance_km" double precision DEFAULT 50.0, "limit_count" integer DEFAULT 20, "services_filter" "text"[] DEFAULT NULL::"text"[], "min_rating" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    result JSONB;
    current_context JSONB;
    current_user_id UUID;
BEGIN
    -- ✅ Input validation with safe bounds
    max_distance_km := LEAST(GREATEST(COALESCE(max_distance_km, 50.0), 1.0), 200.0);
    limit_count := LEAST(GREATEST(COALESCE(limit_count, 20), 1), 50);
    
    -- ✅ FIXED: Get current user using existing function
    current_context := get_current_user_context();
    IF (current_context->>'authenticated')::boolean THEN
        current_user_id := (current_context->>'user_id')::UUID;
    END IF;
    
    -- ✅ FIXED: Smart location fallback
    IF user_location IS NULL AND current_user_id IS NOT NULL THEN
        SELECT pp.preferred_location INTO user_location 
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        JOIN patient_profiles pp ON up.id = pp.user_profile_id
        WHERE u.id = current_user_id
        AND pp.preferred_location IS NOT NULL;
    END IF;
    
    -- ✅ FIXED: Robust query with proper error handling
    WITH clinic_data AS (
        SELECT 
            c.id,
            c.name,
            c.address,
            c.city,
            c.phone,
            c.email,
            c.website_url,
            c.rating,
            c.total_reviews,
            c.services_offered,
            c.operating_hours,
            c.image_url,
            c.location,
            c.created_at,
            -- ✅ FIXED: Safe distance calculation with proper casting
            CASE 
                WHEN user_location IS NULL THEN 0::FLOAT
                ELSE ST_Distance(c.location::geometry, user_location::geometry) / 1000.0
            END AS distance_km
        FROM clinics c
        WHERE 
            c.is_active = true
            -- ✅ FIXED: Safe distance filter
            AND (user_location IS NULL OR 
                 ST_DWithin(c.location::geometry, user_location::geometry, max_distance_km * 1000))
            -- Rating filter
            AND (min_rating IS NULL OR c.rating >= min_rating)
            -- ✅ FIXED: Safe services filter for JSONB arrays
            AND (services_filter IS NULL OR 
                 c.services_offered ?| services_filter)
    ),
    clinic_badges AS (
        SELECT 
            cba.clinic_id,
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'badge_name', cb.badge_name,
                    'badge_description', cb.badge_description,
                    'badge_color', cb.badge_color,
                    'badge_icon_url', cb.badge_icon_url,
                    'award_date', cba.award_date
                )
                ORDER BY cba.award_date DESC
            ), '[]'::jsonb) AS badges
        FROM clinic_badge_awards cba
        JOIN clinic_badges cb ON cba.badge_id = cb.id
        WHERE cba.is_current = true
        AND cb.is_active = true
        GROUP BY cba.clinic_id
    ),
    clinic_stats AS (
        SELECT 
            clinic_id,
            COUNT(*) as total_appointments,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
            COUNT(*) FILTER (WHERE appointment_date >= CURRENT_DATE - INTERVAL '30 days') as recent_appointments
        FROM appointments
        WHERE clinic_id IN (SELECT id FROM clinic_data)
        GROUP BY clinic_id
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'clinics', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', cd.id,
                    'name', cd.name,
                    'address', cd.address,
                    'city', cd.city,
                    'phone', cd.phone,
                    'email', cd.email,
                    'website_url', cd.website_url,
                    'image_url', cd.image_url,
                    'distance_km', ROUND(cd.distance_km::NUMERIC, 2),
                    'rating', cd.rating,
                    'total_reviews', cd.total_reviews,
                    'services_offered', cd.services_offered,
                    'operating_hours', cd.operating_hours,
                    'badges', COALESCE(cb.badges, '[]'::jsonb),
                    'stats', jsonb_build_object(
                        'total_appointments', COALESCE(cs.total_appointments, 0),
                        'completed_appointments', COALESCE(cs.completed_appointments, 0),
                        'recent_appointments', COALESCE(cs.recent_appointments, 0),
                        'completion_rate', CASE 
                            WHEN COALESCE(cs.total_appointments, 0) = 0 THEN 0
                            ELSE ROUND((COALESCE(cs.completed_appointments, 0)::NUMERIC / cs.total_appointments * 100), 1)
                        END
                    ),
                    'is_available', true,
                    'created_at', cd.created_at
                )
                ORDER BY 
                    CASE WHEN user_location IS NULL THEN cd.rating ELSE NULL END DESC,
                    CASE WHEN user_location IS NOT NULL THEN cd.distance_km ELSE NULL END ASC,
                    cd.rating DESC
            ), '[]'::jsonb),
            'search_metadata', jsonb_build_object(
                'user_location_provided', user_location IS NOT NULL,
                'max_distance_km', max_distance_km,
                'services_filter', services_filter,
                'min_rating', min_rating,
                'total_found', COUNT(*),
                'search_center', CASE 
                    WHEN user_location IS NOT NULL THEN ST_AsText(user_location::geometry)
                    ELSE 'No location specified'
                END
            )
        )
    ) INTO result
    FROM clinic_data cd
    LEFT JOIN clinic_badges cb ON cd.id = cb.clinic_id
    LEFT JOIN clinic_stats cs ON cd.id = cs.clinic_id
    LIMIT limit_count;
    
    -- ✅ FIXED: Always return valid result
    RETURN COALESCE(result, jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'clinics', '[]'::jsonb,
            'search_metadata', jsonb_build_object(
                'total_found', 0,
                'user_location_provided', false
            )
        )
    ));
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'find_nearest_clinics error: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Clinic search failed',
            'data', jsonb_build_object('clinics', '[]'::jsonb)
        );
END;
$$;


ALTER FUNCTION "public"."find_nearest_clinics"("user_location" "extensions"."geography", "max_distance_km" double precision, "limit_count" integer, "services_filter" "text"[], "min_rating" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_otp"("p_identifier" character varying, "p_identifier_type" character varying, "p_purpose" character varying) RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    otp_code VARCHAR(6);
    auth_user_id UUID;
BEGIN
    -- Generate 6-digit OTP
    otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- For phone verification, get auth_user_id
    IF p_purpose = 'phone_verification' AND p_identifier_type = 'phone' THEN
        SELECT auth_user_id INTO auth_user_id
        FROM users 
        WHERE phone = p_identifier;
    END IF;
    
    -- Invalidate existing OTPs
    UPDATE otp_verifications 
    SET is_verified = true 
    WHERE identifier = p_identifier 
    AND purpose = p_purpose 
    AND expires_at > NOW()
    AND is_verified = false;
    
    -- Insert new OTP
    INSERT INTO otp_verifications (
        identifier, identifier_type, otp_code, purpose, expires_at
    ) VALUES (
        p_identifier, p_identifier_type, otp_code, p_purpose, 
        NOW() + INTERVAL '10 minutes'
    );
    
    RAISE LOG 'Generated OTP for % (purpose: %)', p_identifier, p_purpose;
    
    RETURN otp_code;
END;
$$;


ALTER FUNCTION "public"."generate_otp"("p_identifier" character varying, "p_identifier_type" character varying, "p_purpose" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_system_analytics"("p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_include_trends" boolean DEFAULT true, "p_include_performance" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    date_from DATE;
    date_to DATE;
    result JSONB;
    system_stats RECORD;
    growth_stats RECORD;
    performance_stats RECORD;
BEGIN
    
    current_context := get_current_user_context();
    
    -- Admin-only access
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
    END IF;
    
    -- ✅ ENHANCED: Smart date range defaults
    date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
    date_to := COALESCE(p_date_to, CURRENT_DATE);
    
    -- ✅ OPTIMIZED: Core system statistics in single query
    WITH system_overview AS (
        SELECT 
            -- User Statistics
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= date_from) as new_users_period,
            COUNT(DISTINCT u.id) FILTER (WHERE u.last_login >= CURRENT_DATE - INTERVAL '7 days') as active_users_week,
            COUNT(DISTINCT u.id) FILTER (WHERE u.last_login >= CURRENT_DATE - INTERVAL '30 days') as active_users_month,
            
            -- Role Distribution
            COUNT(DISTINCT u.id) FILTER (WHERE up.user_type = 'patient') as total_patients,
            COUNT(DISTINCT u.id) FILTER (WHERE up.user_type = 'staff') as total_staff,
            COUNT(DISTINCT u.id) FILTER (WHERE up.user_type = 'admin') as total_admins,
            
            -- Clinic Statistics
            COUNT(DISTINCT c.id) as total_clinics,
            COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) as active_clinics,
            COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= date_from) as new_clinics_period,
            AVG(c.rating) as avg_clinic_rating,
            
            -- Appointment Statistics  
            COUNT(DISTINCT a.id) as total_appointments,
            COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= date_from AND a.created_at <= date_to) as appointments_period,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
            
            -- Financial Estimates (based on appointment services)
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed' AND a.created_at >= date_from) as revenue_appointments
            
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN clinics c ON true -- Cross join for clinic stats
        LEFT JOIN appointments a ON true -- Cross join for appointment stats
    )
    SELECT * INTO system_stats FROM system_overview;
    
    -- ✅ ENHANCED: Growth trends (if requested)
    IF p_include_trends THEN
        WITH daily_growth AS (
            SELECT 
                date_trunc('day', created_at)::date as growth_date,
                COUNT(*) FILTER (WHERE up.user_type = 'patient') as new_patients,
                COUNT(*) FILTER (WHERE up.user_type = 'staff') as new_staff,
                COUNT(*) as total_new_users
            FROM users u
            JOIN user_profiles up ON u.id = up.user_id
            WHERE u.created_at >= date_from - INTERVAL '7 days' -- Extra context
            GROUP BY date_trunc('day', created_at)::date
            ORDER BY growth_date
        ),
        appointment_trends AS (
            SELECT 
                date_trunc('day', created_at)::date as trend_date,
                COUNT(*) as daily_bookings,
                COUNT(*) FILTER (WHERE status = 'completed') as daily_completions,
                COUNT(*) FILTER (WHERE status = 'cancelled') as daily_cancellations
            FROM appointments
            WHERE created_at >= date_from - INTERVAL '7 days'
            GROUP BY date_trunc('day', created_at)::date
            ORDER BY trend_date
        )
        SELECT jsonb_build_object(
            'user_growth_trend', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'date', growth_date,
                        'new_patients', new_patients,
                        'new_staff', new_staff,
                        'total_new', total_new_users
                    )
                    ORDER BY growth_date
                ) FROM daily_growth WHERE growth_date >= date_from
            ),
            'appointment_trends', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'date', trend_date,
                        'bookings', daily_bookings,
                        'completions', daily_completions,
                        'cancellations', daily_cancellations,
                        'completion_rate', ROUND((daily_completions::NUMERIC / NULLIF(daily_bookings, 0) * 100), 1)
                    )
                    ORDER BY trend_date
                ) FROM appointment_trends WHERE trend_date >= date_from
            ),
            'growth_rate_weekly', COALESCE((
                SELECT ROUND(
                    ((COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'))::NUMERIC / 
                     NULLIF(COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'), 0) - 1) * 100, 2
                ) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
            ), 0)
        ) INTO growth_stats;
    END IF;
    
    -- ✅ ENHANCED: Performance metrics (if requested)
    IF p_include_performance THEN
        WITH clinic_performance AS (
            SELECT 
                c.id,
                c.name,
                c.rating,
                c.total_reviews,
                COUNT(a.id) as total_appointments,
                COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
                COUNT(a.id) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
                ROUND(AVG(CASE WHEN a.status = 'completed' THEN 5.0 ELSE 0.0 END), 2) as completion_score,
                COUNT(DISTINCT a.patient_id) as unique_patients
            FROM clinics c
            LEFT JOIN appointments a ON c.id = a.clinic_id
            WHERE c.is_active = true
            GROUP BY c.id, c.name, c.rating, c.total_reviews
        )
        SELECT jsonb_build_object(
'top_performing_clinics', (
    SELECT jsonb_agg(row_data)
    FROM (
        SELECT jsonb_build_object(
            'clinic_id', id,
            'clinic_name', name,
            'rating', rating,
            'total_appointments', total_appointments,
            'completion_rate', ROUND((completed_appointments::NUMERIC / NULLIF(total_appointments, 0) * 100), 1),
            'unique_patients', unique_patients,
            'performance_score', ROUND((rating * 20 + completion_score * 20 + (unique_patients::NUMERIC / NULLIF(total_appointments, 0) * 100)), 1)
        ) AS row_data
        FROM clinic_performance
        ORDER BY (rating * 20 + completion_score * 20) DESC
        LIMIT 10
    ) sub
),

            'system_health', jsonb_build_object(
                'avg_appointment_completion_rate', (
                    SELECT ROUND(AVG(completed_appointments::NUMERIC / NULLIF(total_appointments, 0) * 100), 1)
                    FROM clinic_performance
                    WHERE total_appointments > 0
                ),
                'avg_clinic_rating', (SELECT ROUND(AVG(rating), 2) FROM clinic_performance WHERE rating > 0),
                'patient_retention_rate', (
                    SELECT ROUND(
                        COUNT(DISTINCT patient_id) FILTER (WHERE cnt > 1)::NUMERIC / 
                        COUNT(DISTINCT patient_id) * 100, 1
                    )
                    FROM (
                        SELECT patient_id, COUNT(*) as cnt 
                        FROM appointments 
                        WHERE status = 'completed'
                        GROUP BY patient_id
                    ) patient_visits
                )
            )
        ) INTO performance_stats;
    END IF;
    
    -- ✅ ENHANCED: Comprehensive result structure
    result := jsonb_build_object(
        'success', true,
        'generated_at', NOW(),
        'period', jsonb_build_object(
            'from_date', date_from,
            'to_date', date_to,
            'days_covered', (date_to - date_from) + 1
        ),
        'system_overview', jsonb_build_object(
            'users', jsonb_build_object(
                'total', system_stats.total_users,
                'new_this_period', system_stats.new_users_period,
                'active_last_week', system_stats.active_users_week,
                'active_last_month', system_stats.active_users_month,
                'by_role', jsonb_build_object(
                    'patients', system_stats.total_patients,
                    'staff', system_stats.total_staff,
                    'admins', system_stats.total_admins
                )
            ),
            'clinics', jsonb_build_object(
                'total', system_stats.total_clinics,
                'active', system_stats.active_clinics,
                'new_this_period', system_stats.new_clinics_period,
                'average_rating', ROUND(system_stats.avg_clinic_rating, 2)
            ),
            'appointments', jsonb_build_object(
                'total', system_stats.total_appointments,
                'this_period', system_stats.appointments_period,
                'completed', system_stats.completed_appointments,
                'cancelled', system_stats.cancelled_appointments,
                'completion_rate', ROUND((system_stats.completed_appointments::NUMERIC / NULLIF(system_stats.total_appointments, 0) * 100), 1),
                'cancellation_rate', ROUND((system_stats.cancelled_appointments::NUMERIC / NULLIF(system_stats.total_appointments, 0) * 100), 1)
            )
        ),
        'growth_analytics', CASE WHEN p_include_trends THEN growth_stats ELSE NULL END,
        'performance_metrics', CASE WHEN p_include_performance THEN performance_stats ELSE NULL END,
        'metadata', jsonb_build_object(
            'query_execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - NOW())) * 1000,
            'includes_trends', p_include_trends,
            'includes_performance', p_include_performance,
            'cache_recommended', true
        )
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'System analytics unavailable');
END;
$$;


ALTER FUNCTION "public"."get_admin_system_analytics"("p_date_from" "date", "p_date_to" "date", "p_include_trends" boolean, "p_include_performance" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_appointments_by_role"("p_status" "public"."appointment_status"[] DEFAULT NULL::"public"."appointment_status"[], "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    v_current_role TEXT;
    clinic_id_val UUID;
    user_id_val UUID;
    result JSONB;
    total_count INTEGER;
BEGIN
    
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    user_id_val := (current_context->>'user_id')::UUID;
    clinic_id_val := (current_context->>'clinic_id')::UUID;
    
    -- ✅ ENHANCED: Input validation and defaults
    p_limit := LEAST(COALESCE(p_limit, 20), 100); -- Max 100 records
    p_offset := GREATEST(COALESCE(p_offset, 0), 0);
    
    -- Build role-specific query
    CASE v_current_role
        WHEN 'patient' THEN
            -- ✅ OPTIMIZED: Single query with CTE for performance
            WITH patient_appointments AS (
                SELECT 
                    a.id, a.appointment_date, a.appointment_time, a.status, 
                    a.symptoms, a.notes, a.duration_minutes, a.created_at,
                    c.id as clinic_id, c.name as clinic_name, c.address as clinic_address, c.phone as clinic_phone,
                    d.id as doctor_id, d.specialization, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
                    can_cancel_appointment(a.id) as can_cancel
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.patient_id = user_id_val
                AND (p_status IS NULL OR a.status = ANY(p_status))
                AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
                AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT p_limit OFFSET p_offset
            ),
            appointment_services_agg AS (
                SELECT 
                    aps.appointment_id,
                    jsonb_agg(jsonb_build_object(
                        'id', s.id,
                        'name', s.name,
                        'duration_minutes', s.duration_minutes
                    )) as services
                FROM appointment_services aps
                JOIN services s ON aps.service_id = s.id
                WHERE aps.appointment_id IN (SELECT id FROM patient_appointments)
                GROUP BY aps.appointment_id
            )
            SELECT jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'appointments', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', pa.id,
                            'appointment_date', pa.appointment_date,
                            'appointment_time', pa.appointment_time,
                            'status', pa.status,
                            'symptoms', pa.symptoms,
                            'notes', pa.notes,
                            'duration_minutes', pa.duration_minutes,
                            'can_cancel', pa.can_cancel,
                            'clinic', jsonb_build_object(
                                'id', pa.clinic_id,
                                'name', pa.clinic_name,
                                'address', pa.clinic_address,
                                'phone', pa.clinic_phone
                            ),
                            'doctor', CASE 
                                WHEN pa.doctor_id IS NOT NULL THEN
                                    jsonb_build_object(
                                        'id', pa.doctor_id,
                                        'name', COALESCE(pa.doctor_first_name || ' ' || pa.doctor_last_name, 'Dr. ' || pa.specialization),
                                        'specialization', pa.specialization
                                    )
                                ELSE NULL
                            END,
                            'services', COALESCE(asa.services, '[]'::jsonb),
                            'created_at', pa.created_at
                        )
                    ), '[]'::jsonb),
                    'pagination', jsonb_build_object(
                        'limit', p_limit,
                        'offset', p_offset,
                        'total_count', (SELECT COUNT(*) FROM appointments 
                                       WHERE patient_id = user_id_val
                                       AND (p_status IS NULL OR status = ANY(p_status))
                                       AND (p_date_from IS NULL OR appointment_date >= p_date_from)
                                       AND (p_date_to IS NULL OR appointment_date <= p_date_to))
                    )
                )
            ) INTO result
            FROM patient_appointments pa
            LEFT JOIN appointment_services_agg asa ON pa.id = asa.appointment_id;
            
        WHEN 'staff' THEN
            -- ✅ OPTIMIZED: Staff appointments with patient info
            WITH staff_appointments AS (
                SELECT 
                    a.id, a.appointment_date, a.appointment_time, a.status, 
                    a.symptoms, a.notes, a.duration_minutes, a.created_at,
                    u.id as patient_id, u.email as patient_email, u.phone as patient_phone,
                    up.first_name || ' ' || up.last_name as patient_name,
                    d.id as doctor_id, d.specialization, d.first_name as doctor_first_name, d.last_name as doctor_last_name
                FROM appointments a
                JOIN users u ON a.patient_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.clinic_id = clinic_id_val
                AND (p_status IS NULL OR a.status = ANY(p_status))
                AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
                AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
                ORDER BY 
                    CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END,
                    a.appointment_date ASC, 
                    a.appointment_time ASC
                LIMIT p_limit OFFSET p_offset
            )
            SELECT jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'appointments', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', sa.id,
                            'appointment_date', sa.appointment_date,
                            'appointment_time', sa.appointment_time,
                            'status', sa.status,
                            'symptoms', sa.symptoms,
                            'notes', sa.notes,
                            'duration_minutes', sa.duration_minutes,
                            'patient', jsonb_build_object(
                                'id', sa.patient_id,
                                'name', sa.patient_name,
                                'email', sa.patient_email,
                                'phone', sa.patient_phone
                            ),
                            'doctor', CASE 
                                WHEN sa.doctor_id IS NOT NULL THEN
                                    jsonb_build_object(
                                        'id', sa.doctor_id,
                                        'name', COALESCE(sa.doctor_first_name || ' ' || sa.doctor_last_name, 'Dr. ' || sa.specialization),
                                        'specialization', sa.specialization
                                    )
                                ELSE NULL
                            END,
                            'created_at', sa.created_at
                        )
                    ), '[]'::jsonb),
                    'pagination', jsonb_build_object(
                        'limit', p_limit,
                        'offset', p_offset,
                        'total_count', (SELECT COUNT(*) FROM appointments 
                                       WHERE clinic_id = clinic_id_val
                                       AND (p_status IS NULL OR status = ANY(p_status))
                                       AND (p_date_from IS NULL OR appointment_date >= p_date_from)
                                       AND (p_date_to IS NULL OR appointment_date <= p_date_to)),
                        'pending_count', (SELECT COUNT(*) FROM appointments 
                                         WHERE clinic_id = clinic_id_val AND status = 'pending')
                    )
                )
            ) INTO result
            FROM staff_appointments sa;
            
        WHEN 'admin' THEN
            -- ✅ ADMIN: High-level overview without sensitive data
            SELECT jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'appointments', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', a.id,
                            'appointment_date', a.appointment_date,
                            'appointment_time', a.appointment_time,
                            'status', a.status,
                            'clinic_name', c.name,
                            'patient_name', up.first_name || ' ' || up.last_name,
                            'doctor_name', COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization),
                            'created_at', a.created_at
                        )
                    ), '[]'::jsonb),
                    'pagination', jsonb_build_object(
                        'limit', p_limit,
                        'offset', p_offset,
                        'total_count', (SELECT COUNT(*) FROM appointments 
                                       WHERE (p_status IS NULL OR status = ANY(p_status))
                                       AND (p_date_from IS NULL OR appointment_date >= p_date_from)
                                       AND (p_date_to IS NULL OR appointment_date <= p_date_to))
                    )
                )
            ) INTO result
            FROM appointments a
            JOIN clinics c ON a.clinic_id = c.id
            JOIN users u ON a.patient_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            WHERE (p_status IS NULL OR a.status = ANY(p_status))
            AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
            AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
            ORDER BY a.created_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid user role');
    END CASE;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to fetch appointments');
END;
$$;


ALTER FUNCTION "public"."get_appointments_by_role"("p_status" "public"."appointment_status"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_time_slots"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_service_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_cataglog', 'extensions'
    AS $$
DECLARE
    total_duration INTEGER := 60;
    available_slots JSONB := '[]'::JSONB;
    time_slot TIME;
    end_time TIME;
    conflict_count INTEGER;
    slot_available BOOLEAN;
BEGIN
    -- Input validation
    IF p_doctor_id IS NULL OR p_appointment_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing required parameters');
    END IF;
    
    -- Validate future date
    IF p_appointment_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Date must be in future');
    END IF;
    
    -- Calculate total duration if services provided
    IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 THEN
        SELECT COALESCE(SUM(duration_minutes), 60) INTO total_duration
        FROM services 
        WHERE id = ANY(p_service_ids) AND is_active = true;
    END IF;
    
    -- Get all existing appointments for this doctor on this date (SINGLE QUERY)
    WITH existing_appointments AS (
        SELECT 
            appointment_time,
            appointment_time + (duration_minutes || ' minutes')::INTERVAL as appointment_end_time
        FROM appointments
        WHERE doctor_id = p_doctor_id 
        AND appointment_date = p_appointment_date
        AND status NOT IN ('cancelled', 'no_show')
    ),
    time_slots AS (
        -- Generate all possible slots
        SELECT 
            (TIME '09:00:00' + (slot_num * INTERVAL '30 minutes'))::TIME as slot_time
        FROM generate_series(0, 15) as slot_num  -- 9:00 to 16:30
        WHERE (TIME '09:00:00' + (slot_num * INTERVAL '30 minutes'))::TIME <= TIME '16:30:00'
    ),
    availability_check AS (
        SELECT 
            ts.slot_time,
            ts.slot_time + (total_duration || ' minutes')::INTERVAL as slot_end_time,
            NOT EXISTS (
                SELECT 1 FROM existing_appointments ea
                WHERE (
                    -- Check for time conflicts
                    (ts.slot_time < ea.appointment_end_time AND 
                     (ts.slot_time + (total_duration || ' minutes')::INTERVAL) > ea.appointment_time)
                )
            ) as is_available
        FROM time_slots ts
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'time', slot_time::TEXT,
            'available', is_available,
            'duration_minutes', total_duration
        )
        ORDER BY slot_time
    ) INTO available_slots
    FROM availability_check;
    
    RETURN jsonb_build_object(
        'success', true,
        'date', p_appointment_date,
        'doctor_id', p_doctor_id,
        'total_duration', total_duration,
        'slots', COALESCE(available_slots, '[]'::JSONB)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_available_time_slots"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_service_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_clinic_growth_analytics"("p_clinic_id" "uuid" DEFAULT NULL::"uuid", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_include_comparisons" boolean DEFAULT true, "p_include_patient_insights" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    target_clinic_id UUID;
    clinic_info RECORD;
    date_from DATE;
    date_to DATE;
    result JSONB;
    growth_metrics RECORD;
    comparison_data JSONB;
    patient_insights JSONB;
BEGIN
    
    current_context := get_current_user_context();
    
    -- Access control: Staff can only see their clinic, Admin can see any
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    CASE (current_context->>'user_type')
        WHEN 'staff' THEN
            target_clinic_id := COALESCE(p_clinic_id, (current_context->>'clinic_id')::UUID);
            -- Staff can only access their own clinic
            IF target_clinic_id != (current_context->>'clinic_id')::UUID THEN
                RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff can only view own clinic analytics');
            END IF;
        WHEN 'admin' THEN
            target_clinic_id := p_clinic_id;
            IF target_clinic_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Clinic ID required for admin analytics');
            END IF;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff or Admin required');
    END CASE;
    
    -- Date range defaults
    date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
    date_to := COALESCE(p_date_to, CURRENT_DATE);
    
    -- ✅ ENHANCED: Get comprehensive clinic information
    SELECT 
        c.*,
        COUNT(DISTINCT sp.user_profile_id) as total_staff,
        COUNT(DISTINCT d.id) as total_doctors
    INTO clinic_info
    FROM clinics c
    LEFT JOIN staff_profiles sp ON c.id = sp.clinic_id AND sp.is_active = true
    LEFT JOIN doctor_clinics dc ON c.id = dc.clinic_id AND dc.is_active = true
    LEFT JOIN doctors d ON dc.doctor_id = d.id AND d.is_available = true
    WHERE c.id = target_clinic_id
    GROUP BY c.id, c.name, c.address, c.phone, c.email, c.website_url, c.rating, c.total_reviews, 
             c.services_offered, c.operating_hours, c.is_active, c.created_at;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found');
    END IF;
    
    -- ✅ OPTIMIZED: Core growth metrics with time series
    WITH appointment_metrics AS (
        SELECT 
            DATE_TRUNC('week', a.created_at)::date as week_start,
            COUNT(*) as weekly_bookings,
            COUNT(*) FILTER (WHERE a.status = 'completed') as weekly_completions,
            COUNT(*) FILTER (WHERE a.status = 'cancelled') as weekly_cancellations,
            COUNT(DISTINCT a.patient_id) as unique_patients_week,
            AVG(a.duration_minutes) as avg_duration
        FROM appointments a
        WHERE a.clinic_id = target_clinic_id
        AND a.created_at >= date_from - INTERVAL '4 weeks' -- Extra context for trends
        AND a.created_at <= date_to
        GROUP BY DATE_TRUNC('week', a.created_at)::date
        ORDER BY week_start
    ),
    overall_metrics AS (
        SELECT 
            COUNT(*) as total_appointments_period,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_period,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_period,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_period,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_period,
            COUNT(DISTINCT patient_id) as unique_patients_period,
            COUNT(DISTINCT patient_id) FILTER (WHERE created_at >= date_to - INTERVAL '30 days') as recent_patients,
            AVG(duration_minutes) as avg_appointment_duration,
            -- Patient return rate
            COUNT(DISTINCT patient_id) FILTER (WHERE patient_id IN (
                SELECT patient_id FROM appointments a2 
                WHERE a2.clinic_id = target_clinic_id 
                AND a2.status = 'completed' 
                AND a2.id != appointments.id
            )) as returning_patients
        FROM appointments
        WHERE clinic_id = target_clinic_id
        AND created_at >= date_from
        AND created_at <= date_to
    )
    SELECT 
        om.*,
        ROUND((om.completed_period::NUMERIC / NULLIF(om.total_appointments_period, 0) * 100), 1) as completion_rate,
        ROUND((om.cancelled_period::NUMERIC / NULLIF(om.total_appointments_period, 0) * 100), 1) as cancellation_rate,
        ROUND((om.returning_patients::NUMERIC / NULLIF(om.unique_patients_period, 0) * 100), 1) as patient_retention_rate
    INTO growth_metrics
    FROM overall_metrics om;
    
    -- ✅ ENHANCED: Competitive analysis (if requested)
    IF p_include_comparisons THEN
        WITH peer_clinics AS (
            SELECT 
                c.id,
                c.name,
                c.rating,
                COUNT(a.id) FILTER (WHERE a.created_at >= date_from) as appointments_period,
                COUNT(a.id) FILTER (WHERE a.status = 'completed' AND a.created_at >= date_from) as completed_period,
                COUNT(DISTINCT a.patient_id) FILTER (WHERE a.created_at >= date_from) as unique_patients
            FROM clinics c
            LEFT JOIN appointments a ON c.id = a.clinic_id
            WHERE c.is_active = true
            AND c.id != target_clinic_id
            GROUP BY c.id, c.name, c.rating
            HAVING COUNT(a.id) FILTER (WHERE a.created_at >= date_from) > 0
        ),
        market_benchmarks AS (
            SELECT 
                AVG(appointments_period) as avg_appointments_market,
                AVG(completed_period::NUMERIC / NULLIF(appointments_period, 0) * 100) as avg_completion_rate_market,
                AVG(rating) as avg_rating_market,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY appointments_period) as top_quartile_appointments
            FROM peer_clinics
        )
        SELECT jsonb_build_object(
            'market_position', jsonb_build_object(
                'appointments_vs_market', CASE 
                    WHEN growth_metrics.total_appointments_period > (SELECT avg_appointments_market FROM market_benchmarks) THEN 'above_average'
                    WHEN growth_metrics.total_appointments_period > (SELECT avg_appointments_market * 0.8 FROM market_benchmarks) THEN 'average'
                    ELSE 'below_average'
                END,
                'rating_vs_market', CASE 
                    WHEN clinic_info.rating > (SELECT avg_rating_market FROM market_benchmarks) THEN 'above_average'
                    WHEN clinic_info.rating > (SELECT avg_rating_market * 0.9 FROM market_benchmarks) THEN 'average'
                    ELSE 'below_average'
                END,
                'completion_rate_vs_market', CASE 
                    WHEN growth_metrics.completion_rate > (SELECT avg_completion_rate_market FROM market_benchmarks) THEN 'above_average'
                    WHEN growth_metrics.completion_rate > (SELECT avg_completion_rate_market * 0.9 FROM market_benchmarks) THEN 'average'
                    ELSE 'below_average'
                END
            ),
            'benchmarks', jsonb_build_object(
                'market_avg_appointments', ROUND((SELECT avg_appointments_market FROM market_benchmarks), 1),
                'market_avg_completion_rate', ROUND((SELECT avg_completion_rate_market FROM market_benchmarks), 1),
                'market_avg_rating', ROUND((SELECT avg_rating_market FROM market_benchmarks), 2),
                'top_quartile_appointments', (SELECT top_quartile_appointments FROM market_benchmarks)
            ),
            'ranking_insights', jsonb_build_array(
                CASE 
                    WHEN growth_metrics.total_appointments_period > (SELECT top_quartile_appointments FROM market_benchmarks) 
                    THEN 'High appointment volume - top 25% performer'
                    ELSE 'Room for growth in appointment bookings'
                END,
                CASE 
                    WHEN clinic_info.rating >= 4.5 THEN 'Excellent patient satisfaction'
                    WHEN clinic_info.rating >= 4.0 THEN 'Good patient satisfaction'  
                    ELSE 'Patient satisfaction needs improvement'
                END
            )
        ) INTO comparison_data;
    END IF;
    
    -- ✅ ENHANCED: Patient insights (if requested)
    IF p_include_patient_insights THEN
        WITH patient_demographics AS (
            SELECT 
                COUNT(*) as total_patients,
                COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(up.date_of_birth)) BETWEEN 18 AND 30) as age_18_30,
                COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(up.date_of_birth)) BETWEEN 31 AND 50) as age_31_50,
                COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(up.date_of_birth)) > 50) as age_over_50,
                COUNT(*) FILTER (WHERE up.gender = 'male') as male_patients,
                COUNT(*) FILTER (WHERE up.gender = 'female') as female_patients
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE a.clinic_id = target_clinic_id
            AND a.created_at >= date_from
            AND a.created_at <= date_to
            AND a.status = 'completed'
        ),
        service_popularity AS (
            SELECT 
                s.name as service_name,
                COUNT(*) as usage_count,
                ROUND(AVG(s.min_price + s.max_price) / 2, 2) as avg_price
            FROM appointment_services aps
            JOIN services s ON aps.service_id = s.id
            JOIN appointments a ON aps.appointment_id = a.id
            WHERE a.clinic_id = target_clinic_id
            AND a.created_at >= date_from
            AND a.created_at <= date_to
            AND a.status = 'completed'
            GROUP BY s.id, s.name
            ORDER BY usage_count DESC
            LIMIT 5
        )
        SELECT jsonb_build_object(
            'patient_demographics', (
                SELECT jsonb_build_object(
                    'total_patients', total_patients,
                    'age_distribution', jsonb_build_object(
                        '18-30', age_18_30,
                        '31-50', age_31_50,
                        'over_50', age_over_50
                    ),
                    'gender_distribution', jsonb_build_object(
                        'male', male_patients,
                        'female', female_patients
                    )
                )
                FROM patient_demographics
            ),
            'popular_services', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'service_name', service_name,
                        'appointments', usage_count,
                        'avg_price', avg_price
                    )
                    ORDER BY usage_count DESC
                )
                FROM service_popularity
            ),
            'patient_satisfaction', jsonb_build_object(
                'avg_rating', clinic_info.rating,
                'total_reviews', clinic_info.total_reviews,
                'feedback_score', CASE 
                    WHEN clinic_info.rating >= 4.5 THEN 'excellent'
                    WHEN clinic_info.rating >= 4.0 THEN 'good'
                    WHEN clinic_info.rating >= 3.0 THEN 'average'
                    ELSE 'needs_improvement'
                END
            )
        ) INTO patient_insights;
    END IF;
    
    -- ✅ ENHANCED: Build comprehensive result
    result := jsonb_build_object(
        'success', true,
        'clinic_info', jsonb_build_object(
            'id', clinic_info.id,
            'name', clinic_info.name,
            'rating', clinic_info.rating,
            'total_reviews', clinic_info.total_reviews,
            'total_staff', clinic_info.total_staff,
            'total_doctors', clinic_info.total_doctors,
            'services_offered', clinic_info.services_offered
        ),
        'period_analytics', jsonb_build_object(
            'date_range', jsonb_build_object(
                'from', date_from,
                'to', date_to,
                'days', (date_to - date_from) + 1
            ),
            'appointments', jsonb_build_object(
                'total', growth_metrics.total_appointments_period,
                'completed', growth_metrics.completed_period,
                'cancelled', growth_metrics.cancelled_period,
                'pending', growth_metrics.pending_period,
                'confirmed', growth_metrics.confirmed_period,
                'completion_rate', growth_metrics.completion_rate,
                'cancellation_rate', growth_metrics.cancellation_rate
            ),
            'patients', jsonb_build_object(
                'unique_patients', growth_metrics.unique_patients_period,
                'recent_patients', growth_metrics.recent_patients,
                'returning_patients', growth_metrics.returning_patients,
                'retention_rate', growth_metrics.patient_retention_rate
            ),
            'operational_metrics', jsonb_build_object(
                'avg_appointment_duration', ROUND(growth_metrics.avg_appointment_duration, 1),
                'daily_avg_appointments', ROUND(growth_metrics.total_appointments_period::NUMERIC / ((date_to - date_from) + 1), 1)
            )
        ),
        'market_analysis', CASE WHEN p_include_comparisons THEN comparison_data ELSE NULL END,
        'patient_insights', CASE WHEN p_include_patient_insights THEN patient_insights ELSE NULL END,
        'recommendations', jsonb_build_array(
            CASE 
                WHEN growth_metrics.cancellation_rate > 15 THEN 'High cancellation rate - review booking policies'
                WHEN growth_metrics.cancellation_rate > 10 THEN 'Monitor cancellation trends'
                ELSE 'Cancellation rate is healthy'
            END,
            CASE 
                WHEN growth_metrics.patient_retention_rate < 30 THEN 'Low patient retention - focus on service quality'
                WHEN growth_metrics.patient_retention_rate < 50 THEN 'Average retention - consider loyalty programs'
                ELSE 'Excellent patient loyalty'
            END,
            CASE 
                WHEN clinic_info.rating < 4.0 THEN 'Patient satisfaction needs improvement'
                ELSE 'Maintain current service quality'
            END
        )
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Analytics unavailable');
END;
$$;


ALTER FUNCTION "public"."get_clinic_growth_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean, "p_include_patient_insights" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_clinic_performance_ranking"("days_period" integer DEFAULT 30, "result_limit" integer DEFAULT 10) RETURNS TABLE("clinic_id" "uuid", "clinic_name" character varying, "total_appointments" bigint, "completed_appointments" bigint, "completion_rate" numeric, "average_rating" numeric, "total_reviews" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        COUNT(a.id) AS total_appointments,
        COUNT(a.id) FILTER (WHERE a.status = 'completed') AS completed_appointments,
        CASE 
            WHEN COUNT(a.id) = 0 THEN 0 
            ELSE (COUNT(a.id) FILTER (WHERE a.status = 'completed') * 100.0 / COUNT(a.id))
        END AS completion_rate,
        c.rating,
        c.total_reviews
    FROM clinics c
    LEFT JOIN appointments a ON c.id = a.clinic_id 
        AND a.created_at >= (CURRENT_DATE - (days_period || ' days')::INTERVAL)
    WHERE c.is_active = true
    GROUP BY c.id, c.name, c.rating, c.total_reviews
    ORDER BY 
        total_appointments DESC,
        completion_rate DESC,
        c.rating DESC
    LIMIT result_limit;
END;
$$;


ALTER FUNCTION "public"."get_clinic_performance_ranking"("days_period" integer, "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_clinic_resource_analytics"("p_clinic_id" "uuid" DEFAULT NULL::"uuid", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_include_forecasting" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    target_clinic_id UUID;
    clinic_info RECORD;
    date_from DATE;
    date_to DATE;
    result JSONB;
BEGIN
    
    current_context := get_current_user_context();
    
    -- Access control: Staff can see own clinic, Admin can see any
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    CASE (current_context->>'user_type')
        WHEN 'staff' THEN
            target_clinic_id := COALESCE(p_clinic_id, (current_context->>'clinic_id')::UUID);
            -- Staff can only view their clinic
            IF target_clinic_id != (current_context->>'clinic_id')::UUID THEN
                RETURN jsonb_build_object('success', false, 'error', 'Staff can only view own clinic resources');
            END IF;
        WHEN 'admin' THEN
            IF p_clinic_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Clinic ID required for admin analytics');
            END IF;
            target_clinic_id := p_clinic_id;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Staff or Admin access required');
    END CASE;
    
    -- Date range defaults
    date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
    date_to := COALESCE(p_date_to, CURRENT_DATE);
    
    -- ✅ ENHANCED: Get clinic resource information
    SELECT 
        c.*,
        COUNT(DISTINCT sp.user_profile_id) as active_staff_count,
        COUNT(DISTINCT dc.doctor_id) as active_doctor_count,
        COUNT(DISTINCT s.id) as available_services_count
    INTO clinic_info
    FROM clinics c
    LEFT JOIN staff_profiles sp ON c.id = sp.clinic_id AND sp.is_active = true
    LEFT JOIN doctor_clinics dc ON c.id = dc.clinic_id AND dc.is_active = true
    LEFT JOIN services s ON c.id = s.clinic_id AND s.is_active = true
    WHERE c.id = target_clinic_id
    GROUP BY c.id, c.name, c.address, c.phone, c.email, c.rating, c.total_reviews, 
             c.services_offered, c.operating_hours, c.is_active, c.created_at;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found');
    END IF;
    
    -- ✅ OPTIMIZED: Resource utilization metrics
    WITH resource_metrics AS (
        SELECT 
            -- Appointment volume metrics
            COUNT(*) as total_appointments,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_appointments,
            COUNT(DISTINCT appointment_date) as active_days,
            COUNT(DISTINCT patient_id) as unique_patients,
            
            -- Time utilization
            SUM(duration_minutes) as total_appointment_minutes,
            AVG(duration_minutes) as avg_appointment_duration,
            
            -- Doctor utilization
            COUNT(DISTINCT doctor_id) as doctors_with_appointments,
            
            -- Daily patterns
            EXTRACT(DOW FROM appointment_date) as day_of_week,
            COUNT(*) as appointments_by_day
        FROM appointments
        WHERE clinic_id = target_clinic_id
        AND appointment_date >= date_from
        AND appointment_date <= date_to
        GROUP BY EXTRACT(DOW FROM appointment_date)
    ),
    capacity_analysis AS (
        SELECT 
            -- Theoretical capacity (assuming 8 hours/day, 5 days/week)
            clinic_info.active_doctor_count * 8 * 60 * ((date_to - date_from) + 1) / 7 * 5 as theoretical_weekly_minutes,
            
            -- Service demand analysis
            COUNT(DISTINCT aps.service_id) as services_used,
            jsonb_object_agg(
                s.name, 
                COUNT(aps.appointment_id)
            ) as service_demand_breakdown
        FROM appointment_services aps
        JOIN services s ON aps.service_id = s.id
        JOIN appointments a ON aps.appointment_id = a.id
        WHERE a.clinic_id = target_clinic_id
        AND a.appointment_date >= date_from
        AND a.appointment_date <= date_to
        GROUP BY clinic_info.active_doctor_count
    ),
    staffing_efficiency AS (
        SELECT 
            clinic_info.active_staff_count as current_staff,
            rm.total_appointments / NULLIF(clinic_info.active_staff_count, 0) as appointments_per_staff_member,
            rm.unique_patients / NULLIF(clinic_info.active_staff_count, 0) as patients_per_staff_member,
            
            -- Staff workload scoring
            CASE 
                WHEN (rm.total_appointments / NULLIF(clinic_info.active_staff_count, 0)) > 100 THEN 'high_workload'
                WHEN (rm.total_appointments / NULLIF(clinic_info.active_staff_count, 0)) > 50 THEN 'moderate_workload'
                ELSE 'manageable_workload'
            END as workload_assessment
        FROM resource_metrics rm
        WHERE rm.day_of_week IS NOT NULL
        LIMIT 1
    ),
    forecasting_data AS (
        -- Growth trends for forecasting (if requested)
        SELECT 
            DATE_TRUNC('week', appointment_date)::date as week_start,
            COUNT(*) as weekly_appointments,
            COUNT(DISTINCT patient_id) as weekly_unique_patients
        FROM appointments
        WHERE clinic_id = target_clinic_id
        AND appointment_date >= date_from - INTERVAL '4 weeks' -- Extra data for trend analysis
        AND appointment_date <= date_to
        GROUP BY DATE_TRUNC('week', appointment_date)::date
        ORDER BY week_start
    )
    SELECT jsonb_build_object(
        'success', true,
        'clinic_info', jsonb_build_object(
            'id', clinic_info.id,
            'name', clinic_info.name,
            'active_staff', clinic_info.active_staff_count,
            'active_doctors', clinic_info.active_doctor_count,
            'available_services', clinic_info.available_services_count,
            'operating_hours', clinic_info.operating_hours
        ),
        'analysis_period', jsonb_build_object(
            'from_date', date_from,
            'to_date', date_to,
            'days_analyzed', (date_to - date_from) + 1
        ),
        'appointment_metrics', jsonb_build_object(
            'total_appointments', COALESCE(rm.total_appointments, 0),
            'completed_appointments', COALESCE(rm.completed_appointments, 0),
            'cancelled_appointments', COALESCE(rm.cancelled_appointments, 0),
            'pending_appointments', COALESCE(rm.pending_appointments, 0),
            'unique_patients', COALESCE(rm.unique_patients, 0),
            'active_days', COALESCE(rm.active_days, 0),
            'avg_appointment_duration', ROUND(COALESCE(rm.avg_appointment_duration, 0), 1),
            'completion_rate', ROUND(
                COALESCE(rm.completed_appointments, 0)::NUMERIC / 
                NULLIF(COALESCE(rm.total_appointments, 0), 0) * 100, 1
            ),
            'daily_avg_appointments', ROUND(
                COALESCE(rm.total_appointments, 0)::NUMERIC / 
                NULLIF((date_to - date_from) + 1, 0), 1
            )
        ),
        'resource_utilization', jsonb_build_object(
            'doctor_utilization', jsonb_build_object(
                'doctors_with_appointments', COALESCE(rm.doctors_with_appointments, 0),
                'total_available_doctors', clinic_info.active_doctor_count,
                'utilization_rate', ROUND(
                    COALESCE(rm.doctors_with_appointments, 0)::NUMERIC / 
                    NULLIF(clinic_info.active_doctor_count, 0) * 100, 1
                ),
                'avg_appointments_per_doctor', ROUND(
                    COALESCE(rm.total_appointments, 0)::NUMERIC / 
                    NULLIF(clinic_info.active_doctor_count, 0), 1
                )
            ),
            'service_utilization', jsonb_build_object(
                'services_used', COALESCE(ca.services_used, 0),
                'total_available_services', clinic_info.available_services_count,
                'service_variety_rate', ROUND(
                    COALESCE(ca.services_used, 0)::NUMERIC / 
                    NULLIF(clinic_info.available_services_count, 0) * 100, 1
                ),
                'demand_breakdown', COALESCE(ca.service_demand_breakdown, '{}'::jsonb)
            ),
            'time_utilization', jsonb_build_object(
                'total_appointment_hours', ROUND(COALESCE(rm.total_appointment_minutes, 0) / 60.0, 1),
                'avg_daily_hours', ROUND(
                    COALESCE(rm.total_appointment_minutes, 0) / 60.0 / 
                    NULLIF((date_to - date_from) + 1, 0), 1
                ),
                'capacity_utilization_estimate', ROUND(
                    COALESCE(rm.total_appointment_minutes, 0)::NUMERIC / 
                    NULLIF(ca.theoretical_weekly_minutes, 0) * 100, 1
                )
            )
        ),
        'staffing_analysis', (
            SELECT jsonb_build_object(
                'current_staff_count', se.current_staff,
                'appointments_per_staff', ROUND(COALESCE(se.appointments_per_staff_member, 0), 1),
                'patients_per_staff', ROUND(COALESCE(se.patients_per_staff_member, 0), 1),
                'workload_assessment', se.workload_assessment,
                'staffing_recommendations', CASE se.workload_assessment
                    WHEN 'high_workload' THEN jsonb_build_array(
                        'Consider hiring additional staff',
                        'Review appointment scheduling efficiency',
                        'Implement staff rotation schedules'
                    )
                    WHEN 'moderate_workload' THEN jsonb_build_array(
                        'Current staffing appears adequate',
                        'Monitor for peak time bottlenecks'
                    )
                    ELSE jsonb_build_array(
                        'Staffing levels are comfortable',
                        'Capacity available for growth'
                    )
                END
            )
            FROM staffing_efficiency se
            LIMIT 1
        ),
        'growth_forecast', CASE WHEN p_include_forecasting THEN (
            SELECT jsonb_build_object(
                'weekly_trends', jsonb_agg(
                    jsonb_build_object(
                        'week_start', fd.week_start,
                        'appointments', fd.weekly_appointments,
                        'unique_patients', fd.weekly_unique_patients
                    )
                    ORDER BY fd.week_start
                ),
                'trend_analysis', jsonb_build_object(
                    'growth_trend', CASE 
                        WHEN COUNT(*) >= 4 THEN
                            CASE 
                                WHEN (LAG(weekly_appointments, 3) OVER (ORDER BY week_start) < weekly_appointments) THEN 'growing'
                                WHEN (LAG(weekly_appointments, 3) OVER (ORDER BY week_start) > weekly_appointments) THEN 'declining'
                                ELSE 'stable'
                            END
                        ELSE 'insufficient_data'
                    END,
                    'avg_weekly_growth', COALESCE(
                        (MAX(weekly_appointments) - MIN(weekly_appointments))::NUMERIC / 
                        NULLIF(COUNT(*), 0), 0
                    )
                )
            )
            FROM forecasting_data fd
        ) ELSE NULL END,
        'resource_recommendations', jsonb_build_array(
            CASE 
                WHEN clinic_info.active_doctor_count = 0 THEN 'Critical: No active doctors assigned'
                WHEN COALESCE(rm.doctors_with_appointments, 0)::NUMERIC / NULLIF(clinic_info.active_doctor_count, 0) < 0.5 
                THEN 'Low doctor utilization - review scheduling or availability'
                ELSE 'Doctor utilization is healthy'
            END,
            CASE 
                WHEN clinic_info.active_staff_count = 0 THEN 'Critical: No active staff members'
                WHEN clinic_info.active_staff_count < 2 THEN 'Consider adding staff for redundancy'
                ELSE 'Staffing levels appear adequate'
            END,
            CASE 
                WHEN COALESCE(ca.services_used, 0)::NUMERIC / NULLIF(clinic_info.available_services_count, 0) < 0.3
                THEN 'Many services unused - review service offerings'
                ELSE 'Good service variety utilization'
            END
        )
    ) INTO result
    FROM resource_metrics rm
    CROSS JOIN capacity_analysis ca;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Resource analytics unavailable');
END;
$$;


ALTER FUNCTION "public"."get_clinic_resource_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_forecasting" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_staff_clinic_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    clinic_id UUID;
BEGIN
    SELECT sp.clinic_id INTO clinic_id
    FROM public.users u 
    JOIN public.user_profiles up ON u.id = up.user_id
    JOIN public.staff_profiles sp ON up.id = sp.user_profile_id 
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    AND sp.is_active = true;
    
    RETURN clinic_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_staff_clinic_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_context"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_auth_uid UUID;
    user_record RECORD;
    result JSONB;
    cached_context TEXT;
BEGIN
    -- Get auth user ID from current session
    current_auth_uid := auth.uid();
    
    IF current_auth_uid IS NULL THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- TRY to get from session cache (non-breaking addition)
    BEGIN
        cached_context := current_setting('app.user_context_' || current_auth_uid::text, true);
        
        -- If cached and valid (less than 5 minutes old), return it
        IF cached_context IS NOT NULL AND cached_context != '' THEN
            result := cached_context::JSONB;
            -- Check if cache is still fresh (5 minutes)
            IF (result->>'cached_at')::timestamp + INTERVAL '5 minutes' > NOW() THEN
                RETURN result - 'cached_at'; -- Remove internal cache timestamp
            END IF;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Cache failed, continue with normal query
            NULL;
    END;
    
    -- ✅ REFACTOR: Email-centric user context query (phone optional)
    SELECT 
        u.id as user_id,
        u.auth_user_id,
        u.email, -- Primary identifier
        u.phone, -- Optional field
        u.email_verified,
        u.phone_verified,
        u.is_active,
        up.user_type,
        up.first_name,
        up.last_name,
        sp.clinic_id,
        sp.is_active as staff_active
    INTO user_record
    FROM public.users u 
    JOIN public.user_profiles up ON u.id = up.user_id
    LEFT JOIN public.staff_profiles sp ON up.id = sp.user_profile_id 
    WHERE u.auth_user_id = current_auth_uid 
    AND u.is_active = true
    AND u.email_verified = true; -- ✅ REFACTOR: Only email verification required
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'authenticated', true,
            'profile_exists', false,
            'error', 'User profile not found or email not verified'
        );
    END IF;
    
    -- ✅ REFACTOR: Email-centric result building
    result := jsonb_build_object(
        'authenticated', true,
        'profile_exists', true,
        'user_id', user_record.user_id,
        'auth_user_id', user_record.auth_user_id,
        'email', user_record.email, -- Primary identifier
        'phone', user_record.phone, -- Optional field (can be null)
        'phone_verified', CASE WHEN user_record.phone IS NOT NULL THEN user_record.phone_verified ELSE null END, -- ✅ Only show if phone exists
        'user_type', user_record.user_type::text,
        'first_name', user_record.first_name,
        'last_name', user_record.last_name,
        'full_name', user_record.first_name || ' ' || user_record.last_name,
        'is_active', user_record.is_active,
        'authentication_method', 'email_first' -- ✅ NEW: Indicate auth method
    );
    
    -- Add role-specific context
    IF user_record.user_type = 'staff' THEN
        result := result || jsonb_build_object(
            'clinic_id', user_record.clinic_id,
            'staff_active', user_record.staff_active
        );
    END IF;
    
    -- SAFE CACHE SET (won't break if it fails)
    BEGIN
        PERFORM set_config(
            'app.user_context_' || current_auth_uid::text, 
            (result || jsonb_build_object('cached_at', NOW()))::text, 
            true
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Cache failed, but function still works
            NULL;
    END;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."get_current_user_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    current_auth_uid UUID;
    result_user_id UUID;
BEGIN
    current_auth_uid := auth.uid();
    
    IF current_auth_uid IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT id INTO result_user_id
    FROM public.users 
    WHERE auth_user_id = current_auth_uid 
    AND is_active = true;
    
    RETURN result_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "public"."user_type"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    user_role user_type;
    current_auth_uid UUID;
BEGIN
    current_auth_uid := auth.uid();
    
    IF current_auth_uid IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT up.user_type INTO user_role
    FROM public.users u 
    JOIN public.user_profiles up ON u.id = up.user_id 
    WHERE u.auth_user_id = current_auth_uid 
    AND u.is_active = true;
    
    RETURN user_role;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_data"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_cataglog', 'extensions'
    AS $$
DECLARE
    target_user_id UUID;
    current_context JSONB;
    user_role TEXT;
    clinic_id_val UUID;
    result JSONB;
BEGIN
    -- ORIGINAL LOGIC (unchanged)
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    user_role := current_context->>'user_type';
    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    
    CASE user_role
        WHEN 'patient' THEN
            -- OPTIMIZED: Single query with CTEs instead of nested subqueries
            WITH patient_appointments AS (
                SELECT 
                    a.id, a.appointment_date, a.appointment_time, a.status,
                    c.name as clinic_name,
                    COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization) as doctor_name
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.patient_id = target_user_id
            ),
            appointment_services_agg AS (
                SELECT 
                    aps.appointment_id,
                    jsonb_agg(jsonb_build_object('name', s.name, 'duration', s.duration_minutes)) as services
                FROM appointment_services aps
                JOIN services s ON aps.service_id = s.id
                WHERE aps.appointment_id IN (SELECT id FROM patient_appointments)
                GROUP BY aps.appointment_id
            ),
            patient_notifications AS (
                SELECT 
                    n.id, n.title, n.message, n.created_at, n.is_read
                FROM notifications n
                WHERE n.user_id = target_user_id AND n.is_read = false
                ORDER BY n.created_at DESC
                LIMIT 10
            )
            SELECT jsonb_build_object(
                'profile_completion', get_profile_completion_status(target_user_id),
                'upcoming_appointments', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', pa.id,
                            'appointment_date', pa.appointment_date,
                            'appointment_time', pa.appointment_time,
                            'status', pa.status,
                            'clinic_name', pa.clinic_name,
                            'doctor_name', pa.doctor_name,
                            'services', COALESCE(asa.services, '[]'::jsonb)
                        ) ORDER BY pa.appointment_date, pa.appointment_time
                    ), '[]'::jsonb)
                    FROM patient_appointments pa
                    LEFT JOIN appointment_services_agg asa ON pa.id = asa.appointment_id
                    WHERE pa.appointment_date >= CURRENT_DATE
                    AND pa.status IN ('pending', 'confirmed')
                    LIMIT 5
                ),
                'recent_appointments', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', pa.id,
                            'appointment_date', pa.appointment_date,
                            'status', pa.status,
                            'clinic_name', pa.clinic_name,
                            'can_leave_feedback', (pa.status = 'completed' AND 
                                NOT EXISTS(SELECT 1 FROM feedback WHERE appointment_id = pa.id))
                        ) ORDER BY pa.appointment_date DESC
                    ), '[]'::jsonb)
                    FROM patient_appointments pa
                    WHERE pa.status IN ('completed', 'cancelled')
                    LIMIT 5
                ),
                'quick_stats', get_patient_analytics(target_user_id),
                'notifications', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', pn.id,
                            'title', pn.title,
                            'message', pn.message,
                            'created_at', pn.created_at,
                            'is_read', pn.is_read
                        ) ORDER BY pn.created_at DESC
                    ), '[]'::jsonb)
                    FROM patient_notifications pn
                )
            ) INTO result;
            
        -- ORIGINAL STAFF AND ADMIN LOGIC (unchanged for safety)
        WHEN 'staff' THEN
            clinic_id_val := (current_context->>'clinic_id')::UUID;
            
            SELECT jsonb_build_object(
                'clinic_info', (
                    SELECT jsonb_build_object(
                        'id', c.id,
                        'name', c.name,
                        'rating', c.rating,
                        'total_reviews', c.total_reviews
                    )
                    FROM clinics c
                    WHERE c.id = clinic_id_val
                ),
                'todays_appointments', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', a.id,
                            'appointment_time', a.appointment_time,
                            'patient_name', up.first_name || ' ' || up.last_name,
                            'status', a.status,
                            'services', (
                                SELECT jsonb_agg(s.name)
                                FROM appointment_services aps
                                JOIN services s ON aps.service_id = s.id
                                WHERE aps.appointment_id = a.id
                            )
                        ) ORDER BY a.appointment_time
                    ), '[]'::jsonb)
                    FROM appointments a
                    JOIN users u ON a.patient_id = u.id
                    JOIN user_profiles up ON u.id = up.user_id
                    WHERE a.clinic_id = clinic_id_val
                    AND a.appointment_date = CURRENT_DATE
                ),
                'pending_feedback', (
                    SELECT COUNT(*)
                    FROM feedback f
                    WHERE f.clinic_id = clinic_id_val
                    AND f.response IS NULL
                ),
                'growth_analytics', get_clinic_growth_analytics()
            ) INTO result;
            
        WHEN 'admin' THEN
            result := get_admin_system_analytics(30);
            
        ELSE
            result := jsonb_build_object('error', 'Invalid user role');
    END CASE;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_dashboard_data"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ongoing_treatments"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    target_user_id UUID;
    result JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- Only patients can access ongoing treatments
    IF (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Patient only');
    END IF;
    
    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    
    -- Get ongoing treatments with proper grouping
    WITH treatment_appointments AS (
        SELECT 
            a.id as appointment_id,
            a.appointment_date,
            a.appointment_time,
            a.duration_minutes,
            a.status,
            a.notes,
            a.created_at,
            c.id as clinic_id,
            c.name as clinic_name,
            c.address as clinic_address,
            c.phone as clinic_phone,
            c.email as clinic_email,
            COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization) as doctor_name,
            d.id as doctor_id,
            d.specialization,
            s.id as service_id,
            s.name as service_name,
            s.category as service_category,
            s.duration_minutes as service_duration
        FROM appointments a
        JOIN clinics c ON a.clinic_id = c.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        JOIN appointment_services aps ON a.id = aps.appointment_id
        JOIN services s ON aps.service_id = s.id
        WHERE a.patient_id = target_user_id
        AND a.status IN ('completed', 'confirmed', 'pending')
        AND s.category IS NOT NULL
        ORDER BY a.appointment_date
    ),
    treatment_groups AS (
        SELECT 
            CONCAT(service_category, '_', doctor_id) as treatment_key,
            service_category as treatment_type,
            doctor_name,
            doctor_id,
            clinic_name,
            clinic_address,
            clinic_phone,
            clinic_email,
            COUNT(*) as total_sessions,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
            MIN(appointment_date) as start_date,
            MAX(appointment_date) as estimated_end_date,
            jsonb_agg(
                jsonb_build_object(
                    'appointment_id', appointment_id,
                    'date', appointment_date,
                    'time', appointment_time,
                    'duration', duration_minutes,
                    'status', status,
                    'service_name', service_name,
                    'notes', notes
                )
                ORDER BY appointment_date
            ) as appointments,
            -- Get next upcoming appointment
            (
                SELECT jsonb_build_object(
                    'appointment_id', appointment_id,
                    'date', appointment_date,
                    'time', appointment_time,
                    'service_name', service_name,
                    'duration', duration_minutes || ' min',
                    'cancellable', status = 'confirmed'
                )
                FROM treatment_appointments ta2 
                WHERE ta2.service_category = treatment_appointments.service_category 
                AND ta2.doctor_id = treatment_appointments.doctor_id
                AND ta2.status IN ('confirmed', 'pending')
                AND ta2.appointment_date >= CURRENT_DATE
                ORDER BY ta2.appointment_date, ta2.appointment_time
                LIMIT 1
            ) as next_appointment
        FROM treatment_appointments
        GROUP BY service_category, doctor_name, doctor_id, clinic_name, clinic_address, clinic_phone, clinic_email
        HAVING COUNT(*) > 1  -- Only treatments with multiple appointments
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'treatments', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', treatment_key,
                    'treatment_type', treatment_type,
                    'doctor_name', doctor_name,
                    'clinic_name', clinic_name,
                    'clinic_address', clinic_address,
                    'start_date', start_date,
                    'estimated_end_date', estimated_end_date,
                    'total_sessions', total_sessions,
                    'completed_sessions', completed_sessions,
                    'progress', ROUND((completed_sessions::decimal / total_sessions::decimal) * 100),
                    'next_appointment', next_appointment,
                    'appointments', appointments,
                    'contact_info', jsonb_build_object(
                        'phone', clinic_phone,
                        'email', clinic_email
                    )
                )
            ), '[]'::jsonb),
            'summary', jsonb_build_object(
                'total_treatments', COUNT(*),
                'active_treatments', COUNT(*) FILTER (WHERE next_appointment IS NOT NULL),
                'completed_treatments', COUNT(*) FILTER (WHERE completed_sessions = total_sessions)
            )
        )
    ) INTO result
    FROM treatment_groups;
    
    RETURN COALESCE(result, jsonb_build_object('success', true, 'data', jsonb_build_object('treatments', '[]'::jsonb, 'summary', jsonb_build_object('total_treatments', 0, 'active_treatments', 0, 'completed_treatments', 0))));
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_ongoing_treatments"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_patient_analytics"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    patient_id_val UUID;
    result JSONB;
BEGIN
    -- Resolve patient id
    IF p_user_id IS NULL THEN
        SELECT id INTO patient_id_val FROM users WHERE auth_user_id = auth.uid();
    ELSE
        patient_id_val := p_user_id;
    END IF;

    IF patient_id_val IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;

    -- ✅ FIX: Use subqueries instead of CTEs in JSONB context
    SELECT jsonb_build_object(
        'total_appointments', (
            SELECT COUNT(*) FROM appointments WHERE patient_id = patient_id_val
        ),
        'completed_appointments', (
            SELECT COUNT(*) FROM appointments 
            WHERE patient_id = patient_id_val AND status = 'completed'
        ),
        'upcoming_appointments', (
            SELECT COUNT(*) FROM appointments 
            WHERE patient_id = patient_id_val AND appointment_date > CURRENT_DATE
        ),
        'favorite_clinic', (
            SELECT jsonb_build_object(
                'clinic_id', clinic_id,
                'clinic_name', clinic_name,
                'total_visits', total_visits
            )
            FROM (
                SELECT a.clinic_id, c.name AS clinic_name, COUNT(*) AS total_visits
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                WHERE a.patient_id = patient_id_val
                GROUP BY a.clinic_id, c.name
                ORDER BY total_visits DESC
                LIMIT 1
            ) sub
        ),
        'last_appointment', (
            SELECT jsonb_build_object(
                'appointment_id', id,
                'appointment_date', appointment_date,
                'status', status
            )
            FROM appointments
            WHERE patient_id = patient_id_val
            ORDER BY appointment_date DESC
            LIMIT 1
        )
    ) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_patient_analytics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_patient_feedback_history"("p_patient_id" "uuid" DEFAULT NULL::"uuid", "p_include_archived" boolean DEFAULT false, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
  current_context JSONB;
  patient_id_val UUID;
  result JSONB;
BEGIN
  current_context := get_current_user_context();
  
  IF NOT (current_context->>'authenticated')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  IF (current_context->>'user_type') != 'patient' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient access required');
  END IF;
  
  patient_id_val := COALESCE(p_patient_id, (current_context->>'user_id')::UUID);
  
  WITH feedback_data AS (
    SELECT 
      f.id,
      f.rating,
      f.comment,
      f.is_anonymous,
      f.is_public,
      f.response,
      f.responded_at,
      f.created_at,
      f.appointment_id,
      f.clinic_id,
      f.doctor_id,
      -- Appointment details
      a.appointment_date,
      a.appointment_time,
      -- Clinic details
      c.name as clinic_name,
      c.address as clinic_address,
      -- Doctor details
      d.first_name || ' ' || d.last_name as doctor_name,
      d.specialization as doctor_specialization,
      -- Services
      (SELECT jsonb_agg(s.name) FROM appointment_services aps 
       JOIN services s ON aps.service_id = s.id 
       WHERE aps.appointment_id = f.appointment_id) as services
    FROM feedback f
    LEFT JOIN appointments a ON f.appointment_id = a.id
    LEFT JOIN clinics c ON f.clinic_id = c.id
    LEFT JOIN doctors d ON f.doctor_id = d.id
    WHERE f.patient_id = patient_id_val
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'feedback_history', COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'rating', rating,
          'message', comment,
          'is_anonymous', is_anonymous,
          'clinic_response', response,
          'responded_at', responded_at,
          'created_at', created_at,
          'appointment', jsonb_build_object(
            'id', appointment_id,
            'date', appointment_date,
            'time', appointment_time,
            'services', services
          ),
          'clinic', jsonb_build_object(
            'id', clinic_id,
            'name', clinic_name,
            'address', clinic_address
          ),
          'doctor', CASE WHEN doctor_name IS NOT NULL THEN
            jsonb_build_object(
              'id', doctor_id,
              'name', doctor_name,
              'specialization', doctor_specialization
            )
          ELSE NULL END
        )
        ORDER BY created_at DESC
      ), '[]'::jsonb),
      'total_count', (SELECT COUNT(*) FROM feedback WHERE patient_id = patient_id_val)
    )
  ) INTO result
  FROM feedback_data;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to fetch feedback history');
END;
$$;


ALTER FUNCTION "public"."get_patient_feedback_history"("p_patient_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_patient_health_analytics"("p_patient_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
    result JSON;
    patient_id_val UUID;
    health_score INTEGER;
    improvement_trend DECIMAL;
BEGIN
    -- Use current user if no patient ID provided
    IF p_patient_id IS NULL THEN
        SELECT get_current_user_id() INTO patient_id_val;
    ELSE
        patient_id_val := p_patient_id;
    END IF;
    
    -- Only allow patients to see their own data or staff to see their clinic patients
    IF get_current_user_role() = 'patient' AND patient_id_val != get_current_user_id() THEN
        RAISE EXCEPTION 'Access denied';
    ELSIF get_current_user_role() = 'staff' AND patient_id_val NOT IN (
        SELECT DISTINCT patient_id 
        FROM appointments 
        WHERE clinic_id = (
        SELECT sp.clinic_id
        FROM staff_profiles sp
        JOIN user_profiles up ON up.id = sp.user_profile_id
        WHERE up.user_id = get_current_user_id()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Calculate health improvement score
    WITH appointment_timeline AS (
        SELECT 
            appointment_date,
            status,
            ROW_NUMBER() OVER (ORDER BY appointment_date) as visit_number,
            COUNT(*) OVER () as total_visits
        FROM appointments 
        WHERE patient_id = patient_id_val AND status = 'completed'
    ),
    health_metrics AS (
        SELECT 
            COUNT(*) as total_completed,
            AVG(CASE WHEN visit_number <= total_visits/2 THEN 1 ELSE 0 END) as early_visits,
            AVG(CASE WHEN visit_number > total_visits/2 THEN 1 ELSE 0 END) as recent_visits
        FROM appointment_timeline
    )
    SELECT 
        CASE 
            WHEN total_completed = 0 THEN 0
            WHEN total_completed = 1 THEN 50
            WHEN recent_visits > early_visits THEN 75 + (recent_visits * 25)::INTEGER
            ELSE 50 + (total_completed * 5)::INTEGER
        END
    INTO health_score
    FROM health_metrics;
    
    -- Calculate improvement trend (comparing last 3 months vs previous 3 months)
    SELECT 
        CASE 
            WHEN COUNT(*) FILTER (WHERE appointment_date >= CURRENT_DATE - INTERVAL '3 months') >
                 COUNT(*) FILTER (WHERE appointment_date >= CURRENT_DATE - INTERVAL '6 months' AND appointment_date < CURRENT_DATE - INTERVAL '3 months')
            THEN 1.5
            ELSE 1.0
        END
    INTO improvement_trend
    FROM appointments 
    WHERE patient_id = patient_id_val AND status = 'completed';
    
    SELECT json_build_object(
        'health_score', COALESCE(health_score, 0),
        'improvement_trend', COALESCE(improvement_trend, 1.0),
        'total_appointments', (SELECT COUNT(*) FROM appointments WHERE patient_id = patient_id_val),
        'completed_treatments', (SELECT COUNT(*) FROM appointments WHERE patient_id = patient_id_val AND status = 'completed'),
        'consistency_rating', LEAST(100, (SELECT COUNT(*) FROM appointments WHERE patient_id = patient_id_val AND status = 'completed') * 10),
        'last_visit', (SELECT MAX(appointment_date) FROM appointments WHERE patient_id = patient_id_val AND status = 'completed'),
        'next_recommended_visit', (SELECT MAX(appointment_date) + INTERVAL '6 months' FROM appointments WHERE patient_id = patient_id_val AND status = 'completed')
    ) INTO result;
    
    RETURN result;
END;$$;


ALTER FUNCTION "public"."get_patient_health_analytics"("p_patient_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_completion_status"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    target_user_id UUID;
    user_role user_type;
    result JSONB;
BEGIN
    target_user_id := COALESCE(p_user_id, get_current_user_id());
    
    SELECT up.user_type INTO user_role
    FROM users u
    JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = target_user_id;
    
    IF user_role = 'patient' THEN
        SELECT jsonb_build_object(
            'completion_percentage', 
            CASE 
                WHEN COUNT(CASE WHEN up.first_name IS NOT NULL AND up.first_name != '' THEN 1 END) +
                     COUNT(CASE WHEN up.last_name IS NOT NULL AND up.last_name != '' THEN 1 END) +
                     COUNT(CASE WHEN up.date_of_birth IS NOT NULL THEN 1 END) +
                     COUNT(CASE WHEN pp.emergency_contact_name IS NOT NULL AND pp.emergency_contact_name != '' THEN 1 END) +
                     COUNT(CASE WHEN pp.emergency_contact_phone IS NOT NULL AND pp.emergency_contact_phone != '' THEN 1 END) = 5
                THEN 100
                WHEN COUNT(CASE WHEN up.first_name IS NOT NULL AND up.first_name != '' THEN 1 END) +
                     COUNT(CASE WHEN up.last_name IS NOT NULL AND up.last_name != '' THEN 1 END) >= 2
                THEN 60
                ELSE 20
            END,
            'missing_fields', jsonb_build_array(
                CASE WHEN up.first_name IS NULL OR up.first_name = '' THEN 'first_name' END,
                CASE WHEN up.last_name IS NULL OR up.last_name = '' THEN 'last_name' END,
                CASE WHEN up.date_of_birth IS NULL THEN 'date_of_birth' END,
                CASE WHEN pp.emergency_contact_name IS NULL OR pp.emergency_contact_name = '' THEN 'emergency_contact_name' END,
                CASE WHEN pp.emergency_contact_phone IS NULL OR pp.emergency_contact_phone = '' THEN 'emergency_contact_phone' END
            ),
            'next_steps', CASE 
                WHEN up.first_name IS NULL OR up.first_name = '' THEN 'Complete basic profile information'
                WHEN pp.emergency_contact_name IS NULL THEN 'Add emergency contact information'
                ELSE 'Profile complete'
            END
        ) INTO result
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN patient_profiles pp ON up.id = pp.user_profile_id
        WHERE u.id = target_user_id
        GROUP BY up.first_name, up.last_name, up.date_of_birth, pp.emergency_contact_name, pp.emergency_contact_phone;
    ELSE
        result := jsonb_build_object('completion_percentage', 100, 'missing_fields', '[]'::jsonb);
    END IF;
    
    RETURN COALESCE(result, jsonb_build_object('completion_percentage', 0, 'missing_fields', '[]'::jsonb));
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_profile_completion_status"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_staff_invitation_status"("p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_catalog'
    AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    SELECT 
        si.*,
        c.name as clinic_name
    INTO invitation_record
    FROM staff_invitations si
    LEFT JOIN clinics c ON si.clinic_id = c.id
    WHERE si.id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'status', invitation_record.status,
        'email', invitation_record.email,
        'clinic_name', invitation_record.clinic_name,
        'expires_at', invitation_record.expires_at,
        'expired', invitation_record.expires_at < NOW()
    );
END;
$$;


ALTER FUNCTION "public"."get_staff_invitation_status"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_staff_invitations"("p_clinic_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_catalog'
    AS $$
DECLARE
    current_user_context JSONB;
    invitations JSONB;
BEGIN
    -- Security check
    current_user_context := get_current_user_context();
    
    IF NOT (current_user_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF (current_user_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
    END IF;
    
    SELECT jsonb_build_object(
        'success', true,
        'invitations', jsonb_agg(
            jsonb_build_object(
                'id', si.id,
                'email', si.email,
                'clinic_name', c.name,
                'position', si.position,
                'status', si.status,
                'created_at', si.created_at,
                'expires_at', si.expires_at,
                'expired', si.expires_at < NOW()
            ) ORDER BY si.created_at DESC
        )
    ) INTO invitations
    FROM staff_invitations si
    LEFT JOIN clinics c ON si.clinic_id = c.id
    WHERE (p_clinic_id IS NULL OR si.clinic_id = p_clinic_id)
    AND (p_status IS NULL OR si.status = p_status)
    LIMIT p_limit OFFSET p_offset;
    
    RETURN COALESCE(invitations, jsonb_build_object('success', true, 'invitations', '[]'::jsonb));
END;
$$;


ALTER FUNCTION "public"."get_staff_invitations"("p_clinic_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_staff_performance_analytics"("p_staff_id" "uuid" DEFAULT NULL::"uuid", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_include_comparisons" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    target_staff_id UUID;
    staff_info RECORD;
    date_from DATE;
    date_to DATE;
    result JSONB;
BEGIN
    
    current_context := get_current_user_context();
    
    -- Access control: Staff can see own analytics, Admin can see any
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    CASE (current_context->>'user_type')
        WHEN 'staff' THEN
            target_staff_id := COALESCE(p_staff_id, (current_context->>'user_id')::UUID);
            -- Staff can only view their own analytics
            IF target_staff_id != (current_context->>'user_id')::UUID THEN
                RETURN jsonb_build_object('success', false, 'error', 'Staff can only view own performance analytics');
            END IF;
        WHEN 'admin' THEN
            IF p_staff_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Staff ID required for admin analytics');
            END IF;
            target_staff_id := p_staff_id;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Staff or Admin access required');
    END CASE;
    
    -- Date range defaults
    date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
    date_to := COALESCE(p_date_to, CURRENT_DATE);
    
    -- ✅ ENHANCED: Get comprehensive staff information
    SELECT 
        u.id as user_id,
        up.first_name || ' ' || up.last_name as full_name,
        sp.position,
        sp.department,
        sp.hire_date,
        sp.is_active,
        c.id as clinic_id,
        c.name as clinic_name
    INTO staff_info
    FROM users u
    JOIN user_profiles up ON u.id = up.user_id
    JOIN staff_profiles sp ON up.id = sp.user_profile_id
    JOIN clinics c ON sp.clinic_id = c.id
    WHERE u.id = target_staff_id
    AND up.user_type = 'staff';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff member not found');
    END IF;
    
    -- ✅ OPTIMIZED: Calculate performance metrics
    WITH staff_metrics AS (
        -- Appointment management metrics
        SELECT 
            COUNT(*) FILTER (WHERE status = 'confirmed') as appointments_approved,
            COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = target_staff_id) as appointments_cancelled,
            COUNT(*) FILTER (WHERE status = 'completed') as appointments_completed,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) FILTER (WHERE status IN ('confirmed', 'cancelled')) as avg_response_time_hours,
            
            -- Patient interaction metrics
            COUNT(DISTINCT patient_id) as unique_patients_served,
            COUNT(DISTINCT appointment_date) as active_days,
            
            -- Performance scores
            ROUND(
                (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
                 NULLIF(COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')), 0) * 100), 1
            ) as completion_rate
            
        FROM appointments
        WHERE clinic_id = staff_info.clinic_id
        AND created_at >= date_from
        AND created_at <= date_to
        AND (
            -- Appointments this staff member interacted with
            cancelled_by = target_staff_id OR
            id IN (
                -- Appointments they may have approved (we track this via updated_at timing)
                SELECT a.id FROM appointments a
                WHERE a.clinic_id = staff_info.clinic_id
                AND a.status = 'confirmed'
                AND a.updated_at >= date_from
                AND a.updated_at <= date_to
            )
        )
    ),
    communication_metrics AS (
        -- Email communication metrics
        SELECT 
            COUNT(*) as emails_sent,
            COUNT(DISTINCT to_user_id) as unique_recipients,
            COUNT(*) FILTER (WHERE urgency_level = 'urgent') as urgent_communications,
            AVG(LENGTH(message_body)) as avg_message_length
        FROM email_communications
        WHERE from_user_id = target_staff_id
        AND sent_at >= date_from
        AND sent_at <= date_to
    ),
    feedback_metrics AS (
        -- Feedback related to staff's clinic
        SELECT 
            COUNT(*) as total_feedback_received,
            AVG(rating) as avg_rating,
            COUNT(*) FILTER (WHERE rating >= 4) as positive_feedback,
            COUNT(*) FILTER (WHERE rating <= 2) as negative_feedback
        FROM feedback
        WHERE clinic_id = staff_info.clinic_id
        AND created_at >= date_from
        AND created_at <= date_to
    ),
    clinic_comparison AS (
        -- Compare with other staff at same clinic (if requested)
        SELECT 
            AVG(staff_performance.completion_rate) as clinic_avg_completion_rate,
            COUNT(DISTINCT staff_performance.staff_user_id) as total_staff_count
        FROM (
            SELECT DISTINCT
                cancelled_by as staff_user_id,
                (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
                 NULLIF(COUNT(*), 0) * 100) as completion_rate
            FROM appointments
            WHERE clinic_id = staff_info.clinic_id
            AND created_at >= date_from
            AND created_at <= date_to
            AND cancelled_by IS NOT NULL
            GROUP BY cancelled_by
        ) staff_performance
        WHERE p_include_comparisons
    )
    SELECT jsonb_build_object(
        'success', true,
        'staff_info', jsonb_build_object(
            'id', staff_info.user_id,
            'name', staff_info.full_name,
            'position', staff_info.position,
            'department', staff_info.department,
            'hire_date', staff_info.hire_date,
            'is_active', staff_info.is_active,
            'clinic', jsonb_build_object(
                'id', staff_info.clinic_id,
                'name', staff_info.clinic_name
            ),
            'tenure_months', EXTRACT(MONTH FROM AGE(CURRENT_DATE, staff_info.hire_date))
        ),
        'performance_period', jsonb_build_object(
            'from_date', date_from,
            'to_date', date_to,
            'days_covered', (date_to - date_from) + 1
        ),
        'appointment_management', jsonb_build_object(
            'appointments_approved', COALESCE(sm.appointments_approved, 0),
            'appointments_cancelled', COALESCE(sm.appointments_cancelled, 0),
            'appointments_completed', COALESCE(sm.appointments_completed, 0),
            'unique_patients_served', COALESCE(sm.unique_patients_served, 0),
            'active_days', COALESCE(sm.active_days, 0),
            'completion_rate', COALESCE(sm.completion_rate, 0),
            'avg_response_time_hours', ROUND(COALESCE(sm.avg_response_time_hours, 0), 2),
            'daily_avg_interactions', ROUND(
                COALESCE(sm.appointments_approved + sm.appointments_cancelled, 0)::NUMERIC / 
                NULLIF((date_to - date_from) + 1, 0), 2
            )
        ),
        'communication_activity', jsonb_build_object(
            'emails_sent', COALESCE(cm.emails_sent, 0),
            'unique_recipients', COALESCE(cm.unique_recipients, 0),
            'urgent_communications', COALESCE(cm.urgent_communications, 0),
            'avg_message_length', ROUND(COALESCE(cm.avg_message_length, 0), 0),
            'communication_score', CASE 
                WHEN COALESCE(cm.emails_sent, 0) = 0 THEN 'no_data'
                WHEN COALESCE(cm.emails_sent, 0) >= 20 THEN 'excellent'
                WHEN COALESCE(cm.emails_sent, 0) >= 10 THEN 'good'
                ELSE 'needs_improvement'
            END
        ),
        'patient_satisfaction', jsonb_build_object(
            'total_feedback_received', COALESCE(fm.total_feedback_received, 0),
            'avg_rating', ROUND(COALESCE(fm.avg_rating, 0), 2),
            'positive_feedback_count', COALESCE(fm.positive_feedback, 0),
            'negative_feedback_count', COALESCE(fm.negative_feedback, 0),
            'satisfaction_score', CASE 
                WHEN COALESCE(fm.avg_rating, 0) >= 4.5 THEN 'excellent'
                WHEN COALESCE(fm.avg_rating, 0) >= 4.0 THEN 'good'
                WHEN COALESCE(fm.avg_rating, 0) >= 3.0 THEN 'average'
                WHEN COALESCE(fm.avg_rating, 0) > 0 THEN 'needs_improvement'
                ELSE 'no_data'
            END
        ),
        'performance_comparison', CASE WHEN p_include_comparisons AND cc.clinic_avg_completion_rate IS NOT NULL THEN
            jsonb_build_object(
                'completion_rate_vs_clinic_avg', CASE 
                    WHEN COALESCE(sm.completion_rate, 0) > cc.clinic_avg_completion_rate THEN 'above_average'
                    WHEN COALESCE(sm.completion_rate, 0) > cc.clinic_avg_completion_rate * 0.9 THEN 'average'
                    ELSE 'below_average'
                END,
                'clinic_avg_completion_rate', ROUND(cc.clinic_avg_completion_rate, 1),
                'clinic_staff_count', cc.total_staff_count,
                'ranking_insights', jsonb_build_array(
                    CASE 
                        WHEN COALESCE(sm.completion_rate, 0) >= 95 THEN 'Exceptional appointment completion rate'
                        WHEN COALESCE(sm.completion_rate, 0) >= 85 THEN 'Good appointment management'
                        ELSE 'Room for improvement in appointment handling'
                    END,
                    CASE 
                        WHEN COALESCE(sm.avg_response_time_hours, 0) <= 2 THEN 'Fast response time to appointments'
                        WHEN COALESCE(sm.avg_response_time_hours, 0) <= 8 THEN 'Adequate response time'
                        ELSE 'Could improve response time to patient requests'
                    END
                )
            )
            ELSE NULL
        END,
        'recommendations', jsonb_build_array(
            CASE 
                WHEN COALESCE(sm.completion_rate, 0) < 85 THEN 'Focus on improving appointment completion rate'
                WHEN COALESCE(sm.avg_response_time_hours, 0) > 8 THEN 'Work on faster response times to patient requests'
                ELSE 'Maintain current performance standards'
            END,
            CASE 
                WHEN COALESCE(cm.emails_sent, 0) < 5 THEN 'Increase patient communication frequency'
                WHEN COALESCE(fm.avg_rating, 0) < 4.0 AND COALESCE(fm.total_feedback_received, 0) > 0 THEN 'Focus on improving patient satisfaction'
                ELSE 'Continue excellent patient service'
            END
        )
    ) INTO result
    FROM staff_metrics sm
    CROSS JOIN communication_metrics cm
    CROSS JOIN feedback_metrics fm
    LEFT JOIN clinic_comparison cc ON p_include_comparisons;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Performance analytics unavailable');
END;
$$;


ALTER FUNCTION "public"."get_staff_performance_analytics"("p_staff_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_appointments"("p_status" "text"[] DEFAULT NULL::"text"[], "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$DECLARE
    current_context JSONB;
    v_current_role TEXT;
    clinic_id_val UUID;
    user_id_val UUID;
    result JSONB;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    user_id_val := (current_context->>'user_id')::UUID;
    clinic_id_val := (current_context->>'clinic_id')::UUID;
    
    -- Build query based on role
    CASE v_current_role
        WHEN 'patient' THEN
            SELECT jsonb_build_object(
                'appointments', COALESCE(jsonb_agg(appointment_row), '[]'::jsonb),
                'total_count', COUNT(*)
            ) INTO result
            FROM (
                SELECT jsonb_build_object(
                    'id', a.id,
                    'appointment_date', a.appointment_date,
                    'appointment_time', a.appointment_time,
                    'status', a.status,
                    'symptoms', a.symptoms,
                    'notes', a.notes,
                    'duration_minutes', a.duration_minutes,
                    'clinic', jsonb_build_object(
                        'id', c.id,
                        'name', c.name,
                        'address', c.address,
                        'phone', c.phone
                    ),
                    'doctor', jsonb_build_object(
                        'id', d.id,
                        'specialization', d.specialization,
                        'name', COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization)
                    ),
                    'services', (
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', s.id,
                            'name', s.name,
                            'duration_minutes', s.duration_minutes
                        ))
                        FROM appointment_services aps
                        JOIN services s ON aps.service_id = s.id
                        WHERE aps.appointment_id = a.id
                    ),
                    'can_cancel', can_cancel_appointment(a.id),
                    'created_at', a.created_at
                ) AS appointment_row
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.patient_id = user_id_val
                AND (p_status IS NULL OR a.status = ANY(p_status::appointment_status[]))
                AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
                AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT p_limit OFFSET p_offset
            ) sub;
            
        WHEN 'staff' THEN
            SELECT jsonb_build_object(
                'appointments', COALESCE(jsonb_agg(appointment_row), '[]'::jsonb),
                'total_count', COUNT(*),
                'pending_count', COUNT(*) FILTER (WHERE (appointment_row->>'status') = 'pending')
            ) INTO result
            FROM (
                SELECT jsonb_build_object(
                    'id', a.id,
                    'appointment_date', a.appointment_date,
                    'appointment_time', a.appointment_time,
                    'status', a.status,
                    'symptoms', a.symptoms,
                    'notes', a.notes,
                    'duration_minutes', a.duration_minutes,
                    'patient', jsonb_build_object(
                        'id', u.id,
                        'name', up.first_name || ' ' || up.last_name,
                        'email', u.email,
                        'phone', u.phone
                    ),
                    'doctor', jsonb_build_object(
                        'id', d.id,
                        'specialization', d.specialization,
                        'name', COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization)
                    ),
                    'services', (
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', s.id,
                            'name', s.name,
                            'duration_minutes', s.duration_minutes
                        ))
                        FROM appointment_services aps
                        JOIN services s ON aps.service_id = s.id
                        WHERE aps.appointment_id = a.id
                    ),
                    'created_at', a.created_at
                ) AS appointment_row
                FROM appointments a
                JOIN users u ON a.patient_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.clinic_id = clinic_id_val
                AND (p_status IS NULL OR a.status = ANY(p_status::appointment_status[]))
                AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
                AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
                ORDER BY 
                    CASE WHEN a.status = 'pending'::appointment_status THEN 1 ELSE 2 END,
                    a.appointment_date ASC, 
                    a.appointment_time ASC
                LIMIT p_limit OFFSET p_offset
            ) sub;
            
        WHEN 'admin' THEN
            SELECT jsonb_build_object(
                'appointments', COALESCE(jsonb_agg(appointment_row), '[]'::jsonb),
                'total_count', COUNT(*)
            ) INTO result
            FROM (
                SELECT jsonb_build_object(
                    'id', a.id,
                    'appointment_date', a.appointment_date,
                    'appointment_time', a.appointment_time,
                    'status', a.status,
                    'clinic_name', c.name,
                    'patient_name', up.first_name || ' ' || up.last_name,
                    'doctor_name', COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization),
                    'created_at', a.created_at
                ) AS appointment_row
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                JOIN users u ON a.patient_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE (p_status IS NULL OR a.status = ANY(p_status::appointment_status[]))
                AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
                AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
                ORDER BY a.created_at DESC
                LIMIT p_limit OFFSET p_offset
            ) sub;
            
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid user role');
    END CASE;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;$$;


ALTER FUNCTION "public"."get_user_appointments"("p_status" "text"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_auth_status"("p_auth_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    auth_user_id_val UUID;
    user_data RECORD;
    profile_data RECORD;
    result JSONB;
    user_role user_type;
    missing_fields TEXT[] := '{}';
    verification_complete BOOLEAN := false;
BEGIN
    auth_user_id_val := COALESCE(p_auth_user_id, auth.uid());
    
    IF auth_user_id_val IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;
    
    -- Get auth.users data
    SELECT 
        email_confirmed_at IS NOT NULL as email_verified,
        phone_confirmed_at IS NOT NULL as phone_verified,
        phone,
        email,
        raw_user_meta_data
    INTO user_data
    FROM auth.users 
    WHERE id = auth_user_id_val;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Auth user not found');
    END IF;
    
    -- Get user role from metadata first (most reliable during signup)
    IF user_data.raw_user_meta_data ? 'user_type' THEN
        user_role := (user_data.raw_user_meta_data->>'user_type')::user_type;
    END IF;
    
    -- Try to get from profiles if metadata doesn't have it
    IF user_role IS NULL THEN
        SELECT up.user_type INTO user_role
        FROM public.users u 
        JOIN public.user_profiles up ON u.id = up.user_id 
        WHERE u.auth_user_id = auth_user_id_val;
    END IF;
    
    -- Get profile data if exists
    SELECT 
        up.first_name,
        up.last_name,
        u.phone_verified as public_phone_verified,
        u.email_verified as public_email_verified,
        sp.is_active as staff_active
    INTO profile_data
    FROM public.users u
    JOIN public.user_profiles up ON u.id = up.user_id
    LEFT JOIN public.staff_profiles sp ON up.id = sp.user_profile_id
    WHERE u.auth_user_id = auth_user_id_val;
    
    -- Check required fields
    IF profile_data.first_name IS NULL OR profile_data.first_name = '' THEN
        missing_fields := array_append(missing_fields, 'first_name');
    END IF;
    
    IF profile_data.last_name IS NULL OR profile_data.last_name = '' THEN
        missing_fields := array_append(missing_fields, 'last_name');
    END IF;
    
    -- ✅ REFACTOR: Email verification is the ONLY required verification for all roles
    IF NOT user_data.email_verified THEN
        missing_fields := array_append(missing_fields, 'email_verification');
    END IF;
    
    -- ✅ REFACTOR: Role-specific requirements (phone no longer mandatory)
    CASE user_role
        WHEN 'patient' THEN
            -- Patient: Only email required
            verification_complete := user_data.email_verified;
            
        WHEN 'staff' THEN
            -- Staff: Email + admin activation required (phone optional)
            IF NOT COALESCE(profile_data.staff_active, false) THEN
                missing_fields := array_append(missing_fields, 'staff_activation');
            END IF;
            verification_complete := user_data.email_verified AND 
                                   COALESCE(profile_data.staff_active, false);
            
        WHEN 'admin' THEN
            -- Admin: Only email required (phone optional)
            verification_complete := user_data.email_verified;
    END CASE;
    
    result := jsonb_build_object(
        'auth_user_id', auth_user_id_val,
        'user_role', user_role,
        'profile_exists', profile_data IS NOT NULL,
        'email_verified', user_data.email_verified,
        'phone_verified', user_data.phone_verified, -- ✅ REFACTOR: Informational only
        'phone_provided', user_data.phone IS NOT NULL, -- ✅ NEW: Show if phone was provided
        'phone_required', false, -- ✅ REFACTOR: Phone never required anymore
        'verification_complete', verification_complete,
        'missing_fields', missing_fields,
        'can_access_app', verification_complete AND array_length(missing_fields, 1) IS NULL,
        'next_step', CASE 
            WHEN NOT user_data.email_verified THEN 'verify_email'
            WHEN user_role = 'patient' AND verification_complete THEN 'dashboard'
            WHEN user_role = 'staff' AND NOT COALESCE(profile_data.staff_active, false) THEN 'pending_staff_activation'
            WHEN user_role = 'admin' AND verification_complete THEN 'dashboard'
            WHEN verification_complete THEN 'dashboard'
            ELSE 'complete_profile'
        END,
        'authentication_method', 'email_first' -- ✅ NEW: Indicate email-first approach
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_user_auth_status"("p_auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    target_user_id UUID;
    current_context JSONB;
    v_current_role TEXT;
    result JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- ✅ REFACTOR: Email-centric access control
    IF v_current_role = 'patient' AND target_user_id != (current_context->>'user_id')::UUID THEN
        RETURN jsonb_build_object('error', 'Access denied');
    END IF;
    
    -- Build comprehensive user profile
    SELECT jsonb_build_object(
        'user_id', u.id,
        'auth_user_id', u.auth_user_id,
        'email', u.email, -- ✅ Primary identifier
        'phone', u.phone, -- ✅ REFACTOR: Optional field, included if present
        'email_verified', u.email_verified,
        'phone_verified', CASE WHEN u.phone IS NOT NULL THEN u.phone_verified ELSE null END, -- ✅ REFACTOR: Only show if phone exists
        'is_active', u.is_active,
        'last_login', u.last_login,
        'authentication_method', 'email_first', -- ✅ NEW: Indicate auth method
        'profile', jsonb_build_object(
            'id', up.id,
            'user_type', up.user_type::text,
            'first_name', up.first_name,
            'last_name', up.last_name,
            'full_name', up.first_name || ' ' || up.last_name,
            'date_of_birth', up.date_of_birth,
            'gender', up.gender,
            'profile_image_url', up.profile_image_url,
            'created_at', up.created_at,
            'updated_at', up.updated_at
        ),
        'role_specific_data', CASE up.user_type::text
            WHEN 'patient' THEN (
                SELECT jsonb_build_object(
                    'patient_profile_id', pp.id,
                    'preferred_location', CASE 
                        WHEN pp.preferred_location IS NOT NULL 
                        THEN ST_AsText(pp.preferred_location::geometry)
                        ELSE NULL 
                    END,
                    'preferred_doctors', pp.preferred_doctors,
                    'emergency_contact_name', pp.emergency_contact_name,
                    'emergency_contact_phone', pp.emergency_contact_phone,
                    'insurance_provider', pp.insurance_provider,
                    'medical_conditions', pp.medical_conditions,
                    'allergies', pp.allergies,
                    'email_notifications', pp.email_notifications,
                    'sms_notifications', CASE WHEN u.phone IS NOT NULL THEN pp.sms_notifications ELSE false END, -- ✅ REFACTOR: SMS only if phone exists
                    'profile_completion', CASE 
                        WHEN pp.emergency_contact_name IS NOT NULL AND 
                             pp.medical_conditions IS NOT NULL AND 
                             pp.allergies IS NOT NULL 
                        THEN 100  -- ✅ REFACTOR: Removed emergency_contact_phone requirement
                        ELSE 50
                    END
                )
                FROM patient_profiles pp 
                WHERE pp.user_profile_id = up.id
            )
            WHEN 'staff' THEN (
                SELECT jsonb_build_object(
                    'staff_profile_id', sp.id,
                    'clinic_id', sp.clinic_id,
                    'clinic_name', c.name,
                    'employee_id', sp.employee_id,
                    'position', sp.position,
                    'hire_date', sp.hire_date,
                    'department', sp.department,
                    'permissions', sp.permissions,
                    'is_active', sp.is_active,
                    'activation_method', 'admin_approval' -- ✅ NEW: Clarify activation method
                )
                FROM staff_profiles sp
                LEFT JOIN clinics c ON sp.clinic_id = c.id
                WHERE sp.user_profile_id = up.id
            )
            WHEN 'admin' THEN (
                SELECT jsonb_build_object(
                    'admin_profile_id', ap.id,
                    'access_level', ap.access_level,
                    'login_attempts', ap.login_attempts,
                    'permissions', ap.permissions
                )
                FROM admin_profiles ap 
                WHERE ap.user_profile_id = up.id
            )
            ELSE '{}'::jsonb
        END,
        'statistics', CASE up.user_type::text
            WHEN 'patient' THEN (
                SELECT jsonb_build_object(
                    'total_appointments', COUNT(*),
                    'completed_appointments', COUNT(*) FILTER (WHERE status = 'completed'),
                    'upcoming_appointments', COUNT(*) FILTER (WHERE appointment_date > CURRENT_DATE),
                    'last_appointment', MAX(appointment_date)
                )
                FROM appointments WHERE patient_id = u.id
            )
            ELSE '{}'::jsonb
        END
    ) INTO result
    FROM users u
    JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = target_user_id;
    
    IF result IS NULL THEN
        RETURN jsonb_build_object('error', 'Profile not found');
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_notifications"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_read_status" boolean DEFAULT NULL::boolean, "p_notification_types" "public"."notification_type"[] DEFAULT NULL::"public"."notification_type"[], "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_include_related_data" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    target_user_id UUID;
    result JSONB;
    total_count INTEGER;
    unread_count INTEGER;
BEGIN

    current_context := get_current_user_context();

    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;

    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);

    -- ✅ ENHANCED: Access control with admin override
    IF target_user_id != (current_context->>'user_id')::UUID
       AND (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
    
    -- ✅ ENHANCED: Input validation
    p_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100); -- 1-100 range
    p_offset := GREATEST(COALESCE(p_offset, 0), 0);

    -- ✅ OPTIMIZED: Get counts first for metadata
    SELECT 
        COUNT(*) FILTER (WHERE (p_read_status IS NULL OR is_read = p_read_status)
                         AND (p_notification_types IS NULL OR notification_type = ANY(p_notification_types))),
        COUNT(*) FILTER (WHERE is_read = false)
    INTO total_count, unread_count
    FROM notifications n
    WHERE n.user_id = target_user_id;

    -- ✅ ENHANCED: Build notifications with related data
    WITH filtered_notifications AS (
        SELECT 
            n.id,
            n.notification_type,
            n.title,
            n.message,
            n.is_read,
            n.related_appointment_id,
            n.scheduled_for,
            n.sent_at,
            n.created_at,
            -- ✅ ENHANCED: Priority calculation
            CASE n.notification_type
                WHEN 'appointment_confirmed' THEN 1
                WHEN 'appointment_cancelled' THEN 1  
                WHEN 'appointment_reminder' THEN 2
                WHEN 'feedback_request' THEN 3
                WHEN 'partnership_request' THEN 4
                ELSE 5
            END as priority,
            -- ✅ ENHANCED: Related appointment data (if requested)
            CASE WHEN p_include_related_data AND n.related_appointment_id IS NOT NULL THEN
                (SELECT jsonb_build_object(
                    'id', a.id,
                    'appointment_date', a.appointment_date,
                    'appointment_time', a.appointment_time,
                    'status', a.status,
                    'clinic_name', c.name,
                    'doctor_name', COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization)
                )
                FROM appointments a
                JOIN clinics c ON a.clinic_id = c.id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.id = n.related_appointment_id)
            ELSE NULL
            END as related_appointment_data
        FROM notifications n
        WHERE n.user_id = target_user_id
          AND (p_read_status IS NULL OR n.is_read = p_read_status)
          AND (p_notification_types IS NULL OR n.notification_type = ANY(p_notification_types))
        ORDER BY 
            n.is_read ASC, -- Unread first
            priority ASC,  -- High priority first
            n.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'notifications', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', fn.id,
                    'type', fn.notification_type,
                    'title', fn.title,
                    'message', fn.message,
                    'is_read', fn.is_read,
                    'priority', fn.priority,
                    'scheduled_for', fn.scheduled_for,
                    'sent_at', fn.sent_at,
                    'created_at', fn.created_at,
                    'appointment_id', fn.related_appointment_id,
                    'related_data', fn.related_appointment_data,
                    'time_ago', CASE 
                        WHEN fn.created_at > NOW() - INTERVAL '1 hour' 
                        THEN EXTRACT(EPOCH FROM (NOW() - fn.created_at))::INTEGER || ' minutes ago'
                        WHEN fn.created_at > NOW() - INTERVAL '1 day'
                        THEN EXTRACT(HOUR FROM (NOW() - fn.created_at))::INTEGER || ' hours ago'
                        WHEN fn.created_at > NOW() - INTERVAL '1 week'
                        THEN EXTRACT(DAY FROM (NOW() - fn.created_at))::INTEGER || ' days ago'
                        ELSE TO_CHAR(fn.created_at, 'Mon DD, YYYY')
                    END,
                    'actions', CASE fn.notification_type
                        WHEN 'appointment_confirmed' THEN jsonb_build_array('view_appointment')
                        WHEN 'appointment_cancelled' THEN jsonb_build_array('view_appointment', 'book_new')
                        WHEN 'appointment_reminder' THEN jsonb_build_array('view_appointment', 'reschedule')
                        WHEN 'feedback_request' THEN jsonb_build_array('submit_feedback', 'skip')
                        ELSE jsonb_build_array('view')
                    END
                )
            ), '[]'::jsonb),
            'metadata', jsonb_build_object(
                'pagination', jsonb_build_object(
                    'limit', p_limit,
                    'offset', p_offset,
                    'total_count', total_count,
                    'has_more', (p_offset + p_limit) < total_count
                ),
                'counts', jsonb_build_object(
                    'total', total_count,
                    'unread', unread_count,
                    'read', total_count - unread_count
                ),
                'filters_applied', jsonb_build_object(
                    'read_status', p_read_status,
                    'notification_types', p_notification_types,
                    'include_related_data', p_include_related_data
                )
            )
        )
    ) INTO result
    FROM filtered_notifications fn;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to fetch notifications');
END;
$$;


ALTER FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_read_status" boolean, "p_notification_types" "public"."notification_type"[], "p_limit" integer, "p_offset" integer, "p_include_related_data" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_list"("p_user_type" "public"."user_type" DEFAULT NULL::"public"."user_type", "p_clinic_id" "uuid" DEFAULT NULL::"uuid", "p_search_term" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    current_context JSONB;
    v_current_role TEXT;
    current_clinic_id UUID;
    result JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    
    -- Access control: only staff and admin can list users
    IF v_current_role NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object('error', 'Access denied');
    END IF;
    
    -- Get clinic ID for staff users
    IF v_current_role = 'staff' THEN
        current_clinic_id := (current_context->>'clinic_id')::UUID;
    END IF;
    
    -- Build query based on role
    WITH filtered_users AS (
        SELECT 
            u.id,
            u.email,
            u.phone,
            u.is_active,
            u.last_login,
            up.user_type,
            up.first_name,
            up.last_name,
            up.first_name || ' ' || up.last_name as full_name,
            up.created_at,
            CASE up.user_type::text
                WHEN 'patient' THEN (
                    SELECT jsonb_build_object(
                        'total_appointments', COUNT(a.id),
                        'last_appointment', MAX(a.appointment_date)
                    )
                    FROM appointments a 
                    WHERE a.patient_id = u.id
                    AND (v_current_role = 'admin' OR a.clinic_id = current_clinic_id)
                )
                WHEN 'staff' THEN (
                    SELECT jsonb_build_object(
                        'clinic_name', c.name,
                        'position', sp.position,
                        'is_active', sp.is_active
                    )
                    FROM staff_profiles sp
                    LEFT JOIN clinics c ON sp.clinic_id = c.id
                    WHERE sp.user_profile_id = up.id
                )
                ELSE '{}'::jsonb
            END as role_data
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        WHERE 
            (p_user_type IS NULL OR up.user_type = p_user_type) AND
            (p_search_term IS NULL OR 
             up.first_name ILIKE '%' || p_search_term || '%' OR 
             up.last_name ILIKE '%' || p_search_term || '%' OR 
             u.email ILIKE '%' || p_search_term || '%') AND
            (v_current_role = 'admin' OR 
             (v_current_role = 'staff' AND (
                up.user_type::text = 'patient' AND u.id IN (
                    SELECT DISTINCT patient_id FROM appointments 
                    WHERE clinic_id = current_clinic_id
                ) OR up.user_type::text = 'staff'
             ))
            )
        ORDER BY up.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT jsonb_build_object(
        'users', jsonb_agg(to_jsonb(fu)),
        'total_count', (SELECT COUNT(*) FROM filtered_users)
    ) INTO result
    FROM filtered_users fu;
    
    RETURN COALESCE(result, jsonb_build_object('users', '[]'::jsonb, 'total_count', 0));
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_users_list"("p_user_type" "public"."user_type", "p_clinic_id" "uuid", "p_search_term" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_email_verification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    user_phone VARCHAR(20);
    user_email VARCHAR(255);
    user_type_val user_type;
    current_metadata JSONB;
    updated_metadata JSONB;
BEGIN
    -- Only process when email_confirmed_at changes from NULL to NOT NULL
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        
        user_email := NEW.email;
        current_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
        
        -- Get user type and phone from public.users
        SELECT u.phone, up.user_type 
        INTO user_phone, user_type_val
        FROM public.users u
        JOIN public.user_profiles up ON u.id = up.user_id
        WHERE u.auth_user_id = NEW.id;
        
        -- ✅ REFACTOR: Update email verification status in public.users
        UPDATE public.users 
        SET 
            email_verified = true,
            -- ✅ EMAIL-FIRST: Auto-verify phone internally (no SMS) if phone is provided
            phone_verified = CASE 
                WHEN user_phone IS NOT NULL AND user_phone != '' THEN true 
                ELSE false 
            END,
            updated_at = NOW()
        WHERE auth_user_id = NEW.id;
        
        -- Update metadata with verification info
        updated_metadata := current_metadata || jsonb_build_object(
            'email_verified', true,
            'email_verified_at', NEW.email_confirmed_at::text,
            'authentication_method', 'email_first'
        );
        
        -- ✅ EMAIL-FIRST: If phone provided, mark as verified internally (no SMS)
        IF user_phone IS NOT NULL AND user_phone != '' THEN
            updated_metadata := updated_metadata || jsonb_build_object(
                'phone_verified', true,
                'phone_auto_verified', true,
                'phone_verified_at', NEW.email_confirmed_at::text,
                'phone_verification_method', 'internal_after_email'
            );
            
            RAISE LOG 'Phone auto-verified internally for user: % (no SMS sent)', user_email;
        END IF;
        
        -- ✅ STAFF ACTIVATION: Activate staff after email verification (not phone)
        IF user_type_val = 'staff' THEN
            UPDATE public.staff_profiles
            SET is_active = true,
                updated_at = NOW()
            WHERE user_profile_id IN (
                SELECT up.id
                FROM public.user_profiles up
                JOIN public.users u ON up.user_id = u.id
                WHERE u.auth_user_id = NEW.id
            );
            
            RAISE LOG 'SUCCESS: Activated staff profile after email verification: %', user_email;
        END IF;
        
        -- Update auth.users metadata only (no phone_confirmed_at modification)
        UPDATE auth.users 
        SET 
            raw_user_meta_data = updated_metadata,
            updated_at = NOW()
        WHERE id = NEW.id;
        
        RAISE LOG 'SUCCESS: Email verified for user: % (type: %), phone internal verification: %', 
            user_email, user_type_val, (user_phone IS NOT NULL);
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_email_verification for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_email_verification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_phone_verification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    user_email VARCHAR(255);
    user_type_val user_type;
    current_metadata JSONB;
    updated_metadata JSONB;
BEGIN
    -- ✅ NOTE: This function rarely runs on free plan since we don't send SMS
    -- Only processes if phone_confirmed_at changes (manual SMS verification)
    IF OLD.phone_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NOT NULL THEN
        user_email := NEW.email;
        current_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

        -- Get user type
        SELECT up.user_type
        INTO user_type_val
        FROM public.users u
        JOIN public.user_profiles up ON u.id = up.user_id
        WHERE u.auth_user_id = NEW.id;

        -- Update phone verification status
        UPDATE public.users
        SET phone_verified = true,
            updated_at = NOW()
        WHERE auth_user_id = NEW.id;

        -- Update metadata
        updated_metadata := current_metadata || jsonb_build_object(
            'phone_verified', true,
            'phone_verified_at', NEW.phone_confirmed_at::text,
            'verification_method', 'manual_sms'
        );
        
        UPDATE auth.users
        SET raw_user_meta_data = updated_metadata,
            updated_at = NOW()
        WHERE id = NEW.id;

        RAISE LOG 'Manual phone verification completed for user: % (type: %)', user_email, user_type_val;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_phone_verification for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_phone_verification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_profile_complete"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$DECLARE
    user_id_val UUID;
    profile_data RECORD;
    result JSONB;
    missing_fields TEXT[] := '{}';
    verification_complete BOOLEAN := false;
BEGIN
    user_id_val := COALESCE(p_user_id, public.get_current_user_id());
    
    IF user_id_val IS NULL THEN
        RETURN '{"complete": false, "error": "User not found"}'::JSONB;
    END IF;
    
    -- Get comprehensive user profile data
    SELECT
        COALESCE(up.user_type, au.user_type) AS user_type,
        up.user_type,
        up.first_name,
        up.last_name,
        u.phone,
        u.email_verified,
        u.phone_verified,
        sp.is_active as staff_active
    INTO profile_data
    FROM public.users u
    JOIN public.user_profiles up ON u.id = up.user_id
    LEFT JOIN public.staff_profiles sp ON up.id = sp.user_profile_id
    WHERE u.id = user_id_val;
    
    IF NOT FOUND THEN
        RETURN '{"complete": false, "error": "Profile not found"}'::JSONB;
    END IF;
    
    -- Check required fields
    IF profile_data.first_name IS NULL OR profile_data.first_name = '' THEN
        missing_fields := array_append(missing_fields, 'first_name');
    END IF;
    
    IF profile_data.last_name IS NULL OR profile_data.last_name = '' THEN
        missing_fields := array_append(missing_fields, 'last_name');
    END IF;
    
    IF NOT profile_data.email_verified THEN
        missing_fields := array_append(missing_fields, 'email_verification');
    END IF;
    
    -- ✅ BUSINESS RULE: Role-specific verification requirements
    CASE profile_data.user_type
        WHEN 'patient' THEN
            -- ✅ FIX: Patient with phone must have phone verified (auto-verified with email)
            IF profile_data.phone IS NOT NULL AND NOT profile_data.phone_verified THEN
                missing_fields := array_append(missing_fields, 'phone_verification');
            END IF;
            -- Verification complete: email + phone (if provided)
            verification_complete := profile_data.email_verified AND 
                                   (profile_data.phone IS NULL OR profile_data.phone_verified);
            
        WHEN 'staff' THEN
            -- Staff: Phone verification + activation required
            IF NOT profile_data.phone_verified THEN
                missing_fields := array_append(missing_fields, 'phone_verification');
            END IF;
            IF NOT COALESCE(profile_data.staff_active, false) THEN
                missing_fields := array_append(missing_fields, 'staff_activation');
            END IF;
            verification_complete := profile_data.email_verified AND 
                                   profile_data.phone_verified AND 
                                   COALESCE(profile_data.staff_active, false);
            
        WHEN 'admin' THEN
            -- Admin: Email + phone verification required
            IF NOT profile_data.phone_verified THEN
                missing_fields := array_append(missing_fields, 'phone_verification');
            END IF;
            verification_complete := profile_data.email_verified AND profile_data.phone_verified;
    END CASE;
    
    result := jsonb_build_object(
        'complete', array_length(missing_fields, 1) IS NULL,
        'user_type', profile_data.user_type,
        'missing_fields', missing_fields,
        'email_verified', profile_data.email_verified,
        'phone_verified', profile_data.phone_verified,
        'phone_required', profile_data.user_type IN ('staff', 'admin') OR 
                         (profile_data.user_type = 'patient' AND profile_data.phone IS NOT NULL),
        'verification_complete', verification_complete,
        'can_use_app', verification_complete AND array_length(missing_fields, 1) IS NULL
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('complete', false, 'error', SQLERRM);
END;$$;


ALTER FUNCTION "public"."is_user_profile_complete"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_appointment_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- ✅ FIXED: Only count non-cancelled appointments
        IF NEW.status NOT IN ('cancelled', 'no_show') THEN
            INSERT INTO patient_appointment_limits (patient_id, clinic_id, current_count, limit_count)
            VALUES (NEW.patient_id, NEW.clinic_id, 1, 
                    (SELECT appointment_limit_per_patient FROM clinics WHERE id = NEW.clinic_id))
            ON CONFLICT (patient_id, clinic_id) 
            DO UPDATE SET current_count = patient_appointment_limits.current_count + 1;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- ✅ ENHANCED: Handle status transitions properly
        IF OLD.status NOT IN ('cancelled', 'no_show') AND NEW.status IN ('cancelled', 'no_show') THEN
            -- Decrement when appointment becomes cancelled/no_show
            UPDATE patient_appointment_limits 
            SET current_count = GREATEST(0, current_count - 1)
            WHERE patient_id = NEW.patient_id AND clinic_id = NEW.clinic_id;
            
        ELSIF OLD.status IN ('cancelled', 'no_show') AND NEW.status NOT IN ('cancelled', 'no_show') THEN
            -- Increment when appointment becomes active again
            INSERT INTO patient_appointment_limits (patient_id, clinic_id, current_count, limit_count)
            VALUES (NEW.patient_id, NEW.clinic_id, 1, 
                    (SELECT appointment_limit_per_patient FROM clinics WHERE id = NEW.clinic_id))
            ON CONFLICT (patient_id, clinic_id) 
            DO UPDATE SET current_count = patient_appointment_limits.current_count + 1;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error managing appointment limits: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);  -- Don't fail the main operation
END;
$$;


ALTER FUNCTION "public"."manage_appointment_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_patient_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid" DEFAULT NULL::"uuid", "p_item_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    patient_id_val UUID;
    result JSONB;
    affected_count INTEGER := 0;
    valid_items UUID[];
    item_record RECORD;
BEGIN
    -- Authentication & authorization
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    IF (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient access required');
    END IF;
    
    patient_id_val := (current_context->>'user_id')::UUID;
    
    -- Validate parameters
    IF p_action NOT IN ('archive', 'unarchive', 'hide', 'get_stats', 'list_archived', 'list_hidden') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
    END IF;
    
    IF p_item_type NOT IN ('appointment', 'feedback', 'notification') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid item type');
    END IF;
    
    -- Handle actions
    CASE p_action
        WHEN 'get_stats' THEN
            -- Get archive statistics
            SELECT jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'archived_counts', jsonb_build_object(
                        'appointments', COUNT(*) FILTER (WHERE item_type = 'appointment' AND is_archived = true AND is_hidden = false),
                        'feedback', COUNT(*) FILTER (WHERE item_type = 'feedback' AND is_archived = true AND is_hidden = false),
                        'notifications', COUNT(*) FILTER (WHERE item_type = 'notification' AND is_archived = true AND is_hidden = false)
                    ),
                    'hidden_counts', jsonb_build_object(
                        'appointments', COUNT(*) FILTER (WHERE item_type = 'appointment' AND is_hidden = true),
                        'feedback', COUNT(*) FILTER (WHERE item_type = 'feedback' AND is_hidden = true),
                        'notifications', COUNT(*) FILTER (WHERE item_type = 'notification' AND is_hidden = true)
                    ),
                    'preferences', COALESCE((
                        SELECT row_to_json(pap.*) 
                        FROM patient_archive_preferences pap 
                        WHERE pap.patient_id = patient_id_val
                    ), jsonb_build_object(
                        'auto_archive_days', 365,
                        'data_retention_consent', true
                    ))
                )
            ) INTO result
            FROM patient_archive_items
            WHERE patient_id = patient_id_val;
            
        WHEN 'list_archived' THEN
            -- List archived items (not hidden)
            SELECT jsonb_build_object(
                'success', true,
                'data', COALESCE(jsonb_agg(jsonb_build_object(
                    'item_id', item_id,
                    'archived_at', archived_at,
                    'archive_reason', archive_reason
                )), '[]'::jsonb)
            ) INTO result
            FROM patient_archive_items
            WHERE patient_id = patient_id_val 
            AND item_type = p_item_type
            AND is_archived = true 
            AND is_hidden = false
            ORDER BY archived_at DESC;
            
        WHEN 'list_hidden' THEN
            -- List hidden items (permanently deleted from patient view)
            SELECT jsonb_build_object(
                'success', true,
                'data', COALESCE(jsonb_agg(jsonb_build_object(
                    'item_id', item_id,
                    'hidden_at', hidden_at,
                    'archive_reason', archive_reason
                )), '[]'::jsonb)
            ) INTO result
            FROM patient_archive_items
            WHERE patient_id = patient_id_val 
            AND item_type = p_item_type
            AND is_hidden = true
            ORDER BY hidden_at DESC;
            
        WHEN 'archive' THEN
            -- Validate items before archiving
            IF p_item_id IS NOT NULL THEN
                -- Single item validation
                IF p_item_type = 'appointment' AND NOT EXISTS (
                    SELECT 1 FROM appointments WHERE id = p_item_id AND patient_id = patient_id_val AND status = 'completed'
                ) THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found, not yours, or not completed');
                END IF;
                
                IF p_item_type = 'feedback' AND NOT EXISTS (
                    SELECT 1 FROM feedback WHERE id = p_item_id AND patient_id = patient_id_val
                ) THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Feedback not found or not yours');
                END IF;
                
                IF p_item_type = 'notification' AND NOT EXISTS (
                    SELECT 1 FROM notifications WHERE id = p_item_id AND user_id = patient_id_val
                ) THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Notification not found or not yours');
                END IF;
                
                -- Archive single item
                INSERT INTO patient_archive_items (patient_id, item_type, item_id, archive_reason)
                VALUES (patient_id_val, p_item_type, p_item_id, 'manual')
                ON CONFLICT (patient_id, item_type, item_id) 
                DO UPDATE SET 
                    is_archived = true,
                    is_hidden = false,
                    archived_at = NOW(),
                    archive_reason = 'manual';
                    
                affected_count := 1;
                
            ELSIF p_item_ids IS NOT NULL AND array_length(p_item_ids, 1) > 0 THEN
                -- ✅ FIXED: Proper multi-item validation and insertion
                
                -- Validate all items first
                IF p_item_type = 'appointment' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM appointments 
                    WHERE id = ANY(p_item_ids) 
                    AND patient_id = patient_id_val 
                    AND status = 'completed';
                    
                ELSIF p_item_type = 'feedback' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM feedback 
                    WHERE id = ANY(p_item_ids) 
                    AND patient_id = patient_id_val;
                    
                ELSIF p_item_type = 'notification' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM notifications 
                    WHERE id = ANY(p_item_ids) 
                    AND user_id = patient_id_val;
                END IF;
                
                -- Check if we found valid items
                IF valid_items IS NULL OR array_length(valid_items, 1) = 0 THEN
                    RETURN jsonb_build_object('success', false, 'error', 'No valid items found to archive');
                END IF;
                
                -- ✅ FIXED: Proper batch insert without unnest() in WHERE
                INSERT INTO patient_archive_items (patient_id, item_type, item_id, archive_reason)
                SELECT patient_id_val, p_item_type, unnest(valid_items), 'manual'
                ON CONFLICT (patient_id, item_type, item_id) 
                DO UPDATE SET 
                    is_archived = true,
                    is_hidden = false,
                    archived_at = NOW(),
                    archive_reason = 'manual';
                
                affected_count := array_length(valid_items, 1);
                
            ELSE
                RETURN jsonb_build_object('success', false, 'error', 'No items specified for archive');
            END IF;
            
            result := jsonb_build_object(
                'success', true,
                'message', format('%s item(s) archived successfully', affected_count),
                'affected_count', affected_count
            );
            
        WHEN 'unarchive' THEN
            IF p_item_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Item ID required for unarchive');
            END IF;
            
            -- Remove from archive (delete record)
            DELETE FROM patient_archive_items
            WHERE patient_id = patient_id_val 
            AND item_type = p_item_type 
            AND item_id = p_item_id;
            
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
            result := jsonb_build_object(
                'success', true,
                'message', CASE WHEN affected_count > 0 THEN 'Item unarchived successfully' ELSE 'Item was not archived' END,
                'affected_count', affected_count
            );
            
        WHEN 'hide' THEN
            IF p_item_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Item ID required for hide');
            END IF;
            
            -- Mark as hidden (soft delete from patient view)
            UPDATE patient_archive_items
            SET is_hidden = true, hidden_at = NOW()
            WHERE patient_id = patient_id_val 
            AND item_type = p_item_type 
            AND item_id = p_item_id;
            
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
            -- If item wasn't archived yet, create hidden record
            IF affected_count = 0 THEN
                INSERT INTO patient_archive_items (patient_id, item_type, item_id, is_archived, is_hidden, archive_reason, hidden_at)
                VALUES (patient_id_val, p_item_type, p_item_id, false, true, 'manual', NOW())
                ON CONFLICT (patient_id, item_type, item_id) DO NOTHING;
                affected_count := 1;
            END IF;
            
            result := jsonb_build_object(
                'success', true,
                'message', 'Item permanently hidden from your view',
                'affected_count', affected_count
            );
    END CASE;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', format('Archive operation failed: %s', SQLERRM));
END;
$$;


ALTER FUNCTION "public"."manage_patient_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_ui_components"("p_action" "text", "p_component_id" "uuid" DEFAULT NULL::"uuid", "p_component_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    component_record RECORD;
    result JSONB;
BEGIN
    
    current_context := get_current_user_context();
    
    -- Admin-only access
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
    END IF;
    
    -- ✅ ENHANCED: Action-specific handling
    CASE p_action
        WHEN 'list' THEN
            -- ✅ List all UI components with usage statistics
            SELECT jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'components', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', uc.id,
                            'component_name', uc.component_name,
                            'component_type', uc.component_type,
                            'display_order', uc.display_order,
                            'is_active', uc.is_active,
                            'config_data', uc.config_data,
                            'target_roles', uc.target_roles,
                            'created_at', uc.created_at,
                            'updated_at', uc.updated_at,
                            'last_modified_by', up.first_name || ' ' || up.last_name,
                            'usage_stats', jsonb_build_object(
                                'total_views', COALESCE(ae.view_count, 0),
                                'last_viewed', ae.last_view,
                                'active_status', CASE 
                                    WHEN uc.is_active THEN 'active'
                                    ELSE 'inactive'
                                END
                            )
                        )
                        ORDER BY uc.display_order, uc.component_name
                    ), '[]'::jsonb),
                    'summary', jsonb_build_object(
                        'total_components', COUNT(*),
                        'active_components', COUNT(*) FILTER (WHERE uc.is_active),
                        'inactive_components', COUNT(*) FILTER (WHERE NOT uc.is_active),
                        'by_type', jsonb_object_agg(
                            uc.component_type::TEXT,
                            COUNT(*)
                        )
                    )
                )
            ) INTO result
            FROM ui_components uc
            LEFT JOIN users u ON uc.created_by = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN (
                SELECT 
                    (event_data->>'component_id')::UUID as component_id,
                    COUNT(*) as view_count,
                    MAX(created_at) as last_view
                FROM analytics_events
                WHERE event_type = 'ui_component_view'
                GROUP BY (event_data->>'component_id')::UUID
            ) ae ON uc.id = ae.component_id;
            
        WHEN 'create' THEN
            -- ✅ Create new UI component
            IF p_component_data IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Component data is required for creation');
            END IF;
            
            -- Validate required fields
            IF NOT (p_component_data ? 'component_name') OR 
               NOT (p_component_data ? 'component_type') THEN
                RETURN jsonb_build_object('success', false, 'error', 'component_name and component_type are required');
            END IF;
            
            BEGIN
                INSERT INTO ui_components (
                    component_name,
                    component_type,
                    display_order,
                    config_data,
                    target_roles,
                    is_active,
                    created_by
                ) VALUES (
                    p_component_data->>'component_name',
                    (p_component_data->>'component_type')::component_type,
                    COALESCE((p_component_data->>'display_order')::INTEGER, 0),
                    COALESCE(p_component_data->'config_data', '{}'::jsonb),
                    CASE 
                        WHEN p_component_data ? 'target_roles' 
                        THEN string_to_array(p_component_data->>'target_roles', ',')::user_type[]
                        ELSE ARRAY['patient', 'staff', 'admin']::user_type[]
                    END,
                    COALESCE((p_component_data->>'is_active')::BOOLEAN, true),
                    (current_context->>'user_id')::UUID
                ) RETURNING * INTO component_record;
                
                result := jsonb_build_object(
                    'success', true,
                    'message', 'UI component created successfully',
                    'data', jsonb_build_object(
                        'component_id', component_record.id,
                        'component_name', component_record.component_name,
                        'component_type', component_record.component_type,
                        'is_active', component_record.is_active,
                        'created_at', component_record.created_at
                    )
                );
                
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Failed to create UI component: ' || SQLERRM);
            END;
            
        WHEN 'update' THEN
            -- ✅ Update existing UI component
            IF p_component_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Component ID is required for update');
            END IF;
            
            IF p_component_data IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Component data is required for update');
            END IF;
            
            BEGIN
                UPDATE ui_components 
                SET 
                    component_name = COALESCE(p_component_data->>'component_name', component_name),
                    component_type = COALESCE((p_component_data->>'component_type')::component_type, component_type),
                    display_order = COALESCE((p_component_data->>'display_order')::INTEGER, display_order),
                    config_data = COALESCE(p_component_data->'config_data', config_data),
                    target_roles = CASE 
                        WHEN p_component_data ? 'target_roles' 
                        THEN string_to_array(p_component_data->>'target_roles', ',')::user_type[]
                        ELSE target_roles
                    END,
                    is_active = COALESCE((p_component_data->>'is_active')::BOOLEAN, is_active),
                    updated_at = NOW()
                WHERE id = p_component_id
                RETURNING * INTO component_record;
                
                IF NOT FOUND THEN
                    RETURN jsonb_build_object('success', false, 'error', 'UI component not found');
                END IF;
                
                result := jsonb_build_object(
                    'success', true,
                    'message', 'UI component updated successfully',
                    'data', jsonb_build_object(
                        'component_id', component_record.id,
                        'component_name', component_record.component_name,
                        'component_type', component_record.component_type,
                        'is_active', component_record.is_active,
                        'updated_at', component_record.updated_at
                    )
                );
                
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Failed to update UI component: ' || SQLERRM);
            END;
            
        WHEN 'delete' THEN
            -- ✅ Delete UI component
            IF p_component_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Component ID is required for deletion');
            END IF;
            
            DELETE FROM ui_components 
            WHERE id = p_component_id
            RETURNING component_name INTO component_record;
            
            IF NOT FOUND THEN
                RETURN jsonb_build_object('success', false, 'error', 'UI component not found');
            END IF;
            
            result := jsonb_build_object(
                'success', true,
                'message', format('UI component "%s" deleted successfully', component_record.component_name),
                'data', jsonb_build_object(
                    'deleted_component_id', p_component_id,
                    'deleted_at', NOW()
                )
            );
            
        WHEN 'toggle_status' THEN
            -- ✅ Toggle active status
            IF p_component_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Component ID is required for status toggle');
            END IF;
            
            UPDATE ui_components 
            SET 
                is_active = NOT is_active,
                updated_at = NOW()
            WHERE id = p_component_id
            RETURNING * INTO component_record;
            
            IF NOT FOUND THEN
                RETURN jsonb_build_object('success', false, 'error', 'UI component not found');
            END IF;
            
            result := jsonb_build_object(
                'success', true,
                'message', format('UI component "%s" %s', 
                                  component_record.component_name,
                                  CASE WHEN component_record.is_active THEN 'activated' ELSE 'deactivated' END),
                'data', jsonb_build_object(
                    'component_id', component_record.id,
                    'component_name', component_record.component_name,
                    'is_active', component_record.is_active,
                    'updated_at', component_record.updated_at
                )
            );
            
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Supported actions: list, create, update, delete, toggle_status');
    END CASE;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'UI component management failed: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."manage_ui_components"("p_action" "text", "p_component_id" "uuid", "p_component_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_user_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid" DEFAULT NULL::"uuid", "p_item_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_scope_override" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    current_user_id UUID;
    v_current_role TEXT;
    current_clinic_id UUID;
    result JSONB;
    affected_count INTEGER := 0;
    valid_items UUID[];
    scope_type_val TEXT;
    scope_id_val UUID;
    allowed_item_types TEXT[];
BEGIN
    -- ✅ Authentication & role detection (unchanged)
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    current_user_id := (current_context->>'user_id')::UUID;
    v_current_role := current_context->>'user_type';
    current_clinic_id := (current_context->>'clinic_id')::UUID;
    
    -- ✅ Role-based validation (unchanged)
    CASE v_current_role
        WHEN 'patient' THEN
            allowed_item_types := ARRAY['appointment', 'feedback', 'notification'];
            scope_type_val := 'personal';
            scope_id_val := NULL;
            
        WHEN 'staff' THEN
            allowed_item_types := ARRAY['appointment', 'feedback', 'notification', 'clinic_appointment', 'clinic_feedback', 'staff_notification', 'patient_communication'];
            scope_type_val := 'clinic';
            scope_id_val := current_clinic_id;
            
            IF current_clinic_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Staff user not assigned to a clinic');
            END IF;
            
        WHEN 'admin' THEN
            allowed_item_types := ARRAY['appointment', 'feedback', 'notification', 'clinic_appointment', 'clinic_feedback', 'staff_notification', 'patient_communication', 'user_account', 'clinic_account', 'system_notification', 'analytics_data', 'partnership_request'];
            scope_type_val := COALESCE(p_scope_override, 'system');
            scope_id_val := NULL;
            
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid user role');
    END CASE;
    
    -- Validate parameters
    IF p_action NOT IN ('archive', 'unarchive', 'hide', 'get_stats', 'list_archived', 'list_hidden', 'get_permissions') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
    END IF;
    
    IF p_item_type IS NOT NULL AND NOT (p_item_type = ANY(allowed_item_types)) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Item type "%s" not allowed for %s role', p_item_type, v_current_role),
            'allowed_types', allowed_item_types
        );
    END IF;
    
    -- ✅ HANDLE ACTIONS
    CASE p_action
        WHEN 'get_permissions' THEN
            RETURN jsonb_build_object(
                'success', true,
                'data', jsonb_build_object(
                    'role', v_current_role,
                    'allowed_item_types', allowed_item_types,
                    'scope_type', scope_type_val,
                    'scope_id', scope_id_val,
                    'capabilities', CASE v_current_role
                        WHEN 'patient' THEN jsonb_build_object(
                            'can_archive_own_data', true,
                            'can_view_shared_archives', true,
                            'can_cascade_delete', false
                        )
                        WHEN 'staff' THEN jsonb_build_object(
                            'can_archive_clinic_data', true,
                            'can_manage_patient_communications', true,
                            'can_cascade_delete', false
                        )
                        WHEN 'admin' THEN jsonb_build_object(
                            'can_archive_system_data', true,
                            'can_override_scopes', true,
                            'can_cascade_delete', true
                        )
                        ELSE '{}'::jsonb
                    END
                )
            );
            
        WHEN 'get_stats' THEN
            -- ✅ FIXED: Proper aggregation for statistics
            IF v_current_role = 'patient' THEN
                SELECT jsonb_build_object(
                    'success', true,
                    'data', jsonb_build_object(
                        'archived_counts', jsonb_build_object(
                            'appointments', COUNT(*) FILTER (WHERE item_type = 'appointment' AND is_archived = true AND is_hidden = false),
                            'feedback', COUNT(*) FILTER (WHERE item_type = 'feedback' AND is_archived = true AND is_hidden = false),
                            'notifications', COUNT(*) FILTER (WHERE item_type = 'notification' AND is_archived = true AND is_hidden = false)
                        ),
                        'hidden_counts', jsonb_build_object(
                            'appointments', COUNT(*) FILTER (WHERE item_type = 'appointment' AND is_hidden = true),
                            'feedback', COUNT(*) FILTER (WHERE item_type = 'feedback' AND is_hidden = true),
                            'notifications', COUNT(*) FILTER (WHERE item_type = 'notification' AND is_hidden = true)
                        ),
                        'scope', 'personal'
                    )
                ) INTO result
                FROM archive_items
                WHERE archived_by_user_id = current_user_id;
                
            ELSIF v_current_role = 'staff' THEN
                SELECT jsonb_build_object(
                    'success', true,
                    'data', jsonb_build_object(
                        'archived_counts', jsonb_build_object(
                            'clinic_appointments', COUNT(*) FILTER (WHERE item_type IN ('appointment', 'clinic_appointment') AND is_archived = true AND is_hidden = false),
                            'clinic_feedback', COUNT(*) FILTER (WHERE item_type IN ('feedback', 'clinic_feedback') AND is_archived = true AND is_hidden = false),
                            'staff_notifications', COUNT(*) FILTER (WHERE item_type = 'staff_notification' AND is_archived = true AND is_hidden = false),
                            'patient_communications', COUNT(*) FILTER (WHERE item_type = 'patient_communication' AND is_archived = true AND is_hidden = false)
                        ),
                        'scope', 'clinic',
                        'clinic_id', current_clinic_id
                    )
                ) INTO result
                FROM archive_items
                WHERE archived_by_user_id = current_user_id OR (scope_type = 'clinic' AND scope_id = current_clinic_id);
                
            ELSIF v_current_role = 'admin' THEN
                SELECT jsonb_build_object(
                    'success', true,
                    'data', jsonb_build_object(
                        'archived_counts', jsonb_build_object(
                            'system_wide_total', COUNT(*),
                            'by_scope', jsonb_build_object(
                                'personal', COUNT(*) FILTER (WHERE scope_type = 'personal'),
                                'clinic', COUNT(*) FILTER (WHERE scope_type = 'clinic'),
                                'system', COUNT(*) FILTER (WHERE scope_type = 'system')
                            ),
                            'by_role', jsonb_build_object(
                                'patient_archives', COUNT(*) FILTER (WHERE archived_by_role = 'patient'),
                                'staff_archives', COUNT(*) FILTER (WHERE archived_by_role = 'staff'),
                                'admin_archives', COUNT(*) FILTER (WHERE archived_by_role = 'admin')
                            )
                        ),
                        'scope', 'system'
                    )
                ) INTO result
                FROM archive_items;
            END IF;
            
        WHEN 'list_archived' THEN
            -- ✅ FIXED: Proper query without GROUP BY issues
            SELECT jsonb_build_object(
                'success', true,
                'data', COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'item_id', ai.item_id,
                        'item_type', ai.item_type,
                        'archived_at', ai.archived_at,
                        'archive_reason', ai.archive_reason,
                        'archived_by_role', ai.archived_by_role,
                        'scope_type', ai.scope_type,
                        'scope_id', ai.scope_id,
                        'metadata', ai.metadata
                    ) ORDER BY ai.archived_at DESC
                ), '[]'::jsonb)
            ) INTO result
            FROM archive_items ai
            WHERE (
                -- Own archives
                ai.archived_by_user_id = current_user_id
                OR 
                -- Staff can see clinic archives
                (v_current_role = 'staff' AND ai.scope_type = 'clinic' AND ai.scope_id = current_clinic_id)
                OR
                -- Admin can see all
                (v_current_role = 'admin')
            )
            AND (p_item_type IS NULL OR ai.item_type = p_item_type)
            AND ai.is_archived = true 
            AND ai.is_hidden = false;
            
        WHEN 'list_hidden' THEN
            -- ✅ FIXED: Proper query for hidden items
            SELECT jsonb_build_object(
                'success', true,
                'data', COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'item_id', ai.item_id,
                        'item_type', ai.item_type,
                        'hidden_at', ai.hidden_at,
                        'archive_reason', ai.archive_reason,
                        'archived_by_role', ai.archived_by_role,
                        'scope_type', ai.scope_type,
                        'scope_id', ai.scope_id,
                        'metadata', ai.metadata
                    ) ORDER BY ai.hidden_at DESC
                ), '[]'::jsonb)
            ) INTO result
            FROM archive_items ai
            WHERE (
                ai.archived_by_user_id = current_user_id
                OR (v_current_role = 'staff' AND ai.scope_type = 'clinic' AND ai.scope_id = current_clinic_id)
                OR (v_current_role = 'admin')
            )
            AND (p_item_type IS NULL OR ai.item_type = p_item_type)
            AND ai.is_hidden = true;
            
        WHEN 'archive' THEN
            -- ✅ Archive functionality (simplified for space)
            IF p_item_id IS NOT NULL THEN
                -- Single item archiving
                INSERT INTO archive_items (
                    archived_by_user_id, archived_by_role, item_type, item_id, 
                    scope_type, scope_id, archive_reason, metadata
                )
                VALUES (
                    current_user_id, v_current_role::user_type, p_item_type, p_item_id,
                    scope_type_val, scope_id_val, 'manual', 
                    jsonb_build_object('archived_via', 'single_item')
                )
                ON CONFLICT (archived_by_user_id, item_type, item_id) 
                DO UPDATE SET 
                    is_archived = true,
                    is_hidden = false,
                    archived_at = NOW(),
                    archive_reason = 'manual';
                    
                affected_count := 1;
                
            ELSIF p_item_ids IS NOT NULL AND array_length(p_item_ids, 1) > 0 THEN
                -- Batch archiving - simplified for space
                INSERT INTO archive_items (
                    archived_by_user_id, archived_by_role, item_type, item_id,
                    scope_type, scope_id, archive_reason, metadata
                )
                SELECT 
                    current_user_id, v_current_role::user_type, p_item_type, unnest(p_item_ids),
                    scope_type_val, scope_id_val, 'manual', 
                    jsonb_build_object('archived_via', 'batch_operation', 'batch_size', array_length(p_item_ids, 1))
                ON CONFLICT (archived_by_user_id, item_type, item_id) 
                DO UPDATE SET 
                    is_archived = true,
                    is_hidden = false,
                    archived_at = NOW(),
                    archive_reason = 'manual';
                
                affected_count := array_length(p_item_ids, 1);
            END IF;
            
            result := jsonb_build_object(
                'success', true,
                'message', format('%s item(s) archived successfully', affected_count),
                'affected_count', affected_count,
                'role', v_current_role,
                'scope', scope_type_val
            );
            
        WHEN 'unarchive' THEN
            DELETE FROM archive_items
            WHERE item_type = p_item_type 
            AND item_id = p_item_id
            AND (
                archived_by_user_id = current_user_id
                OR (v_current_role = 'staff' AND scope_type = 'clinic' AND scope_id = current_clinic_id)
                OR (v_current_role = 'admin')
            );
            
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
            result := jsonb_build_object(
                'success', true,
                'message', CASE WHEN affected_count > 0 THEN 'Item unarchived successfully' ELSE 'Item was not archived or access denied' END,
                'affected_count', affected_count
            );
            
        WHEN 'hide' THEN
            UPDATE archive_items
            SET is_hidden = true, hidden_at = NOW()
            WHERE item_type = p_item_type 
            AND item_id = p_item_id
            AND (
                archived_by_user_id = current_user_id
                OR (v_current_role = 'staff' AND scope_type = 'clinic' AND scope_id = current_clinic_id)
                OR (v_current_role = 'admin')
            );
            
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
            IF affected_count = 0 THEN
                -- Create hidden record if it doesn't exist
                INSERT INTO archive_items (
                    archived_by_user_id, archived_by_role, item_type, item_id,
                    scope_type, scope_id, is_archived, is_hidden, archive_reason, hidden_at
                )
                VALUES (
                    current_user_id, v_current_role::user_type, p_item_type, p_item_id,
                    scope_type_val, scope_id_val, false, true, 'manual', NOW()
                )
                ON CONFLICT (archived_by_user_id, item_type, item_id) 
                DO UPDATE SET is_hidden = true, hidden_at = NOW();
                affected_count := 1;
            END IF;
            
            result := jsonb_build_object(
                'success', true,
                'message', CASE WHEN affected_count > 0 THEN 'Item permanently hidden from your view' ELSE 'Item not found or access denied' END,
                'affected_count', affected_count
            );
    END CASE;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', format('Archive operation failed: %s', SQLERRM));
END;
$$;


ALTER FUNCTION "public"."manage_user_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[], "p_scope_override" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    updated_count INTEGER;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- Update notifications - RLS ensures users can only update their own
    UPDATE notifications 
    SET 
        is_read = true,
        updated_at = NOW()
    WHERE id = ANY(p_notification_ids)
    AND user_id = (current_context->>'user_id')::UUID;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_count', updated_count,
        'message', updated_count || ' notifications marked as read'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_feedback_core_field_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
  IF NEW.clinic_id <> OLD.clinic_id
     OR NEW.appointment_id <> OLD.appointment_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify clinic_id, appointment_id, or created_at';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_feedback_core_field_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_email_communications_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
  -- Disallow updates to critical fields
  IF NEW.from_user_id <> OLD.from_user_id
     OR NEW.to_user_id <> OLD.to_user_id
     OR NEW.appointment_id <> OLD.appointment_id
     OR NEW.subject <> OLD.subject
     OR NEW.message_body <> OLD.message_body
     OR NEW.created_at <> OLD.created_at
     OR NEW.email_type <> OLD.email_type
     OR NEW.attachments <> OLD.attachments THEN
    RAISE EXCEPTION 'Only is_read and replied_to can be updated';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_email_communications_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_file_upload_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
  IF NEW.file_name <> OLD.file_name
     OR NEW.file_type <> OLD.file_type
     OR NEW.file_size <> OLD.file_size
     OR NEW.storage_path <> OLD.storage_path
     OR NEW.bucket_name <> OLD.bucket_name
     OR NEW.content_type <> OLD.content_type
     OR NEW.uploaded_at <> OLD.uploaded_at
     OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'You cannot change core file attributes after upload';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_file_upload_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_appointment"("p_appointment_id" "uuid", "p_rejection_reason" "text", "p_rejection_category" "public"."rejection_category" DEFAULT 'other'::"public"."rejection_category", "p_suggest_reschedule" boolean DEFAULT true, "p_alternative_dates" "date"[] DEFAULT NULL::"date"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$DECLARE
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
    
    -- ✅ ENHANCED: Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;
    
    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required');
    END IF;
    
    -- ✅ OPTIMIZED: Get comprehensive appointment details
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
    
    -- ✅ SIMPLIFIED: Get clinic rejection statistics (simplified to avoid errors)
    SELECT 
        COUNT(*) as total_rejections_this_month
    INTO rejection_stats
    FROM appointments 
    WHERE clinic_id = clinic_id_val 
    AND status = 'cancelled'
    AND cancelled_at >= CURRENT_DATE - INTERVAL '30 days';
    
    -- ✅ SIMPLIFIED: Skip alternative slots for now to avoid complexity
    alternative_slots := '[]'::jsonb;
    
    -- ✅ TRANSACTION: Atomic rejection process with better error handling
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
        
        -- ✅ SIMPLIFIED: Create basic rejection notification
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
        
        -- ✅ SIMPLIFIED: Basic analytics logging (only if table exists)
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
        
        -- ✅ SUCCESS: Return comprehensive rejection data
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
END;$$;


ALTER FUNCTION "public"."reject_appointment"("p_appointment_id" "uuid", "p_rejection_reason" "text", "p_rejection_category" "public"."rejection_category", "p_suggest_reschedule" boolean, "p_alternative_dates" "date"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restrict_notification_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
  IF NEW.notification_type <> OLD.notification_type
     OR NEW.title <> OLD.title
     OR NEW.message <> OLD.message
     OR NEW.created_at <> OLD.created_at
     OR NEW.scheduled_for <> OLD.scheduled_for THEN
    RAISE EXCEPTION 'You can only update read status and preferences of notifications.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."restrict_notification_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_condition_report"("p_clinic_id" "uuid", "p_subject" "text", "p_message" "text", "p_attachment_urls" "text"[] DEFAULT NULL::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    patient_id_val UUID;
    clinic_record RECORD;
    communication_id UUID;
    staff_recipients UUID[];
    recipient_count INTEGER;
BEGIN
    current_context := get_current_user_context();
    
    -- Only authenticated patients can send condition reports
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient access required');
    END IF;
    
    patient_id_val := (current_context->>'user_id')::UUID;
    
    -- ✅ Input validation
    IF p_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic ID is required');
    END IF;
    
    IF p_subject IS NULL OR TRIM(p_subject) = '' OR LENGTH(p_subject) > 200 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Subject is required and must be under 200 characters');
    END IF;
    
    IF p_message IS NULL OR TRIM(p_message) = '' OR LENGTH(p_message) > 2000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message is required and must be under 2000 characters');
    END IF;
    
    -- ✅ Get clinic information
    SELECT 
        c.id,
        c.name,
        c.email as clinic_email,
        c.phone as clinic_phone,
        c.is_active
    INTO clinic_record
    FROM clinics c
    WHERE c.id = p_clinic_id;
    
    IF NOT FOUND OR NOT clinic_record.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found or inactive');
    END IF;
    
    -- ✅ Get active staff recipients
    SELECT ARRAY_AGG(u.id) INTO staff_recipients
    FROM staff_profiles sp
    JOIN user_profiles up ON sp.user_profile_id = up.id
    JOIN users u ON up.user_id = u.id
    WHERE sp.clinic_id = p_clinic_id 
    AND sp.is_active = true
    AND u.is_active = true;
    
    IF staff_recipients IS NULL OR array_length(staff_recipients, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'No active staff available to receive your report'
        );
    END IF;
    
    recipient_count := array_length(staff_recipients, 1);
    
    -- ✅ FIXED: Insert with correct schema - send to first staff member
    INSERT INTO email_communications (
        from_user_id,
        to_user_id,      -- ✅ FIXED: to_user_id not to_clinic_id
        subject,
        message_body,
        email_type,      -- ✅ FIXED: email_type not communication_type
        attachments      -- ✅ FIXED: attachments (jsonb) not attachment_urls
    ) VALUES (
        patient_id_val,
        staff_recipients[1],  -- ✅ FIXED: Send to first staff member
        p_subject,
        p_message,
        'condition_report',
        CASE WHEN p_attachment_urls IS NOT NULL 
             THEN jsonb_build_object('urls', p_attachment_urls)
             ELSE NULL END
    ) RETURNING id INTO communication_id;
    
    -- ✅ FIXED: Create notifications (correct schema)
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message
    )
    SELECT 
        unnest(staff_recipients),
        'partnership_request', -- ✅ FIXED: Use existing enum
        'Patient Condition Report: ' || p_subject,
        format('Patient %s has sent a condition report. Subject: %s',
               current_context->>'full_name', p_subject);
    
    -- ✅ FIXED: Analytics event (correct schema)
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata     -- ✅ FIXED: metadata not event_data
    ) VALUES (
        p_clinic_id,
        patient_id_val,
        'patient_communication',
        jsonb_build_object(
            'communication_id', communication_id,
            'type', 'condition_report',
            'subject', p_subject,
            'message_length', LENGTH(p_message),
            'has_attachments', (p_attachment_urls IS NOT NULL),
            'staff_recipients', recipient_count
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Condition report sent successfully',
        'data', jsonb_build_object(
            'communication_id', communication_id,
            'sent_at', NOW(),
            'clinic_info', jsonb_build_object(
                'id', clinic_record.id,
                'name', clinic_record.name,
                'contact_email', clinic_record.clinic_email,
                'contact_phone', clinic_record.clinic_phone
            ),
            'delivery_info', jsonb_build_object(
                'recipients_count', recipient_count
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to send condition report. Please try again.');
END;
$$;


ALTER FUNCTION "public"."send_condition_report"("p_clinic_id" "uuid", "p_subject" "text", "p_message" "text", "p_attachment_urls" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_phone_verification_otp"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    user_phone VARCHAR(20);
    otp_code VARCHAR(6);
    current_user_id UUID;
BEGIN
    
    -- Get current user if not provided
    current_user_id := COALESCE(p_user_id, get_current_user_id());
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;
    
    -- Get user's phone number
    SELECT phone INTO user_phone
    FROM users 
    WHERE id = current_user_id AND phone IS NOT NULL AND phone != '';
    
    IF user_phone IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No phone number found');
    END IF;
    
    -- Generate OTP
    otp_code := generate_otp(user_phone, 'phone', 'phone_verification');
    
    -- ✅ SECURITY FIX: NEVER return OTP in response
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'OTP sent to phone',
        'phone', SUBSTRING(user_phone, 1, 3) || '****' || SUBSTRING(user_phone, -2) -- Masked phone
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to send OTP');
END;
$$;


ALTER FUNCTION "public"."send_phone_verification_otp"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_feedback"("p_rating" integer, "p_comment" "text", "p_appointment_id" "uuid" DEFAULT NULL::"uuid", "p_clinic_id" "uuid" DEFAULT NULL::"uuid", "p_feedback_type" "public"."feedback_type" DEFAULT 'general'::"public"."feedback_type", "p_is_anonymous" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    current_context JSONB;
    patient_id_val UUID;
    appointment_record RECORD;
    clinic_record RECORD;
    feedback_id UUID;
    existing_feedback_count INTEGER;
    doctor_id_val UUID;
BEGIN
    current_context := get_current_user_context();
    
    -- Only authenticated patients can submit feedback
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient access required');
    END IF;
    
    patient_id_val := (current_context->>'user_id')::UUID;
    
    -- ✅ Input validation
    IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
    END IF;
    
    IF p_comment IS NULL OR TRIM(p_comment) = '' OR LENGTH(p_comment) > 1000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comment is required and must be under 1000 characters');
    END IF;
    
    -- Either appointment_id or clinic_id must be provided
    IF p_appointment_id IS NULL AND p_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Either appointment ID or clinic ID is required');
    END IF;
    
    -- ✅ Determine clinic and doctor from appointment
    IF p_appointment_id IS NOT NULL THEN
        SELECT 
            a.id,
            a.clinic_id,
            a.doctor_id,  -- ✅ Get doctor for feedback
            a.status,
            a.appointment_date,
            c.name as clinic_name
        INTO appointment_record
        FROM appointments a
        JOIN clinics c ON a.clinic_id = c.id
        WHERE a.id = p_appointment_id
        AND a.patient_id = patient_id_val;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Appointment not found or access denied');
        END IF;
        
        -- Only allow feedback for completed appointments
        IF appointment_record.status != 'completed' THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Feedback can only be submitted for completed appointments',
                'current_status', appointment_record.status
            );
        END IF;
        
        p_clinic_id := appointment_record.clinic_id;
        doctor_id_val := appointment_record.doctor_id;
    END IF;
    
    -- ✅ Get clinic information
    SELECT 
        c.id,
        c.name,
        c.rating as current_rating,
        c.total_reviews as current_review_count,
        c.is_active
    INTO clinic_record
    FROM clinics c
    WHERE c.id = p_clinic_id;
    
    IF NOT FOUND OR NOT clinic_record.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found or inactive');
    END IF;
    
    -- ✅ Check for duplicate feedback
    IF p_appointment_id IS NOT NULL THEN
        SELECT COUNT(*) INTO existing_feedback_count
        FROM feedback
        WHERE appointment_id = p_appointment_id
        AND patient_id = patient_id_val;
        
        IF existing_feedback_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Feedback already submitted for this appointment'
            );
        END IF;
    END IF;
    
    -- ✅ Rate limiting check  
    SELECT COUNT(*) INTO existing_feedback_count
    FROM feedback
    WHERE patient_id = patient_id_val
    AND created_at >= CURRENT_DATE;
    
    IF existing_feedback_count >= 3 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Maximum 3 feedback submissions per day'
        );
    END IF;
    
    -- ✅ FIXED: Insert with correct schema columns
    INSERT INTO feedback (
        patient_id,
        clinic_id,
        doctor_id,       -- ✅ FIXED: Added doctor_id 
        appointment_id,
        feedback_type,   -- ✅ FIXED: Use feedback_type enum
        rating,
        comment,         -- ✅ FIXED: comment not feedback_text
        is_anonymous,
        is_public
    ) VALUES (
        patient_id_val,
        p_clinic_id,
        doctor_id_val,   -- ✅ FIXED: Include doctor
        p_appointment_id,
        p_feedback_type, -- ✅ FIXED: Use enum
        p_rating,
        p_comment,       -- ✅ FIXED: comment not feedback_text
        COALESCE(p_is_anonymous, false),
        NOT COALESCE(p_is_anonymous, false)  -- Public unless anonymous
    ) RETURNING id INTO feedback_id;
    
    -- ✅ FIXED: Create notification for clinic staff (correct schema)
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message
    )
    SELECT 
        u.id,
        'feedback_request', -- ✅ FIXED: Use existing enum value
        CASE 
            WHEN p_rating >= 4 THEN 'New Positive Feedback Received'
            WHEN p_rating = 3 THEN 'New Feedback Received'
            ELSE 'New Feedback Requires Attention'
        END,
        format('New %s-star feedback received%s: "%s"',
               p_rating,
               CASE WHEN p_is_anonymous THEN ' (anonymous)' ELSE format(' from %s', current_context->>'full_name') END,
               LEFT(p_comment, 100) || CASE WHEN LENGTH(p_comment) > 100 THEN '...' ELSE '' END)
    FROM staff_profiles sp
    JOIN user_profiles up ON sp.user_profile_id = up.id
    JOIN users u ON up.user_id = u.id
    WHERE sp.clinic_id = p_clinic_id 
    AND sp.is_active = true;
    
    -- ✅ FIXED: Analytics event (correct schema)
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata  -- ✅ FIXED: metadata not event_data
    ) VALUES (
        p_clinic_id,
        patient_id_val,
        'feedback_submitted',
        jsonb_build_object(
            'feedback_id', feedback_id,
            'rating', p_rating,
            'appointment_id', p_appointment_id,
            'is_anonymous', COALESCE(p_is_anonymous, false),
            'feedback_type', p_feedback_type,
            'text_length', LENGTH(p_comment)
        )
    );
    
    -- ✅ Return success response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Feedback submitted successfully',
        'data', jsonb_build_object(
            'feedback_id', feedback_id,
            'submitted_at', NOW(),
            'clinic_info', jsonb_build_object(
                'id', clinic_record.id,
                'name', clinic_record.name,
                'previous_rating', clinic_record.current_rating,
                'total_reviews', clinic_record.current_review_count
            ),
            'your_feedback', jsonb_build_object(
                'rating', p_rating,
                'feedback_type', p_feedback_type,
                'is_anonymous', COALESCE(p_is_anonymous, false),
                'is_public', NOT COALESCE(p_is_anonymous, false)
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to submit feedback. Please try again.');
END;
$$;


ALTER FUNCTION "public"."submit_feedback"("p_rating" integer, "p_comment" "text", "p_appointment_id" "uuid", "p_clinic_id" "uuid", "p_feedback_type" "public"."feedback_type", "p_is_anonymous" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_clinic_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    UPDATE clinics SET
        rating = (
            SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0.00)
            FROM feedback
            WHERE clinic_id = COALESCE(NEW.clinic_id, OLD.clinic_id)
            AND rating IS NOT NULL
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM feedback
            WHERE clinic_id = COALESCE(NEW.clinic_id, OLD.clinic_id)
            AND rating IS NOT NULL
        )
    WHERE id = COALESCE(NEW.clinic_id, OLD.clinic_id);
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating clinic rating: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."update_clinic_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_location"("latitude" double precision, "longitude" double precision) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    user_id_val UUID;
    user_profile_id UUID;
BEGIN
    -- ✅ SECURITY FIX: Input validation
    IF latitude IS NULL OR longitude IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180 THEN
        RETURN FALSE;
    END IF;
    
    SELECT id INTO user_id_val 
    FROM users 
    WHERE auth_user_id = auth.uid();
    
    IF user_id_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT id INTO user_profile_id 
    FROM user_profiles 
    WHERE user_id = user_id_val;
    
    IF user_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- ✅ FIX: Proper PostGIS casting and error handling
    INSERT INTO patient_profiles (user_profile_id, preferred_location)
    VALUES (
        user_profile_id, 
        ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography
    )
    ON CONFLICT (user_profile_id) 
    DO UPDATE 
    SET preferred_location = ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography,
        updated_at = NOW();
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_user_location: %', SQLERRM;
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."update_user_location"("latitude" double precision, "longitude" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_profile_data" "jsonb" DEFAULT '{}'::"jsonb", "p_role_specific_data" "jsonb" DEFAULT '{}'::"jsonb", "p_clinic_data" "jsonb" DEFAULT '{}'::"jsonb", "p_services_data" "jsonb" DEFAULT '{}'::"jsonb", "p_doctors_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_catalog'
    AS $$
DECLARE
    target_user_id UUID;
    current_context JSONB;
    v_current_role TEXT;
    profile_id UUID;
    staff_clinic_id UUID;
    result JSONB := '{}';
    temp_result JSONB;
BEGIN
    SET search_path = public, pg_catalog;
    
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    
    -- Access control
    IF v_current_role = 'patient' AND target_user_id != (current_context->>'user_id')::UUID THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
    
    -- Get profile ID and staff clinic
    SELECT up.id, sp.clinic_id INTO profile_id, staff_clinic_id
    FROM user_profiles up
    JOIN users u ON up.user_id = u.id
    LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
    WHERE u.id = target_user_id;
    
    IF profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;
    
    -- 1️⃣ UPDATE BASE USER DATA
    IF p_profile_data ? 'phone' THEN
        UPDATE users 
        SET phone = p_profile_data->>'phone',
            phone_verified = CASE 
                WHEN phone != p_profile_data->>'phone' THEN false 
                ELSE phone_verified 
            END,
            updated_at = NOW()
        WHERE id = target_user_id;
        
        result := result || jsonb_build_object('user_updated', true);
    END IF;
    
    -- 2️⃣ UPDATE USER PROFILES  
    UPDATE user_profiles 
    SET 
        first_name = COALESCE(p_profile_data->>'first_name', first_name),
        last_name = COALESCE(p_profile_data->>'last_name', last_name),
        date_of_birth = COALESCE((p_profile_data->>'date_of_birth')::date, date_of_birth),
        gender = COALESCE(p_profile_data->>'gender', gender),
        profile_image_url = COALESCE(p_profile_data->>'profile_image_url', profile_image_url),
        updated_at = NOW()
    WHERE id = profile_id;
    
    result := result || jsonb_build_object('profile_updated', true);
    
    -- 3️⃣ ROLE-SPECIFIC UPDATES
    
    -- 🏥 PATIENT UPDATES (Enhanced)
    IF v_current_role = 'patient' THEN
        INSERT INTO patient_profiles (user_profile_id, created_at)
        VALUES (profile_id, NOW())
        ON CONFLICT (user_profile_id) DO NOTHING;
        
        UPDATE patient_profiles 
        SET 
            emergency_contact_name = COALESCE(p_role_specific_data->>'emergency_contact_name', emergency_contact_name),
            emergency_contact_phone = COALESCE(p_role_specific_data->>'emergency_contact_phone', emergency_contact_phone),
            insurance_provider = COALESCE(p_role_specific_data->>'insurance_provider', insurance_provider),
            medical_conditions = CASE 
                WHEN p_role_specific_data ? 'medical_conditions' 
                THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_role_specific_data->'medical_conditions'))
                ELSE medical_conditions 
            END,
            allergies = CASE 
                WHEN p_role_specific_data ? 'allergies' 
                THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_role_specific_data->'allergies'))
                ELSE allergies 
            END,
            preferred_location = CASE 
                WHEN p_role_specific_data ? 'preferred_location' AND p_role_specific_data->>'preferred_location' != ''
                THEN ST_SetSRID(ST_GeomFromText(p_role_specific_data->>'preferred_location'), 4326)::geography
                ELSE preferred_location
            END,
            preferred_doctors = CASE 
                WHEN p_role_specific_data ? 'preferred_doctors'
                THEN (SELECT array_agg(value::text::uuid) FROM jsonb_array_elements_text(p_role_specific_data->'preferred_doctors'))
                ELSE preferred_doctors
            END,
            email_notifications = COALESCE((p_role_specific_data->>'email_notifications')::boolean, email_notifications),
            sms_notifications = COALESCE((p_role_specific_data->>'sms_notifications')::boolean, sms_notifications),
            updated_at = NOW()
        WHERE user_profile_id = profile_id;
        
        result := result || jsonb_build_object('patient_profile_updated', true);
    
    -- 👨‍💼 STAFF UPDATES (MAJOR ENHANCEMENT)
    ELSIF v_current_role = 'staff' THEN
        -- Update staff profile
        UPDATE staff_profiles 
        SET 
            position = COALESCE(p_role_specific_data->>'position', position),
            department = COALESCE(p_role_specific_data->>'department', department),
            updated_at = NOW()
        WHERE user_profile_id = profile_id;
        
        result := result || jsonb_build_object('staff_profile_updated', true);
        
        -- 🏥 CLINIC MANAGEMENT (Staff can update their clinic)
        IF p_clinic_data != '{}' AND staff_clinic_id IS NOT NULL THEN
            UPDATE clinics 
            SET 
                name = COALESCE(p_clinic_data->>'name', name),
                description = COALESCE(p_clinic_data->>'description', description),
                address = COALESCE(p_clinic_data->>'address', address),
                city = COALESCE(p_clinic_data->>'city', city),
                province = COALESCE(p_clinic_data->>'province', province),
                zip_code = COALESCE(p_clinic_data->>'zip_code', zip_code),
                phone = COALESCE(p_clinic_data->>'phone', phone),
                email = COALESCE(p_clinic_data->>'email', email),
                website_url = COALESCE(p_clinic_data->>'website_url', website_url),
                image_url = COALESCE(p_clinic_data->>'image_url', image_url),
                location = CASE 
                    WHEN p_clinic_data ? 'location' AND p_clinic_data->>'location' != ''
                    THEN ST_SetSRID(ST_GeomFromText(p_clinic_data->>'location'), 4326)::geography
                    ELSE location
                END,
                operating_hours = CASE 
                    WHEN p_clinic_data ? 'operating_hours'
                    THEN p_clinic_data->'operating_hours'
                    ELSE operating_hours
                END,
                services_offered = CASE 
                    WHEN p_clinic_data ? 'services_offered'
                    THEN p_clinic_data->'services_offered'
                    ELSE services_offered
                END,
                appointment_limit_per_patient = COALESCE((p_clinic_data->>'appointment_limit_per_patient')::integer, appointment_limit_per_patient),
                cancellation_policy_hours = COALESCE((p_clinic_data->>'cancellation_policy_hours')::integer, cancellation_policy_hours),
                updated_at = NOW()
            WHERE id = staff_clinic_id;
            
            result := result || jsonb_build_object('clinic_updated', true);
        END IF;
        
        -- 🏥 SERVICES MANAGEMENT
        IF p_services_data != '{}' AND staff_clinic_id IS NOT NULL THEN
            -- Add new services
            IF p_services_data ? 'add_services' THEN
                INSERT INTO services (clinic_id, name, description, category, duration_minutes, min_price, max_price, is_active)
                SELECT 
                    staff_clinic_id,
                    service->>'name',
                    service->>'description', 
                    service->>'category',
                    COALESCE((service->>'duration_minutes')::integer, 60),
                    (service->>'min_price')::numeric,
                    (service->>'max_price')::numeric,
                    COALESCE((service->>'is_active')::boolean, true)
                FROM jsonb_array_elements(p_services_data->'add_services') AS service
                WHERE service->>'name' IS NOT NULL;
                
                result := result || jsonb_build_object('services_added', jsonb_array_length(p_services_data->'add_services'));
            END IF;
            
            -- Update existing services
            IF p_services_data ? 'update_services' THEN
                UPDATE services 
                SET 
                    name = COALESCE(update_data->>'name', name),
                    description = COALESCE(update_data->>'description', description),
                    category = COALESCE(update_data->>'category', category),
                    duration_minutes = COALESCE((update_data->>'duration_minutes')::integer, duration_minutes),
                    min_price = COALESCE((update_data->>'min_price')::numeric, min_price),
                    max_price = COALESCE((update_data->>'max_price')::numeric, max_price),
                    is_active = COALESCE((update_data->>'is_active')::boolean, is_active),
                    updated_at = NOW()
                FROM (
                    SELECT 
                        (service->>'id')::uuid as service_id,
                        service as update_data
                    FROM jsonb_array_elements(p_services_data->'update_services') AS service
                ) AS updates
                WHERE services.id = updates.service_id 
                AND services.clinic_id = staff_clinic_id;
                
                result := result || jsonb_build_object('services_updated', true);
            END IF;
            
            -- Remove services (soft delete)
            IF p_services_data ? 'remove_services' THEN
                UPDATE services 
                SET is_active = false, updated_at = NOW()
                WHERE clinic_id = staff_clinic_id 
                AND id = ANY(
                    SELECT (value::text)::uuid 
                    FROM jsonb_array_elements_text(p_services_data->'remove_services')
                );
                
                result := result || jsonb_build_object('services_removed', jsonb_array_length(p_services_data->'remove_services'));
            END IF;
        END IF;
        
        -- 👨‍⚕️ DOCTORS MANAGEMENT 
        IF p_doctors_data != '{}' AND staff_clinic_id IS NOT NULL THEN
            -- Add new doctors
            IF p_doctors_data ? 'add_doctors' THEN
                WITH new_doctors AS (
                    INSERT INTO doctors (
                        license_number, specialization, first_name, last_name,
                        education, experience_years, bio, consultation_fee,
                        languages_spoken, certifications, awards, image_url, is_available
                    )
                    SELECT 
                        doctor->>'license_number',
                        doctor->>'specialization',
                        doctor->>'first_name', 
                        doctor->>'last_name',
                        doctor->>'education',
                        (doctor->>'experience_years')::integer,
                        doctor->>'bio',
                        (doctor->>'consultation_fee')::numeric,
                        CASE 
                            WHEN doctor ? 'languages_spoken'
                            THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(doctor->'languages_spoken'))
                            ELSE NULL
                        END,
                        CASE 
                            WHEN doctor ? 'certifications'
                            THEN doctor->'certifications'
                            ELSE NULL
                        END,
                        CASE 
                            WHEN doctor ? 'awards'
                            THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(doctor->'awards'))
                            ELSE NULL
                        END,
                        doctor->>'image_url',
                        COALESCE((doctor->>'is_available')::boolean, true)
                    FROM jsonb_array_elements(p_doctors_data->'add_doctors') AS doctor
                    WHERE doctor->>'license_number' IS NOT NULL 
                    AND doctor->>'specialization' IS NOT NULL
                    RETURNING id
                )
                INSERT INTO doctor_clinics (doctor_id, clinic_id, is_active, schedule)
                SELECT nd.id, staff_clinic_id, true, 
                    CASE 
                        WHEN doctor ? 'schedule' THEN doctor->'schedule'
                        ELSE NULL
                    END
                FROM new_doctors nd, jsonb_array_elements(p_doctors_data->'add_doctors') AS doctor;
                
                result := result || jsonb_build_object('doctors_added', jsonb_array_length(p_doctors_data->'add_doctors'));
            END IF;
            
            -- Update existing doctors
            IF p_doctors_data ? 'update_doctors' THEN
                UPDATE doctors 
                SET 
                    first_name = COALESCE(update_data->>'first_name', first_name),
                    last_name = COALESCE(update_data->>'last_name', last_name),
                    specialization = COALESCE(update_data->>'specialization', specialization),
                    education = COALESCE(update_data->>'education', education),
                    experience_years = COALESCE((update_data->>'experience_years')::integer, experience_years),
                    bio = COALESCE(update_data->>'bio', bio),
                    consultation_fee = COALESCE((update_data->>'consultation_fee')::numeric, consultation_fee),
                    image_url = COALESCE(update_data->>'image_url', image_url),
                    languages_spoken = CASE 
                        WHEN update_data ? 'languages_spoken'
                        THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(update_data->'languages_spoken'))
                        ELSE languages_spoken
                    END,
                    certifications = CASE 
                        WHEN update_data ? 'certifications'
                        THEN update_data->'certifications'
                        ELSE certifications
                    END,
                    awards = CASE 
                        WHEN update_data ? 'awards'
                        THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(update_data->'awards'))
                        ELSE awards
                    END,
                    is_available = COALESCE((update_data->>'is_available')::boolean, is_available),
                    updated_at = NOW()
                FROM (
                    SELECT 
                        (doctor->>'id')::uuid as doctor_id,
                        doctor as update_data
                    FROM jsonb_array_elements(p_doctors_data->'update_doctors') AS doctor
                ) AS updates
                WHERE doctors.id = updates.doctor_id
                AND EXISTS (
                    SELECT 1 FROM doctor_clinics dc 
                    WHERE dc.doctor_id = doctors.id 
                    AND dc.clinic_id = staff_clinic_id
                );
                
                -- Update doctor schedules
                UPDATE doctor_clinics 
                SET schedule = CASE 
                    WHEN update_data ? 'schedule' 
                    THEN update_data->'schedule'
                    ELSE schedule
                END
                FROM (
                    SELECT 
                        (doctor->>'id')::uuid as doctor_id,
                        doctor as update_data
                    FROM jsonb_array_elements(p_doctors_data->'update_doctors') AS doctor
                ) AS updates
                WHERE doctor_clinics.doctor_id = updates.doctor_id
                AND doctor_clinics.clinic_id = staff_clinic_id;
                
                result := result || jsonb_build_object('doctors_updated', true);
            END IF;
            
            -- Remove doctors from clinic (soft delete)
            IF p_doctors_data ? 'remove_doctors' THEN
                UPDATE doctor_clinics 
                SET is_active = false
                WHERE clinic_id = staff_clinic_id 
                AND doctor_id = ANY(
                    SELECT (value::text)::uuid 
                    FROM jsonb_array_elements_text(p_doctors_data->'remove_doctors')
                );
                
                result := result || jsonb_build_object('doctors_removed', jsonb_array_length(p_doctors_data->'remove_doctors'));
            END IF;
        END IF;
    
    -- 👑 ADMIN UPDATES (Enhanced)
    ELSIF v_current_role = 'admin' THEN
        UPDATE admin_profiles 
        SET 
            access_level = COALESCE((p_role_specific_data->>'access_level')::integer, access_level),
            permissions = CASE 
                WHEN p_role_specific_data ? 'permissions'
                THEN p_role_specific_data->'permissions'
                ELSE permissions
            END,
            updated_at = NOW()
        WHERE user_profile_id = profile_id;
        
        result := result || jsonb_build_object('admin_profile_updated', true);
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Profile updated successfully',
        'updates', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;


ALTER FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_profile_data" "jsonb", "p_role_specific_data" "jsonb", "p_clinic_data" "jsonb", "p_services_data" "jsonb", "p_doctors_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_and_signup_staff"("p_invitation_id" "uuid", "p_email" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    invitation_record RECORD;
    result JSONB;
BEGIN
    -- Validate and get invitation
    SELECT 
        si.*,
        c.name as clinic_name
    INTO invitation_record
    FROM staff_invitations si
    JOIN clinics c ON si.clinic_id = c.id
    WHERE si.id = p_invitation_id
    AND si.email = p_email
    AND si.status = 'pending'
    AND si.expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Invalid, expired, or already used invitation'
        );
    END IF;
    
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User with this email already exists'
        );
    END IF;
    
    -- Mark invitation as accepted
    UPDATE staff_invitations 
    SET status = 'accepted'
    WHERE id = p_invitation_id;
    
    -- Return signup data for frontend to use with Supabase auth
    SELECT jsonb_build_object(
        'success', true,
        'invitation_valid', true,
        'clinic_id', invitation_record.clinic_id,
        'clinic_name', invitation_record.clinic_name,
        'position', invitation_record.position,
        'department', invitation_record.department,
        'temp_password', invitation_record.temp_password,
        'signup_data', jsonb_build_object(
            'user_type', 'staff',
            'first_name', p_first_name,
            'last_name', p_last_name,
            'phone', p_phone,
            'clinic_id', invitation_record.clinic_id,
            'position', invitation_record.position,
            'department', invitation_record.department,
            'employee_id', invitation_record.employee_id,
            'hire_date', COALESCE(invitation_record.hire_date, CURRENT_DATE),
            'invitation_id', p_invitation_id,
            'invited_by', 'admin',
            'signup_method', 'email_first_staff_invitation'
        ),
        'message', 'Invitation validated. Proceed with signup.'
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation validation failed: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."validate_and_signup_staff"("p_invitation_id" "uuid", "p_email" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_appointment_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
    -- If status is not changing, allow the update
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Define valid status transitions
    CASE OLD.status
        WHEN 'pending' THEN
            IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
                RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
            END IF;
        WHEN 'confirmed' THEN
            IF NEW.status NOT IN ('completed', 'cancelled', 'no_show') THEN
                RAISE EXCEPTION 'Invalid status transition from confirmed to %', NEW.status;
            END IF;
        WHEN 'completed' THEN
            -- Completed appointments cannot change status
            RAISE EXCEPTION 'Cannot modify completed appointments';
        WHEN 'cancelled' THEN
            -- Cancelled appointments cannot change status
            RAISE EXCEPTION 'Cannot modify cancelled appointments';
        WHEN 'no_show' THEN
            -- No show appointments cannot change status
            RAISE EXCEPTION 'Cannot modify no-show appointments';
        ELSE
            RAISE EXCEPTION 'Unknown appointment status: %', OLD.status;
    END CASE;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_appointment_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
BEGIN
    CASE p_user_role
        WHEN 'patient' THEN
            -- Patients can only archive their own data
            CASE p_item_type
                WHEN 'appointment' THEN
                    RETURN EXISTS (SELECT 1 FROM appointments WHERE id = p_item_id AND patient_id = p_user_id AND status = 'completed');
                WHEN 'feedback' THEN
                    RETURN EXISTS (SELECT 1 FROM feedback WHERE id = p_item_id AND patient_id = p_user_id);
                WHEN 'notification' THEN
                    RETURN EXISTS (SELECT 1 FROM notifications WHERE id = p_item_id AND user_id = p_user_id);
                ELSE
                    RETURN FALSE;
            END CASE;
            
        WHEN 'staff' THEN
            -- Staff can archive clinic-scoped data
            CASE p_item_type
                WHEN 'appointment', 'clinic_appointment' THEN
                    RETURN EXISTS (SELECT 1 FROM appointments WHERE id = p_item_id AND clinic_id = p_clinic_id);
                WHEN 'feedback', 'clinic_feedback' THEN
                    RETURN EXISTS (SELECT 1 FROM feedback WHERE id = p_item_id AND clinic_id = p_clinic_id);
                WHEN 'staff_notification' THEN
                    RETURN EXISTS (SELECT 1 FROM notifications WHERE id = p_item_id AND user_id IN (
                        SELECT u.id FROM users u 
                        JOIN user_profiles up ON u.id = up.user_id 
                        JOIN staff_profiles sp ON up.id = sp.user_profile_id 
                        WHERE sp.clinic_id = p_clinic_id
                    ));
                WHEN 'patient_communication' THEN
                    RETURN EXISTS (SELECT 1 FROM email_communications WHERE id = p_item_id AND to_clinic_id = p_clinic_id);
                ELSE
                    RETURN FALSE;
            END CASE;
            
        WHEN 'admin' THEN
            -- Admin can archive anything
            RETURN TRUE;
            
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$;


ALTER FUNCTION "public"."validate_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_batch_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_ids" "uuid"[]) RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    valid_items UUID[];
BEGIN
    CASE p_user_role
        WHEN 'patient' THEN
            CASE p_item_type
                WHEN 'appointment' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM appointments 
                    WHERE id = ANY(p_item_ids) AND patient_id = p_user_id AND status = 'completed';
                WHEN 'feedback' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM feedback 
                    WHERE id = ANY(p_item_ids) AND patient_id = p_user_id;
                WHEN 'notification' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM notifications 
                    WHERE id = ANY(p_item_ids) AND user_id = p_user_id;
            END CASE;
            
        WHEN 'staff' THEN
            CASE p_item_type
                WHEN 'appointment', 'clinic_appointment' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM appointments 
                    WHERE id = ANY(p_item_ids) AND clinic_id = p_clinic_id;
                WHEN 'feedback', 'clinic_feedback' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM feedback 
                    WHERE id = ANY(p_item_ids) AND clinic_id = p_clinic_id;
            END CASE;
            
        WHEN 'admin' THEN
            -- Admin can archive anything - return all items
            valid_items := p_item_ids;
    END CASE;
    
    RETURN valid_items;
END;
$$;


ALTER FUNCTION "public"."validate_batch_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_feedback_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    user_email VARCHAR(255);
    daily_count INTEGER;
BEGIN
    
    -- Get user email
    SELECT email INTO user_email 
    FROM users WHERE id = NEW.patient_id;
    
    -- ✅ SECURITY FIX: Use direct count instead of rate_limits table to avoid deadlocks
    SELECT COUNT(*) INTO daily_count
    FROM feedback f
    JOIN users u ON f.patient_id = u.id
    WHERE u.email = user_email
    AND f.created_at >= CURRENT_DATE
    AND f.created_at < CURRENT_DATE + INTERVAL '1 day';
    
    IF daily_count >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Maximum 3 feedbacks per day.';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_feedback_submission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_partnership_request"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $_$
DECLARE
    daily_count INTEGER;
BEGIN
    
    -- ✅ SECURITY FIX: Use direct count instead of rate_limits to avoid deadlocks
    SELECT COUNT(*) INTO daily_count
    FROM clinic_partnership_requests
    WHERE email = NEW.email
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
    
    IF daily_count >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
    END IF;
    
    -- Basic validation
    IF LENGTH(NEW.clinic_name) < 3 OR LENGTH(NEW.clinic_name) > 200 THEN
        RAISE EXCEPTION 'Clinic name must be between 3 and 200 characters';
    END IF;
    
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Validate staff email
    IF NEW.staff_email IS NOT NULL AND NEW.staff_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid staff email format';
    END IF;
    
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."validate_partnership_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_otp"("p_identifier" character varying, "p_otp_code" character varying, "p_purpose" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'extensions'
    AS $$
DECLARE
    otp_record RECORD;
    auth_user_id UUID;
BEGIN
    
    -- Input validation
    IF p_identifier IS NULL OR p_identifier = '' THEN
        RAISE EXCEPTION 'Identifier cannot be empty';
    END IF;
    
    IF p_otp_code IS NULL OR p_otp_code = '' OR LENGTH(p_otp_code) != 6 THEN
        RAISE EXCEPTION 'Invalid OTP code format';
    END IF;
    
    IF p_purpose IS NULL OR p_purpose = '' THEN
        RAISE EXCEPTION 'Purpose cannot be empty';
    END IF;
    
    -- Rate limiting for OTP attempts
    IF NOT check_rate_limit(p_identifier, 'otp_verification', 5, 15) THEN
        RETURN false;
    END IF;
    
    -- Find and verify OTP
    SELECT * INTO otp_record
    FROM otp_verifications
    WHERE identifier = p_identifier
    AND otp_code = p_otp_code
    AND purpose = p_purpose
    AND expires_at > NOW()
    AND is_verified = false
    AND attempts < 3;
    
    IF NOT FOUND THEN
        -- Increment attempts for existing OTP
        UPDATE otp_verifications 
        SET attempts = attempts + 1
        WHERE identifier = p_identifier 
        AND purpose = p_purpose 
        AND expires_at > NOW();
        
        RETURN false;
    END IF;
    
    -- Mark as verified
    UPDATE otp_verifications 
    SET is_verified = true, verified_at = NOW()
    WHERE id = otp_record.id;
    
    -- Handle specific verification purposes
    IF p_purpose = 'phone_verification' THEN
        -- Get auth user ID
        SELECT auth_user_id INTO auth_user_id
        FROM users 
        WHERE phone = p_identifier;
        
        IF auth_user_id IS NOT NULL THEN
            UPDATE auth.users 
            SET 
                phone_confirmed_at = NOW(),
                updated_at = NOW()
            WHERE id = auth_user_id;
            
            RAISE LOG 'Phone verification completed for %', p_identifier;
        END IF;
    END IF;
    
    RETURN true;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in verify_otp: %', SQLERRM;
        RETURN false;
END;
$$;


ALTER FUNCTION "public"."verify_otp"("p_identifier" character varying, "p_otp_code" character varying, "p_purpose" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_phone_with_metadata"("p_user_auth_id" "uuid", "p_phone" character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    current_metadata JSONB;
    updated_metadata JSONB;
BEGIN
    -- Get current metadata
    SELECT raw_user_meta_data INTO current_metadata
    FROM auth.users 
    WHERE id = p_user_auth_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Update metadata with phone verification
    updated_metadata := COALESCE(current_metadata, '{}'::jsonb) || jsonb_build_object(
        'phone_verified', true,
        'phone_verified_at', NOW()::text,
        'phone_manual_verified', true
    );
    
    -- Update auth.users with phone confirmation and metadata
    UPDATE auth.users 
    SET 
        phone = COALESCE(phone, p_phone),
        phone_confirmed_at = NOW(),
        raw_user_meta_data = updated_metadata,
        updated_at = NOW()
    WHERE id = p_user_auth_id;
    
    -- This will trigger handle_phone_verification which updates public.users
    
    RETURN jsonb_build_object(
        'success', true,
        'phone_verified', true,
        'verified_at', NOW()
    );
END;
$$;


ALTER FUNCTION "public"."verify_phone_with_metadata"("p_user_auth_id" "uuid", "p_phone" character varying) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_profile_id" "uuid" NOT NULL,
    "access_level" integer DEFAULT 1,
    "login_attempts" integer DEFAULT 0,
    "permissions" "jsonb" DEFAULT '{"manage_users": true, "ui_management": true, "system_analytics": true, "partnership_management": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_type" character varying(100) NOT NULL,
    "user_id" "uuid",
    "clinic_id" "uuid",
    "metadata" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL
);


ALTER TABLE "public"."appointment_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "uuid",
    "clinic_id" "uuid" NOT NULL,
    "appointment_date" "date" NOT NULL,
    "appointment_time" time without time zone NOT NULL,
    "duration_minutes" integer,
    "status" "public"."appointment_status" DEFAULT 'pending'::"public"."appointment_status",
    "symptoms" "text",
    "notes" "text",
    "cancellation_reason" "text",
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "reminder_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."archive_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "archived_by_user_id" "uuid" NOT NULL,
    "archived_by_role" "public"."user_type" NOT NULL,
    "item_type" "text" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "scope_type" "text" DEFAULT 'personal'::"text" NOT NULL,
    "scope_id" "uuid",
    "is_archived" boolean DEFAULT true,
    "is_hidden" boolean DEFAULT false,
    "archived_at" timestamp with time zone DEFAULT "now"(),
    "hidden_at" timestamp with time zone,
    "archive_reason" "text" DEFAULT 'manual'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "archive_items_archive_reason_check" CHECK (("archive_reason" = ANY (ARRAY['manual'::"text", 'auto'::"text", 'policy'::"text", 'cascade'::"text"]))),
    CONSTRAINT "valid_item_type" CHECK (("item_type" = ANY (ARRAY['appointment'::"text", 'feedback'::"text", 'notification'::"text", 'clinic_appointment'::"text", 'clinic_feedback'::"text", 'staff_notification'::"text", 'patient_communication'::"text", 'user_account'::"text", 'clinic_account'::"text", 'system_notification'::"text", 'analytics_data'::"text", 'partnership_request'::"text"]))),
    CONSTRAINT "valid_scope_type" CHECK (("scope_type" = ANY (ARRAY['personal'::"text", 'clinic'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."archive_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_badge_awards" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "awarded_by" "uuid",
    "award_date" "date" DEFAULT CURRENT_DATE,
    "is_current" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clinic_badge_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_badges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "badge_name" character varying(100) NOT NULL,
    "badge_description" "text",
    "badge_icon_url" "text",
    "criteria" "jsonb",
    "badge_color" character varying(7),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clinic_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_partnership_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "clinic_name" character varying NOT NULL,
    "email" character varying NOT NULL,
    "address" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "public"."partnership_status" DEFAULT 'pending'::"public"."partnership_status",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clinic_partnership_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "address" "text" NOT NULL,
    "city" character varying(100) NOT NULL,
    "province" character varying(100),
    "zip_code" character varying(20),
    "country" character varying(100) DEFAULT 'Philippines'::character varying NOT NULL,
    "location" "extensions"."geography"(Point,4326) NOT NULL,
    "phone" character varying(20),
    "email" character varying(255) NOT NULL,
    "website_url" "text",
    "operating_hours" "jsonb",
    "services_offered" "jsonb",
    "appointment_limit_per_patient" integer DEFAULT 5,
    "cancellation_policy_hours" integer DEFAULT 48,
    "is_active" boolean DEFAULT true,
    "rating" numeric(3,2) DEFAULT 0.00,
    "total_reviews" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text"
);


ALTER TABLE "public"."clinics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctor_clinics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "schedule" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."doctor_clinics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "license_number" character varying(100) NOT NULL,
    "specialization" character varying(200) NOT NULL,
    "education" "text",
    "experience_years" integer,
    "bio" "text",
    "consultation_fee" numeric(10,2),
    "profile_image_url" "text",
    "languages_spoken" "text"[],
    "certifications" "jsonb",
    "awards" "text"[],
    "is_available" boolean DEFAULT true,
    "rating" numeric(3,2) DEFAULT 0.00,
    "total_reviews" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" character varying(100) DEFAULT ''::character varying NOT NULL,
    "last_name" character varying(100) DEFAULT ''::character varying NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."doctors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_communications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "subject" character varying(300) NOT NULL,
    "message_body" "text" NOT NULL,
    "email_type" character varying(50),
    "is_read" boolean DEFAULT false,
    "replied_to" "uuid",
    "attachments" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_communications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid",
    "clinic_id" "uuid" NOT NULL,
    "doctor_id" "uuid",
    "appointment_id" "uuid",
    "feedback_type" "public"."feedback_type" NOT NULL,
    "rating" integer,
    "comment" "text",
    "is_anonymous" boolean DEFAULT false,
    "is_public" boolean DEFAULT false,
    "response" "text",
    "responded_by" "uuid",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."file_uploads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "file_name" character varying(500) NOT NULL,
    "file_type" character varying(100) NOT NULL,
    "file_size" bigint NOT NULL,
    "storage_path" "text" NOT NULL,
    "bucket_name" character varying(100) NOT NULL,
    "content_type" character varying(100) NOT NULL,
    "upload_purpose" character varying(100) NOT NULL,
    "related_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."file_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_name" character varying(100) NOT NULL,
    "template_type" character varying(50) NOT NULL,
    "subject" character varying(300),
    "body_template" "text" NOT NULL,
    "variables" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "public"."notification_type" NOT NULL,
    "title" character varying(200) NOT NULL,
    "message" "text" NOT NULL,
    "related_appointment_id" "uuid",
    "is_read" boolean DEFAULT false,
    "sent_via" character varying[],
    "scheduled_for" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_verifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "identifier" character varying(255) NOT NULL,
    "identifier_type" character varying(10) NOT NULL,
    "otp_code" character varying(6) NOT NULL,
    "purpose" character varying(50) NOT NULL,
    "attempts" integer DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "expires_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "otp_verifications_identifier_type_check" CHECK ((("identifier_type")::"text" = ANY ((ARRAY['email'::character varying, 'phone'::character varying])::"text"[])))
);


ALTER TABLE "public"."otp_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_appointment_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "current_count" integer DEFAULT 0,
    "limit_count" integer NOT NULL,
    "reset_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patient_appointment_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_medical_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "conditions" "text"[],
    "allergies" "text"[],
    "medications" "text"[],
    "treatment_notes" "text",
    "follow_up_required" boolean DEFAULT false,
    "follow_up_date" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patient_medical_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_profile_id" "uuid" NOT NULL,
    "preferred_location" "extensions"."geography"(Point,4326),
    "preferred_doctors" "uuid"[],
    "emergency_contact_name" character varying(200),
    "emergency_contact_phone" character varying(20),
    "insurance_provider" character varying(200),
    "medical_conditions" "text"[],
    "allergies" "text"[],
    "email_notifications" boolean DEFAULT true,
    "sms_notifications" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patient_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_identifier" character varying(255) NOT NULL,
    "action_type" character varying(100) NOT NULL,
    "attempt_count" integer DEFAULT 1,
    "first_attempt" timestamp with time zone DEFAULT "now"(),
    "last_attempt" timestamp with time zone DEFAULT "now"(),
    "blocked_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "category" character varying(100),
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "min_price" numeric(10,2),
    "max_price" numeric(10,2),
    CONSTRAINT "services_duration_check" CHECK ((("duration_minutes" > 0) AND ("duration_minutes" <= 480)))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "position" character varying(100) NOT NULL,
    "department" character varying(100),
    "temp_password" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."staff_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_profile_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "employee_id" character varying(50),
    "position" character varying(100) NOT NULL,
    "hire_date" "date" NOT NULL,
    "department" character varying(100),
    "permissions" "jsonb" DEFAULT '{"manage_doctors": false, "view_analytics": true, "manage_appointments": true}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."staff_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ui_components" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "component_name" character varying(100) NOT NULL,
    "component_type" character varying(50) NOT NULL,
    "title" character varying(200),
    "content" "text",
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "metadata" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ui_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_archive_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_type" "public"."user_type" NOT NULL,
    "auto_archive_days" integer DEFAULT 365,
    "data_retention_consent" boolean DEFAULT true,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_auto_archive_days" CHECK (("auto_archive_days" > 0))
);


ALTER TABLE "public"."user_archive_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_type" "public"."user_type" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "date_of_birth" "date",
    "gender" character varying(10),
    "profile_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20),
    "is_active" boolean DEFAULT true,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "phone_verified" boolean DEFAULT false,
    "email_verified" boolean DEFAULT false
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_user_profile_id_key" UNIQUE ("user_profile_id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_appointment_id_service_id_key" UNIQUE ("appointment_id", "service_id");



ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."archive_items"
    ADD CONSTRAINT "archive_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_badge_awards"
    ADD CONSTRAINT "clinic_badge_awards_clinic_id_badge_id_award_date_key" UNIQUE ("clinic_id", "badge_id", "award_date");



ALTER TABLE ONLY "public"."clinic_badge_awards"
    ADD CONSTRAINT "clinic_badge_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_badges"
    ADD CONSTRAINT "clinic_badges_badge_name_key" UNIQUE ("badge_name");



ALTER TABLE ONLY "public"."clinic_badges"
    ADD CONSTRAINT "clinic_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_partnership_requests"
    ADD CONSTRAINT "clinic_partnership_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctor_clinics"
    ADD CONSTRAINT "doctor_clinics_doctor_id_clinic_id_key" UNIQUE ("doctor_id", "clinic_id");



ALTER TABLE ONLY "public"."doctor_clinics"
    ADD CONSTRAINT "doctor_clinics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_license_number_key" UNIQUE ("license_number");



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_communications"
    ADD CONSTRAINT "email_communications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_uploads"
    ADD CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_template_name_key" UNIQUE ("template_name");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_verifications"
    ADD CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_appointment_limits"
    ADD CONSTRAINT "patient_appointment_limits_patient_id_clinic_id_key" UNIQUE ("patient_id", "clinic_id");



ALTER TABLE ONLY "public"."patient_appointment_limits"
    ADD CONSTRAINT "patient_appointment_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_user_id_key" UNIQUE ("user_profile_id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_user_identifier_action_type_key" UNIQUE ("user_identifier", "action_type");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_clinic_id_name_key" UNIQUE ("clinic_id", "name");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_invitations"
    ADD CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_user_id_key" UNIQUE ("user_profile_id");



ALTER TABLE ONLY "public"."ui_components"
    ADD CONSTRAINT "ui_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."archive_items"
    ADD CONSTRAINT "unique_user_archive_item" UNIQUE ("archived_by_user_id", "item_type", "item_id");



ALTER TABLE ONLY "public"."user_archive_preferences"
    ADD CONSTRAINT "unique_user_archive_prefs" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_archive_preferences"
    ADD CONSTRAINT "user_archive_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_analytics_events_clinic_id" ON "public"."analytics_events" USING "btree" ("clinic_id");



CREATE INDEX "idx_analytics_events_clinic_type_created" ON "public"."analytics_events" USING "btree" ("clinic_id", "event_type", "created_at") WHERE ("clinic_id" IS NOT NULL);



CREATE INDEX "idx_analytics_events_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_events_user_type_created" ON "public"."analytics_events" USING "btree" ("user_id", "event_type", "created_at") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_appointment_services_appointment_id" ON "public"."appointment_services" USING "btree" ("appointment_id");



CREATE INDEX "idx_appointment_services_appointment_lookup" ON "public"."appointment_services" USING "btree" ("appointment_id") INCLUDE ("service_id");



CREATE INDEX "idx_appointment_services_service_id" ON "public"."appointment_services" USING "btree" ("service_id");



CREATE INDEX "idx_appointments_cancelled_by" ON "public"."appointments" USING "btree" ("cancelled_by");



CREATE INDEX "idx_appointments_clinic_date_status" ON "public"."appointments" USING "btree" ("clinic_id", "appointment_date", "status");



CREATE INDEX "idx_appointments_clinic_id" ON "public"."appointments" USING "btree" ("clinic_id");



CREATE INDEX "idx_appointments_comprehensive_lookup" ON "public"."appointments" USING "btree" ("patient_id", "status", "appointment_date" DESC, "appointment_time" DESC) WHERE ("status" <> 'cancelled'::"public"."appointment_status");



CREATE INDEX "idx_appointments_created_clinic_status" ON "public"."appointments" USING "btree" ("created_at", "clinic_id", "status");



CREATE INDEX "idx_appointments_created_status" ON "public"."appointments" USING "btree" ("created_at" DESC, "status") WHERE ("status" <> 'cancelled'::"public"."appointment_status");



CREATE INDEX "idx_appointments_doctor_date_time" ON "public"."appointments" USING "btree" ("doctor_id", "appointment_date", "appointment_time");



CREATE INDEX "idx_appointments_doctor_status" ON "public"."appointments" USING "btree" ("doctor_id", "status") WHERE (("doctor_id" IS NOT NULL) AND ("status" IS NOT NULL));



CREATE INDEX "idx_appointments_patient_clinic_rls" ON "public"."appointments" USING "btree" ("patient_id", "clinic_id") WHERE (("patient_id" IS NOT NULL) AND ("clinic_id" IS NOT NULL));



CREATE INDEX "idx_appointments_patient_date_desc" ON "public"."appointments" USING "btree" ("patient_id", "appointment_date" DESC);



CREATE INDEX "idx_appointments_patient_date_status" ON "public"."appointments" USING "btree" ("patient_id", "appointment_date", "status");



CREATE INDEX "idx_appointments_patient_history" ON "public"."appointments" USING "btree" ("patient_id", "appointment_date" DESC, "status");



CREATE INDEX "idx_appointments_patient_id" ON "public"."appointments" USING "btree" ("patient_id");



CREATE INDEX "idx_appointments_patient_stats" ON "public"."appointments" USING "btree" ("patient_id", "status", "appointment_date") INCLUDE ("id") WHERE ("status" IS NOT NULL);



CREATE INDEX "idx_appointments_patient_status_date" ON "public"."appointments" USING "btree" ("patient_id", "status", "appointment_date") WHERE ("status" IS NOT NULL);



CREATE INDEX "idx_appointments_realtime_staff" ON "public"."appointments" USING "btree" ("clinic_id", "status", "created_at" DESC) WHERE ("status" = ANY (ARRAY['pending'::"public"."appointment_status", 'confirmed'::"public"."appointment_status"]));



CREATE INDEX "idx_appointments_staff_management" ON "public"."appointments" USING "btree" ("clinic_id", "status", "appointment_date", "appointment_time") WHERE ("status" = ANY (ARRAY['pending'::"public"."appointment_status", 'confirmed'::"public"."appointment_status"]));



CREATE INDEX "idx_appointments_with_services" ON "public"."appointments" USING "btree" ("patient_id", "appointment_date" DESC) INCLUDE ("id", "clinic_id", "doctor_id", "status", "appointment_time", "duration_minutes");



CREATE INDEX "idx_archive_items_by_date" ON "public"."archive_items" USING "btree" ("archived_at");



CREATE INDEX "idx_archive_items_lookup" ON "public"."archive_items" USING "btree" ("archived_by_user_id", "item_type", "item_id");



CREATE INDEX "idx_archive_items_role_scope" ON "public"."archive_items" USING "btree" ("archived_by_role", "scope_type", "scope_id");



CREATE INDEX "idx_archive_items_scope" ON "public"."archive_items" USING "btree" ("scope_type", "scope_id");



CREATE INDEX "idx_archive_items_user_type" ON "public"."archive_items" USING "btree" ("archived_by_user_id", "item_type");



CREATE INDEX "idx_archive_items_visible" ON "public"."archive_items" USING "btree" ("archived_by_user_id", "item_type") WHERE (("is_archived" = true) AND ("is_hidden" = false));



CREATE INDEX "idx_clinic_badge_awards_awarded_by" ON "public"."clinic_badge_awards" USING "btree" ("awarded_by");



CREATE INDEX "idx_clinic_badge_awards_badge_id" ON "public"."clinic_badge_awards" USING "btree" ("badge_id");



CREATE INDEX "idx_clinics_location" ON "public"."clinics" USING "gist" ("location");



CREATE INDEX "idx_clinics_location_active" ON "public"."clinics" USING "gist" ("location") WHERE ("is_active" = true);



CREATE INDEX "idx_clinics_search_optimized" ON "public"."clinics" USING "btree" ("is_active", "rating" DESC, "total_reviews" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_doctor_clinics_clinic_active" ON "public"."doctor_clinics" USING "btree" ("clinic_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_doctor_clinics_clinic_id" ON "public"."doctor_clinics" USING "btree" ("clinic_id");



CREATE INDEX "idx_doctors_available_rating" ON "public"."doctors" USING "btree" ("is_available", "rating" DESC) WHERE ("is_available" = true);



CREATE INDEX "idx_doctors_clinic_search" ON "public"."doctors" USING "btree" ("is_available", "specialization", "rating" DESC) WHERE ("is_available" = true);



CREATE INDEX "idx_doctors_specialization_available" ON "public"."doctors" USING "btree" ("specialization", "is_available") WHERE ("is_available" = true);



CREATE INDEX "idx_doctors_user_id" ON "public"."doctors" USING "btree" ("user_id");



CREATE INDEX "idx_email_communications_appointment_id" ON "public"."email_communications" USING "btree" ("appointment_id");



CREATE INDEX "idx_email_communications_from_user_created" ON "public"."email_communications" USING "btree" ("from_user_id", "created_at" DESC) WHERE ("from_user_id" IS NOT NULL);



CREATE INDEX "idx_email_communications_to_user_id" ON "public"."email_communications" USING "btree" ("to_user_id");



CREATE INDEX "idx_email_communications_to_user_read" ON "public"."email_communications" USING "btree" ("to_user_id", "is_read", "created_at" DESC) WHERE ("to_user_id" IS NOT NULL);



CREATE INDEX "idx_email_communications_users" ON "public"."email_communications" USING "btree" ("from_user_id", "to_user_id");



CREATE INDEX "idx_feedback_appointment_id" ON "public"."feedback" USING "btree" ("appointment_id");



CREATE INDEX "idx_feedback_clinic_created_rating" ON "public"."feedback" USING "btree" ("clinic_id", "created_at" DESC) WHERE ("rating" IS NOT NULL);



CREATE INDEX "idx_feedback_clinic_id" ON "public"."feedback" USING "btree" ("clinic_id");



CREATE INDEX "idx_feedback_clinic_rating_public" ON "public"."feedback" USING "btree" ("clinic_id", "rating", "is_public", "created_at" DESC) WHERE ("rating" IS NOT NULL);



CREATE INDEX "idx_feedback_comprehensive" ON "public"."feedback" USING "btree" ("clinic_id", "patient_id", "created_at" DESC, "rating") WHERE ("rating" IS NOT NULL);



CREATE INDEX "idx_feedback_patient_created" ON "public"."feedback" USING "btree" ("patient_id", "created_at" DESC) WHERE ("patient_id" IS NOT NULL);



CREATE INDEX "idx_feedback_patient_id" ON "public"."feedback" USING "btree" ("patient_id");



CREATE INDEX "idx_feedback_public" ON "public"."feedback" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_feedback_responded_by" ON "public"."feedback" USING "btree" ("responded_by");



CREATE INDEX "idx_file_uploads_user_id" ON "public"."file_uploads" USING "btree" ("user_id");



CREATE INDEX "idx_medical_history_patient_id" ON "public"."patient_medical_history" USING "btree" ("patient_id");



CREATE INDEX "idx_notifications_related_appointment_id" ON "public"."notifications" USING "btree" ("related_appointment_id");



CREATE INDEX "idx_notifications_scheduled" ON "public"."notifications" USING "btree" ("scheduled_for") WHERE ("sent_at" IS NULL);



CREATE INDEX "idx_notifications_scheduled_unread" ON "public"."notifications" USING "btree" ("scheduled_for", "is_read") WHERE (("scheduled_for" IS NOT NULL) AND ("is_read" = false));



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read_created" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC) WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_otp_active_lookup" ON "public"."otp_verifications" USING "btree" ("identifier", "purpose", "expires_at", "is_verified");



CREATE INDEX "idx_otp_expires_at" ON "public"."otp_verifications" USING "btree" ("expires_at");



CREATE INDEX "idx_otp_identifier_purpose" ON "public"."otp_verifications" USING "btree" ("identifier", "purpose");



CREATE INDEX "idx_patient_appointment_limits_clinic_id" ON "public"."patient_appointment_limits" USING "btree" ("clinic_id");



CREATE INDEX "idx_patient_medical_history_appointment_id" ON "public"."patient_medical_history" USING "btree" ("appointment_id");



CREATE INDEX "idx_patient_medical_history_created_by" ON "public"."patient_medical_history" USING "btree" ("created_by");



CREATE INDEX "idx_patient_preferred_location" ON "public"."patient_profiles" USING "gist" ("preferred_location");



CREATE INDEX "idx_patient_profiles_complete" ON "public"."patient_profiles" USING "btree" ("user_profile_id") INCLUDE ("preferred_location", "emergency_contact_name", "emergency_contact_phone", "medical_conditions", "allergies");



CREATE INDEX "idx_patient_profiles_lookup" ON "public"."patient_profiles" USING "btree" ("user_profile_id") INCLUDE ("emergency_contact_name", "emergency_contact_phone", "medical_conditions", "allergies", "email_notifications", "sms_notifications");



CREATE INDEX "idx_patient_profiles_user_id" ON "public"."patient_profiles" USING "btree" ("user_profile_id");



CREATE INDEX "idx_patient_profiles_user_lookup" ON "public"."patient_profiles" USING "btree" ("user_profile_id", "email_notifications", "sms_notifications");



CREATE INDEX "idx_rate_limits_cleanup" ON "public"."rate_limits" USING "btree" ("last_attempt", "blocked_until");



CREATE INDEX "idx_services_active_price_range" ON "public"."services" USING "btree" ("is_active", "min_price", "max_price") WHERE ("is_active" = true);



CREATE INDEX "idx_services_clinic_active_name" ON "public"."services" USING "btree" ("clinic_id", "is_active", "name") WHERE ("is_active" = true);



CREATE INDEX "idx_services_clinic_search" ON "public"."services" USING "btree" ("clinic_id", "is_active", "category", "name") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_context_lookup" ON "public"."staff_profiles" USING "btree" ("user_profile_id") INCLUDE ("clinic_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_invitations_clinic_id" ON "public"."staff_invitations" USING "btree" ("clinic_id");



CREATE INDEX "idx_staff_profiles_auth_user" ON "public"."staff_profiles" USING "btree" ("user_profile_id") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_profiles_clinic_active_position" ON "public"."staff_profiles" USING "btree" ("clinic_id", "is_active", "position") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_profiles_clinic_id" ON "public"."staff_profiles" USING "btree" ("clinic_id");



CREATE INDEX "idx_staff_profiles_clinic_user" ON "public"."staff_profiles" USING "btree" ("clinic_id", "user_profile_id") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_profiles_context_lookup" ON "public"."staff_profiles" USING "btree" ("user_profile_id", "clinic_id") INCLUDE ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_profiles_user_lookup" ON "public"."staff_profiles" USING "btree" ("user_profile_id", "is_active", "clinic_id") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_profiles_user_profile_clinic" ON "public"."staff_profiles" USING "btree" ("user_profile_id", "clinic_id") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_profiles_user_profile_id" ON "public"."staff_profiles" USING "btree" ("user_profile_id");



CREATE INDEX "idx_ui_components_created_by" ON "public"."ui_components" USING "btree" ("created_by");



CREATE INDEX "idx_user_archive_prefs_type" ON "public"."user_archive_preferences" USING "btree" ("user_type");



CREATE INDEX "idx_user_archive_prefs_user" ON "public"."user_archive_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_context_complete" ON "public"."users" USING "btree" ("auth_user_id") INCLUDE ("id", "email", "phone", "is_active", "email_verified", "phone_verified");



CREATE INDEX "idx_user_context_optimized" ON "public"."users" USING "btree" ("auth_user_id", "is_active") INCLUDE ("id", "email", "phone", "email_verified", "phone_verified") WHERE ("is_active" = true);



CREATE INDEX "idx_user_profiles_role_lookup" ON "public"."user_profiles" USING "btree" ("user_id", "user_type");



CREATE INDEX "idx_user_profiles_user_id_type" ON "public"."user_profiles" USING "btree" ("user_id", "user_type") WHERE ("user_type" IS NOT NULL);



CREATE INDEX "idx_user_profiles_verification" ON "public"."user_profiles" USING "btree" ("user_id", "user_type") INCLUDE ("first_name", "last_name");



CREATE INDEX "idx_users_auth_email_lookup" ON "public"."users" USING "btree" ("auth_user_id", "email", "is_active");



CREATE INDEX "idx_users_auth_lookup_optimized" ON "public"."users" USING "btree" ("auth_user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_users_auth_user_id" ON "public"."users" USING "btree" ("auth_user_id");



CREATE INDEX "idx_users_auth_user_id_active" ON "public"."users" USING "btree" ("auth_user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_users_context_optimized" ON "public"."users" USING "btree" ("auth_user_id", "is_active") INCLUDE ("id", "email", "phone", "email_verified", "phone_verified", "last_login") WHERE ("is_active" = true);



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE UNIQUE INDEX "uniq_current_badge_per_clinic" ON "public"."clinic_badge_awards" USING "btree" ("clinic_id", "badge_id") WHERE ("is_current" = true);



CREATE OR REPLACE TRIGGER "appointment_limits_trigger" AFTER INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."manage_appointment_limits"();



CREATE OR REPLACE TRIGGER "appointment_status_validation_trigger" BEFORE UPDATE OF "status" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_appointment_status_change"();



CREATE OR REPLACE TRIGGER "clinic_rating_trigger" AFTER INSERT OR UPDATE ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_clinic_rating"();



CREATE OR REPLACE TRIGGER "feedback_core_field_protect" BEFORE UPDATE ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_feedback_core_field_update"();



CREATE OR REPLACE TRIGGER "feedback_rate_limit_trigger" BEFORE INSERT ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."validate_feedback_submission"();



CREATE OR REPLACE TRIGGER "notification_update_restriction" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."restrict_notification_updates"();



CREATE OR REPLACE TRIGGER "protect_email_fields_trigger" BEFORE UPDATE ON "public"."email_communications" FOR EACH ROW EXECUTE FUNCTION "public"."protect_email_communications_fields"();



CREATE OR REPLACE TRIGGER "protect_file_upload_updates_trigger" BEFORE UPDATE ON "public"."file_uploads" FOR EACH ROW EXECUTE FUNCTION "public"."protect_file_upload_updates"();



CREATE OR REPLACE TRIGGER "trg_patient_profile_update_constraints" BEFORE UPDATE ON "public"."patient_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_patient_profile_update_constraints"();



CREATE OR REPLACE TRIGGER "trg_staff_profile_update_constraints" BEFORE UPDATE ON "public"."staff_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_staff_profile_update_constraints"();



CREATE OR REPLACE TRIGGER "update_admin_profiles_updated_at" BEFORE UPDATE ON "public"."admin_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_appointment_limits_updated_at" BEFORE UPDATE ON "public"."patient_appointment_limits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinics_updated_at" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_doctors_updated_at" BEFORE UPDATE ON "public"."doctors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_history_updated_at" BEFORE UPDATE ON "public"."patient_medical_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_patient_profiles_updated_at" BEFORE UPDATE ON "public"."patient_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_staff_profiles_updated_at" BEFORE UPDATE ON "public"."staff_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ui_components_updated_at" BEFORE UPDATE ON "public"."ui_components" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_services"
    ADD CONSTRAINT "appointment_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."archive_items"
    ADD CONSTRAINT "archive_items_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_badge_awards"
    ADD CONSTRAINT "clinic_badge_awards_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clinic_badge_awards"
    ADD CONSTRAINT "clinic_badge_awards_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."clinic_badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_badge_awards"
    ADD CONSTRAINT "clinic_badge_awards_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_partnership_requests"
    ADD CONSTRAINT "clinic_partnership_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."doctor_clinics"
    ADD CONSTRAINT "doctor_clinics_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_clinics"
    ADD CONSTRAINT "doctor_clinics_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors"
    ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_communications"
    ADD CONSTRAINT "email_communications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_communications"
    ADD CONSTRAINT "email_communications_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_communications"
    ADD CONSTRAINT "email_communications_replied_to_fkey" FOREIGN KEY ("replied_to") REFERENCES "public"."email_communications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_communications"
    ADD CONSTRAINT "email_communications_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."file_uploads"
    ADD CONSTRAINT "file_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_appointment_id_fkey" FOREIGN KEY ("related_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_appointment_limits"
    ADD CONSTRAINT "patient_appointment_limits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_appointment_limits"
    ADD CONSTRAINT "patient_appointment_limits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient_medical_history"
    ADD CONSTRAINT "patient_medical_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_invitations"
    ADD CONSTRAINT "staff_invitations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."ui_components"
    ADD CONSTRAINT "ui_components_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_archive_preferences"
    ADD CONSTRAINT "user_archive_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active clinics and admin can see all " ON "public"."clinics" FOR SELECT TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    ELSE ("is_active" = true)
END);



CREATE POLICY "Admin badge delete" ON "public"."clinic_badges" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Admin badge management" ON "public"."clinic_badges" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Admin badges updates" ON "public"."clinic_badges" FOR UPDATE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type")) WITH CHECK (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Admin can create clinics" ON "public"."clinics" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Admin can delete clinics" ON "public"."clinics" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Admins can manage UI components" ON "public"."ui_components" TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Admins can manage rate limits" ON "public"."rate_limits" USING ((( SELECT "up"."user_type"
   FROM ("public"."users" "u"
     JOIN "public"."user_profiles" "up" ON (("u"."id" = "up"."user_id")))
  WHERE ("u"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))) = 'admin'::"public"."user_type"));



CREATE POLICY "Admins can view own profile" ON "public"."admin_profiles" FOR SELECT USING (("user_profile_id" = "public"."get_current_user_id"()));



CREATE POLICY "Anyone can view available doctor" ON "public"."doctors" FOR SELECT TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("is_available" = true) OR ("id" IN ( SELECT "doctor_clinics"."doctor_id"
       FROM "public"."doctor_clinics"
      WHERE ("doctor_clinics"."clinic_id" = "public"."get_current_staff_clinic_id"()))))
    ELSE ("is_available" = true)
END);



CREATE POLICY "Appointment creation access" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_current_user_role"() = 'patient'::"public"."user_type") AND ("patient_id" = "public"."get_current_user_id"()) AND ("status" = 'pending'::"public"."appointment_status")));



CREATE POLICY "Appointment deletion access" ON "public"."appointments" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Appointment services access policy" ON "public"."appointment_services" TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("appointment_id" IN ( SELECT "appointments"."id"
       FROM "public"."appointments"
      WHERE ("appointments"."clinic_id" = "public"."get_current_staff_clinic_id"())))
    WHEN 'patient'::"public"."user_type" THEN ("appointment_id" IN ( SELECT "appointments"."id"
       FROM "public"."appointments"
      WHERE ("appointments"."patient_id" = "public"."get_current_user_id"())))
    ELSE false
END);



CREATE POLICY "Appointment update access" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN (("patient_id" = "public"."get_current_user_id"()) AND ("status" = ANY (ARRAY['pending'::"public"."appointment_status", 'confirmed'::"public"."appointment_status"])))
    ELSE false
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN (("patient_id" = "public"."get_current_user_id"()) AND ("status" = 'cancelled'::"public"."appointment_status") AND ("cancellation_reason" IS NOT NULL))
    ELSE false
END);



CREATE POLICY "Appointment view access" ON "public"."appointments" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN ("patient_id" = "public"."get_current_user_id"())
    ELSE false
END);



CREATE POLICY "Authenticated users can create profiles" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Badge award creation access" ON "public"."clinic_badge_awards" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_current_user_role"() = 'admin'::"public"."user_type") AND ("awarded_by" = "public"."get_current_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."clinics" "c"
  WHERE (("c"."id" = "clinic_badge_awards"."clinic_id") AND ("c"."is_active" = true)))) AND (("is_current" = false) OR (NOT (EXISTS ( SELECT 1
   FROM (("public"."clinic_badge_awards" "cba"
     JOIN "public"."clinic_badges" "cb" ON (("cba"."badge_id" = "cb"."id")))
     JOIN "public"."clinic_badges" "new_cb" ON (("new_cb"."id" = "clinic_badge_awards"."badge_id")))
  WHERE (("cba"."clinic_id" = "clinic_badge_awards"."clinic_id") AND (("cb"."badge_name")::"text" = ("new_cb"."badge_name")::"text") AND ("cba"."is_current" = true))))))));



CREATE POLICY "Badge award update access" ON "public"."clinic_badge_awards" FOR UPDATE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type")) WITH CHECK ((("public"."get_current_user_role"() = 'admin'::"public"."user_type") AND (("is_current" = false) OR (NOT (EXISTS ( SELECT 1
   FROM (("public"."clinic_badge_awards" "cba"
     JOIN "public"."clinic_badges" "cb" ON (("cba"."badge_id" = "cb"."id")))
     JOIN "public"."clinic_badges" "this_cb" ON (("this_cb"."id" = "clinic_badge_awards"."badge_id")))
  WHERE (("cba"."clinic_id" = "clinic_badge_awards"."clinic_id") AND (("cb"."badge_name")::"text" = ("this_cb"."badge_name")::"text") AND ("cba"."is_current" = true) AND ("cba"."id" <> "clinic_badge_awards"."id"))))))));



CREATE POLICY "Badge award view access" ON "public"."clinic_badge_awards" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN (("is_current" = true) AND (EXISTS ( SELECT 1
       FROM "public"."clinics" "c"
      WHERE (("c"."id" = "clinic_badge_awards"."clinic_id") AND ("c"."is_active" = true)))))
    ELSE false
END);



CREATE POLICY "Communication delete access" ON "public"."email_communications" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Communication update access" ON "public"."email_communications" FOR UPDATE TO "authenticated" USING ((("from_user_id" = "public"."get_current_user_id"()) OR ("to_user_id" = "public"."get_current_user_id"()) OR ("public"."get_current_user_role"() = 'admin'::"public"."user_type"))) WITH CHECK (true);



CREATE POLICY "Consolidated analytics policy" ON "public"."analytics_events" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN ("user_id" = "public"."get_current_user_id"())
    ELSE false
END) WITH CHECK (true);



CREATE POLICY "Consolidated appointment limit policy" ON "public"."patient_appointment_limits" TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN ("patient_id" = "public"."get_current_user_id"())
    ELSE false
END);



CREATE POLICY "Consolidated clinic badge" ON "public"."clinic_badges" FOR SELECT TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    ELSE ("is_active" = true)
END);



CREATE POLICY "Doctor clinic relationship delete" ON "public"."doctor_clinics" FOR DELETE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END);



CREATE POLICY "Doctor clinic relationship insert" ON "public"."doctor_clinics" FOR INSERT TO "authenticated" WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("clinic_id" = "public"."get_current_staff_clinic_id"()) AND (EXISTS ( SELECT 1
       FROM "public"."doctors" "d"
      WHERE (("d"."id" = "doctor_clinics"."doctor_id") AND ("d"."is_available" = true)))))
    ELSE false
END);



CREATE POLICY "Doctor clinic relationship update" ON "public"."doctor_clinics" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END);



CREATE POLICY "Doctor clinic relationship view" ON "public"."doctor_clinics" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("is_active" = true) OR ("clinic_id" = "public"."get_current_staff_clinic_id"()))
    ELSE ("is_active" = true)
END);



CREATE POLICY "Doctors can create by admin and staff" ON "public"."doctors" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"public"."user_type", 'staff'::"public"."user_type"])));



CREATE POLICY "Doctors can delete by admin and staff" ON "public"."doctors" FOR DELETE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("id" IN ( SELECT "doctor_clinics"."doctor_id"
       FROM "public"."doctor_clinics"
      WHERE ("doctor_clinics"."clinic_id" = "public"."get_current_staff_clinic_id"())))
    ELSE false
END);



CREATE POLICY "Doctors can update by staff not admin" ON "public"."doctors" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("id" IN ( SELECT "doctor_clinics"."doctor_id"
       FROM "public"."doctor_clinics"
      WHERE ("doctor_clinics"."clinic_id" = "public"."get_current_staff_clinic_id"())))
    ELSE false
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("id" IN ( SELECT "doctor_clinics"."doctor_id"
       FROM "public"."doctor_clinics"
      WHERE ("doctor_clinics"."clinic_id" = "public"."get_current_staff_clinic_id"())))
    ELSE false
END);



CREATE POLICY "Feedback view access" ON "public"."feedback" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("clinic_id" = "public"."get_current_staff_clinic_id"()) AND
    CASE
        WHEN ("is_anonymous" = true) THEN true
        ELSE true
    END)
    WHEN 'patient'::"public"."user_type" THEN ("patient_id" = "public"."get_current_user_id"())
    ELSE false
END);



CREATE POLICY "File access control for each role" ON "public"."file_uploads" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("related_id" = "public"."get_current_staff_clinic_id"()) AND (("upload_purpose")::"text" = 'clinic_certificate'::"text"))
    ELSE ("user_id" = "public"."get_current_user_id"())
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("related_id" = "public"."get_current_staff_clinic_id"()) AND (("upload_purpose")::"text" = 'clinic_certificate'::"text"))
    ELSE ("user_id" = "public"."get_current_user_id"())
END);



CREATE POLICY "Medical history privacy protected" ON "public"."patient_medical_history" TO "authenticated" USING ((("public"."get_current_user_role"() = 'staff'::"public"."user_type") AND ("patient_id" IN ( SELECT DISTINCT "appointments"."patient_id"
   FROM "public"."appointments"
  WHERE ("appointments"."clinic_id" = "public"."get_current_staff_clinic_id"())))));



CREATE POLICY "Notification creation access" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (("user_id" = "public"."get_current_user_id"()) OR ("public"."get_current_user_role"() = 'admin'::"public"."user_type"))));



CREATE POLICY "Notification template creation access" ON "public"."notification_templates" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_current_user_role"() = 'admin'::"public"."user_type") AND ("template_name" IS NOT NULL) AND ("template_type" IS NOT NULL) AND ("body_template" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "template_name")) > 0) AND ("length"(TRIM(BOTH FROM "body_template")) > 0) AND (("variables" IS NULL) OR ("jsonb_typeof"("variables") = 'object'::"text"))));



CREATE POLICY "Notification template deletion access" ON "public"."notification_templates" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Notification template update access" ON "public"."notification_templates" FOR UPDATE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type")) WITH CHECK ((("public"."get_current_user_role"() = 'admin'::"public"."user_type") AND ("template_name" IS NOT NULL) AND ("template_type" IS NOT NULL) AND ("body_template" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "template_name")) > 0) AND ("length"(TRIM(BOTH FROM "body_template")) > 0) AND (("variables" IS NULL) OR ("jsonb_typeof"("variables") = 'object'::"text"))));



CREATE POLICY "Notification template view access" ON "public"."notification_templates" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    ELSE ("is_active" = true)
END);



CREATE POLICY "Notification update access" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "public"."get_current_user_id"())) WITH CHECK (("user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Notification view access" ON "public"."notifications" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("user_id" = "public"."get_current_user_id"())
    WHEN 'patient'::"public"."user_type" THEN ("user_id" = "public"."get_current_user_id"())
    ELSE false
END);



CREATE POLICY "Only patient can create feedback" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_current_user_role"() = 'patient'::"public"."user_type") AND ("patient_id" = "public"."get_current_user_id"())));



CREATE POLICY "Patient profile creation access" ON "public"."patient_profiles" FOR INSERT TO "authenticated" WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'patient'::"public"."user_type" THEN (EXISTS ( SELECT 1
       FROM "public"."user_profiles" "up"
      WHERE (("up"."id" = "patient_profiles"."user_profile_id") AND ("up"."user_id" = "public"."get_current_user_id"()))))
    ELSE false
END);



CREATE POLICY "Patient profile deletion access" ON "public"."patient_profiles" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Patient profile update access" ON "public"."patient_profiles" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (EXISTS ( SELECT 1
       FROM ("public"."appointments" "a"
         JOIN "public"."user_profiles" "up" ON (("a"."patient_id" = "up"."user_id")))
      WHERE (("up"."id" = "patient_profiles"."user_profile_id") AND ("a"."clinic_id" = "public"."get_current_staff_clinic_id"()))
     LIMIT 1))
    WHEN 'patient'::"public"."user_type" THEN (EXISTS ( SELECT 1
       FROM "public"."user_profiles" "up"
      WHERE (("up"."id" = "patient_profiles"."user_profile_id") AND ("up"."user_id" = "public"."get_current_user_id"()))))
    ELSE false
END) WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"public"."user_type", 'staff'::"public"."user_type", 'patient'::"public"."user_type"])));



CREATE POLICY "Patient profile view access" ON "public"."patient_profiles" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (EXISTS ( SELECT 1
       FROM ("public"."appointments" "a"
         JOIN "public"."user_profiles" "up" ON (("a"."patient_id" = "up"."user_id")))
      WHERE (("up"."id" = "patient_profiles"."user_profile_id") AND ("a"."clinic_id" = "public"."get_current_staff_clinic_id"()))
     LIMIT 1))
    WHEN 'patient'::"public"."user_type" THEN (EXISTS ( SELECT 1
       FROM "public"."user_profiles" "up"
      WHERE (("up"."id" = "patient_profiles"."user_profile_id") AND ("up"."user_id" = "public"."get_current_user_id"()))))
    ELSE false
END);



CREATE POLICY "Profile creation access" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Profile deletion access" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Profile update access" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "public"."get_current_user_id"())) WITH CHECK (("user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Profile view access" ON "public"."user_profiles" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("user_id" = "public"."get_current_user_id"()) OR (("user_type" = 'patient'::"public"."user_type") AND (EXISTS ( SELECT 1
       FROM "public"."appointments" "a"
      WHERE (("a"."patient_id" = "user_profiles"."user_id") AND ("a"."clinic_id" = "public"."get_current_staff_clinic_id"()))
     LIMIT 1))))
    WHEN 'patient'::"public"."user_type" THEN ("user_id" = "public"."get_current_user_id"())
    ELSE false
END);



CREATE POLICY "Role-based user access" ON "public"."users" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
       FROM "public"."appointments" "a"
      WHERE (("a"."patient_id" = "users"."id") AND ("a"."clinic_id" = "public"."get_current_staff_clinic_id"()))
     LIMIT 1)))
    WHEN 'patient'::"public"."user_type" THEN ("auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))
    ELSE false
END);



CREATE POLICY "Service creation access" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END);



CREATE POLICY "Service deletion access" ON "public"."services" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Service update access" ON "public"."services" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END);



CREATE POLICY "Service view access" ON "public"."services" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN (("is_active" = true) AND (EXISTS ( SELECT 1
       FROM "public"."clinics" "c"
      WHERE (("c"."id" = "services"."clinic_id") AND ("c"."is_active" = true)))))
    ELSE false
END);



CREATE POLICY "Staff can response to feedback patient can update it" ON "public"."feedback" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN ("patient_id" = "public"."get_current_user_id"())
    ELSE false
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    WHEN 'patient'::"public"."user_type" THEN ("patient_id" = "public"."get_current_user_id"())
    ELSE false
END);



CREATE POLICY "Staff can update their clinic" ON "public"."clinics" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'staff'::"public"."user_type" THEN ("id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'staff'::"public"."user_type" THEN ("id" = "public"."get_current_staff_clinic_id"())
    ELSE false
END);



CREATE POLICY "Staff invitation creation access" ON "public"."staff_invitations" FOR INSERT TO "authenticated" WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (("clinic_id" = "public"."get_current_staff_clinic_id"()) AND ("email" IS NOT NULL) AND ("position" IS NOT NULL) AND ("temp_password" IS NOT NULL) AND ("expires_at" > "now"()) AND ("status" = 'pending'::"text") AND (("email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))
    ELSE false
END);



CREATE POLICY "Staff invitation deletion access" ON "public"."staff_invitations" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Staff invitation update access" ON "public"."staff_invitations" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE (((( SELECT "auth"."jwt"() AS "jwt") ->> 'email'::"text") = ("email")::"text") AND ("status" = 'pending'::"text") AND ("expires_at" > "now"()))
END);



CREATE POLICY "Staff invitation view access" ON "public"."staff_invitations" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN ("clinic_id" = "public"."get_current_staff_clinic_id"())
    ELSE (((( SELECT "auth"."jwt"() AS "jwt") ->> 'email'::"text") = ("email")::"text") AND ("status" = 'pending'::"text") AND ("expires_at" > "now"()))
END);



CREATE POLICY "Staff profile creation access" ON "public"."staff_profiles" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Staff profile deletion access" ON "public"."staff_profiles" FOR DELETE TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"public"."user_type"));



CREATE POLICY "Staff profile update access" ON "public"."staff_profiles" FOR UPDATE TO "authenticated" USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (EXISTS ( SELECT 1
       FROM "public"."user_profiles" "up"
      WHERE (("up"."id" = "staff_profiles"."user_profile_id") AND ("up"."user_id" = "public"."get_current_user_id"()))))
    ELSE false
END) WITH CHECK (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN true
    ELSE false
END);



CREATE POLICY "Staff profile view access" ON "public"."staff_profiles" FOR SELECT USING (
CASE "public"."get_current_user_role"()
    WHEN 'admin'::"public"."user_type" THEN true
    WHEN 'staff'::"public"."user_type" THEN (EXISTS ( SELECT 1
       FROM "public"."user_profiles" "up"
      WHERE (("up"."id" = "staff_profiles"."user_profile_id") AND ("up"."user_id" = "public"."get_current_user_id"()))))
    ELSE false
END);



CREATE POLICY "System can create OTP" ON "public"."otp_verifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can update OTP" ON "public"."otp_verifications" FOR UPDATE USING (true);



CREATE POLICY "Users can send communications" ON "public"."email_communications" FOR INSERT TO "authenticated" WITH CHECK (("from_user_id" = "public"."get_current_user_id"()));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can verify own OTP" ON "public"."otp_verifications" FOR SELECT USING (true);



CREATE POLICY "Users can view their communications" ON "public"."email_communications" FOR SELECT TO "authenticated" USING ((("from_user_id" = "public"."get_current_user_id"()) OR ("to_user_id" = "public"."get_current_user_id"())));



ALTER TABLE "public"."admin_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointment_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."archive_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "archive_items_role_access" ON "public"."archive_items" TO "authenticated" USING ((("archived_by_user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR (("archived_by_role" = 'staff'::"public"."user_type") AND ("scope_type" = 'clinic'::"text") AND ("scope_id" = ( SELECT "sp"."clinic_id"
   FROM (("public"."users" "u"
     JOIN "public"."user_profiles" "up" ON (("u"."id" = "up"."user_id")))
     JOIN "public"."staff_profiles" "sp" ON (("up"."id" = "sp"."user_profile_id")))
  WHERE (("u"."auth_user_id" = "auth"."uid"()) AND ("up"."user_type" = 'staff'::"public"."user_type"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."users" "u"
     JOIN "public"."user_profiles" "up" ON (("u"."id" = "up"."user_id")))
  WHERE (("u"."auth_user_id" = "auth"."uid"()) AND ("up"."user_type" = 'admin'::"public"."user_type"))))));



ALTER TABLE "public"."clinic_badge_awards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinic_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinic_partnership_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctor_clinics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_communications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."file_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."otp_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_appointment_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_medical_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ui_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_archive_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_archive_prefs_own_access" ON "public"."user_archive_preferences" TO "authenticated" USING (("user_id" = ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."appointments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."clinic_badge_awards";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."clinics";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."email_communications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."feedback";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


















































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."approve_appointment"("p_appointment_id" "uuid", "p_staff_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_appointment"("p_appointment_id" "uuid", "p_staff_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_appointment"("p_appointment_id" "uuid", "p_staff_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."book_appointment"("p_clinic_id" "uuid", "p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_ids" "uuid"[], "p_symptoms" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."book_appointment"("p_clinic_id" "uuid", "p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_ids" "uuid"[], "p_symptoms" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."book_appointment"("p_clinic_id" "uuid", "p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_ids" "uuid"[], "p_symptoms" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_appointment_duration"("p_service_ids" "uuid"[], "p_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_appointment_duration"("p_service_ids" "uuid"[], "p_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_appointment_duration"("p_service_ids" "uuid"[], "p_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_cancel_appointment"("p_appointment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_cancel_appointment"("p_appointment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_cancel_appointment"("p_appointment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_appointment"("p_appointment_id" "uuid", "p_cancellation_reason" "text", "p_cancelled_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_appointment"("p_appointment_id" "uuid", "p_cancellation_reason" "text", "p_cancelled_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_appointment"("p_appointment_id" "uuid", "p_cancellation_reason" "text", "p_cancelled_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_appointment_availability"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration_minutes" integer, "p_exclude_appointment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_appointment_availability"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration_minutes" integer, "p_exclude_appointment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_appointment_availability"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_duration_minutes" integer, "p_exclude_appointment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_appointment_limit"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."check_appointment_limit"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_appointment_limit"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_patient_reliability"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_lookback_months" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_patient_reliability"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_lookback_months" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_patient_reliability"("p_patient_id" "uuid", "p_clinic_id" "uuid", "p_lookback_months" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_user_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_time_window_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_user_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_time_window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_user_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_time_window_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_appointment"("p_appointment_id" "uuid", "p_completion_notes" "text", "p_services_completed" "uuid"[], "p_follow_up_required" boolean, "p_follow_up_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_appointment"("p_appointment_id" "uuid", "p_completion_notes" "text", "p_services_completed" "uuid"[], "p_follow_up_required" boolean, "p_follow_up_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_appointment"("p_appointment_id" "uuid", "p_completion_notes" "text", "p_services_completed" "uuid"[], "p_follow_up_required" boolean, "p_follow_up_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_appointment_notification"("p_user_id" "uuid", "p_notification_type" "public"."notification_type", "p_appointment_id" "uuid", "p_custom_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_appointment_notification"("p_user_id" "uuid", "p_notification_type" "public"."notification_type", "p_appointment_id" "uuid", "p_custom_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_appointment_notification"("p_user_id" "uuid", "p_notification_type" "public"."notification_type", "p_appointment_id" "uuid", "p_custom_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_appointment_with_validation"("p_doctor_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_type" character varying, "p_symptoms" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_appointment_with_validation"("p_doctor_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_type" character varying, "p_symptoms" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_appointment_with_validation"("p_doctor_id" "uuid", "p_clinic_id" "uuid", "p_appointment_date" "date", "p_appointment_time" time without time zone, "p_service_type" character varying, "p_symptoms" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_staff_invitation"("p_email" character varying, "p_clinic_id" "uuid", "p_position" character varying, "p_department" character varying, "p_first_name" character varying, "p_last_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_staff_invitation"("p_email" character varying, "p_clinic_id" "uuid", "p_position" character varying, "p_department" character varying, "p_first_name" character varying, "p_last_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_staff_invitation"("p_email" character varying, "p_clinic_id" "uuid", "p_position" character varying, "p_department" character varying, "p_first_name" character varying, "p_last_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_patient_profile_update_constraints"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_patient_profile_update_constraints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_patient_profile_update_constraints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_staff_profile_update_constraints"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_staff_profile_update_constraints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_staff_profile_update_constraints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."evaluate_clinic_badges"("p_clinic_id" "uuid", "p_evaluation_period_days" integer, "p_auto_award" boolean, "p_badge_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."evaluate_clinic_badges"("p_clinic_id" "uuid", "p_evaluation_period_days" integer, "p_auto_award" boolean, "p_badge_types" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."evaluate_clinic_badges"("p_clinic_id" "uuid", "p_evaluation_period_days" integer, "p_auto_award" boolean, "p_badge_types" "text"[]) TO "service_role";






GRANT ALL ON FUNCTION "public"."generate_otp"("p_identifier" character varying, "p_identifier_type" character varying, "p_purpose" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_otp"("p_identifier" character varying, "p_identifier_type" character varying, "p_purpose" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_otp"("p_identifier" character varying, "p_identifier_type" character varying, "p_purpose" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_system_analytics"("p_date_from" "date", "p_date_to" "date", "p_include_trends" boolean, "p_include_performance" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_system_analytics"("p_date_from" "date", "p_date_to" "date", "p_include_trends" boolean, "p_include_performance" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_system_analytics"("p_date_from" "date", "p_date_to" "date", "p_include_trends" boolean, "p_include_performance" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_appointments_by_role"("p_status" "public"."appointment_status"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_appointments_by_role"("p_status" "public"."appointment_status"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_appointments_by_role"("p_status" "public"."appointment_status"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_time_slots"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_service_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_time_slots"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_service_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_time_slots"("p_doctor_id" "uuid", "p_appointment_date" "date", "p_service_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_clinic_growth_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean, "p_include_patient_insights" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_clinic_growth_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean, "p_include_patient_insights" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_clinic_growth_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean, "p_include_patient_insights" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_clinic_performance_ranking"("days_period" integer, "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_clinic_performance_ranking"("days_period" integer, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_clinic_performance_ranking"("days_period" integer, "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_clinic_resource_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_forecasting" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_clinic_resource_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_forecasting" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_clinic_resource_analytics"("p_clinic_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_forecasting" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_staff_clinic_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_staff_clinic_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_staff_clinic_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ongoing_treatments"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ongoing_treatments"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ongoing_treatments"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_patient_analytics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_patient_analytics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_patient_analytics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_patient_feedback_history"("p_patient_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_patient_feedback_history"("p_patient_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_patient_feedback_history"("p_patient_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_patient_health_analytics"("p_patient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_patient_health_analytics"("p_patient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_patient_health_analytics"("p_patient_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_completion_status"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_completion_status"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_completion_status"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_staff_invitation_status"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_staff_invitation_status"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_staff_invitation_status"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_staff_invitations"("p_clinic_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_staff_invitations"("p_clinic_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_staff_invitations"("p_clinic_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_staff_performance_analytics"("p_staff_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_staff_performance_analytics"("p_staff_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_staff_performance_analytics"("p_staff_id" "uuid", "p_date_from" "date", "p_date_to" "date", "p_include_comparisons" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_appointments"("p_status" "text"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_appointments"("p_status" "text"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_appointments"("p_status" "text"[], "p_date_from" "date", "p_date_to" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_auth_status"("p_auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_auth_status"("p_auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_auth_status"("p_auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_complete_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_read_status" boolean, "p_notification_types" "public"."notification_type"[], "p_limit" integer, "p_offset" integer, "p_include_related_data" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_read_status" boolean, "p_notification_types" "public"."notification_type"[], "p_limit" integer, "p_offset" integer, "p_include_related_data" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_read_status" boolean, "p_notification_types" "public"."notification_type"[], "p_limit" integer, "p_offset" integer, "p_include_related_data" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_list"("p_user_type" "public"."user_type", "p_clinic_id" "uuid", "p_search_term" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_list"("p_user_type" "public"."user_type", "p_clinic_id" "uuid", "p_search_term" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_list"("p_user_type" "public"."user_type", "p_clinic_id" "uuid", "p_search_term" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_email_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_email_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_email_verification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_phone_verification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_profile_complete"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_profile_complete"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_profile_complete"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_appointment_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."manage_appointment_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_appointment_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_patient_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."manage_patient_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_patient_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_ui_components"("p_action" "text", "p_component_id" "uuid", "p_component_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."manage_ui_components"("p_action" "text", "p_component_id" "uuid", "p_component_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_ui_components"("p_action" "text", "p_component_id" "uuid", "p_component_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_user_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[], "p_scope_override" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."manage_user_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[], "p_scope_override" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_user_archives"("p_action" "text", "p_item_type" "text", "p_item_id" "uuid", "p_item_ids" "uuid"[], "p_scope_override" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_feedback_core_field_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_feedback_core_field_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_feedback_core_field_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_email_communications_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_email_communications_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_email_communications_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_file_upload_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_file_upload_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_file_upload_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_appointment"("p_appointment_id" "uuid", "p_rejection_reason" "text", "p_rejection_category" "public"."rejection_category", "p_suggest_reschedule" boolean, "p_alternative_dates" "date"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."reject_appointment"("p_appointment_id" "uuid", "p_rejection_reason" "text", "p_rejection_category" "public"."rejection_category", "p_suggest_reschedule" boolean, "p_alternative_dates" "date"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_appointment"("p_appointment_id" "uuid", "p_rejection_reason" "text", "p_rejection_category" "public"."rejection_category", "p_suggest_reschedule" boolean, "p_alternative_dates" "date"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."restrict_notification_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."restrict_notification_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."restrict_notification_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_condition_report"("p_clinic_id" "uuid", "p_subject" "text", "p_message" "text", "p_attachment_urls" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."send_condition_report"("p_clinic_id" "uuid", "p_subject" "text", "p_message" "text", "p_attachment_urls" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_condition_report"("p_clinic_id" "uuid", "p_subject" "text", "p_message" "text", "p_attachment_urls" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."send_phone_verification_otp"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."send_phone_verification_otp"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_phone_verification_otp"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_feedback"("p_rating" integer, "p_comment" "text", "p_appointment_id" "uuid", "p_clinic_id" "uuid", "p_feedback_type" "public"."feedback_type", "p_is_anonymous" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_feedback"("p_rating" integer, "p_comment" "text", "p_appointment_id" "uuid", "p_clinic_id" "uuid", "p_feedback_type" "public"."feedback_type", "p_is_anonymous" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_feedback"("p_rating" integer, "p_comment" "text", "p_appointment_id" "uuid", "p_clinic_id" "uuid", "p_feedback_type" "public"."feedback_type", "p_is_anonymous" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_clinic_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_clinic_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_clinic_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_location"("latitude" double precision, "longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_location"("latitude" double precision, "longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_location"("latitude" double precision, "longitude" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_profile_data" "jsonb", "p_role_specific_data" "jsonb", "p_clinic_data" "jsonb", "p_services_data" "jsonb", "p_doctors_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_profile_data" "jsonb", "p_role_specific_data" "jsonb", "p_clinic_data" "jsonb", "p_services_data" "jsonb", "p_doctors_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_profile_data" "jsonb", "p_role_specific_data" "jsonb", "p_clinic_data" "jsonb", "p_services_data" "jsonb", "p_doctors_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_and_signup_staff"("p_invitation_id" "uuid", "p_email" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_and_signup_staff"("p_invitation_id" "uuid", "p_email" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_and_signup_staff"("p_invitation_id" "uuid", "p_email" character varying, "p_first_name" character varying, "p_last_name" character varying, "p_phone" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_appointment_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_appointment_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_appointment_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_batch_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_batch_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_batch_archive_permissions"("p_user_id" "uuid", "p_user_role" "text", "p_clinic_id" "uuid", "p_item_type" "text", "p_item_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_feedback_submission"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_feedback_submission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_feedback_submission"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_partnership_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_partnership_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_partnership_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_otp"("p_identifier" character varying, "p_otp_code" character varying, "p_purpose" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."verify_otp"("p_identifier" character varying, "p_otp_code" character varying, "p_purpose" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_otp"("p_identifier" character varying, "p_otp_code" character varying, "p_purpose" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_phone_with_metadata"("p_user_auth_id" "uuid", "p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."verify_phone_with_metadata"("p_user_auth_id" "uuid", "p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_phone_with_metadata"("p_user_auth_id" "uuid", "p_phone" character varying) TO "service_role";

















































































GRANT ALL ON TABLE "public"."admin_profiles" TO "anon";
GRANT ALL ON TABLE "public"."admin_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_services" TO "anon";
GRANT ALL ON TABLE "public"."appointment_services" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_services" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."archive_items" TO "anon";
GRANT ALL ON TABLE "public"."archive_items" TO "authenticated";
GRANT ALL ON TABLE "public"."archive_items" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_badge_awards" TO "anon";
GRANT ALL ON TABLE "public"."clinic_badge_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_badge_awards" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_badges" TO "anon";
GRANT ALL ON TABLE "public"."clinic_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_badges" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_partnership_requests" TO "anon";
GRANT ALL ON TABLE "public"."clinic_partnership_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_partnership_requests" TO "service_role";



GRANT ALL ON TABLE "public"."clinics" TO "anon";
GRANT ALL ON TABLE "public"."clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics" TO "service_role";



GRANT ALL ON TABLE "public"."doctor_clinics" TO "anon";
GRANT ALL ON TABLE "public"."doctor_clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_clinics" TO "service_role";



GRANT ALL ON TABLE "public"."doctors" TO "anon";
GRANT ALL ON TABLE "public"."doctors" TO "authenticated";
GRANT ALL ON TABLE "public"."doctors" TO "service_role";



GRANT ALL ON TABLE "public"."email_communications" TO "anon";
GRANT ALL ON TABLE "public"."email_communications" TO "authenticated";
GRANT ALL ON TABLE "public"."email_communications" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."file_uploads" TO "anon";
GRANT ALL ON TABLE "public"."file_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."file_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."otp_verifications" TO "anon";
GRANT ALL ON TABLE "public"."otp_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."patient_appointment_limits" TO "anon";
GRANT ALL ON TABLE "public"."patient_appointment_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_appointment_limits" TO "service_role";



GRANT ALL ON TABLE "public"."patient_medical_history" TO "anon";
GRANT ALL ON TABLE "public"."patient_medical_history" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_medical_history" TO "service_role";



GRANT ALL ON TABLE "public"."patient_profiles" TO "anon";
GRANT ALL ON TABLE "public"."patient_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."staff_invitations" TO "anon";
GRANT ALL ON TABLE "public"."staff_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."staff_profiles" TO "anon";
GRANT ALL ON TABLE "public"."staff_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ui_components" TO "anon";
GRANT ALL ON TABLE "public"."ui_components" TO "authenticated";
GRANT ALL ON TABLE "public"."ui_components" TO "service_role";



GRANT ALL ON TABLE "public"."user_archive_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_archive_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_archive_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
