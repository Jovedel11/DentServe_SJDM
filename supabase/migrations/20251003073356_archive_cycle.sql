-- =====================================================
-- ARCHIVE CYCLE MANAGEMENT SYSTEM
-- Complete data archiving and retention functionality
-- =====================================================

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- Archive reason enum (if not exists)
DO $$ BEGIN
    CREATE TYPE archive_reason AS ENUM ('manual', 'auto', 'policy', 'cascade', 'retention', 'cleanup', 'gdpr');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Scope type enum (if not exists)
DO $$ BEGIN
    CREATE TYPE scope_type AS ENUM ('personal', 'clinic', 'system', 'global');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Item type enum (if not exists)
DO $$ BEGIN
    CREATE TYPE archive_item_type AS ENUM (
        'appointment', 'feedback', 'notification', 'clinic_appointment', 
        'clinic_feedback', 'staff_notification', 'patient_communication', 
        'user_account', 'clinic_account', 'system_notification', 
        'analytics_data', 'partnership_request', 'medical_record',
        'file_upload', 'email_communication', 'audit_log'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE ARCHIVE TABLES
-- =====================================================

-- Main archive items table
CREATE TABLE IF NOT EXISTS archive_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archived_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    archived_by_role user_type NOT NULL,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    scope_type TEXT NOT NULL DEFAULT 'personal',
    scope_id UUID,
    is_archived BOOLEAN DEFAULT TRUE,
    is_hidden BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    hidden_at TIMESTAMPTZ,
    archive_reason TEXT DEFAULT 'manual',
    metadata JSONB DEFAULT '{}',
    original_data JSONB DEFAULT '{}', -- Store original data for recovery
    expiry_date DATE, -- When the archived item should be permanently deleted
    auto_delete_after_days INTEGER DEFAULT 2555, -- 7 years default retention
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(archived_by_user_id, item_type, item_id),
    CONSTRAINT valid_archive_reason CHECK (archive_reason IN ('manual', 'auto', 'policy', 'cascade', 'retention', 'cleanup', 'gdpr')),
    CONSTRAINT valid_scope_type CHECK (scope_type IN ('personal', 'clinic', 'system', 'global')),
    CONSTRAINT valid_item_type CHECK (item_type IN (
        'appointment', 'feedback', 'notification', 'clinic_appointment', 
        'clinic_feedback', 'staff_notification', 'patient_communication', 
        'user_account', 'clinic_account', 'system_notification', 
        'analytics_data', 'partnership_request', 'medical_record',
        'file_upload', 'email_communication', 'audit_log'
    ))
);

-- User archive preferences
CREATE TABLE IF NOT EXISTS user_archive_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_type user_type NOT NULL,
    auto_archive_days INTEGER DEFAULT 365,
    auto_delete_days INTEGER DEFAULT 2555, -- 7 years
    data_retention_consent BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{
        "archive_notifications": true,
        "deletion_warnings": true,
        "retention_reminders": true
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id),
    CONSTRAINT valid_auto_archive_days CHECK (auto_archive_days > 0),
    CONSTRAINT valid_auto_delete_days CHECK (auto_delete_days > auto_archive_days)
);

-- Archive audit log
CREATE TABLE IF NOT EXISTS archive_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL, -- 'archive', 'unarchive', 'hide', 'delete', 'restore'
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    performed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    performed_by_role user_type NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archive statistics cache
CREATE TABLE IF NOT EXISTS archive_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL,
    statistics_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_archived INTEGER DEFAULT 0,
    total_hidden INTEGER DEFAULT 0,
    total_deleted INTEGER DEFAULT 0,
    by_item_type JSONB DEFAULT '{}',
    by_archive_reason JSONB DEFAULT '{}',
    storage_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, clinic_id, scope_type, statistics_date)
);

-- Archive retention policies
CREATE TABLE IF NOT EXISTS archive_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(200) NOT NULL,
    item_type TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    auto_archive_days INTEGER,
    auto_delete_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    applies_to_user_types user_type[],
    policy_rules JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Archive items indexes
CREATE INDEX IF NOT EXISTS idx_archive_items_user_type ON archive_items(archived_by_user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_archive_items_visible ON archive_items(archived_by_user_id, item_type) WHERE is_archived = TRUE AND is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_archive_items_by_date ON archive_items(archived_at);
CREATE INDEX IF NOT EXISTS idx_archive_items_lookup ON archive_items(archived_by_user_id, item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_archive_items_scope ON archive_items(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_archive_items_role_scope ON archive_items(archived_by_role, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_archive_items_expiry ON archive_items(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_archive_items_cleanup ON archive_items(archived_at, auto_delete_after_days) WHERE is_archived = TRUE;

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_archive_prefs_user ON user_archive_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_archive_prefs_type ON user_archive_preferences(user_type);
CREATE INDEX IF NOT EXISTS idx_user_archive_prefs_auto_archive ON user_archive_preferences(auto_archive_days);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_archive_audit_user_date ON archive_audit_log(performed_by_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_audit_item ON archive_audit_log(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_archive_audit_action_date ON archive_audit_log(action_type, created_at DESC);

-- Statistics indexes
CREATE INDEX IF NOT EXISTS idx_archive_stats_user_date ON archive_statistics(user_id, statistics_date DESC);
CREATE INDEX IF NOT EXISTS idx_archive_stats_clinic_date ON archive_statistics(clinic_id, statistics_date DESC);
CREATE INDEX IF NOT EXISTS idx_archive_stats_scope ON archive_statistics(scope_type, statistics_date DESC);

-- Retention policies indexes
CREATE INDEX IF NOT EXISTS idx_retention_policies_item_type ON archive_retention_policies(item_type, is_active);
CREATE INDEX IF NOT EXISTS idx_retention_policies_scope ON archive_retention_policies(scope_type, is_active);

-- =====================================================
-- CORE ARCHIVE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function: Manage User Archives
CREATE OR REPLACE FUNCTION manage_user_archives(
    p_action TEXT,
    p_item_type TEXT,
    p_item_id UUID DEFAULT NULL,
    p_item_ids UUID[] DEFAULT NULL,
    p_scope_override TEXT DEFAULT NULL,
    p_archive_reason TEXT DEFAULT 'manual',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
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
    item_record RECORD;
    original_data JSONB;
BEGIN
    -- Authentication & role detection
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Authentication required');
    END IF;
    
    current_user_id := (current_context->>'user_id')::UUID;
    v_current_role := current_context->>'user_type';
    current_clinic_id := (current_context->>'clinic_id')::UUID;
    
    -- Role-based validation and permissions
    CASE v_current_role
        WHEN 'patient' THEN
            allowed_item_types := ARRAY['appointment', 'feedback', 'notification', 'medical_record'];
            scope_type_val := 'personal';
            scope_id_val := NULL;
            
        WHEN 'staff' THEN
            allowed_item_types := ARRAY[
                'appointment', 'feedback', 'notification', 'clinic_appointment', 
                'clinic_feedback', 'staff_notification', 'patient_communication',
                'medical_record', 'file_upload'
            ];
            scope_type_val := 'clinic';
            scope_id_val := current_clinic_id;
            
            IF current_clinic_id IS NULL THEN
                RETURN jsonb_build_object('success', FALSE, 'error', 'Staff user not assigned to a clinic');
            END IF;
            
        WHEN 'admin' THEN
            allowed_item_types := ARRAY[
                'appointment', 'feedback', 'notification', 'clinic_appointment', 
                'clinic_feedback', 'staff_notification', 'patient_communication', 
                'user_account', 'clinic_account', 'system_notification', 
                'analytics_data', 'partnership_request', 'medical_record',
                'file_upload', 'email_communication', 'audit_log'
            ];
            scope_type_val := COALESCE(p_scope_override, 'system');
            scope_id_val := NULL;
            
        ELSE
            RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid user role');
    END CASE;
    
    -- Validate parameters
    IF p_action NOT IN ('archive', 'unarchive', 'hide', 'unhide', 'delete', 'restore', 'get_stats', 'list_archived', 'list_hidden', 'get_permissions', 'bulk_cleanup') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid action');
    END IF;
    
    IF p_item_type IS NOT NULL AND NOT (p_item_type = ANY(allowed_item_types)) THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', format('Item type "%s" not allowed for %s role', p_item_type, v_current_role),
            'allowed_types', allowed_item_types
        );
    END IF;
    
    -- Handle actions
    CASE p_action
        WHEN 'get_permissions' THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'data', jsonb_build_object(
                    'role', v_current_role,
                    'allowed_item_types', allowed_item_types,
                    'scope_type', scope_type_val,
                    'scope_id', scope_id_val,
                    'capabilities', CASE v_current_role
                        WHEN 'patient' THEN jsonb_build_object(
                            'can_archive_own_data', TRUE,
                            'can_view_own_archives', TRUE,
                            'can_restore_own_data', TRUE,
                            'can_permanently_delete', FALSE
                        )
                        WHEN 'staff' THEN jsonb_build_object(
                            'can_archive_clinic_data', TRUE,
                            'can_view_clinic_archives', TRUE,
                            'can_restore_clinic_data', TRUE,
                            'can_permanently_delete', FALSE,
                            'can_bulk_operations', TRUE
                        )
                        WHEN 'admin' THEN jsonb_build_object(
                            'can_archive_any_data', TRUE,
                            'can_view_all_archives', TRUE,
                            'can_restore_any_data', TRUE,
                            'can_permanently_delete', TRUE,
                            'can_bulk_operations', TRUE,
                            'can_manage_policies', TRUE
                        )
                    END
                )
            );
            
        WHEN 'get_stats' THEN
            -- Get comprehensive archive statistics
            WITH archive_stats AS (
                SELECT 
                    COUNT(*) FILTER (WHERE is_archived = TRUE AND is_hidden = FALSE) as archived_count,
                    COUNT(*) FILTER (WHERE is_hidden = TRUE) as hidden_count,
                    COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE) as expired_count,
                    jsonb_object_agg(
                        item_type, 
                        COUNT(*) FILTER (WHERE is_archived = TRUE)
                    ) as by_item_type,
                    jsonb_object_agg(
                        archive_reason,
                        COUNT(*)
                    ) as by_reason,
                    MIN(archived_at) as oldest_archive,
                    MAX(archived_at) as newest_archive,
                    SUM(COALESCE(jsonb_array_length(original_data), 0)) as total_items_archived
                FROM archive_items
                WHERE archived_by_user_id = current_user_id
                    AND (p_item_type IS NULL OR item_type = p_item_type)
            ),
            user_prefs AS (
                SELECT 
                    auto_archive_days,
                    auto_delete_days,
                    data_retention_consent,
                    preferences,
                    notification_preferences
                FROM user_archive_preferences
                WHERE user_id = current_user_id
            )
            SELECT jsonb_build_object(
                'success', TRUE,
                'data', jsonb_build_object(
                    'statistics', jsonb_build_object(
                        'archived_count', COALESCE(archived_count, 0),
                        'hidden_count', COALESCE(hidden_count, 0),
                        'expired_count', COALESCE(expired_count, 0),
                        'by_item_type', COALESCE(by_item_type, '{}'::jsonb),
                        'by_reason', COALESCE(by_reason, '{}'::jsonb),
                        'oldest_archive', oldest_archive,
                        'newest_archive', newest_archive,
                        'total_items_archived', COALESCE(total_items_archived, 0)
                    ),
                    'preferences', COALESCE(
                        (SELECT jsonb_build_object(
                            'auto_archive_days', auto_archive_days,
                            'auto_delete_days', auto_delete_days,
                            'data_retention_consent', data_retention_consent,
                            'preferences', preferences,
                            'notification_preferences', notification_preferences
                        ) FROM user_prefs),
                        jsonb_build_object(
                            'auto_archive_days', 365,
                            'auto_delete_days', 2555,
                            'data_retention_consent', TRUE,
                            'preferences', '{}',
                            'notification_preferences', '{
                                "archive_notifications": true,
                                "deletion_warnings": true,
                                "retention_reminders": true
                            }'
                        )
                    )
                )
            ) INTO result
            FROM archive_stats;
            
            RETURN result;
            
        WHEN 'list_archived' THEN
            -- List archived items (not hidden)
            SELECT jsonb_build_object(
                'success', TRUE,
                'data', jsonb_build_object(
                    'archived_items', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'item_type', item_type,
                            'item_id', item_id,
                            'archived_at', archived_at,
                            'archive_reason', archive_reason,
                            'metadata', metadata,
                            'expiry_date', expiry_date,
                            'can_restore', TRUE,
                            'size_estimate', COALESCE(jsonb_array_length(original_data), 0)
                        )
                        ORDER BY archived_at DESC
                    ), '[]'::jsonb),
                    'total_count', COUNT(*)
                )
            ) INTO result
            FROM archive_items
            WHERE archived_by_user_id = current_user_id 
                AND (p_item_type IS NULL OR item_type = p_item_type)
                AND is_archived = TRUE 
                AND is_hidden = FALSE;
            
            RETURN result;
            
        WHEN 'list_hidden' THEN
            -- List hidden items
            SELECT jsonb_build_object(
                'success', TRUE,
                'data', jsonb_build_object(
                    'hidden_items', COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'item_type', item_type,
                            'item_id', item_id,
                            'archived_at', archived_at,
                            'hidden_at', hidden_at,
                            'archive_reason', archive_reason,
                            'metadata', metadata
                        )
                        ORDER BY hidden_at DESC
                    ), '[]'::jsonb),
                    'total_count', COUNT(*)
                )
            ) INTO result
            FROM archive_items
            WHERE archived_by_user_id = current_user_id 
                AND (p_item_type IS NULL OR item_type = p_item_type)
                AND is_hidden = TRUE;
            
            RETURN result;
            
        WHEN 'archive' THEN
            -- Validate permissions and get valid items
            IF p_item_ids IS NOT NULL THEN
                valid_items := validate_batch_archive_permissions(
                    current_user_id, v_current_role, current_clinic_id, p_item_type, p_item_ids
                );
            ELSIF p_item_id IS NOT NULL THEN
                IF validate_archive_permissions(current_user_id, v_current_role, current_clinic_id, p_item_type, p_item_id) THEN
                    valid_items := ARRAY[p_item_id];
                END IF;
            END IF;
            
            IF valid_items IS NULL OR array_length(valid_items, 1) = 0 THEN
                RETURN jsonb_build_object('success', FALSE, 'error', 'No valid items to archive or permission denied');
            END IF;
            
            -- Archive items
            FOR item_record IN 
                SELECT unnest(valid_items) as item_id
            LOOP
                -- Get original data for backup
                original_data := get_item_original_data(p_item_type, item_record.item_id);
                
                -- Insert or update archive record
                INSERT INTO archive_items (
                    archived_by_user_id,
                    archived_by_role,
                    item_type,
                    item_id,
                    scope_type,
                    scope_id,
                    is_archived,
                    archive_reason,
                    metadata,
                    original_data,
                    expiry_date,
                    auto_delete_after_days
                ) VALUES (
                    current_user_id,
                    v_current_role::user_type,
                    p_item_type,
                    item_record.item_id,
                    scope_type_val,
                    scope_id_val,
                    TRUE,
                    p_archive_reason,
                    p_metadata,
                    original_data,
                    CURRENT_DATE + INTERVAL '7 years', -- Default 7 year retention
                    2555
                )
                ON CONFLICT (archived_by_user_id, item_type, item_id)
                DO UPDATE SET
                    is_archived = TRUE,
                    is_hidden = FALSE,
                    archived_at = NOW(),
                    archive_reason = p_archive_reason,
                    metadata = p_metadata,
                    updated_at = NOW();
                
                affected_count := affected_count + 1;
                
                -- Log the action
                INSERT INTO archive_audit_log (
                    action_type,
                    item_type,
                    item_id,
                    performed_by_user_id,
                    performed_by_role,
                    reason,
                    metadata
                ) VALUES (
                    'archive',
                    p_item_type,
                    item_record.item_id,
                    current_user_id,
                    v_current_role::user_type,
                    p_archive_reason,
                    p_metadata
                );
            END LOOP;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'message', format('%s items archived successfully', affected_count),
                'data', jsonb_build_object(
                    'affected_count', affected_count,
                    'archived_items', valid_items,
                    'archive_reason', p_archive_reason
                )
            );
            
        WHEN 'unarchive' THEN
            -- Unarchive items (restore from archive)
            IF p_item_ids IS NOT NULL THEN
                UPDATE archive_items 
                SET 
                    is_archived = FALSE,
                    is_hidden = FALSE,
                    updated_at = NOW()
                WHERE archived_by_user_id = current_user_id
                    AND item_type = p_item_type
                    AND item_id = ANY(p_item_ids)
                    AND is_archived = TRUE;
                
                GET DIAGNOSTICS affected_count = ROW_COUNT;
                
                -- Log the actions
                INSERT INTO archive_audit_log (
                    action_type, item_type, item_id, performed_by_user_id, 
                    performed_by_role, reason, metadata
                )
                SELECT 
                    'unarchive', p_item_type, unnest(p_item_ids), current_user_id,
                    v_current_role::user_type, 'Manual restore', p_metadata;
                    
            ELSIF p_item_id IS NOT NULL THEN
                UPDATE archive_items 
                SET 
                    is_archived = FALSE,
                    is_hidden = FALSE,
                    updated_at = NOW()
                WHERE archived_by_user_id = current_user_id
                    AND item_type = p_item_type
                    AND item_id = p_item_id
                    AND is_archived = TRUE;
                
                GET DIAGNOSTICS affected_count = ROW_COUNT;
                
                -- Log the action
                INSERT INTO archive_audit_log (
                    action_type, item_type, item_id, performed_by_user_id, 
                    performed_by_role, reason, metadata
                ) VALUES (
                    'unarchive', p_item_type, p_item_id, current_user_id,
                    v_current_role::user_type, 'Manual restore', p_metadata
                );
            END IF;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'message', format('%s items unarchived successfully', affected_count),
                'data', jsonb_build_object('affected_count', affected_count)
            );
            
        WHEN 'hide' THEN
            -- Hide items (make them invisible but keep archived)
            IF p_item_ids IS NOT NULL THEN
                UPDATE archive_items 
                SET 
                    is_hidden = TRUE,
                    hidden_at = NOW(),
                    updated_at = NOW()
                WHERE archived_by_user_id = current_user_id
                    AND item_type = p_item_type
                    AND item_id = ANY(p_item_ids);
                    
                GET DIAGNOSTICS affected_count = ROW_COUNT;
            ELSIF p_item_id IS NOT NULL THEN
                UPDATE archive_items 
                SET 
                    is_hidden = TRUE,
                    hidden_at = NOW(),
                    updated_at = NOW()
                WHERE archived_by_user_id = current_user_id
                    AND item_type = p_item_type
                    AND item_id = p_item_id;
                    
                GET DIAGNOSTICS affected_count = ROW_COUNT;
            END IF;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'message', format('%s items hidden successfully', affected_count),
                'data', jsonb_build_object('affected_count', affected_count)
            );
            
        WHEN 'unhide' THEN
            -- Unhide items
            IF p_item_ids IS NOT NULL THEN
                UPDATE archive_items 
                SET 
                    is_hidden = FALSE,
                    hidden_at = NULL,
                    updated_at = NOW()
                WHERE archived_by_user_id = current_user_id
                    AND item_type = p_item_type
                    AND item_id = ANY(p_item_ids)
                    AND is_hidden = TRUE;
                    
                GET DIAGNOSTICS affected_count = ROW_COUNT;
            ELSIF p_item_id IS NOT NULL THEN
                UPDATE archive_items 
                SET 
                    is_hidden = FALSE,
                    hidden_at = NULL,
                    updated_at = NOW()
                WHERE archived_by_user_id = current_user_id
                    AND item_type = p_item_type
                    AND item_id = p_item_id
                    AND is_hidden = TRUE;
                    
                GET DIAGNOSTICS affected_count = ROW_COUNT;
            END IF;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'message', format('%s items unhidden successfully', affected_count),
                'data', jsonb_build_object('affected_count', affected_count)
            );
            
        WHEN 'delete' THEN
            -- Permanent deletion (admin only)
            IF v_current_role != 'admin' THEN
                RETURN jsonb_build_object('success', FALSE, 'error', 'Permanent deletion requires admin privileges');
            END IF;
            
            -- Log before deletion
            INSERT INTO archive_audit_log (
                action_type, item_type, item_id, performed_by_user_id, 
                performed_by_role, reason, metadata
            )
            SELECT 
                'delete', p_item_type, 
                CASE WHEN p_item_ids IS NOT NULL THEN unnest(p_item_ids) ELSE p_item_id END,
                current_user_id, v_current_role::user_type, 'Permanent deletion', p_metadata;
            
            -- Delete archive records
            IF p_item_ids IS NOT NULL THEN
                DELETE FROM archive_items 
                WHERE item_type = p_item_type
                    AND item_id = ANY(p_item_ids);
                    
                GET DIAGNOSTICS affected_count = ROW_COUNT;
            ELSIF p_item_id IS NOT NULL THEN
                DELETE FROM archive_items 
                WHERE item_type = p_item_type
                    AND item_id = p_item_id;
                    
                GET DIAGNOSTICS affected_count = ROW_COUNT;
            END IF;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'message', format('%s items permanently deleted', affected_count),
                'data', jsonb_build_object('affected_count', affected_count)
            );
            
        WHEN 'bulk_cleanup' THEN
            -- Bulk cleanup of expired items
            IF v_current_role NOT IN ('admin', 'staff') THEN
                RETURN jsonb_build_object('success', FALSE, 'error', 'Bulk cleanup requires staff or admin privileges');
            END IF;
            
            -- Delete expired items
            DELETE FROM archive_items 
            WHERE expiry_date <= CURRENT_DATE
                AND (v_current_role = 'admin' OR 
                     (v_current_role = 'staff' AND scope_id = current_clinic_id));
                     
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
            RETURN jsonb_build_object(
                'success', TRUE,
                'message', format('%s expired items cleaned up', affected_count),
                'data', jsonb_build_object('affected_count', affected_count)
            );
            
        ELSE
            RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown action');
    END CASE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in manage_user_archives: %', SQLERRM;
        RETURN jsonb_build_object('success', FALSE, 'error', 'Archive operation failed');
END;
$$;

-- Function: Validate Archive Permissions
CREATE OR REPLACE FUNCTION validate_archive_permissions(
    p_user_id UUID,
    p_user_role TEXT,
    p_clinic_id UUID,
    p_item_type TEXT,
    p_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $$
BEGIN
    CASE p_user_role
        WHEN 'patient' THEN
            -- Patients can only archive their own data
            CASE p_item_type
                WHEN 'appointment' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM appointments 
                        WHERE id = p_item_id 
                            AND patient_id = p_user_id 
                            AND status IN ('completed', 'cancelled', 'no_show')
                    );
                WHEN 'feedback' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM feedback 
                        WHERE id = p_item_id AND patient_id = p_user_id
                    );
                WHEN 'notification' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM notifications 
                        WHERE id = p_item_id AND user_id = p_user_id
                    );
                WHEN 'medical_record' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM patient_medical_history 
                        WHERE id = p_item_id AND patient_id = p_user_id
                    );
                ELSE
                    RETURN FALSE;
            END CASE;
            
        WHEN 'staff' THEN
            -- Staff can archive clinic-scoped data
            CASE p_item_type
                WHEN 'appointment', 'clinic_appointment' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM appointments 
                        WHERE id = p_item_id AND clinic_id = p_clinic_id
                    );
                WHEN 'feedback', 'clinic_feedback' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM feedback 
                        WHERE id = p_item_id AND clinic_id = p_clinic_id
                    );
                WHEN 'staff_notification' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM notifications 
                        WHERE id = p_item_id AND user_id IN (
                            SELECT u.id FROM users u 
                            JOIN user_profiles up ON u.id = up.user_id 
                            JOIN staff_profiles sp ON up.id = sp.user_profile_id 
                            WHERE sp.clinic_id = p_clinic_id
                        )
                    );
                WHEN 'patient_communication' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM email_communications 
                        WHERE id = p_item_id 
                            AND (from_clinic_id = p_clinic_id OR to_clinic_id = p_clinic_id)
                    );
                WHEN 'medical_record' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM patient_medical_history pmh
                        JOIN appointments a ON pmh.appointment_id = a.id
                        WHERE pmh.id = p_item_id AND a.clinic_id = p_clinic_id
                    );
                WHEN 'file_upload' THEN
                    RETURN EXISTS (
                        SELECT 1 FROM file_uploads 
                        WHERE id = p_item_id 
                            AND user_id IN (
                                SELECT u.id FROM users u 
                                JOIN user_profiles up ON u.id = up.user_id 
                                JOIN staff_profiles sp ON up.id = sp.user_profile_id 
                                WHERE sp.clinic_id = p_clinic_id
                            )
                    );
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

-- Function: Validate Batch Archive Permissions
CREATE OR REPLACE FUNCTION validate_batch_archive_permissions(
    p_user_id UUID,
    p_user_role TEXT,
    p_clinic_id UUID,
    p_item_type TEXT,
    p_item_ids UUID[]
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
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
                    WHERE id = ANY(p_item_ids) 
                        AND patient_id = p_user_id 
                        AND status IN ('completed', 'cancelled', 'no_show');
                WHEN 'feedback' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM feedback 
                    WHERE id = ANY(p_item_ids) AND patient_id = p_user_id;
                WHEN 'notification' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM notifications 
                    WHERE id = ANY(p_item_ids) AND user_id = p_user_id;
                WHEN 'medical_record' THEN
                    SELECT array_agg(id) INTO valid_items
                    FROM patient_medical_history 
                    WHERE id = ANY(p_item_ids) AND patient_id = p_user_id;
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
                WHEN 'medical_record' THEN
                    SELECT array_agg(pmh.id) INTO valid_items
                    FROM patient_medical_history pmh
                    JOIN appointments a ON pmh.appointment_id = a.id
                    WHERE pmh.id = ANY(p_item_ids) AND a.clinic_id = p_clinic_id;
            END CASE;
            
        WHEN 'admin' THEN
            -- Admin can archive anything - return all items
            valid_items := p_item_ids;
    END CASE;
    
    RETURN COALESCE(valid_items, ARRAY[]::UUID[]);
END;
$$;

-- Function: Get Item Original Data
CREATE OR REPLACE FUNCTION get_item_original_data(
    p_item_type TEXT,
    p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    original_data JSONB;
BEGIN
    CASE p_item_type
        WHEN 'appointment' THEN
            SELECT to_jsonb(a.*) INTO original_data
            FROM appointments a
            WHERE a.id = p_item_id;
            
        WHEN 'feedback' THEN
            SELECT to_jsonb(f.*) INTO original_data
            FROM feedback f
            WHERE f.id = p_item_id;
            
        WHEN 'notification' THEN
            SELECT to_jsonb(n.*) INTO original_data
            FROM notifications n
            WHERE n.id = p_item_id;
            
        WHEN 'medical_record' THEN
            SELECT to_jsonb(pmh.*) INTO original_data
            FROM patient_medical_history pmh
            WHERE pmh.id = p_item_id;
            
        WHEN 'file_upload' THEN
            SELECT to_jsonb(fu.*) INTO original_data
            FROM file_uploads fu
            WHERE fu.id = p_item_id;
            
        WHEN 'email_communication' THEN
            SELECT to_jsonb(ec.*) INTO original_data
            FROM email_communications ec
            WHERE ec.id = p_item_id;
            
        ELSE
            original_data := '{}';
    END CASE;
    
    RETURN COALESCE(original_data, '{}');
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '{}';
END;
$$;

-- =====================================================
-- ARCHIVE PREFERENCES FUNCTIONS
-- =====================================================

-- Function: Update User Archive Preferences
CREATE OR REPLACE FUNCTION update_user_archive_preferences(
    p_preferences JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_context JSONB;
    user_id_val UUID;
    user_type_val user_type;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    user_id_val := (current_context->>'user_id')::UUID;
    user_type_val := (current_context->>'user_type')::user_type;
    
    -- Update or insert preferences
    INSERT INTO user_archive_preferences (
        user_id,
        user_type,
        auto_archive_days,
        auto_delete_days,
        data_retention_consent,
        preferences,
        notification_preferences
    ) VALUES (
        user_id_val,
        user_type_val,
        COALESCE((p_preferences->>'auto_archive_days')::INTEGER, 365),
        COALESCE((p_preferences->>'auto_delete_days')::INTEGER, 2555),
        COALESCE((p_preferences->>'data_retention_consent')::BOOLEAN, TRUE),
        COALESCE(p_preferences->'preferences', '{}'),
        COALESCE(p_preferences->'notification_preferences', '{
            "archive_notifications": true,
            "deletion_warnings": true,
            "retention_reminders": true
        }')
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        auto_archive_days = COALESCE((p_preferences->>'auto_archive_days')::INTEGER, user_archive_preferences.auto_archive_days),
        auto_delete_days = COALESCE((p_preferences->>'auto_delete_days')::INTEGER, user_archive_preferences.auto_delete_days),
        data_retention_consent = COALESCE((p_preferences->>'data_retention_consent')::BOOLEAN, user_archive_preferences.data_retention_consent),
        preferences = COALESCE(p_preferences->'preferences', user_archive_preferences.preferences),
        notification_preferences = COALESCE(p_preferences->'notification_preferences', user_archive_preferences.notification_preferences),
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Archive preferences updated successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Failed to update preferences');
END;
$$;

-- =====================================================
-- AUTOMATED ARCHIVE FUNCTIONS
-- =====================================================

-- Function: Auto Archive Old Items
CREATE OR REPLACE FUNCTION auto_archive_old_items(
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_batch_size INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processed_count INTEGER := 0;
    total_eligible INTEGER := 0;
    batch_result RECORD;
    archive_policies RECORD;
BEGIN
    -- Get total eligible items
    SELECT COUNT(*) INTO total_eligible
    FROM user_archive_preferences uap
    JOIN users u ON uap.user_id = u.id
    WHERE uap.data_retention_consent = TRUE
        AND uap.auto_archive_days > 0;
    
    -- Process each user's auto-archive preferences
    FOR archive_policies IN
        SELECT 
            uap.user_id,
            uap.user_type,
            uap.auto_archive_days,
            uap.preferences
        FROM user_archive_preferences uap
        JOIN users u ON uap.user_id = u.id
        WHERE uap.data_retention_consent = TRUE
            AND uap.auto_archive_days > 0
        LIMIT p_batch_size
    LOOP
        -- Auto-archive appointments
        IF NOT p_dry_run THEN
            INSERT INTO archive_items (
                archived_by_user_id,
                archived_by_role,
                item_type,
                item_id,
                scope_type,
                archive_reason,
                metadata,
                original_data
            )
            SELECT 
                archive_policies.user_id,
                archive_policies.user_type,
                'appointment',
                a.id,
                'personal',
                'auto',
                jsonb_build_object('auto_archived_at', NOW()),
                to_jsonb(a.*)
            FROM appointments a
            WHERE (
                (archive_policies.user_type = 'patient' AND a.patient_id = archive_policies.user_id)
                OR 
                (archive_policies.user_type = 'staff' AND a.doctor_id = archive_policies.user_id)
            )
            AND a.appointment_date < CURRENT_DATE - (archive_policies.auto_archive_days || ' days')::INTERVAL
            AND a.status IN ('completed', 'cancelled', 'no_show')
            AND NOT EXISTS (
                SELECT 1 FROM archive_items ai 
                WHERE ai.item_type = 'appointment' 
                    AND ai.item_id = a.id 
                    AND ai.archived_by_user_id = archive_policies.user_id
            )
            ON CONFLICT (archived_by_user_id, item_type, item_id) DO NOTHING;
        END IF;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', CASE 
            WHEN p_dry_run THEN 'Dry run completed'
            ELSE 'Auto-archive completed'
        END,
        'data', jsonb_build_object(
            'processed_users', processed_count,
            'total_eligible_users', total_eligible,
            'dry_run', p_dry_run
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Auto-archive failed: ' || SQLERRM
        );
END;
$$;

-- Function: Cleanup Expired Archives
CREATE OR REPLACE FUNCTION cleanup_expired_archives(
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_batch_size INTEGER DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    total_expired INTEGER := 0;
BEGIN
    -- Count expired items
    SELECT COUNT(*) INTO total_expired
    FROM archive_items
    WHERE expiry_date <= CURRENT_DATE
        OR (archived_at + (auto_delete_after_days || ' days')::INTERVAL) <= NOW();
    
    IF NOT p_dry_run THEN
        -- Log deletions before removing
        INSERT INTO archive_audit_log (
            action_type,
            item_type,
            item_id,
            performed_by_user_id,
            performed_by_role,
            reason,
            metadata
        )
        SELECT 
            'auto_delete',
            ai.item_type,
            ai.item_id,
            ai.archived_by_user_id,
            'system'::user_type,
            'Expired retention period',
            jsonb_build_object(
                'expiry_date', ai.expiry_date,
                'auto_delete_after_days', ai.auto_delete_after_days,
                'archived_at', ai.archived_at
            )
        FROM archive_items ai
        WHERE (ai.expiry_date <= CURRENT_DATE
            OR (ai.archived_at + (ai.auto_delete_after_days || ' days')::INTERVAL) <= NOW())
        LIMIT p_batch_size;
        
        -- Delete expired items
        DELETE FROM archive_items
        WHERE (expiry_date <= CURRENT_DATE
            OR (archived_at + (auto_delete_after_days || ' days')::INTERVAL) <= NOW())
        AND id IN (
            SELECT id FROM archive_items
            WHERE (expiry_date <= CURRENT_DATE
                OR (archived_at + (auto_delete_after_days || ' days')::INTERVAL) <= NOW())
            LIMIT p_batch_size
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', CASE 
            WHEN p_dry_run THEN 'Cleanup dry run completed'
            ELSE 'Expired archives cleaned up'
        END,
        'data', jsonb_build_object(
            'total_expired', total_expired,
            'deleted_count', deleted_count,
            'dry_run', p_dry_run
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Cleanup failed: ' || SQLERRM
        );
END;
$$;

-- =====================================================
-- ARCHIVE ANALYTICS FUNCTIONS
-- =====================================================

-- Function: Generate Archive Statistics
CREATE OR REPLACE FUNCTION generate_archive_statistics(
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_scope_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_context JSONB;
    date_from DATE;
    date_to DATE;
    result JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- Only admins can view system-wide statistics
    IF (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Access denied: Admin only');
    END IF;
    
    -- Set date range
    date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
    date_to := COALESCE(p_date_to, CURRENT_DATE);
    
    -- Generate comprehensive statistics
    WITH archive_summary AS (
        SELECT 
            COUNT(*) as total_archived_items,
            COUNT(DISTINCT archived_by_user_id) as unique_users_archiving,
            COUNT(*) FILTER (WHERE is_hidden = TRUE) as hidden_items,
            COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE) as expired_items,
            AVG(EXTRACT(DAYS FROM (NOW() - archived_at))) as avg_archive_age_days,
            jsonb_object_agg(item_type, COUNT(*)) as by_item_type,
            jsonb_object_agg(archive_reason, COUNT(*)) as by_reason,
            jsonb_object_agg(archived_by_role, COUNT(*)) as by_role,
            SUM(COALESCE(jsonb_array_length(original_data), 0)) as total_data_points
        FROM archive_items
        WHERE archived_at::DATE BETWEEN date_from AND date_to
            AND (p_scope_type IS NULL OR scope_type = p_scope_type)
    ),
    user_preferences_summary AS (
        SELECT 
            COUNT(*) as total_users_with_preferences,
            COUNT(*) FILTER (WHERE data_retention_consent = TRUE) as users_consented,
            AVG(auto_archive_days) as avg_auto_archive_days,
            AVG(auto_delete_days) as avg_auto_delete_days,
            jsonb_object_agg(user_type, COUNT(*)) as by_user_type
        FROM user_archive_preferences
    ),
    storage_estimates AS (
        SELECT 
            SUM(pg_column_size(original_data)) as estimated_storage_bytes,
            COUNT(*) FILTER (WHERE pg_column_size(original_data) > 1024) as large_items
        FROM archive_items
        WHERE archived_at::DATE BETWEEN date_from AND date_to
    )
    SELECT jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'date_range', jsonb_build_object(
                'from', date_from,
                'to', date_to
            ),
            'archive_summary', (
                SELECT jsonb_build_object(
                    'total_archived_items', total_archived_items,
                    'unique_users_archiving', unique_users_archiving,
                    'hidden_items', hidden_items,
                    'expired_items', expired_items,
                    'avg_archive_age_days', ROUND(avg_archive_age_days::numeric, 1),
                    'by_item_type', by_item_type,
                    'by_reason', by_reason,
                    'by_role', by_role,
                    'total_data_points', total_data_points
                )
                FROM archive_summary
            ),
            'user_preferences', (
                SELECT jsonb_build_object(
                    'total_users_with_preferences', total_users_with_preferences,
                    'users_consented', users_consented,
                    'consent_rate_percent', ROUND((users_consented::numeric / NULLIF(total_users_with_preferences, 0) * 100), 1),
                    'avg_auto_archive_days', ROUND(avg_auto_archive_days::numeric, 0),
                    'avg_auto_delete_days', ROUND(avg_auto_delete_days::numeric, 0),
                    'by_user_type', by_user_type
                )
                FROM user_preferences_summary
            ),
            'storage_estimates', (
                SELECT jsonb_build_object(
                    'estimated_storage_bytes', estimated_storage_bytes,
                    'estimated_storage_mb', ROUND((estimated_storage_bytes::numeric / 1024 / 1024), 2),
                    'large_items_count', large_items
                )
                FROM storage_estimates
            )
        )
    ) INTO result;
    
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Failed to generate archive statistics: ' || SQLERRM
        );
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update archive items timestamp
DROP TRIGGER IF EXISTS update_archive_items_updated_at ON archive_items;
CREATE TRIGGER update_archive_items_updated_at
    BEFORE UPDATE ON archive_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update user archive preferences timestamp
DROP TRIGGER IF EXISTS update_user_archive_preferences_updated_at ON user_archive_preferences;
CREATE TRIGGER update_user_archive_preferences_updated_at
    BEFORE UPDATE ON user_archive_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update archive statistics timestamp
DROP TRIGGER IF EXISTS update_archive_statistics_updated_at ON archive_statistics;
CREATE TRIGGER update_archive_statistics_updated_at
    BEFORE UPDATE ON archive_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update retention policies timestamp
DROP TRIGGER IF EXISTS update_retention_policies_updated_at ON archive_retention_policies;
CREATE TRIGGER update_retention_policies_updated_at
    BEFORE UPDATE ON archive_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE archive_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_archive_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_retention_policies ENABLE ROW LEVEL SECURITY;

-- Archive items policies
DROP POLICY IF EXISTS "archive_items_role_access" ON archive_items;
CREATE POLICY "archive_items_role_access" ON archive_items
    FOR ALL USING (
        -- Users can access their own archived items
        archived_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR
        -- Staff can access clinic-scoped items
        (
            archived_by_role = 'staff' 
            AND scope_type = 'clinic' 
            AND scope_id = (
                SELECT sp.clinic_id
                FROM users u
                JOIN user_profiles up ON u.id = up.user_id
                JOIN staff_profiles sp ON up.id = sp.user_profile_id
                WHERE u.auth_user_id = auth.uid() AND sp.is_active = TRUE
            )
        )
        OR
        -- Admins can access all items
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_profiles up ON u.id = up.user_id 
            WHERE u.auth_user_id = auth.uid() AND up.user_type = 'admin'
        )
    );

-- User archive preferences policies
DROP POLICY IF EXISTS "user_archive_prefs_own_access" ON user_archive_preferences;
CREATE POLICY "user_archive_prefs_own_access" ON user_archive_preferences
    FOR ALL USING (
        user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_profiles up ON u.id = up.user_id 
            WHERE u.auth_user_id = auth.uid() AND up.user_type = 'admin'
        )
    );

-- Archive audit log policies
DROP POLICY IF EXISTS "archive_audit_own_access" ON archive_audit_log;
CREATE POLICY "archive_audit_own_access" ON archive_audit_log
    FOR SELECT USING (
        performed_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_profiles up ON u.id = up.user_id 
            WHERE u.auth_user_id = auth.uid() AND up.user_type IN ('admin', 'staff')
        )
    );

-- Archive statistics policies
DROP POLICY IF EXISTS "archive_stats_access" ON archive_statistics;
CREATE POLICY "archive_stats_access" ON archive_statistics
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR
        (
            clinic_id = (
                SELECT sp.clinic_id
                FROM users u
                JOIN user_profiles up ON u.id = up.user_id
                JOIN staff_profiles sp ON up.id = sp.user_profile_id
                WHERE u.auth_user_id = auth.uid() AND sp.is_active = TRUE
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_profiles up ON u.id = up.user_id 
            WHERE u.auth_user_id = auth.uid() AND up.user_type = 'admin'
        )
    );

-- Retention policies (admin only)
DROP POLICY IF EXISTS "retention_policies_admin_only" ON archive_retention_policies;
CREATE POLICY "retention_policies_admin_only" ON archive_retention_policies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN user_profiles up ON u.id = up.user_id 
            WHERE u.auth_user_id = auth.uid() AND up.user_type = 'admin'
        )
    );

-- =====================================================
-- SCHEDULED JOBS (CRON-LIKE FUNCTIONS)
-- =====================================================

-- Function: Daily Archive Maintenance
CREATE OR REPLACE FUNCTION daily_archive_maintenance()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    maintenance_result JSONB;
BEGIN
    -- Auto-archive old items
    SELECT auto_archive_old_items(FALSE, 500) INTO maintenance_result;
    RAISE LOG 'Auto-archive result: %', maintenance_result;
    
    -- Cleanup expired archives
    SELECT cleanup_expired_archives(FALSE, 1000) INTO maintenance_result;
    RAISE LOG 'Cleanup result: %', maintenance_result;
    
    -- Update statistics cache
    INSERT INTO archive_statistics (
        scope_type,
        statistics_date,
        total_archived,
        total_hidden,
        by_item_type,
        by_archive_reason
    )
    SELECT 
        'system',
        CURRENT_DATE,
        COUNT(*),
        COUNT(*) FILTER (WHERE is_hidden = TRUE),
        jsonb_object_agg(item_type, COUNT(*)),
        jsonb_object_agg(archive_reason, COUNT(*))
    FROM archive_items
    WHERE archived_at::DATE = CURRENT_DATE
    ON CONFLICT (user_id, clinic_id, scope_type, statistics_date) 
    DO UPDATE SET
        total_archived = EXCLUDED.total_archived,
        total_hidden = EXCLUDED.total_hidden,
        by_item_type = EXCLUDED.by_item_type,
        by_archive_reason = EXCLUDED.by_archive_reason,
        updated_at = NOW();

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Daily archive maintenance failed: %', SQLERRM;
END;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE archive_items IS 'Main archive storage for all archived items with metadata and original data backup';
COMMENT ON TABLE user_archive_preferences IS 'User-specific archive preferences including auto-archive and retention settings';
COMMENT ON TABLE archive_audit_log IS 'Comprehensive audit trail for all archive operations';
COMMENT ON TABLE archive_statistics IS 'Cached statistics for archive usage and storage metrics';
COMMENT ON TABLE archive_retention_policies IS 'System-wide retention policies for different item types and scopes';

COMMENT ON FUNCTION manage_user_archives IS 'Comprehensive archive management function supporting all archive operations with role-based permissions';
COMMENT ON FUNCTION validate_archive_permissions IS 'Permission validation for individual archive operations';
COMMENT ON FUNCTION validate_batch_archive_permissions IS 'Batch permission validation for bulk archive operations';
COMMENT ON FUNCTION get_item_original_data IS 'Retrieve and backup original data before archiving';
COMMENT ON FUNCTION update_user_archive_preferences IS 'Update user archive preferences with validation';
COMMENT ON FUNCTION auto_archive_old_items IS 'Automated archiving based on user preferences and retention policies';
COMMENT ON FUNCTION cleanup_expired_archives IS 'Automated cleanup of expired archived items';
COMMENT ON FUNCTION generate_archive_statistics IS 'Generate comprehensive archive analytics and usage statistics';
COMMENT ON FUNCTION daily_archive_maintenance IS 'Daily maintenance routine for archive system health';