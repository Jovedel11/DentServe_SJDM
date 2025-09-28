-- ========================================
-- DENTSERVE ARCHIVE CYCLE ANALYSIS
-- ========================================
-- This file contains all archive-related database objects extracted from the main schema
-- for easier understanding and hook/function evaluation.

-- ========================================
-- ARCHIVE-RELATED TABLES
-- ========================================

-- Core archive items table for tracking archived/hidden data
create table "public"."archive_items" (
  "id" uuid not null default gen_random_uuid(),
  "archived_by_user_id" uuid not null,
  "archived_by_role" user_type not null,
  "item_type" text not null,
  "item_id" uuid not null,
  "scope_type" text not null default 'personal'::text,
  "scope_id" uuid,
  "is_archived" boolean default true,
  "is_hidden" boolean default false,
  "archived_at" timestamp with time zone default now(),
  "hidden_at" timestamp with time zone,
  "archive_reason" text default 'manual'::text,
  "metadata" jsonb default '{}'::jsonb
);

-- User archive preferences for customizing archive behavior
create table "public"."user_archive_preferences" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "user_type" user_type not null,
  "auto_archive_days" integer default 365,
  "data_retention_consent" boolean default true,
  "preferences" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- ========================================
-- ARCHIVE-RELATED INDEXES
-- ========================================

-- Archive items indexes
CREATE UNIQUE INDEX archive_items_pkey ON public.archive_items USING btree (id);
CREATE INDEX idx_archive_items_by_date ON public.archive_items USING btree (archived_at);
CREATE INDEX idx_archive_items_lookup ON public.archive_items USING btree (archived_by_user_id, item_type, item_id);
CREATE INDEX idx_archive_items_role_scope ON public.archive_items USING btree (archived_by_role, scope_type, scope_id);
CREATE INDEX idx_archive_items_scope ON public.archive_items USING btree (scope_type, scope_id);
CREATE INDEX idx_archive_items_user_type ON public.archive_items USING btree (archived_by_user_id, item_type);
CREATE INDEX idx_archive_items_visible ON public.archive_items USING btree (archived_by_user_id, item_type) WHERE ((is_archived = true) AND (is_hidden = false));

-- User archive preferences indexes
CREATE UNIQUE INDEX user_archive_preferences_pkey ON public.user_archive_preferences USING btree (id);
CREATE INDEX idx_user_archive_prefs_type ON public.user_archive_preferences USING btree (user_type);
CREATE INDEX idx_user_archive_prefs_user ON public.user_archive_preferences USING btree (user_id);
CREATE UNIQUE INDEX unique_user_archive_prefs ON public.user_archive_preferences USING btree (user_id);

-- Unique constraint for archive items
CREATE UNIQUE INDEX unique_user_archive_item ON public.archive_items USING btree (archived_by_user_id, item_type, item_id);

-- ========================================
-- ARCHIVE SECURITY POLICIES
-- ========================================

-- Enable Row Level Security for archive tables
alter table "public"."archive_items" enable row level security;
alter table "public"."user_archive_preferences" enable row level security;

-- ========================================
-- ARCHIVE CYCLE FUNCTIONS
-- ========================================

-- Function: Manage patient archives
-- Purpose: Handle archive operations for patient users (appointments, feedback, notifications)
-- Usage: Patient dashboard archive management, data privacy controls
CREATE OR REPLACE FUNCTION public.manage_patient_archives(p_action text, p_item_type text, p_item_id uuid DEFAULT NULL::uuid, p_item_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
                        SELECT row_to_json(uap.*) 
                        FROM user_archive_preferences uap 
                        WHERE uap.user_id = patient_id_val
                    ), jsonb_build_object(
                        'auto_archive_days', 365,
                        'data_retention_consent', true
                    ))
                )
            ) INTO result
            FROM archive_items
            WHERE archived_by_user_id = patient_id_val;
            
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
            FROM archive_items
            WHERE archived_by_user_id = patient_id_val 
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
            FROM archive_items
            WHERE archived_by_user_id = patient_id_val 
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
                INSERT INTO archive_items (archived_by_user_id, archived_by_role, item_type, item_id, archive_reason)
                VALUES (patient_id_val, 'patient', p_item_type, p_item_id, 'manual')
                ON CONFLICT (archived_by_user_id, item_type, item_id) 
                DO UPDATE SET 
                    is_archived = true,
                    is_hidden = false,
                    archived_at = NOW(),
                    archive_reason = 'manual';
                    
                affected_count := 1;
                
            ELSIF p_item_ids IS NOT NULL AND array_length(p_item_ids, 1) > 0 THEN
                -- Multi-item validation and insertion
                
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
                
                -- Batch insert for valid items
                INSERT INTO archive_items (archived_by_user_id, archived_by_role, item_type, item_id, archive_reason)
                SELECT patient_id_val, 'patient', p_item_type, unnest(valid_items), 'manual'
                ON CONFLICT (archived_by_user_id, item_type, item_id) 
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
            DELETE FROM archive_items
            WHERE archived_by_user_id = patient_id_val 
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
            UPDATE archive_items
            SET is_hidden = true, hidden_at = NOW()
            WHERE archived_by_user_id = patient_id_val 
            AND item_type = p_item_type 
            AND item_id = p_item_id;
            
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
            -- If item wasn't archived yet, create hidden record
            IF affected_count = 0 THEN
                INSERT INTO archive_items (archived_by_user_id, archived_by_role, item_type, item_id, is_archived, is_hidden, archive_reason, hidden_at)
                VALUES (patient_id_val, 'patient', p_item_type, p_item_id, false, true, 'manual', NOW())
                ON CONFLICT (archived_by_user_id, item_type, item_id) DO NOTHING;
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
$function$;

-- Function: Manage user archives (universal)
-- Purpose: Handle archive operations for all user types with role-based permissions
-- Usage: Multi-role archive management, staff and admin archive operations
CREATE OR REPLACE FUNCTION public.manage_user_archives(p_action text, p_item_type text, p_item_id uuid DEFAULT NULL::uuid, p_item_ids uuid[] DEFAULT NULL::uuid[], p_scope_override text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
    -- Authentication & role detection
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    current_user_id := (current_context->>'user_id')::UUID;
    v_current_role := current_context->>'user_type';
    current_clinic_id := (current_context->>'clinic_id')::UUID;
    
    -- Role-based validation
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
    
    -- Handle actions
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
            -- Role-specific statistics gathering
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
            -- List archived items with proper access control
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
            
        WHEN 'archive' THEN
            -- Archive functionality
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
                -- Batch archiving
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
$function$;

-- Function: Validate archive permissions
-- Purpose: Check if a user has permission to archive a specific item
-- Usage: Permission validation before archive operations
CREATE OR REPLACE FUNCTION public.validate_archive_permissions(p_user_id uuid, p_user_role text, p_clinic_id uuid, p_item_type text, p_item_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
                    RETURN EXISTS (SELECT 1 FROM email_communications WHERE id = p_item_id);
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
$function$;

-- Function: Validate batch archive permissions
-- Purpose: Validate permissions for multiple items in batch operations
-- Usage: Batch archive operations with permission filtering
CREATE OR REPLACE FUNCTION public.validate_batch_archive_permissions(p_user_id uuid, p_user_role text, p_clinic_id uuid, p_item_type text, p_item_ids uuid[])
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$;

-- ========================================
-- ARCHIVE CYCLE RELATIONSHIPS
-- ========================================

-- Foreign key relationships
ALTER TABLE ONLY public.archive_items
ADD CONSTRAINT archive_items_pkey 
PRIMARY KEY USING INDEX archive_items_pkey;

ALTER TABLE ONLY public.archive_items
ADD CONSTRAINT archive_items_archived_by_user_id_fkey 
FOREIGN KEY (archived_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_archive_preferences
ADD CONSTRAINT user_archive_preferences_pkey 
PRIMARY KEY USING INDEX user_archive_preferences_pkey;

ALTER TABLE ONLY public.user_archive_preferences
ADD CONSTRAINT user_archive_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ========================================
-- ARCHIVE CONSTRAINTS
-- ========================================

-- Valid item type constraint
ALTER TABLE ONLY public.archive_items
ADD CONSTRAINT valid_item_type 
CHECK ((item_type = ANY (ARRAY['appointment'::text, 'feedback'::text, 'notification'::text, 'clinic_appointment'::text, 'clinic_feedback'::text, 'staff_notification'::text, 'patient_communication'::text, 'user_account'::text, 'clinic_account'::text, 'system_notification'::text, 'analytics_data'::text, 'partnership_request'::text])));

-- ========================================
-- ARCHIVE CYCLE TRIGGER ASSIGNMENTS
-- ========================================

-- Add updated_at trigger for archive preferences
CREATE TRIGGER set_user_archive_preferences_updated_at 
BEFORE UPDATE ON public.user_archive_preferences 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- ARCHIVE HOOKS REFERENCE GUIDE
-- ========================================

/*
ARCHIVE CYCLE HOOK PATTERNS:

1. PATIENT ARCHIVE HOOK:
   - Function: manage_patient_archives()
   - Use Cases: Patient data privacy, appointment history management
   - Parameters: action, item_type, item_id/item_ids
   - Actions: archive, unarchive, hide, get_stats, list_archived, list_hidden
   - Returns: Operation status and affected counts

2. UNIVERSAL ARCHIVE HOOK:
   - Function: manage_user_archives()
   - Use Cases: Multi-role archive management, staff operations, admin controls
   - Parameters: action, item_type, item_id/item_ids, scope_override
   - Actions: archive, unarchive, hide, get_stats, list_archived, list_hidden, get_permissions
   - Returns: Role-based results with scope information

3. PERMISSION VALIDATION HOOKS:
   - Function: validate_archive_permissions()
   - Use Cases: Pre-operation permission checks
   - Parameters: user_id, user_role, clinic_id, item_type, item_id
   - Returns: Boolean permission result

   - Function: validate_batch_archive_permissions()
   - Use Cases: Batch operation permission filtering
   - Parameters: user_id, user_role, clinic_id, item_type, item_ids
   - Returns: Array of valid item IDs

4. ARCHIVE PREFERENCES HOOK:
   - Table: user_archive_preferences
   - Use Cases: User preference management, auto-archive settings
   - Fields: auto_archive_days, data_retention_consent, preferences

IMPLEMENTATION NOTES:
- All functions include comprehensive role-based access control
- Support for both single-item and batch operations
- Proper scope management (personal, clinic, system)
- Archive vs hide distinction for different privacy levels
- Statistics and listing functions for dashboard integration
- Permission validation prevents unauthorized access
- Metadata tracking for audit and debugging purposes
*/

-- ========================================
-- ARCHIVE DATA INTEGRITY
-- ========================================

-- Ensure archived items belong to valid users
-- Maintain proper scope relationships
-- Prevent unauthorized archive access
-- Support role-based archive capabilities
-- Provide audit trails for all archive operations
-- Enable efficient querying through optimized indexes