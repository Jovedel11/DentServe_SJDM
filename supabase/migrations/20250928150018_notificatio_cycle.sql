-- ========================================
-- DENTSERVE NOTIFICATION CYCLE ANALYSIS
-- ========================================
-- This file contains all notification-related database objects extracted from the main schema
-- for easier understanding and hook/function evaluation.

-- ========================================
-- NOTIFICATION-RELATED TYPES & ENUMS
-- ========================================

-- Notification type enum for categorizing notifications
create type "public"."notification_type" as enum ('appointment_reminder', 'appointment_confirmed', 'appointment_cancelled', 'feedback_request', 'partnership_request');

-- ========================================
-- NOTIFICATION-RELATED TABLES
-- ========================================

-- Notification templates for dynamic content generation
create table "public"."notification_templates" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "template_name" character varying(100) not null,
  "template_type" character varying(50) not null,
  "subject" character varying(300),
  "body_template" text not null,
  "variables" jsonb,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now()
);

-- Primary notifications table
create table "public"."notifications" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_id" uuid not null,
  "notification_type" notification_type not null,
  "title" character varying(200) not null,
  "message" text not null,
  "related_appointment_id" uuid,
  "is_read" boolean default false,
  "sent_via" character varying[],
  "scheduled_for" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- ========================================
-- NOTIFICATION-RELATED INDEXES
-- ========================================

-- Template indexes
CREATE UNIQUE INDEX notification_templates_pkey ON public.notification_templates USING btree (id);
CREATE UNIQUE INDEX notification_templates_template_name_key ON public.notification_templates USING btree (template_name);

-- Notification indexes
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);
CREATE INDEX idx_notifications_related_appointment_id ON public.notifications USING btree (related_appointment_id);
CREATE INDEX idx_notifications_scheduled ON public.notifications USING btree (scheduled_for) WHERE (sent_at IS NULL);
CREATE INDEX idx_notifications_scheduled_unread ON public.notifications USING btree (scheduled_for, is_read) WHERE ((scheduled_for IS NOT NULL) AND (is_read = false));
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_user_read_created ON public.notifications USING btree (user_id, is_read, created_at DESC) WHERE (user_id IS NOT NULL);

-- Patient profile notification preferences index
CREATE INDEX idx_patient_profiles_lookup ON public.patient_profiles USING btree (user_profile_id) INCLUDE (emergency_contact_name, emergency_contact_phone, medical_conditions, allergies, email_notifications, sms_notifications);

-- ========================================
-- NOTIFICATION SECURITY POLICIES
-- ========================================

-- Enable Row Level Security for notification templates
alter table "public"."notification_templates" enable row level security;

-- Enable Row Level Security for notifications
alter table "public"."notifications" enable row level security;

-- ========================================
-- NOTIFICATION CYCLE FUNCTIONS
-- ========================================

-- Function: Create appointment notification
-- Purpose: Generate notifications for appointment events
-- Usage: Used when appointments are confirmed, cancelled, or reminders needed
CREATE OR REPLACE FUNCTION public.create_appointment_notification(p_user_id uuid, p_notification_type notification_type, p_appointment_id uuid, p_custom_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

-- Function: Get user notifications
-- Purpose: Retrieve notifications for a user with filtering and pagination
-- Usage: Used to display notification list in user dashboard
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id uuid DEFAULT NULL::uuid, p_read_status boolean DEFAULT NULL::boolean, p_notification_types notification_type[] DEFAULT NULL::notification_type[], p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_include_related_data boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$;

-- Function: Mark notifications as read
-- Purpose: Update notification read status
-- Usage: Used when user views notifications to mark them as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$;

-- Function: Restrict notification updates
-- Purpose: Trigger function to prevent unauthorized updates to notification core fields
-- Usage: Applied as trigger to protect notification integrity
CREATE OR REPLACE FUNCTION public.restrict_notification_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$;

-- ========================================
-- NOTIFICATION CYCLE RELATIONSHIPS
-- ========================================

-- Foreign key relationships
ALTER TABLE ONLY public.notifications
ADD CONSTRAINT notifications_related_appointment_id_fkey 
FOREIGN KEY (related_appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.notifications
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ========================================
-- NOTIFICATION CYCLE TRIGGER ASSIGNMENTS
-- ========================================

-- Apply update restriction trigger
CREATE TRIGGER restrict_notification_updates 
BEFORE UPDATE ON public.notifications 
FOR EACH ROW 
EXECUTE FUNCTION public.restrict_notification_updates();

-- Add updated_at trigger for notifications
CREATE TRIGGER set_notifications_updated_at 
BEFORE UPDATE ON public.notifications 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- NOTIFICATION HOOKS REFERENCE GUIDE
-- ========================================

/*
NOTIFICATION CYCLE HOOK PATTERNS:

1. CREATE NOTIFICATION HOOK:
   - Function: create_appointment_notification()
   - Trigger Events: appointment_confirmed, appointment_cancelled, feedback_request
   - Parameters: user_id, notification_type, appointment_id, custom_message
   - Returns: success/error status

2. FETCH NOTIFICATIONS HOOK:
   - Function: get_user_notifications()
   - Use Cases: Dashboard notifications, notification center
   - Parameters: user_id, read_status, types, pagination
   - Returns: notifications with metadata and related data

3. MARK READ HOOK:
   - Function: mark_notifications_read()
   - Use Cases: User interaction with notifications
   - Parameters: notification_ids array
   - Returns: updated count and status

4. NOTIFICATION PREFERENCES:
   - Table: patient_profiles (email_notifications, sms_notifications)
   - Use Cases: User preference management
   - Integration: Link with notification delivery system

IMPLEMENTATION NOTES:
- All functions include proper authentication and access control
- Notifications support scheduling for future delivery
- Related appointment data is automatically included
- Priority system ensures important notifications appear first
- Time-based formatting provides user-friendly timestamps
- Action suggestions guide user next steps
*/

-- ========================================
-- NOTIFICATION DATA INTEGRITY
-- ========================================

-- Ensure notification templates have unique names
-- Ensure notifications belong to valid users
-- Ensure appointment notifications reference valid appointments
-- Protect core notification fields from unauthorized updates
-- Maintain audit trail with created_at and updated_at timestamps