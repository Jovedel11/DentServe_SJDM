-- ========================================
-- DENTSERVE FILE UPLOAD CYCLE ANALYSIS
-- ========================================
-- This file contains all file upload-related database objects extracted from the main schema
-- for easier understanding and hook/function evaluation.

-- ========================================
-- FILE UPLOAD-RELATED TABLES
-- ========================================

-- Core file uploads table for tracking uploaded files
create table "public"."file_uploads" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_id" uuid,
  "file_name" character varying(500) not null,
  "file_type" character varying(100) not null,
  "file_size" bigint not null,
  "storage_path" text not null,
  "bucket_name" character varying(100) not null,
  "content_type" character varying(100) not null,
  "upload_purpose" character varying(100) not null,
  "related_id" uuid,
  "metadata" jsonb default '{}'::jsonb,
  "is_active" boolean default true,
  "uploaded_at" timestamp with time zone default now(),
  "created_at" timestamp with time zone default now()
);

-- ========================================
-- FILE UPLOAD-RELATED INDEXES
-- ========================================

-- Primary key and basic indexes
CREATE UNIQUE INDEX file_uploads_pkey ON public.file_uploads USING btree (id);
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads USING btree (user_id);

-- ========================================
-- FILE UPLOAD SECURITY POLICIES
-- ========================================

-- Enable Row Level Security for file uploads
alter table "public"."file_uploads" enable row level security;

-- ========================================
-- FILE UPLOAD CYCLE FUNCTIONS
-- ========================================

-- Function: Protect file upload updates
-- Purpose: Prevent modification of core file attributes after upload
-- Usage: Applied as trigger to maintain file integrity
CREATE OR REPLACE FUNCTION public.protect_file_upload_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$;

-- Function: Send condition report with attachments
-- Purpose: Allow patients to send reports with file attachments to clinics
-- Usage: Patient communication with file upload support
CREATE OR REPLACE FUNCTION public.send_condition_report(p_clinic_id uuid, p_subject text, p_message text, p_attachment_urls text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
    
    -- Input validation
    IF p_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic ID is required');
    END IF;
    
    IF p_subject IS NULL OR TRIM(p_subject) = '' OR LENGTH(p_subject) > 200 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Subject is required and must be under 200 characters');
    END IF;
    
    IF p_message IS NULL OR TRIM(p_message) = '' OR LENGTH(p_message) > 2000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message is required and must be under 2000 characters');
    END IF;
    
    -- Get clinic information
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
    
    -- Get active staff recipients
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
    
    -- Insert communication with attachments
    INSERT INTO email_communications (
        from_user_id,
        to_user_id,
        subject,
        message_body,
        email_type,
        attachments
    ) VALUES (
        patient_id_val,
        staff_recipients[1],  -- Send to first staff member
        p_subject,
        p_message,
        'condition_report',
        CASE WHEN p_attachment_urls IS NOT NULL 
             THEN jsonb_build_object('urls', p_attachment_urls)
             ELSE NULL END
    ) RETURNING id INTO communication_id;
    
    -- Create notifications for staff
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message
    )
    SELECT 
        unnest(staff_recipients),
        'partnership_request',
        'Patient Condition Report: ' || p_subject,
        format('Patient %s has sent a condition report. Subject: %s',
               current_context->>'full_name', p_subject);
    
    -- Track analytics event
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata
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
$function$;

-- ========================================
-- ADDITIONAL FILE UPLOAD FUNCTIONS
-- ========================================

-- Function: Create file upload record
-- Purpose: Record file upload metadata in the database
-- Usage: Called after successful file upload to external storage
CREATE OR REPLACE FUNCTION public.create_file_upload_record(
    p_file_name text,
    p_file_type text,
    p_file_size bigint,
    p_storage_path text,
    p_bucket_name text,
    p_content_type text,
    p_upload_purpose text,
    p_related_id uuid DEFAULT NULL::uuid,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    current_user_id UUID;
    upload_id UUID;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    current_user_id := (current_context->>'user_id')::UUID;
    
    -- Validate required parameters
    IF p_file_name IS NULL OR p_file_type IS NULL OR p_file_size IS NULL 
       OR p_storage_path IS NULL OR p_bucket_name IS NULL 
       OR p_content_type IS NULL OR p_upload_purpose IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing required file parameters');
    END IF;
    
    -- Insert file upload record
    INSERT INTO file_uploads (
        user_id,
        file_name,
        file_type,
        file_size,
        storage_path,
        bucket_name,
        content_type,
        upload_purpose,
        related_id,
        metadata
    ) VALUES (
        current_user_id,
        p_file_name,
        p_file_type,
        p_file_size,
        p_storage_path,
        p_bucket_name,
        p_content_type,
        p_upload_purpose,
        p_related_id,
        p_metadata
    ) RETURNING id INTO upload_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'upload_id', upload_id,
        'message', 'File upload recorded successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to record file upload');
END;
$function$;

-- Function: Get user file uploads
-- Purpose: Retrieve file uploads for a specific user with filtering
-- Usage: User file management dashboard, file listings
CREATE OR REPLACE FUNCTION public.get_user_file_uploads(
    p_user_id uuid DEFAULT NULL::uuid,
    p_upload_purpose text DEFAULT NULL::text,
    p_file_type text DEFAULT NULL::text,
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
    target_user_id UUID;
    result JSONB;
    total_count INTEGER;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    
    -- Access control: Users can only see their own files, except admins
    IF target_user_id != (current_context->>'user_id')::UUID 
       AND (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
    
    -- Input validation
    p_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
    p_offset := GREATEST(COALESCE(p_offset, 0), 0);
    
    -- Get total count
    SELECT COUNT(*) INTO total_count
    FROM file_uploads
    WHERE user_id = target_user_id
    AND is_active = true
    AND (p_upload_purpose IS NULL OR upload_purpose = p_upload_purpose)
    AND (p_file_type IS NULL OR file_type = p_file_type);
    
    -- Get file uploads with pagination
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'files', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', fu.id,
                    'file_name', fu.file_name,
                    'file_type', fu.file_type,
                    'file_size', fu.file_size,
                    'storage_path', fu.storage_path,
                    'bucket_name', fu.bucket_name,
                    'content_type', fu.content_type,
                    'upload_purpose', fu.upload_purpose,
                    'related_id', fu.related_id,
                    'metadata', fu.metadata,
                    'uploaded_at', fu.uploaded_at,
                    'file_size_formatted', CASE 
                        WHEN fu.file_size < 1024 THEN fu.file_size || ' B'
                        WHEN fu.file_size < 1048576 THEN ROUND(fu.file_size / 1024.0, 1) || ' KB'
                        ELSE ROUND(fu.file_size / 1048576.0, 1) || ' MB'
                    END
                ) ORDER BY fu.uploaded_at DESC
            ), '[]'::jsonb),
            'pagination', jsonb_build_object(
                'total_count', total_count,
                'limit', p_limit,
                'offset', p_offset,
                'has_more', (p_offset + p_limit) < total_count
            ),
            'filters', jsonb_build_object(
                'upload_purpose', p_upload_purpose,
                'file_type', p_file_type
            )
        )
    ) INTO result
    FROM file_uploads fu
    WHERE fu.user_id = target_user_id
    AND fu.is_active = true
    AND (p_upload_purpose IS NULL OR fu.upload_purpose = p_upload_purpose)
    AND (p_file_type IS NULL OR fu.file_type = p_file_type)
    ORDER BY fu.uploaded_at DESC
    LIMIT p_limit OFFSET p_offset;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to retrieve file uploads');
END;
$function$;

-- Function: Delete file upload record
-- Purpose: Mark file upload as inactive (soft delete)
-- Usage: File management, cleanup operations
CREATE OR REPLACE FUNCTION public.delete_file_upload(p_upload_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    current_user_id UUID;
    affected_count INTEGER;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    current_user_id := (current_context->>'user_id')::UUID;
    
    -- Soft delete: mark as inactive
    UPDATE file_uploads
    SET is_active = false
    WHERE id = p_upload_id
    AND (
        user_id = current_user_id
        OR (current_context->>'user_type') = 'admin'
    );
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', affected_count > 0,
        'message', CASE 
            WHEN affected_count > 0 THEN 'File upload deleted successfully'
            ELSE 'File upload not found or access denied'
        END,
        'affected_count', affected_count
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to delete file upload');
END;
$function$;

-- Function: Get file upload statistics
-- Purpose: Provide upload analytics and storage usage information
-- Usage: Admin dashboard, user storage management
CREATE OR REPLACE FUNCTION public.get_file_upload_stats(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    target_user_id UUID;
    result JSONB;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    
    -- Access control: Users can only see their own stats, except admins
    IF target_user_id != (current_context->>'user_id')::UUID 
       AND (current_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
    
    -- Calculate statistics
    WITH upload_stats AS (
        SELECT 
            COUNT(*) as total_files,
            COUNT(*) FILTER (WHERE is_active = true) as active_files,
            SUM(file_size) as total_size_bytes,
            SUM(file_size) FILTER (WHERE is_active = true) as active_size_bytes,
            COUNT(DISTINCT upload_purpose) as purpose_count,
            COUNT(DISTINCT file_type) as file_type_count,
            MAX(uploaded_at) as last_upload_date,
            MIN(uploaded_at) as first_upload_date
        FROM file_uploads
        WHERE user_id = target_user_id
    ),
    purpose_breakdown AS (
        SELECT 
            upload_purpose,
            COUNT(*) as file_count,
            SUM(file_size) as total_size
        FROM file_uploads
        WHERE user_id = target_user_id AND is_active = true
        GROUP BY upload_purpose
        ORDER BY COUNT(*) DESC
    ),
    type_breakdown AS (
        SELECT 
            file_type,
            COUNT(*) as file_count,
            SUM(file_size) as total_size
        FROM file_uploads
        WHERE user_id = target_user_id AND is_active = true
        GROUP BY file_type
        ORDER BY COUNT(*) DESC
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'overview', jsonb_build_object(
                'total_files', us.total_files,
                'active_files', us.active_files,
                'total_size_mb', ROUND((us.total_size_bytes / 1048576.0)::numeric, 2),
                'active_size_mb', ROUND((us.active_size_bytes / 1048576.0)::numeric, 2),
                'purpose_count', us.purpose_count,
                'file_type_count', us.file_type_count,
                'last_upload', us.last_upload_date,
                'first_upload', us.first_upload_date
            ),
            'by_purpose', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'purpose', upload_purpose,
                        'file_count', file_count,
                        'size_mb', ROUND((total_size / 1048576.0)::numeric, 2)
                    )
                )
                FROM purpose_breakdown
            ), '[]'::jsonb),
            'by_type', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'file_type', file_type,
                        'file_count', file_count,
                        'size_mb', ROUND((total_size / 1048576.0)::numeric, 2)
                    )
                )
                FROM type_breakdown
            ), '[]'::jsonb)
        )
    ) INTO result
    FROM upload_stats us;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to retrieve file upload statistics');
END;
$function$;

-- ========================================
-- FILE UPLOAD CYCLE RELATIONSHIPS
-- ========================================

-- Foreign key relationships
ALTER TABLE ONLY public.file_uploads
ADD CONSTRAINT file_uploads_pkey 
PRIMARY KEY USING INDEX file_uploads_pkey;

ALTER TABLE ONLY public.file_uploads
ADD CONSTRAINT file_uploads_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ========================================
-- FILE UPLOAD CYCLE TRIGGER ASSIGNMENTS
-- ========================================

-- Apply file upload protection trigger
CREATE TRIGGER protect_file_upload_updates_trigger 
BEFORE UPDATE ON public.file_uploads 
FOR EACH ROW 
EXECUTE FUNCTION public.protect_file_upload_updates();

-- ========================================
-- FILE UPLOAD HOOKS REFERENCE GUIDE
-- ========================================

/*
FILE UPLOAD CYCLE HOOK PATTERNS:

1. FILE UPLOAD RECORD HOOK:
   - Function: create_file_upload_record()
   - Use Cases: Post-upload database recording, metadata tracking
   - Parameters: file metadata (name, type, size, path, bucket, etc.)
   - Returns: Upload ID and success status

2. USER FILES LIST HOOK:
   - Function: get_user_file_uploads()
   - Use Cases: File management dashboard, user file listings
   - Parameters: user_id, upload_purpose, file_type, pagination
   - Returns: Paginated file list with metadata and filtering

3. FILE DELETION HOOK:
   - Function: delete_file_upload()
   - Use Cases: File cleanup, user file management
   - Parameters: upload_id
   - Returns: Deletion status and affected count

4. FILE STATISTICS HOOK:
   - Function: get_file_upload_stats()
   - Use Cases: Storage usage analytics, admin dashboard
   - Parameters: user_id (optional)
   - Returns: Comprehensive upload statistics and breakdowns

5. CONDITION REPORT WITH ATTACHMENTS HOOK:
   - Function: send_condition_report()
   - Use Cases: Patient communication with file attachments
   - Parameters: clinic_id, subject, message, attachment_urls
   - Returns: Communication status and delivery information

INTEGRATION WITH EXTERNAL STORAGE:
- File uploads table tracks metadata only
- Actual files stored in external service (Cloudinary, AWS S3, etc.)
- storage_path and bucket_name reference external storage location
- Supports multiple storage backends through bucket_name field

IMPLEMENTATION NOTES:
- All functions include proper authentication and access control
- Soft delete pattern preserves file history
- Comprehensive metadata tracking for audit and analytics
- Support for various upload purposes (profile, clinic, documents, etc.)
- File type and size validation should be done client-side
- Integration with communication system for file attachments
- Statistics functions for storage management and analytics
*/

-- ========================================
-- FILE UPLOAD DATA INTEGRITY
-- ========================================

-- Ensure file uploads belong to valid users
-- Prevent modification of core file attributes after upload
-- Support multiple storage backends through bucket configuration
-- Maintain file metadata for analytics and management
-- Enable efficient querying through proper indexing
-- Provide soft delete functionality for file management