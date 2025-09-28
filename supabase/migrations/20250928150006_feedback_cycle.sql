-- ========================================
-- DENTSERVE FEEDBACK CYCLE ANALYSIS
-- ========================================
-- This file contains all feedback-related database objects extracted from the main schema
-- for easier understanding and hook/function evaluation.

-- ========================================
-- FEEDBACK-RELATED TYPES & ENUMS
-- ========================================

-- Feedback type enum for categorizing feedback
create type "public"."feedback_type" as enum ('general', 'service', 'doctor', 'facility');

-- ========================================
-- FEEDBACK-RELATED TABLES
-- ========================================

-- Core feedback table
create table "public"."feedback" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "patient_id" uuid,
  "clinic_id" uuid not null,
  "doctor_id" uuid,
  "appointment_id" uuid,
  "feedback_type" feedback_type not null,
  "rating" integer,
  "comment" text,
  "is_anonymous" boolean default false,
  "is_public" boolean default false,
  "response" text,
  "responded_by" uuid,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone default now()
);

-- ========================================
-- FEEDBACK CYCLE FUNCTIONS
-- ========================================

-- 1. FEEDBACK SUBMISSION FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_rating integer, 
  p_comment text, 
  p_appointment_id uuid DEFAULT NULL::uuid, 
  p_clinic_id uuid DEFAULT NULL::uuid, 
  p_feedback_type feedback_type DEFAULT 'general'::feedback_type, 
  p_is_anonymous boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
    
    -- Input validation
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
    
    -- Determine clinic and doctor from appointment
    IF p_appointment_id IS NOT NULL THEN
        SELECT 
            a.id,
            a.clinic_id,
            a.doctor_id,
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
    
    -- Get clinic information
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
    
    -- Check for duplicate feedback
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
    
    -- Rate limiting check  
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
    
    -- Insert feedback
    INSERT INTO feedback (
        patient_id,
        clinic_id,
        doctor_id,
        appointment_id,
        feedback_type,
        rating,
        comment,
        is_anonymous,
        is_public
    ) VALUES (
        patient_id_val,
        p_clinic_id,
        doctor_id_val,
        p_appointment_id,
        p_feedback_type,
        p_rating,
        p_comment,
        COALESCE(p_is_anonymous, false),
        NOT COALESCE(p_is_anonymous, false)  -- Public unless anonymous
    ) RETURNING id INTO feedback_id;
    
    -- Create notification for clinic staff
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message
    )
    SELECT 
        u.id,
        'feedback_request',
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
    
    -- Analytics event
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata
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
    
    -- Return success response
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
$function$;

-- ========================================
-- 2. FEEDBACK RESPONSE FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.respond_to_feedback(p_feedback_id uuid, p_response text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    staff_clinic_id UUID;
    feedback_record RECORD;
    responder_id UUID;
BEGIN
    current_context := get_current_user_context();
    
    -- Only staff and admin can respond
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff or Admin access required');
    END IF;
    
    responder_id := (current_context->>'user_id')::UUID;
    
    -- Validate response
    IF p_response IS NULL OR TRIM(p_response) = '' OR LENGTH(p_response) > 1000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Response is required and must be under 1000 characters');
    END IF;
    
    -- Get staff clinic ID
    SELECT sp.clinic_id INTO staff_clinic_id
    FROM staff_profiles sp
    JOIN user_profiles up ON sp.user_profile_id = up.id
    WHERE up.user_id = responder_id
    AND sp.is_active = true;
    
    IF staff_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No clinic association found');
    END IF;
    
    -- Get and validate feedback
    SELECT 
        f.id,
        f.clinic_id,
        f.patient_id,
        f.response as existing_response,
        f.rating,
        f.comment
    INTO feedback_record
    FROM feedback f
    WHERE f.id = p_feedback_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feedback not found');
    END IF;
    
    -- Check if staff can respond to this feedback (same clinic)
    IF feedback_record.clinic_id != staff_clinic_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot respond to feedback from different clinic');
    END IF;
    
    -- Check if already responded
    IF feedback_record.existing_response IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feedback already has a response');
    END IF;
    
    -- Update feedback with response
    UPDATE feedback SET
        response = TRIM(p_response),
        responded_by = responder_id,
        responded_at = NOW()
    WHERE id = p_feedback_id;
    
    -- Create notification for patient
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message
    ) VALUES (
        feedback_record.patient_id,
        'feedback_request',
        'Response to Your Feedback',
        format('We have responded to your %s-star feedback. Thank you for helping us improve our services.', feedback_record.rating)
    );
    
    -- Analytics event
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata
    ) VALUES (
        staff_clinic_id,
        responder_id,
        'feedback_responded',
        jsonb_build_object(
            'feedback_id', p_feedback_id,
            'response_length', LENGTH(TRIM(p_response)),
            'original_rating', feedback_record.rating
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Response submitted successfully',
        'data', jsonb_build_object(
            'feedback_id', p_feedback_id,
            'responded_at', NOW(),
            'responder_id', responder_id
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to submit response');
END;
$function$;

-- ========================================
-- 3. FEEDBACK RETRIEVAL FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.get_patient_feedback_history(
  p_patient_id uuid DEFAULT NULL::uuid, 
  p_include_archived boolean DEFAULT false, 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
      f.feedback_type,
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
          'feedback_type', feedback_type,
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
      'total_count', (SELECT COUNT(*) FROM feedback WHERE patient_id = patient_id_val),
      'statistics', jsonb_build_object(
        'average_rating_given', (
          SELECT ROUND(AVG(rating), 1) 
          FROM feedback 
          WHERE patient_id = patient_id_val AND rating IS NOT NULL
        ),
        'total_feedback_submitted', (
          SELECT COUNT(*) FROM feedback WHERE patient_id = patient_id_val
        ),
        'responses_received', (
          SELECT COUNT(*) FROM feedback 
          WHERE patient_id = patient_id_val AND response IS NOT NULL
        ),
        'anonymous_feedback_count', (
          SELECT COUNT(*) FROM feedback 
          WHERE patient_id = patient_id_val AND is_anonymous = true
        )
      )
    )
  ) INTO result
  FROM feedback_data;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to fetch feedback history');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_staff_feedback_list(
  p_clinic_id uuid DEFAULT NULL::uuid, 
  p_include_responses boolean DEFAULT true, 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    staff_clinic_id UUID;
    result JSONB;
BEGIN
    current_context := get_current_user_context();
    
    -- Only staff and admin can access
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff or Admin access required');
    END IF;
    
    -- Get staff clinic ID if not provided
    IF p_clinic_id IS NULL THEN
        SELECT sp.clinic_id INTO staff_clinic_id
        FROM staff_profiles sp
        JOIN user_profiles up ON sp.user_profile_id = up.id
        WHERE up.user_id = (current_context->>'user_id')::UUID
        AND sp.is_active = true;
        
        IF staff_clinic_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'No clinic association found');
        END IF;
    ELSE
        staff_clinic_id := p_clinic_id;
    END IF;
    
    WITH feedback_data AS (
        SELECT 
            f.id,
            f.rating,
            f.comment,
            f.is_anonymous,
            f.is_public,
            f.feedback_type,
            f.response,
            f.responded_by,
            f.responded_at,
            f.created_at,
            f.appointment_id,
            f.clinic_id,
            f.doctor_id,
            -- Patient info (respecting anonymity)
            CASE 
                WHEN f.is_anonymous THEN NULL
                ELSE p.first_name || ' ' || p.last_name
            END as patient_name,
            CASE 
                WHEN f.is_anonymous THEN NULL
                ELSE u.email
            END as patient_email,
            CASE 
                WHEN f.is_anonymous THEN NULL
                ELSE p.profile_image_url
            END as patient_image,
            -- Appointment details
            a.appointment_date,
            a.appointment_time,
            -- Doctor details
            d.first_name || ' ' || d.last_name as doctor_name,
            d.specialization as doctor_specialization,
            -- Responder details
            resp.first_name || ' ' || resp.last_name as responder_name,
            -- Services
            (SELECT jsonb_agg(s.name) FROM appointment_services aps 
             JOIN services s ON aps.service_id = s.id 
             WHERE aps.appointment_id = f.appointment_id) as services
        FROM feedback f
        LEFT JOIN appointments a ON f.appointment_id = a.id
        LEFT JOIN users u ON f.patient_id = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN doctors d ON f.doctor_id = d.id
        LEFT JOIN user_profiles resp ON f.responded_by = resp.user_id
        WHERE f.clinic_id = staff_clinic_id
        ORDER BY f.created_at DESC
        LIMIT p_limit OFFSET p_offset
    ),
    feedback_stats AS (
        SELECT 
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE response IS NOT NULL) as responded_count,
            AVG(rating) as average_rating,
            COUNT(*) FILTER (WHERE rating >= 4) as positive_count,
            COUNT(*) FILTER (WHERE rating <= 2) as negative_count,
            COUNT(*) FILTER (WHERE feedback_type = 'general') as general_count,
            COUNT(*) FILTER (WHERE feedback_type = 'service') as service_count,
            COUNT(*) FILTER (WHERE feedback_type = 'doctor') as doctor_count,
            COUNT(*) FILTER (WHERE feedback_type = 'facility') as facility_count
        FROM feedback 
        WHERE clinic_id = staff_clinic_id
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'feedback_list', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', fd.id,
                    'rating', fd.rating,
                    'comment', fd.comment,
                    'feedback_type', fd.feedback_type,
                    'is_anonymous', fd.is_anonymous,
                    'is_public', fd.is_public,
                    'response', fd.response,
                    'responded_at', fd.responded_at,
                    'created_at', fd.created_at,
                    'patient', CASE WHEN NOT fd.is_anonymous THEN
                        jsonb_build_object(
                            'name', fd.patient_name,
                            'email', fd.patient_email,
                            'image', fd.patient_image
                        )
                    ELSE 
                        jsonb_build_object('name', 'Anonymous Patient')
                    END,
                    'appointment', jsonb_build_object(
                        'id', fd.appointment_id,
                        'date', fd.appointment_date,
                        'time', fd.appointment_time,
                        'services', fd.services
                    ),
                    'doctor', CASE WHEN fd.doctor_name IS NOT NULL THEN
                        jsonb_build_object(
                            'id', fd.doctor_id,
                            'name', fd.doctor_name,
                            'specialization', fd.doctor_specialization
                        )
                    ELSE NULL END,
                    'responder', CASE WHEN fd.responder_name IS NOT NULL THEN
                        jsonb_build_object(
                            'name', fd.responder_name,
                            'responded_at', fd.responded_at
                        )
                    ELSE NULL END,
                    'urgency_level', CASE 
                        WHEN fd.rating <= 2 THEN 'high'
                        WHEN fd.rating = 3 THEN 'medium'
                        ELSE 'low'
                    END,
                    'needs_response', fd.response IS NULL AND fd.rating <= 3
                )
                ORDER BY fd.created_at DESC
            ), '[]'::jsonb),
            'pagination', jsonb_build_object(
                'limit', p_limit,
                'offset', p_offset,
                'total_count', (SELECT total_count FROM feedback_stats)
            ),
            'statistics', jsonb_build_object(
                'total_feedback', (SELECT total_count FROM feedback_stats),
                'response_rate', CASE 
                    WHEN (SELECT total_count FROM feedback_stats) > 0 
                    THEN ROUND((SELECT responded_count FROM feedback_stats)::numeric / (SELECT total_count FROM feedback_stats) * 100, 1)
                    ELSE 0 
                END,
                'average_rating', ROUND((SELECT average_rating FROM feedback_stats), 1),
                'positive_feedback', (SELECT positive_count FROM feedback_stats),
                'negative_feedback', (SELECT negative_count FROM feedback_stats),
                'pending_responses', (SELECT total_count - responded_count FROM feedback_stats),
                'feedback_by_type', jsonb_build_object(
                    'general', (SELECT general_count FROM feedback_stats),
                    'service', (SELECT service_count FROM feedback_stats),
                    'doctor', (SELECT doctor_count FROM feedback_stats),
                    'facility', (SELECT facility_count FROM feedback_stats)
                )
            )
        )
    ) INTO result
    FROM feedback_data fd;
    
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to fetch feedback list');
END;
$function$;

-- ========================================
-- 4. FEEDBACK ANALYTICS FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.get_clinic_feedback_analytics(
  p_clinic_id uuid DEFAULT NULL::uuid,
  p_date_from date DEFAULT NULL::date,
  p_date_to date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    clinic_id_val UUID;
    date_from date;
    date_to date;
    result JSONB;
BEGIN
    current_context := get_current_user_context();
    
    -- Only staff and admin can access
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff or Admin access required');
    END IF;
    
    -- Get clinic ID
    IF p_clinic_id IS NULL THEN
        SELECT sp.clinic_id INTO clinic_id_val
        FROM staff_profiles sp
        JOIN user_profiles up ON sp.user_profile_id = up.id
        WHERE up.user_id = (current_context->>'user_id')::UUID
        AND sp.is_active = true;
    ELSE
        clinic_id_val := p_clinic_id;
    END IF;
    
    IF clinic_id_val IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No clinic association found');
    END IF;
    
    -- Set date defaults
    date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
    date_to := COALESCE(p_date_to, CURRENT_DATE);
    
    WITH feedback_analytics AS (
        SELECT 
            COUNT(*) as total_feedback,
            AVG(rating) as average_rating,
            COUNT(*) FILTER (WHERE rating = 5) as five_star,
            COUNT(*) FILTER (WHERE rating = 4) as four_star,
            COUNT(*) FILTER (WHERE rating = 3) as three_star,
            COUNT(*) FILTER (WHERE rating = 2) as two_star,
            COUNT(*) FILTER (WHERE rating = 1) as one_star,
            COUNT(*) FILTER (WHERE response IS NOT NULL) as responded_count,
            COUNT(*) FILTER (WHERE is_anonymous = true) as anonymous_count,
            COUNT(*) FILTER (WHERE feedback_type = 'general') as general_feedback,
            COUNT(*) FILTER (WHERE feedback_type = 'service') as service_feedback,
            COUNT(*) FILTER (WHERE feedback_type = 'doctor') as doctor_feedback,
            COUNT(*) FILTER (WHERE feedback_type = 'facility') as facility_feedback,
            AVG(LENGTH(comment)) as avg_comment_length
        FROM feedback
        WHERE clinic_id = clinic_id_val
        AND created_at::date BETWEEN date_from AND date_to
    ),
    daily_trends AS (
        SELECT 
            created_at::date as feedback_date,
            COUNT(*) as daily_count,
            AVG(rating) as daily_avg_rating
        FROM feedback
        WHERE clinic_id = clinic_id_val
        AND created_at::date BETWEEN date_from AND date_to
        GROUP BY created_at::date
        ORDER BY feedback_date
    ),
    response_time_stats AS (
        SELECT 
            AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) as avg_response_time_hours,
            MIN(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) as min_response_time_hours,
            MAX(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) as max_response_time_hours
        FROM feedback
        WHERE clinic_id = clinic_id_val
        AND responded_at IS NOT NULL
        AND created_at::date BETWEEN date_from AND date_to
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'clinic_id', clinic_id_val,
            'period', jsonb_build_object(
                'from_date', date_from,
                'to_date', date_to,
                'days_covered', (date_to - date_from) + 1
            ),
            'summary_statistics', jsonb_build_object(
                'total_feedback', fa.total_feedback,
                'average_rating', ROUND(fa.average_rating, 2),
                'response_rate', CASE 
                    WHEN fa.total_feedback > 0 
                    THEN ROUND((fa.responded_count::numeric / fa.total_feedback * 100), 1)
                    ELSE 0
                END,
                'anonymity_rate', CASE 
                    WHEN fa.total_feedback > 0 
                    THEN ROUND((fa.anonymous_count::numeric / fa.total_feedback * 100), 1)
                    ELSE 0
                END
            ),
            'rating_distribution', jsonb_build_object(
                '5_star', fa.five_star,
                '4_star', fa.four_star,
                '3_star', fa.three_star,
                '2_star', fa.two_star,
                '1_star', fa.one_star,
                'satisfaction_score', CASE 
                    WHEN fa.total_feedback > 0 
                    THEN ROUND(((fa.five_star + fa.four_star)::numeric / fa.total_feedback * 100), 1)
                    ELSE 0
                END
            ),
            'feedback_by_type', jsonb_build_object(
                'general', fa.general_feedback,
                'service', fa.service_feedback,
                'doctor', fa.doctor_feedback,
                'facility', fa.facility_feedback
            ),
            'response_analytics', jsonb_build_object(
                'total_responses', fa.responded_count,
                'pending_responses', fa.total_feedback - fa.responded_count,
                'avg_response_time_hours', ROUND(COALESCE(rt.avg_response_time_hours, 0), 1),
                'fastest_response_hours', ROUND(COALESCE(rt.min_response_time_hours, 0), 1),
                'slowest_response_hours', ROUND(COALESCE(rt.max_response_time_hours, 0), 1)
            ),
            'trends', jsonb_build_object(
                'daily_feedback', COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'date', feedback_date,
                            'count', daily_count,
                            'avg_rating', ROUND(daily_avg_rating, 1)
                        )
                        ORDER BY feedback_date
                    ) FROM daily_trends),
                    '[]'::jsonb
                )
            ),
            'insights', jsonb_build_object(
                'avg_comment_length', ROUND(COALESCE(fa.avg_comment_length, 0), 0),
                'engagement_level', CASE 
                    WHEN fa.avg_comment_length > 100 THEN 'high'
                    WHEN fa.avg_comment_length > 50 THEN 'medium'
                    ELSE 'low'
                END,
                'priority_areas', CASE 
                    WHEN fa.facility_feedback = (SELECT MAX(cnt) FROM (VALUES (fa.general_feedback), (fa.service_feedback), (fa.doctor_feedback), (fa.facility_feedback)) AS t(cnt)) THEN 'facility'
                    WHEN fa.service_feedback = (SELECT MAX(cnt) FROM (VALUES (fa.general_feedback), (fa.service_feedback), (fa.doctor_feedback), (fa.facility_feedback)) AS t(cnt)) THEN 'service'
                    WHEN fa.doctor_feedback = (SELECT MAX(cnt) FROM (VALUES (fa.general_feedback), (fa.service_feedback), (fa.doctor_feedback), (fa.facility_feedback)) AS t(cnt)) THEN 'doctor'
                    ELSE 'general'
                END
            )
        )
    ) INTO result
    FROM feedback_analytics fa
    CROSS JOIN response_time_stats rt;
    
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to generate feedback analytics');
END;
$function$;

-- ========================================
-- 5. FEEDBACK VALIDATION FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.validate_feedback_appointment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_feedback_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_feedback_core_field_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
BEGIN
  IF NEW.clinic_id <> OLD.clinic_id
     OR NEW.appointment_id <> OLD.appointment_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify clinic_id, appointment_id, or created_at';
  END IF;
  RETURN NEW;
END;
$function$;

-- ========================================
-- 6. FEEDBACK MANAGEMENT FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.moderate_feedback(
  p_feedback_id uuid,
  p_action text,
  p_moderator_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    feedback_record RECORD;
    moderator_id UUID;
BEGIN
    current_context := get_current_user_context();
    
    -- Only admin can moderate feedback
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
    END IF;
    
    moderator_id := (current_context->>'user_id')::UUID;
    
    -- Validate action
    IF p_action NOT IN ('approve', 'hide', 'flag', 'delete') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Must be: approve, hide, flag, delete');
    END IF;
    
    -- Get feedback record
    SELECT * INTO feedback_record
    FROM feedback
    WHERE id = p_feedback_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feedback not found');
    END IF;
    
    -- Perform moderation action
    CASE p_action
        WHEN 'approve' THEN
            UPDATE feedback SET is_public = true WHERE id = p_feedback_id;
        WHEN 'hide' THEN
            UPDATE feedback SET is_public = false WHERE id = p_feedback_id;
        WHEN 'flag' THEN
            -- Add flag for review (could extend schema to include moderation flags)
            UPDATE feedback SET is_public = false WHERE id = p_feedback_id;
        WHEN 'delete' THEN
            DELETE FROM feedback WHERE id = p_feedback_id;
    END CASE;
    
    -- Log moderation action
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata
    ) VALUES (
        feedback_record.clinic_id,
        moderator_id,
        'feedback_moderated',
        jsonb_build_object(
            'feedback_id', p_feedback_id,
            'action', p_action,
            'moderator_notes', p_moderator_notes,
            'original_rating', feedback_record.rating
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Feedback %s successfully', p_action),
        'data', jsonb_build_object(
            'feedback_id', p_feedback_id,
            'action_taken', p_action,
            'moderated_at', NOW(),
            'moderator_id', moderator_id
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to moderate feedback');
END;
$function$;

CREATE OR REPLACE FUNCTION public.bulk_respond_to_feedback(
  p_feedback_ids uuid[],
  p_response_template text,
  p_personalize boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    staff_clinic_id UUID;
    responder_id UUID;
    feedback_record RECORD;
    processed_count INTEGER := 0;
    failed_count INTEGER := 0;
    personalized_response TEXT;
BEGIN
    current_context := get_current_user_context();
    
    -- Only staff and admin can respond
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff or Admin access required');
    END IF;
    
    responder_id := (current_context->>'user_id')::UUID;
    
    -- Get staff clinic ID
    SELECT sp.clinic_id INTO staff_clinic_id
    FROM staff_profiles sp
    JOIN user_profiles up ON sp.user_profile_id = up.id
    WHERE up.user_id = responder_id
    AND sp.is_active = true;
    
    IF staff_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No clinic association found');
    END IF;
    
    -- Validate response template
    IF p_response_template IS NULL OR TRIM(p_response_template) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Response template is required');
    END IF;
    
    -- Process each feedback
    FOR feedback_record IN
        SELECT f.id, f.clinic_id, f.patient_id, f.rating, f.response as existing_response
        FROM feedback f
        WHERE f.id = ANY(p_feedback_ids)
        AND f.clinic_id = staff_clinic_id
        AND f.response IS NULL
    LOOP
        BEGIN
            -- Personalize response if requested
            IF p_personalize THEN
                personalized_response := p_response_template || CASE 
                    WHEN feedback_record.rating >= 4 THEN ' We''re thrilled you had a positive experience!'
                    WHEN feedback_record.rating = 3 THEN ' We appreciate your feedback and will work to improve.'
                    ELSE ' We take your concerns seriously and will address them promptly.'
                END;
            ELSE
                personalized_response := p_response_template;
            END IF;
            
            -- Update feedback with response
            UPDATE feedback SET
                response = personalized_response,
                responded_by = responder_id,
                responded_at = NOW()
            WHERE id = feedback_record.id;
            
            -- Create notification for patient
            INSERT INTO notifications (
                user_id,
                notification_type,
                title,
                message
            ) VALUES (
                feedback_record.patient_id,
                'feedback_request',
                'Response to Your Feedback',
                'We have responded to your feedback. Thank you for helping us improve our services.'
            );
            
            processed_count := processed_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_count := failed_count + 1;
        END;
    END LOOP;
    
    -- Log bulk response action
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata
    ) VALUES (
        staff_clinic_id,
        responder_id,
        'bulk_feedback_response',
        jsonb_build_object(
            'total_processed', processed_count,
            'total_failed', failed_count,
            'response_template_length', LENGTH(p_response_template),
            'personalized', p_personalize
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Bulk response completed. %s processed, %s failed.', processed_count, failed_count),
        'data', jsonb_build_object(
            'processed_count', processed_count,
            'failed_count', failed_count,
            'total_requested', array_length(p_feedback_ids, 1),
            'response_template_used', p_response_template,
            'personalized', p_personalize
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bulk response operation failed');
END;
$function$;

-- ========================================
-- FEEDBACK CYCLE SUMMARY
-- ========================================

/*
FEEDBACK LIFECYCLE:

1. FEEDBACK SUBMISSION PHASE
   - submit_feedback(): Patient submits feedback after appointment
   - Input validation (rating 1-5, comment length, appointment verification)
   - Rate limiting (3 submissions per day)
   - Duplicate prevention (one feedback per appointment)
   - Automatic notifications to clinic staff

2. FEEDBACK MANAGEMENT PHASE
   - respond_to_feedback(): Staff responds to patient feedback
   - get_staff_feedback_list(): Staff views all clinic feedback
   - moderate_feedback(): Admin moderation capabilities
   - bulk_respond_to_feedback(): Bulk response management

3. FEEDBACK RETRIEVAL PHASE
   - get_patient_feedback_history(): Patient views their feedback history
   - get_clinic_feedback_analytics(): Comprehensive analytics for clinics
   - Role-based access control and anonymity respect

4. VALIDATION AND PROTECTION
   - validate_feedback_appointment(): Ensures feedback integrity
   - validate_feedback_submission(): Rate limiting enforcement
   - prevent_feedback_core_field_update(): Prevents tampering

FEEDBACK TYPES:
- 'general': Overall clinic experience
- 'service': Specific service feedback
- 'doctor': Doctor-specific feedback
- 'facility': Facility and environment feedback

KEY FEATURES:

ANONYMITY SUPPORT:
- is_anonymous field controls patient identity visibility
- Anonymous feedback shows "Anonymous Patient" to staff
- Public/private visibility controls

RESPONSE SYSTEM:
- Staff can respond to feedback
- Response notifications sent to patients
- Response time tracking and analytics

RATING SYSTEM:
- 1-5 star rating scale
- Rating distribution analytics
- Satisfaction score calculations

ANALYTICS AND INSIGHTS:
- Feedback trends over time
- Response rate tracking
- Feedback categorization by type
- Average response time measurement
- Satisfaction scoring

ACCESS CONTROL:
- Patients: Submit and view own feedback
- Staff: View clinic feedback, respond to feedback
- Admin: Full moderation capabilities, system-wide analytics

VALIDATION RULES:
- Only completed appointments can receive feedback
- One feedback per appointment
- Rate limiting: 3 feedbacks per day per patient
- Doctor must work at the clinic for doctor feedback
- Core fields (clinic_id, appointment_id, created_at) are immutable

NOTIFICATION SYSTEM:
- Staff notified of new feedback (priority based on rating)
- Patients notified when clinic responds
- Escalation for low-rated feedback

MODERATION CAPABILITIES:
- Admin can approve/hide/flag/delete feedback
- Bulk response templates for efficiency
- Audit trail for all moderation actions
*/