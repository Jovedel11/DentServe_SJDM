-- ========================================
-- DENTSERVE LOCATION CYCLE ANALYSIS
-- ========================================
-- This file contains all location-related database objects extracted from the main schema
-- for easier understanding and hook/function evaluation.

-- ========================================
-- LOCATION-RELATED TABLES
-- ========================================

-- Clinics table with geographic location
create table "public"."clinics" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "name" character varying(200) not null,
  "description" text,
  "address" text not null,
  "city" character varying(100) not null,
  "province" character varying(100),
  "zip_code" character varying(20),
  "country" character varying(100) not null default 'Philippines'::character varying,
  "location" extensions.geography(Point,4326) not null,
  "phone" character varying(20),
  "email" character varying(255) not null,
  "website_url" text,
  "operating_hours" jsonb,
  "services_offered" jsonb,
  "appointment_limit_per_patient" integer default 5,
  "cancellation_policy_hours" integer default 48,
  "is_active" boolean default true,
  "rating" numeric(3,2) default 0.00,
  "total_reviews" integer default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "image_url" text,
  "timezone" character varying(50) default 'Asia/Manila'::character varying
);

-- Patient profiles with preferred location
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

-- ========================================
-- LOCATION CYCLE FUNCTIONS
-- ========================================

-- 1. CLINIC LOCATION DISCOVERY FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.find_nearest_clinics(
  user_location extensions.geography DEFAULT NULL::extensions.geography, 
  max_distance_km double precision DEFAULT 50.0, 
  limit_count integer DEFAULT 20, 
  services_filter text[] DEFAULT NULL::text[], 
  min_rating numeric DEFAULT NULL::numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    result JSONB;
    current_context JSONB;
    current_user_id UUID;
BEGIN
    -- Input validation with safe bounds
    max_distance_km := LEAST(GREATEST(COALESCE(max_distance_km, 50.0), 1.0), 200.0);
    limit_count := LEAST(GREATEST(COALESCE(limit_count, 20), 1), 50);
    
    -- Get current user using existing function
    current_context := get_current_user_context();
    IF (current_context->>'authenticated')::boolean THEN
        current_user_id := (current_context->>'user_id')::UUID;
    END IF;
    
    -- Smart location fallback - use patient's preferred location if no location provided
    IF user_location IS NULL AND current_user_id IS NOT NULL THEN
        SELECT pp.preferred_location INTO user_location 
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        JOIN patient_profiles pp ON up.id = pp.user_profile_id
        WHERE u.id = current_user_id
        AND pp.preferred_location IS NOT NULL;
    END IF;
    
    -- Robust query with proper error handling
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
            -- Safe distance calculation with proper casting
            CASE 
                WHEN user_location IS NULL THEN 0::FLOAT
                ELSE ST_Distance(c.location::geometry, user_location::geometry) / 1000.0
            END AS distance_km
        FROM clinics c
        WHERE 
            c.is_active = true
            -- Safe distance filter
            AND (user_location IS NULL OR 
                 ST_DWithin(c.location::geometry, user_location::geometry, max_distance_km * 1000))
            -- Rating filter
            AND (min_rating IS NULL OR c.rating >= min_rating)
            -- Safe services filter for JSONB arrays
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
                    'location', jsonb_build_object(
                        'coordinates', ST_AsGeoJSON(cd.location::geometry)::jsonb->'coordinates',
                        'type', 'Point'
                    ),
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
                END,
                'search_area', CASE 
                    WHEN user_location IS NOT NULL THEN 
                        jsonb_build_object(
                            'center_lat', ST_Y(user_location::geometry),
                            'center_lng', ST_X(user_location::geometry),
                            'radius_km', max_distance_km
                        )
                    ELSE NULL
                END
            )
        )
    ) INTO result
    FROM clinic_data cd
    LEFT JOIN clinic_badges cb ON cd.id = cb.clinic_id
    LEFT JOIN clinic_stats cs ON cd.id = cs.clinic_id
    LIMIT limit_count;
    
    -- Always return valid result
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
$function$;

-- ========================================
-- 2. GEOCODING FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.geocode_clinic_address(
  p_address text, 
  p_city text DEFAULT 'San Jose Del Monte'::text, 
  p_province text DEFAULT 'Bulacan'::text, 
  p_country text DEFAULT 'Philippines'::text
)
RETURNS extensions.geography
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    full_address text;
    lat_lng geography;
BEGIN
    -- Construct full address
    full_address := p_address || ', ' || p_city || ', ' || p_province || ', ' || p_country;
    
    -- For now, return a default location in SJDM center if we can't geocode
    -- In production, you'd integrate with Google Maps Geocoding API
    -- Default coordinates for San Jose Del Monte center
    lat_lng := ST_SetSRID(ST_Point(121.0447, 14.8136), 4326)::geography;
    
    RETURN lat_lng;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to SJDM center coordinates
        RETURN ST_SetSRID(ST_Point(121.0447, 14.8136), 4326)::geography;
END;
$function$;

CREATE OR REPLACE FUNCTION public.geocode_address_to_point(
  p_address text, 
  p_city text DEFAULT 'San Jose Del Monte'::text, 
  p_province text DEFAULT 'Bulacan'::text, 
  p_country text DEFAULT 'Philippines'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    full_address text;
    result_point geography;
    latitude NUMERIC;
    longitude NUMERIC;
BEGIN
    -- Input validation
    IF p_address IS NULL OR TRIM(p_address) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Address is required'
        );
    END IF;
    
    -- Construct full address
    full_address := TRIM(p_address) || ', ' || 
                   COALESCE(TRIM(p_city), 'San Jose Del Monte') || ', ' || 
                   COALESCE(TRIM(p_province), 'Bulacan') || ', ' || 
                   COALESCE(TRIM(p_country), 'Philippines');
    
    -- Use existing geocoding function
    result_point := geocode_clinic_address(p_address, p_city, p_province, p_country);
    
    -- Extract coordinates
    latitude := ST_Y(result_point::geometry);
    longitude := ST_X(result_point::geometry);
    
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'latitude', latitude,
            'longitude', longitude,
            'formatted_address', full_address,
            'geography_point', ST_AsGeoJSON(result_point::geometry)::jsonb,
            'geocoding_method', 'default_sjdm_center'
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Geocoding failed: ' || SQLERRM
        );
END;
$function$;

-- ========================================
-- 3. USER LOCATION MANAGEMENT
-- ========================================

CREATE OR REPLACE FUNCTION public.update_user_location(latitude double precision, longitude double precision)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    patient_user_id UUID;
    user_profile_id UUID;
    new_location geography;
    old_location geography;
    distance_moved NUMERIC;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    -- Only patients can update location (staff/admin locations are clinic-based)
    IF current_context->>'user_type' != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only patients can update personal location');
    END IF;
    
    patient_user_id := (current_context->>'user_id')::UUID;
    
    -- Input validation
    IF latitude IS NULL OR longitude IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Latitude and longitude are required');
    END IF;
    
    IF latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Invalid coordinates',
            'data', jsonb_build_object(
                'valid_latitude_range', '[-90, 90]',
                'valid_longitude_range', '[-180, 180]',
                'provided', jsonb_build_object(
                    'latitude', latitude,
                    'longitude', longitude
                )
            )
        );
    END IF;
    
    -- Get user profile ID
    SELECT up.id INTO user_profile_id
    FROM user_profiles up
    WHERE up.user_id = patient_user_id;
    
    IF user_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient profile not found');
    END IF;
    
    -- Get current location for distance calculation
    SELECT pp.preferred_location INTO old_location
    FROM patient_profiles pp
    WHERE pp.user_profile_id = user_profile_id;
    
    -- Create new geography point
    new_location := ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography;
    
    -- Calculate distance moved if previous location exists
    IF old_location IS NOT NULL THEN
        distance_moved := ST_Distance(old_location::geometry, new_location::geometry) / 1000.0; -- Convert to km
    END IF;
    
    -- Ensure patient profile exists and update location
    INSERT INTO patient_profiles (user_profile_id, preferred_location, created_at)
    VALUES (user_profile_id, new_location, NOW())
    ON CONFLICT (user_profile_id) DO UPDATE SET
        preferred_location = new_location,
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Location updated successfully',
        'data', jsonb_build_object(
            'location', jsonb_build_object(
                'latitude', latitude,
                'longitude', longitude,
                'geography_point', ST_AsGeoJSON(new_location::geometry)::jsonb
            ),
            'updated_at', NOW(),
            'location_history', jsonb_build_object(
                'previous_location_existed', old_location IS NOT NULL,
                'distance_moved_km', CASE 
                    WHEN distance_moved IS NOT NULL THEN ROUND(distance_moved, 2)
                    ELSE NULL
                END,
                'significant_move', CASE 
                    WHEN distance_moved IS NOT NULL THEN distance_moved > 1.0
                    ELSE false
                END
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in update_user_location: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to update location: ' || SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_location()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    user_id_val UUID;
    user_location geography;
    result JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- Check authentication
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    user_id_val := (current_context->>'user_id')::UUID;
    
    -- Get user location based on role
    CASE current_context->>'user_type'
        WHEN 'patient' THEN
            -- Get patient's preferred location
            SELECT pp.preferred_location INTO user_location
            FROM user_profiles up
            JOIN patient_profiles pp ON up.id = pp.user_profile_id
            WHERE up.user_id = user_id_val;
            
        WHEN 'staff' THEN
            -- Get clinic location for staff
            SELECT c.location INTO user_location
            FROM user_profiles up
            JOIN staff_profiles sp ON up.id = sp.user_profile_id
            JOIN clinics c ON sp.clinic_id = c.id
            WHERE up.user_id = user_id_val
            AND sp.is_active = true;
            
        WHEN 'admin' THEN
            -- Admin has no specific location
            user_location := NULL;
            
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid user type');
    END CASE;
    
    IF user_location IS NOT NULL THEN
        result := jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'has_location', true,
                'latitude', ST_Y(user_location::geometry),
                'longitude', ST_X(user_location::geometry),
                'geography_point', ST_AsGeoJSON(user_location::geometry)::jsonb,
                'location_type', CASE 
                    WHEN current_context->>'user_type' = 'patient' THEN 'preferred_location'
                    WHEN current_context->>'user_type' = 'staff' THEN 'clinic_location'
                    ELSE 'unknown'
                END,
                'accuracy_note', CASE 
                    WHEN current_context->>'user_type' = 'patient' THEN 'User-set preferred location'
                    WHEN current_context->>'user_type' = 'staff' THEN 'Primary clinic location'
                    ELSE 'Unknown location type'
                END
            )
        );
    ELSE
        result := jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'has_location', false,
                'message', CASE 
                    WHEN current_context->>'user_type' = 'patient' THEN 'No preferred location set'
                    WHEN current_context->>'user_type' = 'staff' THEN 'No active clinic assignment'
                    WHEN current_context->>'user_type' = 'admin' THEN 'Admins do not have personal locations'
                    ELSE 'Location not available'
                END,
                'suggestion', CASE 
                    WHEN current_context->>'user_type' = 'patient' THEN 'Set your preferred location in profile settings'
                    WHEN current_context->>'user_type' = 'staff' THEN 'Contact admin for clinic assignment'
                    ELSE NULL
                END
            )
        );
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to get location: ' || SQLERRM);
END;
$function$;

-- ========================================
-- 4. DISTANCE AND PROXIMITY FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.calculate_distance_between_points(
  lat1 double precision, 
  lng1 double precision, 
  lat2 double precision, 
  lng2 double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    point1 geography;
    point2 geography;
    distance_meters NUMERIC;
    distance_km NUMERIC;
BEGIN
    -- Input validation
    IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'All coordinates are required');
    END IF;
    
    IF lat1 < -90 OR lat1 > 90 OR lat2 < -90 OR lat2 > 90 OR
       lng1 < -180 OR lng1 > 180 OR lng2 < -180 OR lng2 > 180 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid coordinates');
    END IF;
    
    -- Create geography points
    point1 := ST_SetSRID(ST_Point(lng1, lat1), 4326)::geography;
    point2 := ST_SetSRID(ST_Point(lng2, lat2), 4326)::geography;
    
    -- Calculate distance
    distance_meters := ST_Distance(point1, point2);
    distance_km := distance_meters / 1000.0;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'distance_meters', ROUND(distance_meters, 2),
            'distance_km', ROUND(distance_km, 3),
            'distance_miles', ROUND(distance_km * 0.621371, 3),
            'is_nearby', distance_km <= 5.0, -- Within 5km considered nearby
            'travel_category', CASE 
                WHEN distance_km <= 1.0 THEN 'walking_distance'
                WHEN distance_km <= 5.0 THEN 'short_drive'
                WHEN distance_km <= 20.0 THEN 'medium_drive'
                WHEN distance_km <= 50.0 THEN 'long_drive'
                ELSE 'very_far'
            END,
            'coordinates', jsonb_build_object(
                'point1', jsonb_build_object('lat', lat1, 'lng', lng1),
                'point2', jsonb_build_object('lat', lat2, 'lng', lng2)
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Distance calculation failed: ' || SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_clinics_within_radius(
  center_lat double precision, 
  center_lng double precision, 
  radius_km double precision DEFAULT 10.0,
  limit_count integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    center_point geography;
    result JSONB;
BEGIN
    -- Input validation
    IF center_lat IS NULL OR center_lng IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Center coordinates are required');
    END IF;
    
    IF center_lat < -90 OR center_lat > 90 OR center_lng < -180 OR center_lng > 180 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid center coordinates');
    END IF;
    
    -- Validate and constrain radius
    radius_km := LEAST(GREATEST(COALESCE(radius_km, 10.0), 0.1), 100.0);
    limit_count := LEAST(GREATEST(COALESCE(limit_count, 20), 1), 50);
    
    -- Create center point
    center_point := ST_SetSRID(ST_Point(center_lng, center_lat), 4326)::geography;
    
    -- Find clinics within radius
    WITH nearby_clinics AS (
        SELECT 
            c.id,
            c.name,
            c.address,
            c.city,
            c.phone,
            c.email,
            c.rating,
            c.total_reviews,
            c.location,
            ST_Distance(c.location, center_point) / 1000.0 AS distance_km,
            ST_Azimuth(center_point::geometry, c.location::geometry) * 180 / pi() AS bearing_degrees
        FROM clinics c
        WHERE c.is_active = true
        AND ST_DWithin(c.location, center_point, radius_km * 1000)
        ORDER BY ST_Distance(c.location, center_point)
        LIMIT limit_count
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'clinics', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'name', name,
                    'address', address,
                    'city', city,
                    'phone', phone,
                    'email', email,
                    'rating', rating,
                    'total_reviews', total_reviews,
                    'distance_km', ROUND(distance_km, 2),
                    'bearing_degrees', ROUND(bearing_degrees, 1),
                    'location', jsonb_build_object(
                        'latitude', ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ),
                    'is_very_close', distance_km <= 1.0,
                    'travel_time_estimate', CASE 
                        WHEN distance_km <= 1.0 THEN '5-10 minutes walk'
                        WHEN distance_km <= 5.0 THEN '10-15 minutes drive'
                        WHEN distance_km <= 15.0 THEN '15-30 minutes drive'
                        ELSE '30+ minutes drive'
                    END
                )
                ORDER BY distance_km
            ), '[]'::jsonb),
            'search_metadata', jsonb_build_object(
                'center_coordinates', jsonb_build_object(
                    'latitude', center_lat,
                    'longitude', center_lng
                ),
                'search_radius_km', radius_km,
                'total_found', COUNT(*),
                'search_area_km2', ROUND((pi() * radius_km * radius_km), 2)
            )
        )
    ) INTO result
    FROM nearby_clinics;
    
    RETURN COALESCE(result, jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'clinics', '[]'::jsonb,
            'search_metadata', jsonb_build_object(
                'total_found', 0,
                'search_radius_km', radius_km
            )
        )
    ));
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Radius search failed: ' || SQLERRM);
END;
$function$;

-- ========================================
-- 5. LOCATION UTILITIES AND HELPERS
-- ========================================

CREATE OR REPLACE FUNCTION public.validate_coordinates(latitude double precision, longitude double precision)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Null check
    IF latitude IS NULL OR longitude IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Coordinates cannot be null',
            'suggestions', jsonb_build_array(
                'Provide both latitude and longitude',
                'Latitude range: -90 to 90',
                'Longitude range: -180 to 180'
            )
        );
    END IF;
    
    -- Range validation
    IF latitude < -90 OR latitude > 90 THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid latitude',
            'provided_latitude', latitude,
            'valid_range', '[-90, 90]'
        );
    END IF;
    
    IF longitude < -180 OR longitude > 180 THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid longitude',
            'provided_longitude', longitude,
            'valid_range', '[-180, 180]'
        );
    END IF;
    
    -- Check if coordinates are in Philippines general area (optional validation)
    DECLARE
        in_philippines_area BOOLEAN;
    BEGIN
        in_philippines_area := (
            latitude BETWEEN 4.0 AND 21.0 AND 
            longitude BETWEEN 116.0 AND 127.0
        );
        
        RETURN jsonb_build_object(
            'valid', true,
            'coordinates', jsonb_build_object(
                'latitude', latitude,
                'longitude', longitude
            ),
            'location_info', jsonb_build_object(
                'in_philippines_general_area', in_philippines_area,
                'area_note', CASE 
                    WHEN in_philippines_area THEN 'Coordinates are within Philippines general area'
                    ELSE 'Coordinates are outside Philippines general area'
                END
            ),
            'geography_point', ST_AsGeoJSON(ST_SetSRID(ST_Point(longitude, latitude), 4326)::geometry)::jsonb
        );
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Coordinate validation failed: ' || SQLERRM
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_default_location_sjdm()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'location_name', 'San Jose Del Monte, Bulacan, Philippines',
            'latitude', 14.8136,
            'longitude', 121.0447,
            'geography_point', ST_AsGeoJSON(ST_SetSRID(ST_Point(121.0447, 14.8136), 4326)::geometry)::jsonb,
            'description', 'Default center location for San Jose Del Monte',
            'usage', 'Used as fallback when user location is not available'
        )
    );
END;
$function$;

-- ========================================
-- 6. LOCATION-BASED SEARCH ENHANCEMENTS
-- ========================================

CREATE OR REPLACE FUNCTION public.search_clinics_by_location_and_services(
  search_lat double precision,
  search_lng double precision,
  max_distance_km double precision DEFAULT 25.0,
  required_services text[] DEFAULT NULL::text[],
  min_rating numeric DEFAULT NULL::numeric,
  sort_by text DEFAULT 'distance'::text,
  limit_count integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    search_point geography;
    result JSONB;
    valid_sort_options text[] := ARRAY['distance', 'rating', 'reviews'];
BEGIN
    -- Input validation
    IF search_lat IS NULL OR search_lng IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Search coordinates are required');
    END IF;
    
    IF search_lat < -90 OR search_lat > 90 OR search_lng < -180 OR search_lng > 180 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid search coordinates');
    END IF;
    
    -- Validate sort option
    IF sort_by IS NULL OR sort_by NOT = ANY(valid_sort_options) THEN
        sort_by := 'distance';
    END IF;
    
    -- Constrain parameters
    max_distance_km := LEAST(GREATEST(COALESCE(max_distance_km, 25.0), 1.0), 100.0);
    limit_count := LEAST(GREATEST(COALESCE(limit_count, 15), 1), 50);
    
    -- Create search point
    search_point := ST_SetSRID(ST_Point(search_lng, search_lat), 4326)::geography;
    
    -- Enhanced search query
    WITH filtered_clinics AS (
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
            ST_Distance(c.location, search_point) / 1000.0 AS distance_km,
            -- Service matching score
            CASE 
                WHEN required_services IS NULL THEN 1.0
                ELSE (
                    SELECT COUNT(*)::FLOAT / array_length(required_services, 1)
                    FROM unnest(required_services) AS req_service
                    WHERE c.services_offered ? req_service
                )
            END AS service_match_score
        FROM clinics c
        WHERE c.is_active = true
        AND ST_DWithin(c.location, search_point, max_distance_km * 1000)
        AND (min_rating IS NULL OR c.rating >= min_rating)
        AND (
            required_services IS NULL OR 
            c.services_offered ?| required_services
        )
    ),
    ranked_clinics AS (
        SELECT *,
            -- Composite score for ranking
            CASE 
                WHEN sort_by = 'distance' THEN ROW_NUMBER() OVER (ORDER BY distance_km)
                WHEN sort_by = 'rating' THEN ROW_NUMBER() OVER (ORDER BY rating DESC, distance_km)
                WHEN sort_by = 'reviews' THEN ROW_NUMBER() OVER (ORDER BY total_reviews DESC, rating DESC, distance_km)
                ELSE ROW_NUMBER() OVER (ORDER BY distance_km)
            END AS rank_position
        FROM filtered_clinics
        WHERE (required_services IS NULL OR service_match_score > 0)
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'clinics', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'name', name,
                    'address', address,
                    'city', city,
                    'phone', phone,
                    'email', email,
                    'website_url', website_url,
                    'image_url', image_url,
                    'rating', rating,
                    'total_reviews', total_reviews,
                    'distance_km', ROUND(distance_km, 2),
                    'service_match_score', ROUND(service_match_score, 2),
                    'rank_position', rank_position,
                    'location', jsonb_build_object(
                        'latitude', ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ),
                    'services_offered', services_offered,
                    'operating_hours', operating_hours,
                    'availability_status', CASE 
                        WHEN distance_km <= 5.0 THEN 'nearby'
                        WHEN distance_km <= 15.0 THEN 'accessible'
                        ELSE 'distant'
                    END
                )
                ORDER BY rank_position
            ), '[]'::jsonb),
            'search_metadata', jsonb_build_object(
                'search_coordinates', jsonb_build_object(
                    'latitude', search_lat,
                    'longitude', search_lng
                ),
                'filters_applied', jsonb_build_object(
                    'max_distance_km', max_distance_km,
                    'required_services', required_services,
                    'min_rating', min_rating,
                    'sort_by', sort_by
                ),
                'results_summary', jsonb_build_object(
                    'total_found', COUNT(*),
                    'within_5km', COUNT(*) FILTER (WHERE distance_km <= 5.0),
                    'within_15km', COUNT(*) FILTER (WHERE distance_km <= 15.0),
                    'avg_distance_km', ROUND(AVG(distance_km), 2),
                    'avg_rating', ROUND(AVG(rating), 2)
                )
            )
        )
    ) INTO result
    FROM ranked_clinics
    LIMIT limit_count;
    
    RETURN COALESCE(result, jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'clinics', '[]'::jsonb,
            'search_metadata', jsonb_build_object(
                'total_found', 0,
                'message', 'No clinics found matching criteria'
            )
        )
    ));
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Advanced clinic search failed: ' || SQLERRM);
END;
$function$;

-- ========================================
-- LOCATION CYCLE SUMMARY
-- ========================================

/*
LOCATION LIFECYCLE:

1. LOCATION SETUP PHASE
   - geocode_clinic_address(): Convert addresses to coordinates
   - geocode_address_to_point(): General address geocoding
   - validate_coordinates(): Coordinate validation
   - get_default_location_sjdm(): Default fallback location

2. USER LOCATION MANAGEMENT
   - update_user_location(): Patient location updates
   - get_user_location(): Retrieve user location by role
   - Location storage in patient_profiles.preferred_location

3. CLINIC DISCOVERY PHASE
   - find_nearest_clinics(): Main clinic discovery function
   - find_clinics_within_radius(): Simple radius search
   - search_clinics_by_location_and_services(): Advanced search

4. DISTANCE AND PROXIMITY
   - calculate_distance_between_points(): Distance calculations
   - ST_Distance(): PostGIS distance functions
   - Travel time estimates and categorization

5. LOCATION-BASED FEATURES
   - Geographic search with filters
   - Service matching with location
   - Rating and distance-based sorting
   - Clinic badges and statistics integration

KEY COMPONENTS:

TABLES WITH LOCATION DATA:
- clinics.location: Clinic geographic coordinates (required)
- patient_profiles.preferred_location: Patient preferred location (optional)

GEOGRAPHIC FEATURES:
- PostGIS geography type for accurate distance calculations
- SRID 4326 (WGS84) for global coordinate system
- Meter-based distance calculations
- Geographic indexing for performance

SEARCH CAPABILITIES:
- Radius-based searches (1-100km)
- Service filtering with location
- Rating-based filtering
- Multi-criteria sorting (distance, rating, reviews)
- Travel time estimations

LOCATION TYPES:
- Patient: preferred_location (user-set)
- Staff: clinic_location (from assigned clinic)
- Admin: no specific location

DEFAULT BEHAVIOR:
- Fallback to San Jose Del Monte center (14.8136, 121.0447)
- Smart location detection from user profiles
- Graceful handling of missing location data

INTEGRATION POINTS:
- Appointment booking with location context
- Clinic recommendations based on proximity
- User profile location preferences
- Geographic analytics and reporting
*/