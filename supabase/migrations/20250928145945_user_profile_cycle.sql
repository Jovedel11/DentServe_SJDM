-- ========================================
-- DENTSERVE USER PROFILE CYCLE ANALYSIS
-- ========================================
-- This file contains all user profile-related database objects extracted from the main schema
-- for easier understanding and hook/function evaluation.

-- ========================================
-- USER-RELATED TYPES & ENUMS
-- ========================================

-- Core user type enum
create type "public"."user_type" as enum ('patient', 'staff', 'admin');

-- ========================================
-- USER-RELATED TABLES
-- ========================================

-- Core users table (authentication and contact info)
create table "public"."users" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "auth_user_id" uuid not null,
  "email" character varying(255) not null,
  "phone" character varying(20),
  "is_active" boolean default true,
  "last_login" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "phone_verified" boolean default false,
  "email_verified" boolean default false
);

-- Base user profiles table (common profile data)
create table "public"."user_profiles" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_id" uuid not null,
  "user_type" user_type not null,
  "first_name" character varying(100) not null,
  "last_name" character varying(100) not null,
  "date_of_birth" date,
  "gender" character varying(10),
  "profile_image_url" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- Admin-specific profile data
create table "public"."admin_profiles" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_profile_id" uuid not null,
  "access_level" integer default 1,
  "login_attempts" integer default 0,
  "permissions" jsonb default '{"manage_users": true, "ui_management": true, "system_analytics": true, "partnership_management": true}'::jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- Patient-specific profile data
create table "public"."patient_profiles" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_profile_id" uuid not null,
  "preferred_location" extensions.geography(Point,4326),
  "preferred_doctors" uuid[],
  "emergency_contact_name" character varying(200),
  "emergency_contact_phone" character varying(20),
  "insurance_provider" character varying(200),
  "medical_conditions" text[],
  "allergies" text[],
  "email_notifications" boolean default true,
  "sms_notifications" boolean default false,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- Staff-specific profile data
create table "public"."staff_profiles" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_profile_id" uuid not null,
  "clinic_id" uuid not null,
  "employee_id" character varying(50),
  "position" character varying(100) not null,
  "hire_date" date not null,
  "department" character varying(100),
  "permissions" jsonb default '{"manage_clinic": true, "manage_doctors": false, "view_analytics": true, "manage_services": true, "manage_appointments": true}'::jsonb,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- User archive preferences
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
-- USER PROFILE CYCLE FUNCTIONS
-- ========================================

-- 1. USER CREATION AND SETUP FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
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
        
        -- Phone is now completely optional - no blocking on invalid/missing phone
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
            user_phone := NULL;
    END;

    -- Insert user record (STEP 1) - Email-first, phone optional
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
                true, -- Email notifications always enabled
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
                false -- Staff inactive by default, activation via admin
            );
            
            RAISE LOG 'Created staff_profiles record for profile_id: % (requires admin activation)', new_profile_id;
            
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

    -- Optional phone sync - only runs if phone exists
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
$function$;

CREATE OR REPLACE FUNCTION public.create_user_email_only(p_email character varying, p_first_name character varying, p_last_name character varying, p_user_type user_type DEFAULT 'patient'::user_type)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    new_user_id UUID;
    new_profile_id UUID;
    auth_user_id UUID;
BEGIN
    -- Input validation
    IF p_email IS NULL OR p_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email is required');
    END IF;
    
    IF p_first_name IS NULL OR p_first_name = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'First name is required');
    END IF;
    
    IF p_last_name IS NULL OR p_last_name = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Last name is required');
    END IF;

    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- Create auth user first
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
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
        crypt('temp_password_' || gen_random_uuid()::text, gen_salt('bf')),
        NOW(),
        jsonb_build_object(
            'first_name', p_first_name,
            'last_name', p_last_name,
            'user_type', p_user_type::text,
            'created_method', 'email_only_admin'
        ),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO auth_user_id;

    -- Create public user record
    INSERT INTO public.users (
        auth_user_id,
        email,
        email_verified,
        is_active
    ) VALUES (
        auth_user_id,
        p_email,
        true,
        true
    ) RETURNING id INTO new_user_id;

    -- Create user profile
    INSERT INTO public.user_profiles (
        user_id,
        user_type,
        first_name,
        last_name
    ) VALUES (
        new_user_id,
        p_user_type,
        p_first_name,
        p_last_name
    ) RETURNING id INTO new_profile_id;

    -- Create role-specific profile
    IF p_user_type = 'patient' THEN
        INSERT INTO public.patient_profiles (user_profile_id, email_notifications)
        VALUES (new_profile_id, true);
    ELSIF p_user_type = 'admin' THEN
        INSERT INTO public.admin_profiles (user_profile_id, access_level)
        VALUES (new_profile_id, 1);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User created successfully',
        'data', jsonb_build_object(
            'user_id', new_user_id,
            'profile_id', new_profile_id,
            'auth_user_id', auth_user_id,
            'email', p_email,
            'user_type', p_user_type
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- ========================================
-- 2. USER CONTEXT AND AUTHENTICATION
-- ========================================

CREATE OR REPLACE FUNCTION public.get_current_user_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
    
    -- Email-centric user context query (phone optional)
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
    AND u.email_verified = true; -- Only email verification required
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'authenticated', true,
            'profile_exists', false,
            'error', 'User profile not found or email not verified'
        );
    END IF;
    
    -- Email-centric result building
    result := jsonb_build_object(
        'authenticated', true,
        'profile_exists', true,
        'user_id', user_record.user_id,
        'auth_user_id', user_record.auth_user_id,
        'email', user_record.email, -- Primary identifier
        'phone', user_record.phone, -- Optional field (can be null)
        'phone_verified', CASE WHEN user_record.phone IS NOT NULL THEN user_record.phone_verified ELSE null END,
        'user_type', user_record.user_type::text,
        'first_name', user_record.first_name,
        'last_name', user_record.last_name,
        'full_name', user_record.first_name || ' ' || user_record.last_name,
        'is_active', user_record.is_active,
        'authentication_method', 'email_first' -- Indicate auth method
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
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    current_auth_uid UUID;
    user_id_result UUID;
BEGIN
    current_auth_uid := auth.uid();
    
    IF current_auth_uid IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT u.id INTO user_id_result
    FROM public.users u
    WHERE u.auth_user_id = current_auth_uid
    AND u.is_active = true;
    
    RETURN user_id_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    current_user_id UUID;
    user_role user_type;
BEGIN
    current_user_id := get_current_user_id();
    
    IF current_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT up.user_type INTO user_role
    FROM public.user_profiles up
    WHERE up.user_id = current_user_id;
    
    RETURN user_role;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_auth_status(p_auth_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    target_auth_id UUID;
    auth_user RECORD;
    public_user RECORD;
    result JSONB;
BEGIN
    target_auth_id := COALESCE(p_auth_user_id, auth.uid());
    
    IF target_auth_id IS NULL THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'error', 'No auth user ID provided'
        );
    END IF;
    
    -- Get auth.users data
    SELECT 
        id,
        email,
        phone,
        email_confirmed_at,
        phone_confirmed_at,
        created_at,
        last_sign_in_at,
        raw_user_meta_data
    INTO auth_user
    FROM auth.users
    WHERE id = target_auth_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'error', 'Auth user not found'
        );
    END IF;
    
    -- Get public.users data if exists
    SELECT 
        u.id,
        u.email,
        u.phone,
        u.email_verified,
        u.phone_verified,
        u.is_active,
        up.user_type,
        up.first_name,
        up.last_name
    INTO public_user
    FROM public.users u
    LEFT JOIN public.user_profiles up ON u.id = up.user_id
    WHERE u.auth_user_id = target_auth_id;
    
    -- Build comprehensive status
    result := jsonb_build_object(
        'auth_user_id', auth_user.id,
        'email', auth_user.email,
        'phone', auth_user.phone,
        'auth_created_at', auth_user.created_at,
        'last_sign_in_at', auth_user.last_sign_in_at,
        'email_confirmed_auth', auth_user.email_confirmed_at IS NOT NULL,
        'phone_confirmed_auth', auth_user.phone_confirmed_at IS NOT NULL,
        'signup_metadata', auth_user.raw_user_meta_data,
        'profile_created', public_user.id IS NOT NULL
    );
    
    IF public_user.id IS NOT NULL THEN
        result := result || jsonb_build_object(
            'user_id', public_user.id,
            'user_type', public_user.user_type,
            'full_name', COALESCE(public_user.first_name || ' ' || public_user.last_name, 'Unnamed User'),
            'email_verified_public', public_user.email_verified,
            'phone_verified_public', public_user.phone_verified,
            'is_active', public_user.is_active,
            'authentication_method', 'email_first'
        );
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', 'Failed to get auth status: ' || SQLERRM
        );
END;
$function$;

-- ========================================
-- 3. PROFILE RETRIEVAL FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.get_user_complete_profile(p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
    
    -- Email-centric access control
    IF v_current_role = 'patient' AND target_user_id != (current_context->>'user_id')::UUID THEN
        RETURN jsonb_build_object('error', 'Access denied');
    END IF;
    
    -- Build comprehensive user profile
    SELECT jsonb_build_object(
        'user_id', u.id,
        'auth_user_id', u.auth_user_id,
        'email', u.email, -- Primary identifier
        'phone', u.phone, -- Optional field, included if present
        'email_verified', u.email_verified,
        'phone_verified', CASE WHEN u.phone IS NOT NULL THEN u.phone_verified ELSE null END,
        'is_active', u.is_active,
        'last_login', u.last_login,
        'authentication_method', 'email_first', -- Indicate auth method
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
                    'sms_notifications', CASE WHEN u.phone IS NOT NULL THEN pp.sms_notifications ELSE false END,
                    'profile_completion', CASE 
                        WHEN pp.emergency_contact_name IS NOT NULL AND 
                             pp.medical_conditions IS NOT NULL AND 
                             pp.allergies IS NOT NULL 
                        THEN 100
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
                    'activation_method', 'admin_approval'
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
$function$;

CREATE OR REPLACE FUNCTION public.get_profile_completion_status(p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_user_profile_complete(p_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    target_user_id UUID;
    completion_status JSONB;
    completion_percentage INTEGER;
BEGIN
    target_user_id := COALESCE(p_user_id, get_current_user_id());
    
    IF target_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    completion_status := get_profile_completion_status(target_user_id);
    completion_percentage := (completion_status->>'completion_percentage')::INTEGER;
    
    RETURN completion_percentage >= 80; -- 80% completion threshold
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_users_list(p_user_type user_type DEFAULT NULL::user_type, p_clinic_id uuid DEFAULT NULL::uuid, p_search_term text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    v_current_role TEXT;
    search_pattern TEXT;
    result JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    v_current_role := current_context->>'user_type';
    
    -- Only staff and admin can access user lists
    IF v_current_role NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
    
    -- Prepare search pattern
    IF p_search_term IS NOT NULL AND p_search_term != '' THEN
        search_pattern := '%' || LOWER(p_search_term) || '%';
    END IF;
    
    -- Build user list query based on role and filters
    WITH user_data AS (
        SELECT 
            u.id,
            u.email,
            u.phone,
            u.is_active,
            u.last_login,
            u.created_at,
            up.user_type,
            up.first_name,
            up.last_name,
            up.profile_image_url,
            CASE 
                WHEN up.user_type = 'patient' THEN (
                    SELECT jsonb_build_object(
                        'emergency_contact_name', pp.emergency_contact_name,
                        'medical_conditions', pp.medical_conditions,
                        'total_appointments', (
                            SELECT COUNT(*) FROM appointments WHERE patient_id = u.id
                        )
                    )
                    FROM patient_profiles pp WHERE pp.user_profile_id = up.id
                )
                WHEN up.user_type = 'staff' THEN (
                    SELECT jsonb_build_object(
                        'clinic_id', sp.clinic_id,
                        'clinic_name', c.name,
                        'position', sp.position,
                        'department', sp.department,
                        'is_active', sp.is_active
                    )
                    FROM staff_profiles sp
                    LEFT JOIN clinics c ON sp.clinic_id = c.id
                    WHERE sp.user_profile_id = up.id
                )
                WHEN up.user_type = 'admin' THEN (
                    SELECT jsonb_build_object(
                        'access_level', ap.access_level,
                        'permissions', ap.permissions
                    )
                    FROM admin_profiles ap WHERE ap.user_profile_id = up.id
                )
                ELSE '{}'::jsonb
            END as role_data
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
        WHERE (p_user_type IS NULL OR up.user_type = p_user_type)
        AND (p_clinic_id IS NULL OR sp.clinic_id = p_clinic_id)
        AND (
            search_pattern IS NULL OR 
            LOWER(up.first_name || ' ' || up.last_name) LIKE search_pattern OR
            LOWER(u.email) LIKE search_pattern OR
            LOWER(u.phone) LIKE search_pattern
        )
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'email', email,
            'phone', phone,
            'is_active', is_active,
            'last_login', last_login,
            'created_at', created_at,
            'user_type', user_type,
            'first_name', first_name,
            'last_name', last_name,
            'full_name', first_name || ' ' || last_name,
            'profile_image_url', profile_image_url,
            'role_specific_data', role_data
        )
    ) INTO result
    FROM user_data;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(result, '[]'::jsonb),
        'metadata', jsonb_build_object(
            'total_count', (
                SELECT COUNT(*)
                FROM users u
                JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN staff_profiles sp ON up.id = sp.user_profile_id
                WHERE (p_user_type IS NULL OR up.user_type = p_user_type)
                AND (p_clinic_id IS NULL OR sp.clinic_id = p_clinic_id)
            ),
            'filters', jsonb_build_object(
                'user_type', p_user_type,
                'clinic_id', p_clinic_id,
                'search_term', p_search_term
            ),
            'pagination', jsonb_build_object(
                'limit', p_limit,
                'offset', p_offset
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- ========================================
-- 4. PROFILE UPDATE FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.update_patient_profile(p_profile_data jsonb DEFAULT '{}'::jsonb, p_patient_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
    current_context JSONB;
    patient_user_id UUID;
    profile_id UUID;
    result JSONB := '{}';
BEGIN
    SET search_path = public, pg_catalog;
    
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- Only patients can use this function
    IF current_context->>'user_type' != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Patients only');
    END IF;
    
    patient_user_id := (current_context->>'user_id')::UUID;
    
    -- Get profile ID
    SELECT up.id INTO profile_id
    FROM user_profiles up
    WHERE up.user_id = patient_user_id;
    
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
        WHERE id = patient_user_id;
        
        result := result || jsonb_build_object('user_updated', true);
    END IF;
    
    -- 2️⃣ UPDATE USER PROFILES (Basic Info + Profile Image)
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
    
    -- 3️⃣ UPDATE PATIENT-SPECIFIC DATA
    -- Ensure patient profile exists
    INSERT INTO patient_profiles (user_profile_id, created_at)
    VALUES (profile_id, NOW())
    ON CONFLICT (user_profile_id) DO NOTHING;
    
    -- Update patient profile
    UPDATE patient_profiles 
    SET 
        emergency_contact_name = COALESCE(p_patient_data->>'emergency_contact_name', emergency_contact_name),
        emergency_contact_phone = COALESCE(p_patient_data->>'emergency_contact_phone', emergency_contact_phone),
        insurance_provider = COALESCE(p_patient_data->>'insurance_provider', insurance_provider),
        medical_conditions = CASE 
            WHEN p_patient_data ? 'medical_conditions' 
            THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_patient_data->'medical_conditions'))
            ELSE medical_conditions 
        END,
        allergies = CASE 
            WHEN p_patient_data ? 'allergies' 
            THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_patient_data->'allergies'))
            ELSE allergies 
        END,
        preferred_doctors = CASE 
            WHEN p_patient_data ? 'preferred_doctors'
            THEN (SELECT array_agg(value::text::uuid) FROM jsonb_array_elements_text(p_patient_data->'preferred_doctors'))
            ELSE preferred_doctors
        END,
        updated_at = NOW()
    WHERE user_profile_id = profile_id;
    
    result := result || jsonb_build_object('patient_profile_updated', true);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Patient profile updated successfully',
        'updates', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_admin_profile(p_profile_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    admin_user_id UUID;
    profile_id UUID;
    result JSONB := '{}';
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- Only admins can use this function
    IF current_context->>'user_type' != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Admins only');
    END IF;
    
    admin_user_id := (current_context->>'user_id')::UUID;
    
    -- Get profile ID
    SELECT up.id INTO profile_id
    FROM user_profiles up
    WHERE up.user_id = admin_user_id;
    
    IF profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;
    
    -- Update base user data if phone provided
    IF p_profile_data ? 'phone' THEN
        UPDATE users 
        SET phone = p_profile_data->>'phone',
            phone_verified = CASE 
                WHEN phone != p_profile_data->>'phone' THEN false 
                ELSE phone_verified 
            END,
            updated_at = NOW()
        WHERE id = admin_user_id;
        
        result := result || jsonb_build_object('user_updated', true);
    END IF;
    
    -- Update user profiles
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
    
    -- Update admin-specific data
    UPDATE admin_profiles 
    SET 
        access_level = COALESCE((p_profile_data->>'access_level')::integer, access_level),
        permissions = CASE 
            WHEN p_profile_data ? 'permissions'
            THEN p_profile_data->'permissions'
            ELSE permissions
        END,
        updated_at = NOW()
    WHERE user_profile_id = profile_id;
    
    result := result || jsonb_build_object('admin_profile_updated', true);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Admin profile updated successfully',
        'updates', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_staff_complete_profile(p_profile_data jsonb DEFAULT '{}'::jsonb, p_clinic_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    staff_user_id UUID;
    profile_id UUID;
    staff_clinic_id UUID;
    result JSONB := '{}';
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- Only staff can use this function
    IF current_context->>'user_type' != 'staff' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff only');
    END IF;
    
    staff_user_id := (current_context->>'user_id')::UUID;
    
    -- Get profile ID and clinic ID
    SELECT up.id, sp.clinic_id INTO profile_id, staff_clinic_id
    FROM user_profiles up
    JOIN staff_profiles sp ON up.id = sp.user_profile_id
    WHERE up.user_id = staff_user_id;
    
    IF profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff profile not found');
    END IF;
    
    -- Update base user data
    IF p_profile_data ? 'phone' THEN
        UPDATE users 
        SET phone = p_profile_data->>'phone',
            phone_verified = CASE 
                WHEN phone != p_profile_data->>'phone' THEN false 
                ELSE phone_verified 
            END,
            updated_at = NOW()
        WHERE id = staff_user_id;
        
        result := result || jsonb_build_object('user_updated', true);
    END IF;
    
    -- Update user profiles
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
    
    -- Update staff profile
    UPDATE staff_profiles 
    SET 
        position = COALESCE(p_profile_data->>'position', position),
        department = COALESCE(p_profile_data->>'department', department),
        updated_at = NOW()
    WHERE user_profile_id = profile_id;
    
    result := result || jsonb_build_object('staff_profile_updated', true);
    
    -- Update clinic if data provided and user has clinic
    IF p_clinic_data != '{}' AND staff_clinic_id IS NOT NULL THEN
        UPDATE clinics 
        SET 
            name = COALESCE(p_clinic_data->>'name', name),
            description = COALESCE(p_clinic_data->>'description', description),
            address = COALESCE(p_clinic_data->>'address', address),
            city = COALESCE(p_clinic_data->>'city', city),
            province = COALESCE(p_clinic_data->>'province', province),
            phone = COALESCE(p_clinic_data->>'phone', phone),
            email = COALESCE(p_clinic_data->>'email', email),
            website_url = COALESCE(p_clinic_data->>'website_url', website_url),
            updated_at = NOW()
        WHERE id = staff_clinic_id;
        
        result := result || jsonb_build_object('clinic_updated', true);
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Staff profile updated successfully',
        'updates', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_location(latitude double precision, longitude double precision)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    patient_user_id UUID;
    profile_id UUID;
    new_location geography;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    -- Only patients can update location
    IF current_context->>'user_type' != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only patients can update location');
    END IF;
    
    patient_user_id := (current_context->>'user_id')::UUID;
    
    -- Validate coordinates
    IF latitude IS NULL OR longitude IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Latitude and longitude are required');
    END IF;
    
    IF latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid coordinates');
    END IF;
    
    -- Get profile ID
    SELECT up.id INTO profile_id
    FROM user_profiles up
    WHERE up.user_id = patient_user_id;
    
    IF profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient profile not found');
    END IF;
    
    -- Create geography point
    new_location := ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography;
    
    -- Ensure patient profile exists
    INSERT INTO patient_profiles (user_profile_id, preferred_location, created_at)
    VALUES (profile_id, new_location, NOW())
    ON CONFLICT (user_profile_id) DO UPDATE SET
        preferred_location = new_location,
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Location updated successfully',
        'data', jsonb_build_object(
            'latitude', latitude,
            'longitude', longitude,
            'updated_at', NOW()
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- ========================================
-- 5. PROFILE VALIDATION FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.enforce_patient_profile_update_constraints()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only allow patients to update their own profile
    IF TG_OP = 'UPDATE' THEN
        -- Check if current user is the profile owner or admin
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN users u ON up.user_id = u.id
            WHERE up.id = NEW.user_profile_id
            AND (u.id = get_current_user_id() OR get_current_user_role() = 'admin')
        ) THEN
            RAISE EXCEPTION 'Access denied: Can only update own profile';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_staff_profile_update_constraints()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only allow staff to update their own profile or admin
    IF TG_OP = 'UPDATE' THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN users u ON up.user_id = u.id
            WHERE up.id = NEW.user_profile_id
            AND (u.id = get_current_user_id() OR get_current_user_role() = 'admin')
        ) THEN
            RAISE EXCEPTION 'Access denied: Can only update own profile';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- ========================================
-- 6. UTILITY FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ========================================
-- USER PROFILE CYCLE SUMMARY
-- ========================================

/*
USER PROFILE LIFECYCLE:

1. CREATION PHASE
   - create_user_profile_on_signup(): Triggered on auth.users insert
   - create_user_email_only(): Manual user creation (admin only)
   - Creates users, user_profiles, and role-specific profiles

2. AUTHENTICATION PHASE
   - get_current_user_context(): Primary context function
   - get_current_user_id(): Gets current user ID
   - get_current_user_role(): Gets current user role
   - get_user_auth_status(): Comprehensive auth status

3. RETRIEVAL PHASE
   - get_user_complete_profile(): Complete profile data
   - get_profile_completion_status(): Profile completion analysis
   - is_user_profile_complete(): Boolean completion check
   - get_users_list(): Admin/staff user management

4. UPDATE PHASE
   - update_patient_profile(): Patient-specific updates
   - update_admin_profile(): Admin-specific updates
   - update_staff_complete_profile(): Staff and clinic updates
   - update_user_profile(): Universal profile update function
   - update_user_location(): Location-specific updates

5. VALIDATION PHASE
   - enforce_patient_profile_update_constraints(): Patient access control
   - enforce_staff_profile_update_constraints(): Staff access control
   - Various input validation throughout

PROFILE TYPES:
- 'patient': Healthcare consumers with medical data
- 'staff': Clinic employees with clinic management access
- 'admin': System administrators with full access

TABLES INVOLVED:
- users: Core authentication and contact info
- user_profiles: Base profile information
- patient_profiles: Patient-specific medical data
- staff_profiles: Staff role and clinic association
- admin_profiles: Administrative permissions
- user_archive_preferences: Data retention settings

KEY FEATURES:
- Email-first authentication (phone optional)
- Role-based access control
- Profile completion tracking
- Comprehensive update capabilities
- Geographic location support
- Medical data management
- Clinic management integration
*/