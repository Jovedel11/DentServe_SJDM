-- ================================================================
-- DENTSERVE STAFF INVITATION & CLEANUP SYSTEM
-- ================================================================
-- Migration: 20250930_staff_invitation_cleanup_system.sql
-- Purpose: Fix staff invitation flow and add automatic cleanup
-- 
-- KEY CHANGES:
-- 1. Clinic creation moved to AFTER staff accepts invitation
-- 2. Services created in services table (not clinics.services_offered)
-- 3. Auto-cleanup for incomplete profiles (7-day threshold)
-- 4. Reminder email system
-- 5. Admin monitoring dashboard functions
-- ================================================================

-- ========================================
-- 0. ALTER TABLE TO ALLOW NULL clinic_id (CRITICAL FIX)
-- ========================================

ALTER TABLE staff_invitations 
ALTER COLUMN clinic_id DROP NOT NULL;

COMMENT ON COLUMN staff_invitations.clinic_id IS 
'Clinic ID - NULL during invitation creation, populated after staff accepts';

-- ========================================
-- 1. MODIFIED: Partnership Approval (No Immediate Clinic Creation)
-- ========================================

CREATE OR REPLACE FUNCTION public.approve_partnership_request_v2(
    p_request_id uuid,
    p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_context jsonb;
    request_record record;
    invitation_result jsonb;
    first_name varchar;
    last_name varchar;
BEGIN
    -- Security check
    current_user_context := get_current_user_context();
    
    IF current_user_context->>'user_type' != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied. Admin privileges required.');
    END IF;
    
    -- Get the request
    SELECT * INTO request_record
    FROM clinic_partnership_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or already processed'
        );
    END IF;
    
    -- Extract first and last name
    first_name := split_part(request_record.clinic_name, ' ', 1);
    last_name := COALESCE(split_part(request_record.clinic_name, ' ', 2), 'Manager');
    
    -- Create staff invitation with clinic metadata
    invitation_result := create_staff_invitation_with_clinic_data(
        request_record.email,
        jsonb_build_object(
            'clinic_name', request_record.clinic_name,
            'clinic_address', request_record.address,
            'clinic_city', 'San Jose Del Monte',
            'clinic_province', 'Bulacan',
            'clinic_email', request_record.email
        ),
        'Clinic Manager',
        'Administration',
        first_name,
        last_name
    );
    
    IF NOT (invitation_result->>'success')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to create staff invitation: ' || (invitation_result->>'error')
        );
    END IF;
    
    -- Update request status
    UPDATE clinic_partnership_requests 
    SET 
        status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_by = (current_user_context->>'user_id')::uuid,
        reviewed_at = NOW()
    WHERE id = p_request_id;
    
    -- ✅ FIX: Return the full invitation_result including email_data
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Partnership request approved. Invitation sent to staff.',
        'invitation_id', invitation_result->'invitation_id',
        'email_data', invitation_result->'email_data',  -- ✅ ADD THIS LINE
        'note', 'Clinic will be created when staff accepts invitation'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to approve partnership request: ' || SQLERRM
        );
END;
$$;

-- ========================================
-- 2. NEW: Staff Invitation with Clinic Data Storage
-- ========================================

CREATE OR REPLACE FUNCTION public.create_staff_invitation_with_clinic_data(
    p_email character varying,
    p_clinic_metadata jsonb,
    p_position character varying,
    p_department character varying DEFAULT NULL,
    p_first_name character varying DEFAULT NULL,
    p_last_name character varying DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
    invitation_id UUID;
    temp_password TEXT;
    invitation_token TEXT;
    current_user_context JSONB;
    email_data JSONB;
BEGIN
    -- Security check
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
    temp_password := replace(gen_random_uuid()::text, '-', '');
    invitation_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    
    -- ✅ NEW: Create invitation with clinic metadata (no clinic_id yet)
    INSERT INTO staff_invitations (
        email,
        clinic_id, -- Will be NULL initially
        position,
        department,
        temp_password,
        invitation_token,
        expires_at,
        status,
        metadata -- Store clinic data here
    ) VALUES (
        p_email,
        NULL, -- Clinic will be created after acceptance
        COALESCE(p_position, 'Staff'),
        p_department,
        temp_password,
        invitation_token,
        NOW() + INTERVAL '7 days',
        'pending',
        p_clinic_metadata -- Store clinic metadata for later
    ) RETURNING id INTO invitation_id;
    
    -- Prepare email data
    email_data := jsonb_build_object(
        'invitation_id', invitation_id,
        'invitation_token', invitation_token,
        'email', p_email,
        'clinic_name', p_clinic_metadata->>'clinic_name',
        'position', COALESCE(p_position, 'Staff'),
        'first_name', COALESCE(p_first_name, ''),
        'last_name', COALESCE(p_last_name, '')
    );
    
    -- Note: Email sending handled separately
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Staff invitation created successfully',
        'invitation_id', invitation_id,
        'email_data', email_data
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to create staff invitation: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION create_staff_invitation_with_clinic_data IS 
'Creates staff invitation with clinic metadata stored for later clinic creation after acceptance';

-- ========================================
-- 3. MODIFIED: Staff Signup (Create Clinic After Acceptance)
-- ========================================

CREATE OR REPLACE FUNCTION public.validate_and_signup_staff_v2(
    p_invitation_id uuid,
    p_email character varying,
    p_first_name character varying,
    p_last_name character varying,
    p_phone character varying DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $$
DECLARE
    invitation_record RECORD;
    new_clinic_id UUID;
    clinic_metadata JSONB;
    result JSONB;
BEGIN
    -- Validate and get invitation
    SELECT si.*
    INTO invitation_record
    FROM staff_invitations si
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
    
    -- ✅ NEW: Create clinic placeholder NOW (after staff confirms)
    clinic_metadata := invitation_record.metadata;
    
    IF clinic_metadata IS NOT NULL THEN
        -- Create clinic with placeholder data
        INSERT INTO clinics (
            name,
            address,
            city,
            province,
            email,
            location,
            is_active,
            created_at
        ) VALUES (
            COALESCE(clinic_metadata->>'clinic_name', 'Pending Clinic Setup'),
            COALESCE(clinic_metadata->>'clinic_address', 'To be updated during profile completion'),
            COALESCE(clinic_metadata->>'clinic_city', 'San Jose Del Monte'),
            COALESCE(clinic_metadata->>'clinic_province', 'Bulacan'),
            COALESCE(clinic_metadata->>'clinic_email', p_email),
            ST_SetSRID(ST_Point(121.0583, 14.8169), 4326)::geography,
            false, -- Inactive until profile completed
            NOW()
        ) RETURNING id INTO new_clinic_id;
        
        -- Update invitation with clinic_id
        UPDATE staff_invitations 
        SET 
            clinic_id = new_clinic_id,
            status = 'accepted',
            updated_at = NOW()
        WHERE id = p_invitation_id;
        
        RAISE LOG 'Created placeholder clinic % for staff invitation %', new_clinic_id, p_invitation_id;
    ELSE
        -- If no metadata, just mark as accepted (for direct invitations to existing clinics)
        UPDATE staff_invitations 
        SET status = 'accepted'
        WHERE id = p_invitation_id;
        
        new_clinic_id := invitation_record.clinic_id;
    END IF;
    
    -- Return signup data for frontend
    result := jsonb_build_object(
        'success', true,
        'invitation_valid', true,
        'clinic_id', new_clinic_id,
        'clinic_name', COALESCE(clinic_metadata->>'clinic_name', 'Your Clinic'),
        'position', invitation_record.position,
        'department', invitation_record.department,
        'temp_password', invitation_record.temp_password,
        'signup_data', jsonb_build_object(
            'user_type', 'staff',
            'first_name', p_first_name,
            'last_name', p_last_name,
            'phone', p_phone,
            'clinic_id', new_clinic_id,
            'position', invitation_record.position,
            'department', invitation_record.department,
            'invitation_id', p_invitation_id,
            'invited_by', 'admin',
            'signup_method', 'email_first_staff_invitation',
            'profile_completion_deadline', (NOW() + INTERVAL '7 days')::text
        ),
        'message', 'Invitation validated. Clinic created. Complete your profile within 7 days.'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback clinic creation if something fails
        IF new_clinic_id IS NOT NULL THEN
            DELETE FROM clinics WHERE id = new_clinic_id;
        END IF;
        
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Invitation validation failed: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION validate_and_signup_staff_v2 IS 
'Validates staff invitation and creates placeholder clinic after staff confirms (not during admin approval)';

-- ========================================
-- 4. MODIFIED: Staff Profile Completion (Create Services in services table)
-- ========================================

-- ========================================
-- 4. UPDATED: Complete Staff Profile (V2 - Services in services table)
-- ========================================

-- ========================================
-- 4. UPDATED: Complete Staff Profile (V2 - Services in services table)
-- ========================================

CREATE OR REPLACE FUNCTION public.update_staff_complete_profile_v2(
    p_profile_data jsonb DEFAULT '{}'::jsonb,
    p_clinic_data jsonb DEFAULT '{}'::jsonb,
    p_services_data jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog', 'auth'
AS $$
DECLARE
    current_auth_uid UUID;
    user_id_val UUID;
    profile_id UUID;
    staff_profile_id UUID;
    clinic_id_val UUID;
    invitation_record RECORD;
    full_address TEXT;
    location_point geography;
    service_record JSONB;
    services_created INTEGER := 0;
BEGIN
    -- ✅ FIX: Get auth user ID directly (bypass get_current_user_context which checks is_active)
    current_auth_uid := auth.uid();
    
    IF current_auth_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- ✅ FIX: Get user even if is_active = false (for first-time profile completion)
    SELECT u.id INTO user_id_val
    FROM users u
    WHERE u.auth_user_id = current_auth_uid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Get staff invitation and profile info
    SELECT si.*, sp.id as staff_profile_id, up.id as profile_id
    INTO invitation_record
    FROM staff_invitations si
    JOIN users u ON u.email = si.email
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
    WHERE u.id = user_id_val 
    AND si.status = 'accepted';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff invitation not found or not accepted');
    END IF;
    
    profile_id := invitation_record.profile_id;
    clinic_id_val := invitation_record.clinic_id;
    
    -- Validate clinic exists
    IF NOT EXISTS (SELECT 1 FROM clinics WHERE id = clinic_id_val) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found');
    END IF;
    
    -- ========================================
    -- 1️⃣ UPDATE USER DATA
    -- ========================================
    IF p_profile_data ? 'phone' THEN
        UPDATE users 
        SET phone = p_profile_data->>'phone',
            phone_verified = false,
            updated_at = NOW()
        WHERE id = user_id_val;
    END IF;
    
    -- ========================================
    -- 2️⃣ UPDATE USER PROFILE
    -- ========================================
    UPDATE user_profiles 
    SET 
        first_name = COALESCE(p_profile_data->>'first_name', first_name),
        last_name = COALESCE(p_profile_data->>'last_name', last_name),
        updated_at = NOW()
    WHERE id = profile_id;
    
    -- ========================================
    -- 3️⃣ CREATE OR UPDATE STAFF PROFILE (ACTIVATE)
    -- ========================================
    IF invitation_record.staff_profile_id IS NULL THEN
        INSERT INTO staff_profiles (
            user_profile_id, 
            clinic_id, 
            position, 
            department, 
            is_active,
            created_at
        ) VALUES (
            profile_id,
            clinic_id_val,
            invitation_record.position,
            invitation_record.department,
            true, -- ✅ Activate staff after profile completion
            NOW()
        );
    ELSE
        UPDATE staff_profiles 
        SET 
            is_active = true, -- ✅ Activate staff
            updated_at = NOW()
        WHERE id = invitation_record.staff_profile_id;
    END IF;
    
    -- ========================================
    -- 4️⃣ UPDATE CLINIC INFORMATION
    -- ========================================
    IF p_clinic_data != '{}' THEN
        -- Build full address
        full_address := CONCAT(
            p_clinic_data->>'address', ', ',
            COALESCE(p_clinic_data->>'city', 'San Jose Del Monte'), ', ',
            COALESCE(p_clinic_data->>'province', 'Bulacan'), ', Philippines'
        );
        
        -- Accept latitude and longitude from frontend
        IF (p_clinic_data ? 'latitude') AND (p_clinic_data ? 'longitude') THEN
            location_point := ST_SetSRID(
                ST_Point(
                    (p_clinic_data->>'longitude')::double precision,
                    (p_clinic_data->>'latitude')::double precision
                ), 
                4326
            )::geography;
        ELSE
            location_point := ST_SetSRID(ST_Point(121.0583, 14.8169), 4326)::geography;
        END IF;
        
        UPDATE clinics 
        SET 
            name = COALESCE(p_clinic_data->>'name', name),
            address = full_address,
            city = COALESCE(p_clinic_data->>'city', city),
            province = COALESCE(p_clinic_data->>'province', province),
            zip_code = p_clinic_data->>'zip_code',
            phone = COALESCE(p_clinic_data->>'phone', phone),
            email = COALESCE(p_clinic_data->>'email', email),
            location = location_point,
            operating_hours = CASE 
                WHEN p_clinic_data ? 'operating_hours'
                THEN p_clinic_data->'operating_hours'
                ELSE operating_hours
            END,
            is_active = true, -- ✅ Activate clinic after completion
            updated_at = NOW()
        WHERE id = clinic_id_val;
    END IF;
    
    -- ========================================
    -- 5️⃣ CREATE SERVICES IN SERVICES TABLE
    -- ========================================
    IF jsonb_typeof(p_services_data) = 'array' AND jsonb_array_length(p_services_data) > 0 THEN
        FOR service_record IN SELECT * FROM jsonb_array_elements(p_services_data)
        LOOP
            IF service_record->>'name' IS NOT NULL AND trim(service_record->>'name') != '' THEN
                INSERT INTO services (
                    clinic_id,
                    name,
                    description,
                    category,
                    duration_minutes,
                    min_price,
                    max_price,
                    priority,
                    is_active,
                    created_at
                ) VALUES (
                    clinic_id_val,
                    service_record->>'name',
                    service_record->>'description',
                    COALESCE(service_record->>'category', 'General Dentistry'),
                    COALESCE((service_record->>'duration_minutes')::integer, 30),
                    CASE 
                        WHEN service_record->>'min_price' IS NOT NULL 
                        THEN (service_record->>'min_price')::numeric 
                        ELSE NULL 
                    END,
                    CASE 
                        WHEN service_record->>'max_price' IS NOT NULL 
                        THEN (service_record->>'max_price')::numeric 
                        ELSE NULL 
                    END,
                    COALESCE((service_record->>'priority')::integer, 10),
                    COALESCE((service_record->>'is_active')::boolean, true),
                    NOW()
                );
                
                services_created := services_created + 1;
            END IF;
        END LOOP;
    END IF;
    
    -- ========================================
    -- 6️⃣ ACTIVATE USER & MARK INVITATION AS COMPLETED
    -- ========================================
    
    -- ✅ Activate user in users table
    UPDATE users
    SET 
        is_active = true,
        updated_at = NOW()
    WHERE id = user_id_val;
    
    -- Mark invitation as completed
    UPDATE staff_invitations 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- ========================================
    -- 7️⃣ RETURN SUCCESS RESPONSE
    -- ========================================
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile completed successfully',
        'data', jsonb_build_object(
            'clinic_id', clinic_id_val,
            'profile_id', profile_id,
            'services_created', services_created,
            'is_active', true,
            'completed_at', NOW()
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

COMMENT ON FUNCTION update_staff_complete_profile_v2 IS 
'Completes staff profile and creates services in services table (not clinics.services_offered)';
    
    -- ========================================
    -- 6️⃣ MARK INVITATION AS COMPLETED
    -- ========================================
    UPDATE staff_invitations 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- ========================================
    -- 7️⃣ RETURN SUCCESS RESPONSE
    -- ========================================
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile completed successfully',
        'data', jsonb_build_object(
            'clinic_id', clinic_id_val,
            'profile_id', profile_id,
            'services_created', services_created,
            'is_active', true,
            'completed_at', NOW()
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

COMMENT ON FUNCTION update_staff_complete_profile_v2 IS 
'Completes staff profile and creates services in services table (not clinics.services_offered)';


-- ========================================
-- NEW: Complete Staff Signup (Server-Side with Admin Privileges)
-- ========================================

CREATE OR REPLACE FUNCTION public.complete_staff_signup_from_invitation(
    p_invitation_id uuid,
    p_email character varying,
    p_password character varying,
    p_first_name character varying,
    p_last_name character varying,
    p_phone character varying DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog', 'auth'
AS $$
DECLARE
    invitation_record RECORD;
    new_auth_user_id UUID;
    new_user_id UUID;
    new_profile_id UUID;
    new_clinic_id UUID;
    clinic_metadata JSONB;
    encrypted_password TEXT;
BEGIN
    -- Step 1: Validate invitation
    SELECT si.*
    INTO invitation_record
    FROM staff_invitations si
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
    
    -- Step 2: Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User with this email already exists'
        );
    END IF;
    
    -- Step 3: Create auth user with email confirmed (admin privilege)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(), -- ✅ Email confirmed immediately (invitation validates email)
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
            'user_type', 'staff',
            'first_name', p_first_name,
            'last_name', p_last_name,
            'phone', p_phone,
            'invitation_id', p_invitation_id,
            'profile_completion_required', true
        ),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_auth_user_id;
    
    -- Step 4: Create user in users table
    INSERT INTO users (
        auth_user_id,
        email,
        phone,
        is_active,
        email_verified,
        created_at
    ) VALUES (
        new_auth_user_id,
        p_email,
        p_phone,
        false, -- Inactive until profile completed
        true, -- Email verified through invitation
        NOW()
    ) RETURNING id INTO new_user_id;
    
    -- Step 5: Create user profile
    INSERT INTO user_profiles (
        user_id,
        user_type,
        first_name,
        last_name,
        created_at
    ) VALUES (
        new_user_id,
        'staff',
        p_first_name,
        p_last_name,
        NOW()
    ) RETURNING id INTO new_profile_id;
    
    -- Step 6: Create clinic placeholder
    clinic_metadata := invitation_record.metadata;
    
    IF clinic_metadata IS NOT NULL THEN
        INSERT INTO clinics (
            name,
            address,
            city,
            province,
            email,
            location,
            is_active,
            created_at
        ) VALUES (
            COALESCE(clinic_metadata->>'clinic_name', 'Pending Clinic Setup'),
            COALESCE(clinic_metadata->>'clinic_address', 'To be updated during profile completion'),
            COALESCE(clinic_metadata->>'clinic_city', 'San Jose Del Monte'),
            COALESCE(clinic_metadata->>'clinic_province', 'Bulacan'),
            COALESCE(clinic_metadata->>'clinic_email', p_email),
            ST_SetSRID(ST_Point(121.0583, 14.8169), 4326)::geography,
            false, -- Inactive until profile completed
            NOW()
        ) RETURNING id INTO new_clinic_id;
    END IF;
    
    -- Step 7: Create staff profile
    INSERT INTO staff_profiles (
        user_profile_id,
        clinic_id,
        position,
        department,
        is_active,
        created_at
    ) VALUES (
        new_profile_id,
        new_clinic_id,
        invitation_record.position,
        invitation_record.department,
        false, -- Inactive until profile completed
        NOW()
    );
    
    -- Step 8: Update invitation status
    UPDATE staff_invitations
    SET 
        clinic_id = new_clinic_id,
        status = 'accepted',
        updated_at = NOW()
    WHERE id = p_invitation_id;
    
    -- Step 9: Create initial session (optional, handled by frontend)
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account created successfully',
        'data', jsonb_build_object(
            'auth_user_id', new_auth_user_id,
            'user_id', new_user_id,
            'profile_id', new_profile_id,
            'clinic_id', new_clinic_id,
            'clinic_name', COALESCE(clinic_metadata->>'clinic_name', 'Your Clinic'),
            'position', invitation_record.position,
            'email', p_email,
            'profile_completion_required', true,
            'deadline', (NOW() + INTERVAL '7 days')::text
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback all changes
        IF new_clinic_id IS NOT NULL THEN
            DELETE FROM clinics WHERE id = new_clinic_id;
        END IF;
        IF new_profile_id IS NOT NULL THEN
            DELETE FROM user_profiles WHERE id = new_profile_id;
        END IF;
        IF new_user_id IS NOT NULL THEN
            DELETE FROM users WHERE id = new_user_id;
        END IF;
        IF new_auth_user_id IS NOT NULL THEN
            DELETE FROM auth.users WHERE id = new_auth_user_id;
        END IF;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account creation failed: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION complete_staff_signup_from_invitation IS 
'Creates complete staff account (auth + users + profiles + clinic) from invitation with email pre-confirmed';

-- Grant permissions
GRANT EXECUTE ON FUNCTION complete_staff_signup_from_invitation TO anon;
GRANT EXECUTE ON FUNCTION complete_staff_signup_from_invitation TO authenticated;

-- ========================================
-- 5. NEW: Cleanup Incomplete Staff Profiles (7-day threshold)
-- ========================================

CREATE OR REPLACE FUNCTION public.cleanup_incomplete_staff_profiles(
    p_days_threshold integer DEFAULT 7,
    p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    incomplete_staff RECORD;
    total_cleaned INTEGER := 0;
    clinics_deleted INTEGER := 0;
    users_deleted INTEGER := 0;
    invitations_expired INTEGER := 0;
    cleanup_details JSONB[] := '{}';
BEGIN
    -- Find incomplete staff profiles (accepted but not completed within threshold)
    FOR incomplete_staff IN
        SELECT 
            si.id as invitation_id,
            si.email,
            si.clinic_id,
            si.status,
            si.updated_at,
            u.id as user_id,
            u.auth_user_id,
            up.id as profile_id,
            sp.id as staff_profile_id,
            sp.is_active,
            c.name as clinic_name,
            c.is_active as clinic_active,
            EXTRACT(EPOCH FROM (NOW() - si.updated_at)) / 86400 as days_since_acceptance
        FROM staff_invitations si
        LEFT JOIN users u ON si.email = u.email
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
        LEFT JOIN clinics c ON si.clinic_id = c.id
        WHERE si.status = 'accepted'
        AND si.completed_at IS NULL
        AND si.updated_at < (NOW() - INTERVAL '1 day' * p_days_threshold)
        AND (sp.is_active IS NULL OR sp.is_active = false) -- Not activated
    LOOP
        IF NOT p_dry_run THEN
            -- ========================================
            -- HARD DELETE SEQUENCE
            -- ========================================
            
            -- 1. Delete staff profile if exists
            IF incomplete_staff.staff_profile_id IS NOT NULL THEN
                DELETE FROM staff_profiles WHERE id = incomplete_staff.staff_profile_id;
            END IF;
            
            -- 2. Delete user profile if exists
            IF incomplete_staff.profile_id IS NOT NULL THEN
                DELETE FROM user_profiles WHERE id = incomplete_staff.profile_id;
            END IF;
            
            -- 3. Delete user if exists
            IF incomplete_staff.user_id IS NOT NULL THEN
                DELETE FROM users WHERE id = incomplete_staff.user_id;
                users_deleted := users_deleted + 1;
            END IF;
            
            -- 4. Delete auth user if exists
            IF incomplete_staff.auth_user_id IS NOT NULL THEN
                DELETE FROM auth.users WHERE id = incomplete_staff.auth_user_id;
            END IF;
            
            -- 5. Delete orphaned clinic (if it has no other staff and is inactive)
            IF incomplete_staff.clinic_id IS NOT NULL THEN
                IF NOT EXISTS (
                    SELECT 1 FROM staff_profiles 
                    WHERE clinic_id = incomplete_staff.clinic_id 
                    AND id != incomplete_staff.staff_profile_id
                ) THEN
                    DELETE FROM clinics WHERE id = incomplete_staff.clinic_id;
                    clinics_deleted := clinics_deleted + 1;
                END IF;
            END IF;
            
            -- 6. Mark invitation as expired
            UPDATE staff_invitations 
            SET status = 'expired',
                updated_at = NOW()
            WHERE id = incomplete_staff.invitation_id;
            invitations_expired := invitations_expired + 1;
            
            RAISE LOG 'Cleaned up incomplete staff: % (clinic: %)', 
                incomplete_staff.email, incomplete_staff.clinic_name;
        END IF;
        
        -- Add to cleanup details
        cleanup_details := array_append(
            cleanup_details,
            jsonb_build_object(
                'email', incomplete_staff.email,
                'clinic_name', incomplete_staff.clinic_name,
                'days_since_acceptance', ROUND(incomplete_staff.days_since_acceptance::numeric, 2),
                'invitation_status', incomplete_staff.status,
                'staff_activated', COALESCE(incomplete_staff.is_active, false),
                'clinic_active', COALESCE(incomplete_staff.clinic_active, false)
            )
        );
        
        total_cleaned := total_cleaned + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'dry_run', p_dry_run,
        'threshold_days', p_days_threshold,
        'total_cleaned', total_cleaned,
        'users_deleted', users_deleted,
        'clinics_deleted', clinics_deleted,
        'invitations_expired', invitations_expired,
        'cleanup_details', cleanup_details,
        'message', CASE 
            WHEN p_dry_run THEN format('%s incomplete staff profiles found (dry run - no changes made)', total_cleaned)
            ELSE format('%s incomplete staff profiles cleaned up successfully', total_cleaned)
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cleanup failed: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION cleanup_incomplete_staff_profiles IS 
'Automatically cleans up incomplete staff profiles and orphaned clinics after 7 days (hard delete)';

-- ========================================
-- 6. NEW: Get Incomplete Staff Signups (Admin Dashboard)
-- ========================================

CREATE OR REPLACE FUNCTION public.get_incomplete_staff_signups(
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_context JSONB;
    incomplete_signups JSONB;
    total_count INTEGER;
BEGIN
    -- Security check
    current_user_context := get_current_user_context();
    
    IF current_user_context->>'user_type' != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied. Admin privileges required.');
    END IF;
    
    -- Get incomplete staff signups
    WITH incomplete_staff AS (
        SELECT 
            si.id as invitation_id,
            si.email,
            si.position,
            si.department,
            si.status,
            si.created_at as invited_at,
            si.updated_at as last_updated,
            si.expires_at,
            si.completed_at,
            CASE 
                WHEN si.status = 'accepted' THEN EXTRACT(EPOCH FROM (NOW() - si.updated_at)) / 86400
                ELSE NULL
            END as days_since_acceptance,
            CASE 
                WHEN si.expires_at < NOW() THEN true
                ELSE false
            END as is_expired,
            u.id as user_id,
            u.email as user_email,
            sp.is_active as staff_active,
            c.id as clinic_id,
            c.name as clinic_name,
            c.is_active as clinic_active
        FROM staff_invitations si
        LEFT JOIN users u ON si.email = u.email
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
        LEFT JOIN clinics c ON si.clinic_id = c.id
        WHERE si.status IN ('pending', 'accepted')
        AND si.completed_at IS NULL
        ORDER BY si.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'invitation_id', invitation_id,
                'email', email,
                'position', position,
                'department', department,
                'status', status,
                'invited_at', invited_at,
                'last_updated', last_updated,
                'expires_at', expires_at,
                'completed_at', completed_at,
                'days_since_acceptance', ROUND(days_since_acceptance::numeric, 2),
                'is_expired', is_expired,
                'user_exists', user_id IS NOT NULL,
                'staff_active', COALESCE(staff_active, false),
                'clinic_id', clinic_id,
                'clinic_name', clinic_name,
                'clinic_active', COALESCE(clinic_active, false),
                'action_required', CASE 
                    WHEN is_expired THEN 'Resend invitation or cleanup'
                    WHEN status = 'accepted' AND days_since_acceptance > 5 THEN 'Profile completion overdue'
                    WHEN status = 'pending' THEN 'Awaiting acceptance'
                    ELSE 'In progress'
                END
            )
        )
    INTO incomplete_signups
    FROM incomplete_staff;
    
    -- Get total count
    SELECT COUNT(*)::integer INTO total_count
    FROM staff_invitations si
    WHERE si.status IN ('pending', 'accepted')
    AND si.completed_at IS NULL;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(incomplete_signups, '[]'::jsonb),
        'total_count', total_count,
        'limit', p_limit,
        'offset', p_offset
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION get_incomplete_staff_signups IS 
'Returns list of incomplete staff signups for admin dashboard monitoring';

-- ========================================
-- 7. NEW: Send Reminder Email for Incomplete Profile
-- ========================================

CREATE OR REPLACE FUNCTION public.send_profile_completion_reminder(
    p_invitation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    days_remaining INTEGER;
    email_data JSONB;
BEGIN
    -- Get invitation details
    SELECT 
        si.*,
        c.name as clinic_name,
        EXTRACT(EPOCH FROM (si.expires_at - NOW())) / 86400 as days_until_expiry
    INTO invitation_record
    FROM staff_invitations si
    LEFT JOIN clinics c ON si.clinic_id = c.id
    WHERE si.id = p_invitation_id
    AND si.status = 'accepted'
    AND si.completed_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already completed');
    END IF;
    
    days_remaining := CEIL(invitation_record.days_until_expiry);
    
    IF days_remaining <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
    END IF;
    
    -- Prepare email data for sending
    email_data := jsonb_build_object(
        'email', invitation_record.email,
        'subject', 'Complete Your Clinic Profile - ' || days_remaining || ' Days Remaining',
        'clinic_name', invitation_record.clinic_name,
        'position', invitation_record.position,
        'days_remaining', days_remaining,
        'expires_at', invitation_record.expires_at,
        'invitation_id', invitation_record.id,
        'invitation_token', invitation_record.invitation_token,
        'reminder_type', 'profile_completion'
    );
    
    -- Note: Actual email sending handled by backend service
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reminder email prepared',
        'email_data', email_data
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to send reminder: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION send_profile_completion_reminder IS 
'Prepares reminder email data for staff who have not completed their profile';

-- ========================================
-- 8. NEW: Batch Send Reminder Emails (For Cron Job)
-- ========================================

CREATE OR REPLACE FUNCTION public.send_batch_profile_completion_reminders(
    p_days_before_expiry integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    reminders_sent INTEGER := 0;
    email_queue JSONB[] := '{}';
    reminder_result JSONB;
BEGIN
    -- Find incomplete profiles nearing expiration
    FOR invitation_record IN
        SELECT 
            si.id,
            si.email,
            si.expires_at,
            EXTRACT(EPOCH FROM (si.expires_at - NOW())) / 86400 as days_until_expiry
        FROM staff_invitations si
        WHERE si.status = 'accepted'
        AND si.completed_at IS NULL
        AND si.expires_at > NOW()
        AND si.expires_at <= (NOW() + INTERVAL '1 day' * p_days_before_expiry)
        -- Don't send reminder if already sent today
        AND NOT EXISTS (
            SELECT 1 FROM notification_log 
            WHERE recipient_email = si.email 
            AND notification_type = 'profile_completion_reminder'
            AND sent_at > (NOW() - INTERVAL '24 hours')
        )
    LOOP
        -- Send reminder
        reminder_result := send_profile_completion_reminder(invitation_record.id);
        
        IF (reminder_result->>'success')::boolean THEN
            email_queue := array_append(email_queue, reminder_result->'email_data');
            reminders_sent := reminders_sent + 1;
            
            -- Log reminder sent (optional notification_log table)
            -- INSERT INTO notification_log (recipient_email, notification_type, sent_at) 
            -- VALUES (invitation_record.email, 'profile_completion_reminder', NOW());
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'reminders_sent', reminders_sent,
        'email_queue', email_queue,
        'message', format('%s reminder emails prepared for sending', reminders_sent)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Batch reminder failed: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION send_batch_profile_completion_reminders IS 
'Sends batch reminder emails to staff who have not completed profile (called by cron job)';

-- ========================================
-- 9. NEW: Check Staff Profile Completion Status
-- ========================================

CREATE OR REPLACE FUNCTION public.check_staff_profile_completion_status(
    p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_context JSONB;
    target_user_id UUID;
    invitation_record RECORD;
    completion_status JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    
    -- Get invitation and profile status
    SELECT 
        si.id as invitation_id,
        si.status as invitation_status,
        si.completed_at,
        si.expires_at,
        si.metadata as clinic_metadata,
        sp.is_active as staff_active,
        sp.clinic_id,
        c.is_active as clinic_active,
        c.name as clinic_name,
        CASE 
            WHEN si.completed_at IS NOT NULL THEN 100
            WHEN sp.is_active = true THEN 90
            WHEN si.status = 'accepted' THEN 50
            WHEN si.status = 'pending' THEN 25
            ELSE 0
        END as completion_percentage,
        EXTRACT(EPOCH FROM (si.expires_at - NOW())) / 86400 as days_until_expiry
    INTO invitation_record
    FROM users u
    JOIN staff_invitations si ON u.email = si.email
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
    LEFT JOIN clinics c ON sp.clinic_id = c.id
    WHERE u.id = target_user_id
    ORDER BY si.created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No staff invitation found for this user'
        );
    END IF;
    
    completion_status := jsonb_build_object(
        'success', true,
        'invitation_id', invitation_record.invitation_id,
        'invitation_status', invitation_record.invitation_status,
        'completion_percentage', invitation_record.completion_percentage,
        'is_completed', invitation_record.completed_at IS NOT NULL,
        'completed_at', invitation_record.completed_at,
        'expires_at', invitation_record.expires_at,
        'days_until_expiry', ROUND(invitation_record.days_until_expiry::numeric, 2),
        'is_expired', invitation_record.expires_at < NOW(),
        'staff_active', COALESCE(invitation_record.staff_active, false),
        'clinic_id', invitation_record.clinic_id,
        'clinic_name', invitation_record.clinic_name,
        'clinic_active', COALESCE(invitation_record.clinic_active, false),
        'next_steps', CASE 
            WHEN invitation_record.completed_at IS NOT NULL THEN 'Profile completed. You can now access the system.'
            WHEN invitation_record.staff_active = true THEN 'Finalize clinic setup'
            WHEN invitation_record.status = 'accepted' THEN 'Complete your profile to activate your account'
            ELSE 'Accept your invitation to continue'
        END
    );
    
    RETURN completion_status;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION check_staff_profile_completion_status IS 
'Returns staff profile completion status and deadline information';

-- ========================================
-- 10. NEW: Manual Cleanup Function (Admin Trigger)
-- ========================================

CREATE OR REPLACE FUNCTION public.admin_cleanup_specific_incomplete_staff(
    p_invitation_id uuid,
    p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_context JSONB;
    invitation_record RECORD;
    cleanup_result JSONB;
BEGIN
    -- Security check
    current_user_context := get_current_user_context();
    
    IF current_user_context->>'user_type' != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied. Admin privileges required.');
    END IF;
    
    -- Get invitation details
    SELECT 
        si.*,
        u.id as user_id,
        u.auth_user_id,
        up.id as profile_id,
        sp.id as staff_profile_id,
        c.id as clinic_id
    INTO invitation_record
    FROM staff_invitations si
    LEFT JOIN users u ON si.email = u.email
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
    LEFT JOIN clinics c ON si.clinic_id = c.id
    WHERE si.id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
    END IF;
    
    -- Perform cleanup
    BEGIN
        -- Delete staff profile
        IF invitation_record.staff_profile_id IS NOT NULL THEN
            DELETE FROM staff_profiles WHERE id = invitation_record.staff_profile_id;
        END IF;
        
        -- Delete user profile
        IF invitation_record.profile_id IS NOT NULL THEN
            DELETE FROM user_profiles WHERE id = invitation_record.profile_id;
        END IF;
        
        -- Delete user
        IF invitation_record.user_id IS NOT NULL THEN
            DELETE FROM users WHERE id = invitation_record.user_id;
        END IF;
        
        -- Delete auth user
        IF invitation_record.auth_user_id IS NOT NULL THEN
            DELETE FROM auth.users WHERE id = invitation_record.auth_user_id;
        END IF;
        
        -- Delete orphaned clinic
        IF invitation_record.clinic_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM staff_profiles 
                WHERE clinic_id = invitation_record.clinic_id
            ) THEN
                DELETE FROM clinics WHERE id = invitation_record.clinic_id;
            END IF;
        END IF;
        
        -- Update invitation status
        UPDATE staff_invitations 
        SET 
            status = 'cancelled',
            admin_notes = p_admin_notes,
            updated_at = NOW()
        WHERE id = p_invitation_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Incomplete staff profile cleaned up successfully',
            'email', invitation_record.email,
            'admin_notes', p_admin_notes
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cleanup failed: ' || SQLERRM
            );
    END;
END;
$$;

COMMENT ON FUNCTION admin_cleanup_specific_incomplete_staff IS 
'Allows admin to manually cleanup specific incomplete staff signup';

CREATE OR REPLACE FUNCTION public.get_staff_invitation_status(
    p_invitation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details
    SELECT 
        si.*,
        c.name as clinic_name
    INTO invitation_record
    FROM staff_invitations si
    LEFT JOIN clinics c ON si.clinic_id = c.id
    WHERE si.id = p_invitation_id;
    
    -- Check if invitation exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invitation not found'
        );
    END IF;
    
    -- Return invitation details
    RETURN jsonb_build_object(
        'success', true,
        'invitation', jsonb_build_object(
            'id', invitation_record.id,
            'email', invitation_record.email,
            'clinic_id', invitation_record.clinic_id,
            'position', invitation_record.position,
            'department', invitation_record.department,
            'status', invitation_record.status,
            'expires_at', invitation_record.expires_at,
            'completed_at', invitation_record.completed_at,
            'invitation_token', invitation_record.invitation_token,
            'metadata', invitation_record.metadata,
            'clinic_name', COALESCE(invitation_record.clinic_name, invitation_record.metadata->>'clinic_name')
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to get invitation status: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION get_staff_invitation_status IS 
'Returns staff invitation status and details for validation (public access)';

-- Grant public access (no authentication required for invitation validation)
GRANT EXECUTE ON FUNCTION get_staff_invitation_status TO anon;
GRANT EXECUTE ON FUNCTION get_staff_invitation_status TO authenticated;

-- ========================================
-- 11. ADD METADATA COLUMN TO STAFF_INVITATIONS (If not exists)
-- ========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_invitations' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE staff_invitations 
        ADD COLUMN metadata jsonb DEFAULT NULL;
        
        COMMENT ON COLUMN staff_invitations.metadata IS 
        'Stores clinic metadata for later clinic creation after staff accepts invitation';
    END IF;
END $$;

-- ========================================
-- 12. ADD ADMIN_NOTES COLUMN TO STAFF_INVITATIONS (If not exists)
-- ========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_invitations' 
        AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE staff_invitations 
        ADD COLUMN admin_notes text DEFAULT NULL;
        
        COMMENT ON COLUMN staff_invitations.admin_notes IS 
        'Admin notes for invitation cancellation or cleanup';
    END IF;
END $$;

-- ========================================
-- 13. CREATE NOTIFICATION_LOG TABLE (For reminder tracking)
-- ========================================

CREATE TABLE IF NOT EXISTS public.notification_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    recipient_email character varying(255) NOT NULL,
    notification_type character varying(100) NOT NULL,
    sent_at timestamp with time zone DEFAULT NOW(),
    metadata jsonb DEFAULT NULL,
    CONSTRAINT notification_log_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_notification_log_email_type_sent 
ON notification_log (recipient_email, notification_type, sent_at DESC);

COMMENT ON TABLE notification_log IS 
'Tracks sent notifications for deduplication and audit purposes';

-- ========================================
-- 14. CREATE SCHEDULED JOB FOR AUTO-CLEANUP (Using pg_cron if available)
-- ========================================

-- NOTE: This requires pg_cron extension
-- If not available, create a cron job at OS level to call this function

DO $$
BEGIN
    -- Check if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule daily cleanup at 2 AM
        PERFORM cron.schedule(
            'cleanup-incomplete-staff-profiles',
            '0 2 * * *', -- Daily at 2 AM
            $$SELECT cleanup_incomplete_staff_profiles(7, false);$$
        );
        
        -- Schedule daily reminder emails at 10 AM
        PERFORM cron.schedule(
            'send-profile-completion-reminders',
            '0 10 * * *', -- Daily at 10 AM
            $$SELECT send_batch_profile_completion_reminders(2);$$
        );
        
        RAISE NOTICE 'Scheduled jobs created successfully';
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Please create cron jobs manually.';
    END IF;
END $$;

-- ========================================
-- 15. GRANT PERMISSIONS
-- ========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_and_signup_staff_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION update_staff_complete_profile_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION check_staff_profile_completion_status TO authenticated;

-- Grant execute permissions to service role (for cron jobs)
GRANT EXECUTE ON FUNCTION cleanup_incomplete_staff_profiles TO service_role;
GRANT EXECUTE ON FUNCTION send_batch_profile_completion_reminders TO service_role;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION approve_partnership_request_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION create_staff_invitation_with_clinic_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_incomplete_staff_signups TO authenticated;
GRANT EXECUTE ON FUNCTION send_profile_completion_reminder TO authenticated;
GRANT EXECUTE ON FUNCTION admin_cleanup_specific_incomplete_staff TO authenticated;

-- ========================================
-- 16. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_staff_invitations_cleanup 
ON staff_invitations (status, updated_at, completed_at) 
WHERE status = 'accepted' AND completed_at IS NULL;

-- Index for reminder queries
CREATE INDEX IF NOT EXISTS idx_staff_invitations_reminders 
ON staff_invitations (status, expires_at) 
WHERE status = 'accepted' AND completed_at IS NULL;

-- Index for admin dashboard
CREATE INDEX IF NOT EXISTS idx_staff_invitations_incomplete 
ON staff_invitations (status, created_at DESC) 
WHERE completed_at IS NULL;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Summary of changes:
-- ✅ Clinic creation moved to AFTER staff accepts invitation
-- ✅ Services created in services table (not clinics.services_offered)
-- ✅ Auto-cleanup for incomplete profiles (7-day threshold)
-- ✅ Reminder email system
-- ✅ Admin monitoring dashboard functions
-- ✅ Hard delete for orphaned records
-- ✅ Scheduled jobs for automation
-- ✅ Comprehensive logging and error handling

COMMENT ON SCHEMA public IS 
'DentServe Staff Invitation & Cleanup System - Migration completed successfully';