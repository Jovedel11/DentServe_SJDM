create extension if not exists "postgis" with schema "extensions";


create type "public"."appointment_booking_type" as enum ('consultation_only', 'consultation_with_service', 'service_only', 'treatment_plan_follow_up');

create type "public"."appointment_status" as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

create type "public"."feedback_type" as enum ('general', 'service', 'doctor', 'facility');

create type "public"."notification_type" as enum ('appointment_reminder', 'appointment_confirmed', 'appointment_cancelled', 'feedback_request', 'partnership_request', 'feedback_response');

create type "public"."partnership_status" as enum ('pending', 'approved', 'rejected');

create type "public"."rejection_category" as enum ('doctor_unavailable', 'overbooked', 'patient_request', 'system_error', 'other', 'staff_decision');

create type "public"."urgency_level" as enum ('normal', 'high', 'urgent');

create type "public"."user_type" as enum ('patient', 'staff', 'admin');

create table "public"."admin_profiles" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_profile_id" uuid not null,
    "access_level" integer default 1,
    "login_attempts" integer default 0,
    "permissions" jsonb default '{"manage_users": true, "ui_management": true, "system_analytics": true, "partnership_management": true}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."admin_profiles" enable row level security;

create table "public"."analytics_events" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "event_type" character varying(100) not null,
    "user_id" uuid,
    "clinic_id" uuid,
    "metadata" jsonb,
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."analytics_events" enable row level security;

create table "public"."appointment_services" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "appointment_id" uuid not null,
    "service_id" uuid,
    "treatment_plan_id" uuid
);


alter table "public"."appointment_services" enable row level security;

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
    "timezone" character varying(50) default 'Asia/Manila'::character varying,
    "booking_type" appointment_booking_type default 'consultation_only'::appointment_booking_type,
    "appointment_type" character varying(50) default 'consultation_only'::character varying,
    "consultation_fee_charged" numeric(10,2) default NULL::numeric,
    "requires_new_consultation" boolean default false
);


alter table "public"."appointments" enable row level security;

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


alter table "public"."archive_items" enable row level security;

create table "public"."clinic_badge_awards" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "clinic_id" uuid not null,
    "badge_id" uuid not null,
    "awarded_by" uuid,
    "award_date" date default CURRENT_DATE,
    "is_current" boolean default true,
    "notes" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."clinic_badge_awards" enable row level security;

create table "public"."clinic_badges" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "badge_name" character varying(100) not null,
    "badge_description" text,
    "badge_icon_url" text,
    "criteria" jsonb,
    "badge_color" character varying(7),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
);


alter table "public"."clinic_badges" enable row level security;

create table "public"."clinic_partnership_requests" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "clinic_name" character varying not null,
    "email" character varying not null,
    "address" text not null,
    "reason" text not null,
    "status" partnership_status default 'pending'::partnership_status,
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "admin_notes" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."clinic_partnership_requests" enable row level security;

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
    "appointment_limit_per_patient" integer default 1000000,
    "cancellation_policy_hours" integer default 48,
    "is_active" boolean default true,
    "rating" numeric(3,2) default 0.00,
    "total_reviews" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "image_url" text,
    "timezone" character varying(50) default 'Asia/Manila'::character varying
);


alter table "public"."clinics" enable row level security;

create table "public"."doctor_clinics" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "doctor_id" uuid not null,
    "clinic_id" uuid not null,
    "is_active" boolean default true,
    "schedule" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."doctor_clinics" enable row level security;

create table "public"."doctor_services" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "doctor_id" uuid not null,
    "service_id" uuid not null,
    "clinic_id" uuid not null,
    "is_primary_provider" boolean default false,
    "proficiency_level" character varying(50) default 'proficient'::character varying,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."doctor_services" enable row level security;

create table "public"."doctors" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "license_number" character varying(100) not null,
    "specialization" character varying(200) not null,
    "education" text,
    "experience_years" integer,
    "bio" text,
    "consultation_fee" numeric(10,2),
    "image_url" text,
    "languages_spoken" text[],
    "certifications" jsonb,
    "awards" text[],
    "is_available" boolean default true,
    "rating" numeric(3,2) default 0.00,
    "total_reviews" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "first_name" character varying(100) not null default ''::character varying,
    "last_name" character varying(100) not null default ''::character varying
);


alter table "public"."doctors" enable row level security;

create table "public"."email_communications" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "from_user_id" uuid not null,
    "to_user_id" uuid not null,
    "appointment_id" uuid,
    "subject" character varying(300) not null,
    "message_body" text not null,
    "email_type" character varying(50),
    "is_read" boolean default false,
    "replied_to" uuid,
    "attachments" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."email_communications" enable row level security;

create table "public"."email_queue" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "to_email" character varying(255) not null,
    "subject" character varying(500) not null,
    "body" text not null,
    "email_type" character varying(50) default 'staff_invitation'::character varying,
    "status" character varying(20) default 'pending'::character varying,
    "attempts" integer default 0,
    "max_attempts" integer default 3,
    "error_message" text,
    "scheduled_for" timestamp with time zone default now(),
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."email_queue" enable row level security;

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
    "created_at" timestamp with time zone default now(),
    "clinic_rating" integer,
    "doctor_rating" integer
);


alter table "public"."feedback" enable row level security;

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


alter table "public"."file_uploads" enable row level security;

create table "public"."notification_log" (
    "id" uuid not null default gen_random_uuid(),
    "recipient_email" character varying(255) not null,
    "notification_type" character varying(100) not null,
    "sent_at" timestamp with time zone default now(),
    "metadata" jsonb
);


alter table "public"."notification_log" enable row level security;

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


alter table "public"."notification_templates" enable row level security;

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


alter table "public"."notifications" enable row level security;

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


alter table "public"."patient_appointment_limits" enable row level security;

create table "public"."patient_medical_history" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "patient_id" uuid not null,
    "appointment_id" uuid,
    "conditions" text[],
    "allergies" text[],
    "medications" text[],
    "treatment_notes" text,
    "follow_up_required" boolean default false,
    "follow_up_date" date,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "appointment_deleted_at" timestamp with time zone,
    "treatment_plan_id" uuid
);


alter table "public"."patient_medical_history" enable row level security;

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


alter table "public"."patient_profiles" enable row level security;

create table "public"."rate_limits" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_identifier" character varying(255) not null,
    "action_type" character varying(100) not null,
    "attempt_count" integer default 1,
    "first_attempt" timestamp with time zone default now(),
    "last_attempt" timestamp with time zone default now(),
    "blocked_until" timestamp with time zone,
    "created_at" timestamp with time zone default now()
);


alter table "public"."rate_limits" enable row level security;

create table "public"."services" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "clinic_id" uuid not null,
    "name" character varying(200) not null,
    "description" text,
    "category" character varying(100),
    "duration_minutes" integer not null default 30,
    "is_active" boolean default true,
    "priority" integer default 10,
    "created_at" timestamp with time zone default now(),
    "min_price" numeric(10,2),
    "max_price" numeric(10,2),
    "updated_at" timestamp with time zone default now(),
    "requires_multiple_visits" boolean default false,
    "typical_visit_count" integer default 1,
    "requires_consultation" boolean default true,
    "consultation_validity_days" integer default 30,
    "treatment_price" numeric(10,2) default NULL::numeric,
    "follow_up_price" numeric(10,2) default NULL::numeric,
    "pricing_notes" text
);


alter table "public"."services" enable row level security;

create table "public"."staff_invitations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "email" character varying(255) not null,
    "clinic_id" uuid,
    "position" character varying(100) not null,
    "department" character varying(100),
    "temp_password" text not null,
    "expires_at" timestamp with time zone not null,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone default now(),
    "invitation_token" text,
    "completed_at" timestamp with time zone,
    "metadata" jsonb,
    "admin_notes" text,
    "updated_at" timestamp with time zone default now()
);


alter table "public"."staff_invitations" enable row level security;

create table "public"."staff_profiles" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_profile_id" uuid not null,
    "clinic_id" uuid not null,
    "employee_id" character varying(50),
    "position" character varying(100) not null,
    "hire_date" date,
    "department" character varying(100),
    "permissions" jsonb default '{"manage_clinic": true, "manage_doctors": false, "view_analytics": true, "manage_services": true, "manage_appointments": true}'::jsonb,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."staff_profiles" enable row level security;

create table "public"."treatment_plan_appointments" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "treatment_plan_id" uuid not null,
    "appointment_id" uuid not null,
    "visit_number" integer not null,
    "visit_purpose" character varying(200),
    "is_completed" boolean default false,
    "completion_notes" text,
    "recommended_next_visit_days" integer,
    "created_at" timestamp with time zone default now()
);


alter table "public"."treatment_plan_appointments" enable row level security;

create table "public"."treatment_plans" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "patient_id" uuid not null,
    "clinic_id" uuid not null,
    "created_by_staff_id" uuid,
    "treatment_name" character varying(200) not null,
    "treatment_category" character varying(100),
    "description" text,
    "status" character varying(50) not null default 'active'::character varying,
    "progress_percentage" integer default 0,
    "start_date" date not null,
    "expected_end_date" date,
    "actual_end_date" date,
    "total_visits_planned" integer,
    "visits_completed" integer default 0,
    "next_visit_date" date,
    "next_visit_appointment_id" uuid,
    "diagnosis" text,
    "treatment_notes" text,
    "requires_follow_up" boolean default true,
    "follow_up_interval_days" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
);


alter table "public"."treatment_plans" enable row level security;

create table "public"."ui_components" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "component_name" character varying(100) not null,
    "component_type" character varying(50) not null,
    "title" character varying(200),
    "content" text,
    "image_url" text,
    "is_active" boolean default true,
    "display_order" integer default 0,
    "metadata" jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."ui_components" enable row level security;

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


alter table "public"."user_archive_preferences" enable row level security;

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


alter table "public"."user_profiles" enable row level security;

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


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX admin_profiles_pkey ON public.admin_profiles USING btree (id);

CREATE UNIQUE INDEX admin_profiles_user_profile_id_key ON public.admin_profiles USING btree (user_profile_id);

CREATE UNIQUE INDEX analytics_events_pkey ON public.analytics_events USING btree (id);

CREATE UNIQUE INDEX appointment_services_appointment_id_service_id_key ON public.appointment_services USING btree (appointment_id, service_id);

CREATE UNIQUE INDEX appointment_services_pkey ON public.appointment_services USING btree (id);

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX archive_items_pkey ON public.archive_items USING btree (id);

CREATE UNIQUE INDEX clinic_badge_awards_clinic_id_badge_id_award_date_key ON public.clinic_badge_awards USING btree (clinic_id, badge_id, award_date);

CREATE UNIQUE INDEX clinic_badge_awards_pkey ON public.clinic_badge_awards USING btree (id);

CREATE UNIQUE INDEX clinic_badges_badge_name_key ON public.clinic_badges USING btree (badge_name);

CREATE UNIQUE INDEX clinic_badges_pkey ON public.clinic_badges USING btree (id);

CREATE UNIQUE INDEX clinic_partnership_requests_pkey ON public.clinic_partnership_requests USING btree (id);

CREATE UNIQUE INDEX clinics_pkey ON public.clinics USING btree (id);

CREATE UNIQUE INDEX doctor_clinics_doctor_id_clinic_id_key ON public.doctor_clinics USING btree (doctor_id, clinic_id);

CREATE UNIQUE INDEX doctor_clinics_pkey ON public.doctor_clinics USING btree (id);

CREATE UNIQUE INDEX doctor_services_doctor_id_service_id_clinic_id_key ON public.doctor_services USING btree (doctor_id, service_id, clinic_id);

CREATE UNIQUE INDEX doctor_services_pkey ON public.doctor_services USING btree (id);

CREATE UNIQUE INDEX doctors_license_number_key ON public.doctors USING btree (license_number);

CREATE UNIQUE INDEX doctors_pkey ON public.doctors USING btree (id);

CREATE UNIQUE INDEX email_communications_pkey ON public.email_communications USING btree (id);

CREATE UNIQUE INDEX email_queue_pkey ON public.email_queue USING btree (id);

CREATE UNIQUE INDEX feedback_pkey ON public.feedback USING btree (id);

CREATE UNIQUE INDEX file_uploads_pkey ON public.file_uploads USING btree (id);

CREATE INDEX idx_analytics_events_clinic_id ON public.analytics_events USING btree (clinic_id);

CREATE INDEX idx_analytics_events_clinic_type_created ON public.analytics_events USING btree (clinic_id, event_type, created_at) WHERE (clinic_id IS NOT NULL);

CREATE INDEX idx_analytics_events_user_id ON public.analytics_events USING btree (user_id);

CREATE INDEX idx_analytics_events_user_type_created ON public.analytics_events USING btree (user_id, event_type, created_at) WHERE (user_id IS NOT NULL);

CREATE INDEX idx_appointment_services_appointment_id ON public.appointment_services USING btree (appointment_id);

CREATE INDEX idx_appointment_services_appointment_lookup ON public.appointment_services USING btree (appointment_id) INCLUDE (service_id);

CREATE INDEX idx_appointment_services_service_id ON public.appointment_services USING btree (service_id);

CREATE INDEX idx_appointment_services_treatment ON public.appointment_services USING btree (treatment_plan_id);

CREATE INDEX idx_appointments_booking_type ON public.appointments USING btree (booking_type);

CREATE INDEX idx_appointments_cancelled_by ON public.appointments USING btree (cancelled_by);

CREATE INDEX idx_appointments_clinic_date_status ON public.appointments USING btree (clinic_id, appointment_date, status);

CREATE INDEX idx_appointments_clinic_id ON public.appointments USING btree (clinic_id);

CREATE INDEX idx_appointments_comprehensive_lookup ON public.appointments USING btree (patient_id, status, appointment_date DESC, appointment_time DESC) WHERE (status <> 'cancelled'::appointment_status);

CREATE INDEX idx_appointments_created_clinic_status ON public.appointments USING btree (created_at, clinic_id, status);

CREATE INDEX idx_appointments_created_status ON public.appointments USING btree (created_at DESC, status) WHERE (status <> 'cancelled'::appointment_status);

CREATE INDEX idx_appointments_doctor_date_time ON public.appointments USING btree (doctor_id, appointment_date, appointment_time);

CREATE INDEX idx_appointments_doctor_datetime_availability ON public.appointments USING btree (doctor_id, appointment_date, appointment_time, status) WHERE (status = ANY (ARRAY['pending'::appointment_status, 'confirmed'::appointment_status]));

CREATE INDEX idx_appointments_doctor_status ON public.appointments USING btree (doctor_id, status) WHERE ((doctor_id IS NOT NULL) AND (status IS NOT NULL));

CREATE INDEX idx_appointments_patient_clinic_rls ON public.appointments USING btree (patient_id, clinic_id) WHERE ((patient_id IS NOT NULL) AND (clinic_id IS NOT NULL));

CREATE INDEX idx_appointments_patient_date_desc ON public.appointments USING btree (patient_id, appointment_date DESC);

CREATE INDEX idx_appointments_patient_date_status ON public.appointments USING btree (patient_id, appointment_date, status);

CREATE INDEX idx_appointments_patient_history ON public.appointments USING btree (patient_id, appointment_date DESC, status);

CREATE INDEX idx_appointments_patient_id ON public.appointments USING btree (patient_id);

CREATE INDEX idx_appointments_patient_reliability ON public.appointments USING btree (patient_id, clinic_id, status, appointment_date) WHERE (status = ANY (ARRAY['completed'::appointment_status, 'no_show'::appointment_status, 'cancelled'::appointment_status]));

CREATE INDEX idx_appointments_patient_stats ON public.appointments USING btree (patient_id, status, appointment_date) INCLUDE (id) WHERE (status IS NOT NULL);

CREATE INDEX idx_appointments_patient_status_date ON public.appointments USING btree (patient_id, status, appointment_date) WHERE (status IS NOT NULL);

CREATE INDEX idx_appointments_realtime_staff ON public.appointments USING btree (clinic_id, status, created_at DESC) WHERE (status = ANY (ARRAY['pending'::appointment_status, 'confirmed'::appointment_status]));

CREATE INDEX idx_appointments_staff_management ON public.appointments USING btree (clinic_id, status, appointment_date, appointment_time) WHERE (status = ANY (ARRAY['pending'::appointment_status, 'confirmed'::appointment_status]));

CREATE INDEX idx_appointments_with_services ON public.appointments USING btree (patient_id, appointment_date DESC) INCLUDE (id, clinic_id, doctor_id, status, appointment_time, duration_minutes);

CREATE INDEX idx_archive_items_by_date ON public.archive_items USING btree (archived_at);

CREATE INDEX idx_archive_items_lookup ON public.archive_items USING btree (archived_by_user_id, item_type, item_id);

CREATE INDEX idx_archive_items_role_scope ON public.archive_items USING btree (archived_by_role, scope_type, scope_id);

CREATE INDEX idx_archive_items_scope ON public.archive_items USING btree (scope_type, scope_id);

CREATE INDEX idx_archive_items_user_type ON public.archive_items USING btree (archived_by_user_id, item_type);

CREATE INDEX idx_archive_items_visible ON public.archive_items USING btree (archived_by_user_id, item_type) WHERE ((is_archived = true) AND (is_hidden = false));

CREATE INDEX idx_clinic_badge_awards_awarded_by ON public.clinic_badge_awards USING btree (awarded_by);

CREATE INDEX idx_clinic_badge_awards_badge_id ON public.clinic_badge_awards USING btree (badge_id);

CREATE INDEX idx_clinics_location ON public.clinics USING gist (location);

CREATE INDEX idx_clinics_location_active ON public.clinics USING gist (location) WHERE (is_active = true);

CREATE INDEX idx_clinics_search_optimized ON public.clinics USING btree (is_active, rating DESC, total_reviews DESC) WHERE (is_active = true);

CREATE INDEX idx_doctor_clinics_booking_lookup ON public.doctor_clinics USING btree (clinic_id, is_active) INCLUDE (doctor_id) WHERE (is_active = true);

CREATE INDEX idx_doctor_clinics_clinic_active ON public.doctor_clinics USING btree (clinic_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_doctor_clinics_clinic_id ON public.doctor_clinics USING btree (clinic_id);

CREATE INDEX idx_doctor_services_active ON public.doctor_services USING btree (doctor_id, service_id) WHERE (is_primary_provider = true);

CREATE INDEX idx_doctor_services_clinic ON public.doctor_services USING btree (clinic_id);

CREATE INDEX idx_doctor_services_doctor ON public.doctor_services USING btree (doctor_id);

CREATE INDEX idx_doctor_services_service ON public.doctor_services USING btree (service_id);

CREATE INDEX idx_doctors_available_rating ON public.doctors USING btree (is_available, rating DESC) WHERE (is_available = true);

CREATE INDEX idx_doctors_clinic_search ON public.doctors USING btree (is_available, specialization, rating DESC) WHERE (is_available = true);

CREATE INDEX idx_doctors_specialization_available ON public.doctors USING btree (specialization, is_available) WHERE (is_available = true);

CREATE INDEX idx_email_communications_appointment_id ON public.email_communications USING btree (appointment_id);

CREATE INDEX idx_email_communications_from_user_created ON public.email_communications USING btree (from_user_id, created_at DESC) WHERE (from_user_id IS NOT NULL);

CREATE INDEX idx_email_communications_to_user_id ON public.email_communications USING btree (to_user_id);

CREATE INDEX idx_email_communications_to_user_read ON public.email_communications USING btree (to_user_id, is_read, created_at DESC) WHERE (to_user_id IS NOT NULL);

CREATE INDEX idx_email_communications_users ON public.email_communications USING btree (from_user_id, to_user_id);

CREATE INDEX idx_feedback_appointment_id ON public.feedback USING btree (appointment_id);

CREATE INDEX idx_feedback_clinic_created_rating ON public.feedback USING btree (clinic_id, created_at DESC) WHERE (rating IS NOT NULL);

CREATE INDEX idx_feedback_clinic_id ON public.feedback USING btree (clinic_id);

CREATE INDEX idx_feedback_clinic_rating_new ON public.feedback USING btree (clinic_id, clinic_rating, created_at DESC) WHERE (clinic_rating IS NOT NULL);

CREATE INDEX idx_feedback_clinic_rating_public ON public.feedback USING btree (clinic_id, rating, is_public, created_at DESC) WHERE (rating IS NOT NULL);

CREATE INDEX idx_feedback_comprehensive ON public.feedback USING btree (clinic_id, patient_id, created_at DESC, rating) WHERE (rating IS NOT NULL);

CREATE INDEX idx_feedback_doctor_rating ON public.feedback USING btree (doctor_id, doctor_rating, created_at DESC) WHERE (doctor_rating IS NOT NULL);

CREATE INDEX idx_feedback_dual_ratings ON public.feedback USING btree (clinic_id, doctor_id, clinic_rating, doctor_rating, created_at DESC) WHERE ((clinic_rating IS NOT NULL) OR (doctor_rating IS NOT NULL));

CREATE INDEX idx_feedback_patient_created ON public.feedback USING btree (patient_id, created_at DESC) WHERE (patient_id IS NOT NULL);

CREATE INDEX idx_feedback_patient_daily_limit ON public.feedback USING btree (patient_id, created_at);

CREATE INDEX idx_feedback_patient_id ON public.feedback USING btree (patient_id);

CREATE INDEX idx_feedback_public ON public.feedback USING btree (is_public) WHERE (is_public = true);

CREATE INDEX idx_feedback_responded_by ON public.feedback USING btree (responded_by);

CREATE INDEX idx_file_uploads_user_id ON public.file_uploads USING btree (user_id);

CREATE INDEX idx_medical_history_patient_id ON public.patient_medical_history USING btree (patient_id);

CREATE INDEX idx_notification_log_email_type_sent ON public.notification_log USING btree (recipient_email, notification_type, sent_at DESC);

CREATE INDEX idx_notifications_related_appointment_id ON public.notifications USING btree (related_appointment_id);

CREATE INDEX idx_notifications_scheduled ON public.notifications USING btree (scheduled_for) WHERE (sent_at IS NULL);

CREATE INDEX idx_notifications_scheduled_unread ON public.notifications USING btree (scheduled_for, is_read) WHERE ((scheduled_for IS NOT NULL) AND (is_read = false));

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_notifications_user_read_created ON public.notifications USING btree (user_id, is_read, created_at DESC) WHERE (user_id IS NOT NULL);

CREATE INDEX idx_patient_appointment_limits_clinic_id ON public.patient_appointment_limits USING btree (clinic_id);

CREATE INDEX idx_patient_limits_lookup ON public.patient_appointment_limits USING btree (patient_id, clinic_id);

CREATE INDEX idx_patient_medical_history_appointment_id ON public.patient_medical_history USING btree (appointment_id);

CREATE INDEX idx_patient_medical_history_created_by ON public.patient_medical_history USING btree (created_by);

CREATE INDEX idx_patient_preferred_location ON public.patient_profiles USING gist (preferred_location);

CREATE INDEX idx_patient_profiles_complete ON public.patient_profiles USING btree (user_profile_id) INCLUDE (preferred_location, emergency_contact_name, emergency_contact_phone, medical_conditions, allergies);

CREATE INDEX idx_patient_profiles_lookup ON public.patient_profiles USING btree (user_profile_id) INCLUDE (emergency_contact_name, emergency_contact_phone, medical_conditions, allergies, email_notifications, sms_notifications);

CREATE INDEX idx_patient_profiles_user_id ON public.patient_profiles USING btree (user_profile_id);

CREATE INDEX idx_patient_profiles_user_lookup ON public.patient_profiles USING btree (user_profile_id, email_notifications, sms_notifications);

CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits USING btree (last_attempt, blocked_until);

CREATE INDEX idx_services_active_price_range ON public.services USING btree (is_active, min_price, max_price) WHERE (is_active = true);

CREATE INDEX idx_services_clinic_active_duration ON public.services USING btree (clinic_id, is_active) INCLUDE (duration_minutes, name) WHERE (is_active = true);

CREATE INDEX idx_services_clinic_active_name ON public.services USING btree (clinic_id, is_active, name) WHERE (is_active = true);

CREATE INDEX idx_services_clinic_search ON public.services USING btree (clinic_id, is_active, category, name) WHERE (is_active = true);

CREATE INDEX idx_staff_clinic_context ON public.staff_profiles USING btree (user_profile_id, clinic_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_staff_context_lookup ON public.staff_profiles USING btree (user_profile_id) INCLUDE (clinic_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_staff_invitations_cleanup ON public.staff_invitations USING btree (status, completed_at) WHERE ((status = 'accepted'::text) AND (completed_at IS NULL));

CREATE INDEX idx_staff_invitations_clinic_id ON public.staff_invitations USING btree (clinic_id);

CREATE INDEX idx_staff_invitations_incomplete ON public.staff_invitations USING btree (status, created_at DESC) WHERE (completed_at IS NULL);

CREATE INDEX idx_staff_invitations_reminders ON public.staff_invitations USING btree (status, expires_at) WHERE ((status = 'accepted'::text) AND (completed_at IS NULL));

CREATE INDEX idx_staff_profiles_auth_user ON public.staff_profiles USING btree (user_profile_id) WHERE (is_active = true);

CREATE INDEX idx_staff_profiles_clinic_active_position ON public.staff_profiles USING btree (clinic_id, is_active, "position") WHERE (is_active = true);

CREATE INDEX idx_staff_profiles_clinic_id ON public.staff_profiles USING btree (clinic_id);

CREATE INDEX idx_staff_profiles_clinic_user ON public.staff_profiles USING btree (clinic_id, user_profile_id) WHERE (is_active = true);

CREATE INDEX idx_staff_profiles_context_lookup ON public.staff_profiles USING btree (user_profile_id, clinic_id) INCLUDE (is_active) WHERE (is_active = true);

CREATE INDEX idx_staff_profiles_user_lookup ON public.staff_profiles USING btree (user_profile_id, is_active, clinic_id) WHERE (is_active = true);

CREATE INDEX idx_staff_profiles_user_profile_clinic ON public.staff_profiles USING btree (user_profile_id, clinic_id) WHERE (is_active = true);

CREATE INDEX idx_staff_profiles_user_profile_id ON public.staff_profiles USING btree (user_profile_id);

CREATE INDEX idx_treatment_plans_clinic_active ON public.treatment_plans USING btree (clinic_id, status, next_visit_date) WHERE ((status)::text = 'active'::text);

CREATE INDEX idx_treatment_plans_patient_status ON public.treatment_plans USING btree (patient_id, status) WHERE ((status)::text = 'active'::text);

CREATE INDEX idx_ui_components_created_by ON public.ui_components USING btree (created_by);

CREATE INDEX idx_user_archive_prefs_type ON public.user_archive_preferences USING btree (user_type);

CREATE INDEX idx_user_archive_prefs_user ON public.user_archive_preferences USING btree (user_id);

CREATE INDEX idx_user_context_complete ON public.users USING btree (auth_user_id) INCLUDE (id, email, phone, is_active, email_verified, phone_verified);

CREATE INDEX idx_user_context_optimized ON public.users USING btree (auth_user_id, is_active) INCLUDE (id, email, phone, email_verified, phone_verified) WHERE (is_active = true);

CREATE INDEX idx_user_profiles_role_lookup ON public.user_profiles USING btree (user_id, user_type);

CREATE INDEX idx_user_profiles_user_id_type ON public.user_profiles USING btree (user_id, user_type) WHERE (user_type IS NOT NULL);

CREATE INDEX idx_user_profiles_verification ON public.user_profiles USING btree (user_id, user_type) INCLUDE (first_name, last_name);

CREATE INDEX idx_users_auth_email_lookup ON public.users USING btree (auth_user_id, email, is_active);

CREATE INDEX idx_users_auth_lookup_optimized ON public.users USING btree (auth_user_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_users_auth_user_id ON public.users USING btree (auth_user_id);

CREATE INDEX idx_users_auth_user_id_active ON public.users USING btree (auth_user_id) WHERE (is_active = true);

CREATE INDEX idx_users_context_optimized ON public.users USING btree (auth_user_id, is_active) INCLUDE (id, email, phone, email_verified, phone_verified, last_login) WHERE (is_active = true);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE UNIQUE INDEX notification_log_pkey ON public.notification_log USING btree (id);

CREATE UNIQUE INDEX notification_templates_pkey ON public.notification_templates USING btree (id);

CREATE UNIQUE INDEX notification_templates_template_name_key ON public.notification_templates USING btree (template_name);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX patient_appointment_limits_patient_id_clinic_id_key ON public.patient_appointment_limits USING btree (patient_id, clinic_id);

CREATE UNIQUE INDEX patient_appointment_limits_pkey ON public.patient_appointment_limits USING btree (id);

CREATE UNIQUE INDEX patient_medical_history_pkey ON public.patient_medical_history USING btree (id);

CREATE UNIQUE INDEX patient_profiles_pkey ON public.patient_profiles USING btree (id);

CREATE UNIQUE INDEX patient_profiles_user_id_key ON public.patient_profiles USING btree (user_profile_id);

CREATE UNIQUE INDEX rate_limits_pkey ON public.rate_limits USING btree (id);

CREATE UNIQUE INDEX rate_limits_user_identifier_action_type_key ON public.rate_limits USING btree (user_identifier, action_type);

CREATE UNIQUE INDEX services_clinic_id_name_key ON public.services USING btree (clinic_id, name);

CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id);

CREATE UNIQUE INDEX staff_invitations_pkey ON public.staff_invitations USING btree (id);

CREATE UNIQUE INDEX staff_profiles_employee_id_key ON public.staff_profiles USING btree (employee_id);

CREATE UNIQUE INDEX staff_profiles_pkey ON public.staff_profiles USING btree (id);

CREATE UNIQUE INDEX staff_profiles_user_id_key ON public.staff_profiles USING btree (user_profile_id);

CREATE UNIQUE INDEX treatment_plan_appointments_pkey ON public.treatment_plan_appointments USING btree (id);

CREATE UNIQUE INDEX treatment_plan_appointments_treatment_plan_id_appointment_i_key ON public.treatment_plan_appointments USING btree (treatment_plan_id, appointment_id);

CREATE UNIQUE INDEX treatment_plans_pkey ON public.treatment_plans USING btree (id);

CREATE UNIQUE INDEX ui_components_pkey ON public.ui_components USING btree (id);

CREATE UNIQUE INDEX uniq_current_badge_per_clinic ON public.clinic_badge_awards USING btree (clinic_id, badge_id) WHERE (is_current = true);

CREATE UNIQUE INDEX unique_user_archive_item ON public.archive_items USING btree (archived_by_user_id, item_type, item_id);

CREATE UNIQUE INDEX unique_user_archive_prefs ON public.user_archive_preferences USING btree (user_id);

CREATE UNIQUE INDEX user_archive_preferences_pkey ON public.user_archive_preferences USING btree (id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);

CREATE UNIQUE INDEX users_auth_user_id_key ON public.users USING btree (auth_user_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."admin_profiles" add constraint "admin_profiles_pkey" PRIMARY KEY using index "admin_profiles_pkey";

alter table "public"."analytics_events" add constraint "analytics_events_pkey" PRIMARY KEY using index "analytics_events_pkey";

alter table "public"."appointment_services" add constraint "appointment_services_pkey" PRIMARY KEY using index "appointment_services_pkey";

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."archive_items" add constraint "archive_items_pkey" PRIMARY KEY using index "archive_items_pkey";

alter table "public"."clinic_badge_awards" add constraint "clinic_badge_awards_pkey" PRIMARY KEY using index "clinic_badge_awards_pkey";

alter table "public"."clinic_badges" add constraint "clinic_badges_pkey" PRIMARY KEY using index "clinic_badges_pkey";

alter table "public"."clinic_partnership_requests" add constraint "clinic_partnership_requests_pkey" PRIMARY KEY using index "clinic_partnership_requests_pkey";

alter table "public"."clinics" add constraint "clinics_pkey" PRIMARY KEY using index "clinics_pkey";

alter table "public"."doctor_clinics" add constraint "doctor_clinics_pkey" PRIMARY KEY using index "doctor_clinics_pkey";

alter table "public"."doctor_services" add constraint "doctor_services_pkey" PRIMARY KEY using index "doctor_services_pkey";

alter table "public"."doctors" add constraint "doctors_pkey" PRIMARY KEY using index "doctors_pkey";

alter table "public"."email_communications" add constraint "email_communications_pkey" PRIMARY KEY using index "email_communications_pkey";

alter table "public"."email_queue" add constraint "email_queue_pkey" PRIMARY KEY using index "email_queue_pkey";

alter table "public"."feedback" add constraint "feedback_pkey" PRIMARY KEY using index "feedback_pkey";

alter table "public"."file_uploads" add constraint "file_uploads_pkey" PRIMARY KEY using index "file_uploads_pkey";

alter table "public"."notification_log" add constraint "notification_log_pkey" PRIMARY KEY using index "notification_log_pkey";

alter table "public"."notification_templates" add constraint "notification_templates_pkey" PRIMARY KEY using index "notification_templates_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."patient_appointment_limits" add constraint "patient_appointment_limits_pkey" PRIMARY KEY using index "patient_appointment_limits_pkey";

alter table "public"."patient_medical_history" add constraint "patient_medical_history_pkey" PRIMARY KEY using index "patient_medical_history_pkey";

alter table "public"."patient_profiles" add constraint "patient_profiles_pkey" PRIMARY KEY using index "patient_profiles_pkey";

alter table "public"."rate_limits" add constraint "rate_limits_pkey" PRIMARY KEY using index "rate_limits_pkey";

alter table "public"."services" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_pkey" PRIMARY KEY using index "staff_invitations_pkey";

alter table "public"."staff_profiles" add constraint "staff_profiles_pkey" PRIMARY KEY using index "staff_profiles_pkey";

alter table "public"."treatment_plan_appointments" add constraint "treatment_plan_appointments_pkey" PRIMARY KEY using index "treatment_plan_appointments_pkey";

alter table "public"."treatment_plans" add constraint "treatment_plans_pkey" PRIMARY KEY using index "treatment_plans_pkey";

alter table "public"."ui_components" add constraint "ui_components_pkey" PRIMARY KEY using index "ui_components_pkey";

alter table "public"."user_archive_preferences" add constraint "user_archive_preferences_pkey" PRIMARY KEY using index "user_archive_preferences_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."admin_profiles" add constraint "admin_profiles_user_profile_id_fkey" FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) not valid;

alter table "public"."admin_profiles" validate constraint "admin_profiles_user_profile_id_fkey";

alter table "public"."admin_profiles" add constraint "admin_profiles_user_profile_id_key" UNIQUE using index "admin_profiles_user_profile_id_key";

alter table "public"."analytics_events" add constraint "analytics_events_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL not valid;

alter table "public"."analytics_events" validate constraint "analytics_events_clinic_id_fkey";

alter table "public"."analytics_events" add constraint "analytics_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."analytics_events" validate constraint "analytics_events_user_id_fkey";

alter table "public"."appointment_services" add constraint "appointment_services_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE not valid;

alter table "public"."appointment_services" validate constraint "appointment_services_appointment_id_fkey";

alter table "public"."appointment_services" add constraint "appointment_services_appointment_id_service_id_key" UNIQUE using index "appointment_services_appointment_id_service_id_key";

alter table "public"."appointment_services" add constraint "appointment_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE not valid;

alter table "public"."appointment_services" validate constraint "appointment_services_service_id_fkey";

alter table "public"."appointment_services" add constraint "appointment_services_treatment_plan_id_fkey" FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) not valid;

alter table "public"."appointment_services" validate constraint "appointment_services_treatment_plan_id_fkey";

alter table "public"."appointments" add constraint "appointments_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."appointments" validate constraint "appointments_cancelled_by_fkey";

alter table "public"."appointments" add constraint "appointments_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."appointments" validate constraint "appointments_clinic_id_fkey";

alter table "public"."appointments" add constraint "appointments_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL not valid;

alter table "public"."appointments" validate constraint "appointments_doctor_id_fkey";

alter table "public"."appointments" add constraint "appointments_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."appointments" validate constraint "appointments_patient_id_fkey";

alter table "public"."archive_items" add constraint "archive_items_archive_reason_check" CHECK ((archive_reason = ANY (ARRAY['manual'::text, 'auto'::text, 'policy'::text, 'cascade'::text]))) not valid;

alter table "public"."archive_items" validate constraint "archive_items_archive_reason_check";

alter table "public"."archive_items" add constraint "archive_items_archived_by_user_id_fkey" FOREIGN KEY (archived_by_user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."archive_items" validate constraint "archive_items_archived_by_user_id_fkey";

alter table "public"."archive_items" add constraint "unique_user_archive_item" UNIQUE using index "unique_user_archive_item";

alter table "public"."archive_items" add constraint "valid_item_type" CHECK ((item_type = ANY (ARRAY['appointment'::text, 'feedback'::text, 'notification'::text, 'clinic_appointment'::text, 'clinic_feedback'::text, 'staff_notification'::text, 'patient_communication'::text, 'user_account'::text, 'clinic_account'::text, 'system_notification'::text, 'analytics_data'::text, 'partnership_request'::text]))) not valid;

alter table "public"."archive_items" validate constraint "valid_item_type";

alter table "public"."archive_items" add constraint "valid_scope_type" CHECK ((scope_type = ANY (ARRAY['personal'::text, 'clinic'::text, 'system'::text]))) not valid;

alter table "public"."archive_items" validate constraint "valid_scope_type";

alter table "public"."clinic_badge_awards" add constraint "clinic_badge_awards_awarded_by_fkey" FOREIGN KEY (awarded_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."clinic_badge_awards" validate constraint "clinic_badge_awards_awarded_by_fkey";

alter table "public"."clinic_badge_awards" add constraint "clinic_badge_awards_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES clinic_badges(id) ON DELETE CASCADE not valid;

alter table "public"."clinic_badge_awards" validate constraint "clinic_badge_awards_badge_id_fkey";

alter table "public"."clinic_badge_awards" add constraint "clinic_badge_awards_clinic_id_badge_id_award_date_key" UNIQUE using index "clinic_badge_awards_clinic_id_badge_id_award_date_key";

alter table "public"."clinic_badge_awards" add constraint "clinic_badge_awards_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."clinic_badge_awards" validate constraint "clinic_badge_awards_clinic_id_fkey";

alter table "public"."clinic_badges" add constraint "clinic_badges_badge_name_key" UNIQUE using index "clinic_badges_badge_name_key";

alter table "public"."clinic_partnership_requests" add constraint "clinic_partnership_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id) not valid;

alter table "public"."clinic_partnership_requests" validate constraint "clinic_partnership_requests_reviewed_by_fkey";

alter table "public"."doctor_clinics" add constraint "doctor_clinics_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_clinics" validate constraint "doctor_clinics_clinic_id_fkey";

alter table "public"."doctor_clinics" add constraint "doctor_clinics_doctor_id_clinic_id_key" UNIQUE using index "doctor_clinics_doctor_id_clinic_id_key";

alter table "public"."doctor_clinics" add constraint "doctor_clinics_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_clinics" validate constraint "doctor_clinics_doctor_id_fkey";

alter table "public"."doctor_services" add constraint "doctor_services_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_services" validate constraint "doctor_services_clinic_id_fkey";

alter table "public"."doctor_services" add constraint "doctor_services_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_services" validate constraint "doctor_services_doctor_id_fkey";

alter table "public"."doctor_services" add constraint "doctor_services_doctor_id_service_id_clinic_id_key" UNIQUE using index "doctor_services_doctor_id_service_id_clinic_id_key";

alter table "public"."doctor_services" add constraint "doctor_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_services" validate constraint "doctor_services_service_id_fkey";

alter table "public"."doctors" add constraint "doctors_license_number_key" UNIQUE using index "doctors_license_number_key";

alter table "public"."email_communications" add constraint "email_communications_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE not valid;

alter table "public"."email_communications" validate constraint "email_communications_appointment_id_fkey";

alter table "public"."email_communications" add constraint "email_communications_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."email_communications" validate constraint "email_communications_from_user_id_fkey";

alter table "public"."email_communications" add constraint "email_communications_replied_to_fkey" FOREIGN KEY (replied_to) REFERENCES email_communications(id) ON DELETE SET NULL not valid;

alter table "public"."email_communications" validate constraint "email_communications_replied_to_fkey";

alter table "public"."email_communications" add constraint "email_communications_to_user_id_fkey" FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."email_communications" validate constraint "email_communications_to_user_id_fkey";

alter table "public"."feedback" add constraint "check_at_least_one_rating" CHECK (((clinic_rating IS NOT NULL) OR (doctor_rating IS NOT NULL) OR (rating IS NOT NULL))) not valid;

alter table "public"."feedback" validate constraint "check_at_least_one_rating";

alter table "public"."feedback" add constraint "check_doctor_rating_requires_doctor" CHECK (((doctor_rating IS NULL) OR (doctor_id IS NOT NULL))) not valid;

alter table "public"."feedback" validate constraint "check_doctor_rating_requires_doctor";

alter table "public"."feedback" add constraint "feedback_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL not valid;

alter table "public"."feedback" validate constraint "feedback_appointment_id_fkey";

alter table "public"."feedback" add constraint "feedback_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."feedback" validate constraint "feedback_clinic_id_fkey";

alter table "public"."feedback" add constraint "feedback_clinic_rating_check" CHECK (((clinic_rating >= 1) AND (clinic_rating <= 5))) not valid;

alter table "public"."feedback" validate constraint "feedback_clinic_rating_check";

alter table "public"."feedback" add constraint "feedback_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL not valid;

alter table "public"."feedback" validate constraint "feedback_doctor_id_fkey";

alter table "public"."feedback" add constraint "feedback_doctor_rating_check" CHECK (((doctor_rating >= 1) AND (doctor_rating <= 5))) not valid;

alter table "public"."feedback" validate constraint "feedback_doctor_rating_check";

alter table "public"."feedback" add constraint "feedback_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."feedback" validate constraint "feedback_patient_id_fkey";

alter table "public"."feedback" add constraint "feedback_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."feedback" validate constraint "feedback_rating_check";

alter table "public"."feedback" add constraint "feedback_responded_by_fkey" FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."feedback" validate constraint "feedback_responded_by_fkey";

alter table "public"."file_uploads" add constraint "file_uploads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."file_uploads" validate constraint "file_uploads_user_id_fkey";

alter table "public"."notification_templates" add constraint "notification_templates_template_name_key" UNIQUE using index "notification_templates_template_name_key";

alter table "public"."notifications" add constraint "notifications_related_appointment_id_fkey" FOREIGN KEY (related_appointment_id) REFERENCES appointments(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_related_appointment_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."patient_appointment_limits" add constraint "patient_appointment_limits_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."patient_appointment_limits" validate constraint "patient_appointment_limits_clinic_id_fkey";

alter table "public"."patient_appointment_limits" add constraint "patient_appointment_limits_patient_id_clinic_id_key" UNIQUE using index "patient_appointment_limits_patient_id_clinic_id_key";

alter table "public"."patient_appointment_limits" add constraint "patient_appointment_limits_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."patient_appointment_limits" validate constraint "patient_appointment_limits_patient_id_fkey";

alter table "public"."patient_medical_history" add constraint "patient_medical_history_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL not valid;

alter table "public"."patient_medical_history" validate constraint "patient_medical_history_appointment_id_fkey";

alter table "public"."patient_medical_history" add constraint "patient_medical_history_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."patient_medical_history" validate constraint "patient_medical_history_created_by_fkey";

alter table "public"."patient_medical_history" add constraint "patient_medical_history_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."patient_medical_history" validate constraint "patient_medical_history_patient_id_fkey";

alter table "public"."patient_medical_history" add constraint "patient_medical_history_treatment_plan_id_fkey" FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) not valid;

alter table "public"."patient_medical_history" validate constraint "patient_medical_history_treatment_plan_id_fkey";

alter table "public"."patient_profiles" add constraint "patient_profiles_user_id_key" UNIQUE using index "patient_profiles_user_id_key";

alter table "public"."patient_profiles" add constraint "patient_profiles_user_profile_id_fkey" FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) not valid;

alter table "public"."patient_profiles" validate constraint "patient_profiles_user_profile_id_fkey";

alter table "public"."rate_limits" add constraint "rate_limits_user_identifier_action_type_key" UNIQUE using index "rate_limits_user_identifier_action_type_key";

alter table "public"."services" add constraint "services_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."services" validate constraint "services_clinic_id_fkey";

alter table "public"."services" add constraint "services_clinic_id_name_key" UNIQUE using index "services_clinic_id_name_key";

alter table "public"."services" add constraint "services_duration_check" CHECK (((duration_minutes > 0) AND (duration_minutes <= 480))) not valid;

alter table "public"."services" validate constraint "services_duration_check";

alter table "public"."services" add constraint "valid_duration_check" CHECK (((duration_minutes > 0) AND (duration_minutes <= 480))) not valid;

alter table "public"."services" validate constraint "valid_duration_check";

alter table "public"."staff_invitations" add constraint "staff_invitations_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_clinic_id_fkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'completed'::text]))) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_status_check";

alter table "public"."staff_profiles" add constraint "staff_profiles_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE not valid;

alter table "public"."staff_profiles" validate constraint "staff_profiles_clinic_id_fkey";

alter table "public"."staff_profiles" add constraint "staff_profiles_employee_id_key" UNIQUE using index "staff_profiles_employee_id_key";

alter table "public"."staff_profiles" add constraint "staff_profiles_user_id_key" UNIQUE using index "staff_profiles_user_id_key";

alter table "public"."staff_profiles" add constraint "staff_profiles_user_profile_id_fkey" FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) not valid;

alter table "public"."staff_profiles" validate constraint "staff_profiles_user_profile_id_fkey";

alter table "public"."treatment_plan_appointments" add constraint "treatment_plan_appointments_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE not valid;

alter table "public"."treatment_plan_appointments" validate constraint "treatment_plan_appointments_appointment_id_fkey";

alter table "public"."treatment_plan_appointments" add constraint "treatment_plan_appointments_treatment_plan_id_appointment_i_key" UNIQUE using index "treatment_plan_appointments_treatment_plan_id_appointment_i_key";

alter table "public"."treatment_plan_appointments" add constraint "treatment_plan_appointments_treatment_plan_id_fkey" FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE not valid;

alter table "public"."treatment_plan_appointments" validate constraint "treatment_plan_appointments_treatment_plan_id_fkey";

alter table "public"."treatment_plans" add constraint "treatment_plans_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES clinics(id) not valid;

alter table "public"."treatment_plans" validate constraint "treatment_plans_clinic_id_fkey";

alter table "public"."treatment_plans" add constraint "treatment_plans_created_by_staff_id_fkey" FOREIGN KEY (created_by_staff_id) REFERENCES users(id) not valid;

alter table "public"."treatment_plans" validate constraint "treatment_plans_created_by_staff_id_fkey";

alter table "public"."treatment_plans" add constraint "treatment_plans_next_visit_appointment_id_fkey" FOREIGN KEY (next_visit_appointment_id) REFERENCES appointments(id) not valid;

alter table "public"."treatment_plans" validate constraint "treatment_plans_next_visit_appointment_id_fkey";

alter table "public"."treatment_plans" add constraint "treatment_plans_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES users(id) not valid;

alter table "public"."treatment_plans" validate constraint "treatment_plans_patient_id_fkey";

alter table "public"."treatment_plans" add constraint "treatment_plans_progress_percentage_check" CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))) not valid;

alter table "public"."treatment_plans" validate constraint "treatment_plans_progress_percentage_check";

alter table "public"."treatment_plans" add constraint "valid_status" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'paused'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."treatment_plans" validate constraint "valid_status";

alter table "public"."ui_components" add constraint "ui_components_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."ui_components" validate constraint "ui_components_created_by_fkey";

alter table "public"."user_archive_preferences" add constraint "unique_user_archive_prefs" UNIQUE using index "unique_user_archive_prefs";

alter table "public"."user_archive_preferences" add constraint "user_archive_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_archive_preferences" validate constraint "user_archive_preferences_user_id_fkey";

alter table "public"."user_archive_preferences" add constraint "valid_auto_archive_days" CHECK ((auto_archive_days > 0)) not valid;

alter table "public"."user_archive_preferences" validate constraint "valid_auto_archive_days";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_key" UNIQUE using index "user_profiles_user_id_key";

alter table "public"."users" add constraint "users_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_auth_user_id_fkey";

alter table "public"."users" add constraint "users_auth_user_id_key" UNIQUE using index "users_auth_user_id_key";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_cleanup_specific_incomplete_staff(p_invitation_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.approve_partnership_request_v2(p_request_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.book_appointment(p_clinic_id uuid, p_doctor_id uuid, p_appointment_date date, p_appointment_time time without time zone, p_service_ids uuid[] DEFAULT NULL::uuid[], p_symptoms text DEFAULT NULL::text, p_treatment_plan_id uuid DEFAULT NULL::uuid, p_skip_consultation boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$DECLARE
    current_context JSONB;
    patient_id_val UUID;
    user_email VARCHAR(255);
    appointment_id UUID;
    validation_result RECORD;
    patient_profile RECORD;
    appointment_limit_check JSONB;
    reliability_check JSONB;
    cancellation_deadline TIMESTAMP;
    appointment_datetime TIMESTAMP;
    min_advance_hours INTEGER := 2;
    max_advance_days INTEGER := 90;
    max_pending_appointments INTEGER := 5;
    pending_count INTEGER;
    treatment_plan_record RECORD;
    next_visit_number INTEGER;
    doctor_consultation_fee DECIMAL(10,2) := 0;
    is_consultation_only BOOLEAN := false;
    booking_type_val appointment_booking_type;
    total_estimated_cost DECIMAL(10,2) := 0;
    total_treatment_cost DECIMAL(10,2) := 0;
    total_duration INTEGER := 30;
BEGIN
    -- Authentication check
    current_context := get_current_user_context();

    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;

    IF (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only patients can book appointments');
    END IF;

    patient_id_val := (current_context->>'user_id')::UUID;

    -- Initialize treatment_plan_record
    SELECT 
        NULL::uuid as id,
        NULL::uuid as patient_id,
        NULL::uuid as clinic_id,
        NULL::text as status,
        NULL::integer as visits_completed,
        NULL::integer as total_visits_planned,
        NULL::text as treatment_name
    INTO treatment_plan_record
    WHERE FALSE;

    -- Validate treatment plan if provided
    IF p_treatment_plan_id IS NOT NULL THEN
        SELECT 
            tp.id, tp.patient_id, tp.clinic_id, tp.status,
            tp.visits_completed, tp.total_visits_planned, tp.treatment_name
        INTO treatment_plan_record
        FROM treatment_plans tp
        WHERE tp.id = p_treatment_plan_id
        AND tp.patient_id = patient_id_val
        AND tp.status = 'active';

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Treatment plan not found or not active');
        END IF;

        IF treatment_plan_record.clinic_id != p_clinic_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Appointment clinic must match treatment plan clinic');
        END IF;

        IF treatment_plan_record.total_visits_planned IS NOT NULL AND 
           treatment_plan_record.visits_completed >= treatment_plan_record.total_visits_planned THEN
            RETURN jsonb_build_object('success', false, 'error', 'Treatment plan is already completed');
        END IF;

        next_visit_number := treatment_plan_record.visits_completed + 1;
    END IF;

    -- ✅ Basic validation (services optional)
    IF p_clinic_id IS NULL OR p_doctor_id IS NULL OR 
       p_appointment_date IS NULL OR p_appointment_time IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic, doctor, date, and time are required');
    END IF;

    -- ✅ Determine if consultation-only or with services
    IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
        is_consultation_only := true;
        booking_type_val := 'consultation_only'::appointment_booking_type;
    ELSIF p_treatment_plan_id IS NOT NULL THEN
        booking_type_val := 'treatment_plan_follow_up'::appointment_booking_type;
    ELSE
        -- ✅ Check skip consultation
        DECLARE
            srv RECORD;
            can_skip_consultation BOOLEAN := true;
            any_service_requires_consultation BOOLEAN := false;
            last_consultation_date DATE;
        BEGIN
            SELECT MAX(a.appointment_date) INTO last_consultation_date
            FROM appointments a
            WHERE a.patient_id = patient_id_val
              AND a.clinic_id = p_clinic_id
              AND a.status = 'completed'
              AND (
                  a.booking_type IN ('consultation_only','consultation_with_service')
                  OR a.appointment_type IN ('consultation_only','consultation_with_service')
              );

            FOR srv IN
                SELECT id, requires_consultation, consultation_validity_days
                FROM services
                WHERE id = ANY(p_service_ids)
            LOOP
                IF srv.requires_consultation THEN
                    any_service_requires_consultation := true;

                    IF last_consultation_date IS NULL
                       OR (CURRENT_DATE - last_consultation_date) > COALESCE(srv.consultation_validity_days, 0) THEN
                        can_skip_consultation := false;
                        EXIT;
                    END IF;
                END IF;
            END LOOP;

            IF NOT any_service_requires_consultation THEN
                booking_type_val := 'service_only'::appointment_booking_type;
                doctor_consultation_fee := 0;
            ELSIF can_skip_consultation AND p_skip_consultation THEN
                booking_type_val := 'service_only'::appointment_booking_type;
                doctor_consultation_fee := 0;
            ELSE
                booking_type_val := 'consultation_with_service'::appointment_booking_type;
            END IF;
        END;
    END IF;

    -- ✅ Get doctor's consultation fee
    IF booking_type_val != 'service_only'::appointment_booking_type THEN
        SELECT COALESCE(consultation_fee, 0) INTO doctor_consultation_fee
        FROM doctors WHERE id = p_doctor_id;
    ELSE
        doctor_consultation_fee := 0;
    END IF;

    total_estimated_cost := doctor_consultation_fee;

        IF NOT is_consultation_only THEN
        -- For services: calculate from services table
        total_duration := calculate_appointment_duration(p_service_ids, p_clinic_id);
        
        -- Fallback if calculation fails
        IF total_duration IS NULL OR total_duration = 0 THEN
            total_duration := 30;
        END IF;
    ELSE
        -- For consultation-only: use default 30 minutes
        total_duration := 30;
    END IF;

    -- ✅ Service validation
    IF NOT is_consultation_only THEN
        IF array_length(p_service_ids, 1) > 3 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Maximum 3 services allowed');
        END IF;
    END IF;

    -- Date validations
    IF p_appointment_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot book in the past');
    END IF;

    appointment_datetime := p_appointment_date::timestamp + p_appointment_time;
    
    IF appointment_datetime < NOW() + (min_advance_hours || ' hours')::INTERVAL THEN
        RETURN jsonb_build_object('success', false, 'error', format('Book at least %s hours in advance', min_advance_hours));
    END IF;

    IF p_appointment_date > CURRENT_DATE + (max_advance_days || ' days')::INTERVAL THEN
        RETURN jsonb_build_object('success', false, 'error', format('Cannot book more than %s days ahead', max_advance_days));
    END IF;

    -- Rate limit check
    SELECT email INTO user_email FROM users WHERE id = patient_id_val;
    
    IF NOT check_rate_limit_unified(user_email, 'appointment_booking', 5, 60) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded');
    END IF;

    IF pending_count >= max_pending_appointments THEN
        RETURN jsonb_build_object('success', false, 'error', format('Too many pending (%s). Wait for confirmations.', pending_count));
    END IF;

    -- ✅ ADD: Get patient profile and clinic/doctor details for response
    SELECT 
        u.email, u.phone,
        up.first_name, up.last_name, up.gender, up.date_of_birth,
        CASE 
            WHEN up.date_of_birth IS NOT NULL THEN 
                EXTRACT(YEAR FROM AGE(up.date_of_birth))::INTEGER
            ELSE NULL
        END as age
    INTO patient_profile
    FROM users u
    JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = patient_id_val;

    -- ✅ ADD: Get clinic, doctor, and services details
    WITH clinic_doctor_info AS (
        SELECT 
            c.id as clinic_id,
            c.name as clinic_name,
            c.phone as clinic_phone,
            c.email as clinic_email,
            c.address as clinic_address,
            c.cancellation_policy_hours,
            
            d.id as doctor_id,
            d.specialization,
            d.first_name as doctor_first_name,
            d.last_name as doctor_last_name
        FROM clinics c
        JOIN doctors d ON d.id = p_doctor_id
        WHERE c.id = p_clinic_id
    ),
    services_info AS (
        SELECT 
            COALESCE(SUM(duration_minutes), 0)::INTEGER AS total_duration_services,
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'duration_minutes', s.duration_minutes,
                'min_price', s.min_price,
                'max_price', s.max_price,
                'category', s.category
            )), '[]'::jsonb) AS service_details
        FROM services s
        WHERE (p_service_ids IS NOT NULL AND s.id = ANY(p_service_ids))
    )
    SELECT 
        cdi.*,
        si.service_details
    INTO validation_result
    FROM clinic_doctor_info cdi
    CROSS JOIN services_info si;

    -- ✅ Calculate cancellation deadline
    cancellation_deadline := appointment_datetime - (COALESCE(validation_result.cancellation_policy_hours, 24) || ' hours')::INTERVAL;

    -- ✅ Create appointment
    INSERT INTO appointments (
        patient_id, 
        clinic_id, 
        doctor_id, 
        appointment_date, 
        appointment_time,
        duration_minutes,
        status, 
        booking_type, 
        symptoms,
        consultation_fee_charged,
        requires_new_consultation
    ) VALUES (
        patient_id_val, 
        p_clinic_id, 
        p_doctor_id, 
        p_appointment_date, 
        p_appointment_time,
        total_duration,
        'pending', 
        booking_type_val, 
        p_symptoms,
        doctor_consultation_fee,
        NOT p_skip_consultation
    )
    RETURNING id INTO appointment_id;

    -- ✅ Insert appointment services with treatment plan link
    IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 THEN
        INSERT INTO appointment_services (appointment_id, service_id, treatment_plan_id)
        SELECT appointment_id, unnest(p_service_ids), p_treatment_plan_id;
    ELSIF p_treatment_plan_id IS NOT NULL THEN
        -- If treatment plan is linked but no services, still create link
        INSERT INTO appointment_services (appointment_id, service_id, treatment_plan_id)
        VALUES (appointment_id, NULL, p_treatment_plan_id);
    END IF;

    -- ✅ Return response with FULL DATA STRUCTURE
    RETURN jsonb_build_object(
        'success', true,
        'message', CASE 
            WHEN p_treatment_plan_id IS NOT NULL THEN 'Treatment plan follow-up booked successfully'
            WHEN is_consultation_only THEN 'Consultation appointment booked successfully'
            ELSE 'Appointment booked successfully'
        END,
        'data', jsonb_build_object(
            'appointment_id', appointment_id,
            'status', 'pending',
            'booking_type', booking_type_val,
            'is_consultation_only', is_consultation_only,
            'treatment_plan_link', jsonb_build_object(
                'linked', p_treatment_plan_id IS NOT NULL,
                'treatment_plan_id', p_treatment_plan_id
            ),
            'patient_info', jsonb_build_object(
                'name', patient_profile.first_name || ' ' || patient_profile.last_name,
                'email', patient_profile.email,
                'phone', patient_profile.phone,
                'age', patient_profile.age,
                'gender', patient_profile.gender
            ),
            'appointment_details', jsonb_build_object(
                'date', p_appointment_date,
                'time', p_appointment_time,
                'symptoms', p_symptoms,
                'duration', total_duration || ' minutes',
                'cancellation_deadline', cancellation_deadline
            ),
            'clinic', jsonb_build_object(
                'id', validation_result.clinic_id,
                'name', validation_result.clinic_name,
                'address', validation_result.clinic_address,
                'phone', validation_result.clinic_phone,
                'email', validation_result.clinic_email
            ),
            'doctor', jsonb_build_object(
                'id', validation_result.doctor_id,
                'name', TRIM(COALESCE(validation_result.doctor_first_name, '') || ' ' || COALESCE(validation_result.doctor_last_name, '')),
                'specialization', validation_result.specialization,
                'consultation_fee', doctor_consultation_fee
            ),
            'services', CASE 
                WHEN is_consultation_only THEN '[]'::jsonb
                ELSE validation_result.service_details
            END,
            'pricing_estimate', jsonb_build_object(
                'consultation_fee', doctor_consultation_fee,
                'total_estimated', doctor_consultation_fee,
                'currency', 'PHP'
            ),
            'cancellation_policy', jsonb_build_object(
                'policy_hours', COALESCE(validation_result.cancellation_policy_hours, 24),
                'deadline', cancellation_deadline,
                'can_cancel_now', NOW() < cancellation_deadline
            )
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'book_appointment error: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Booking failed: ' || SQLERRM);
END;$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.can_book_service_without_consultation(p_patient_id uuid, p_service_id uuid, p_clinic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    service_record RECORD;
    last_consultation_date DATE;
    days_since_consultation INTEGER;
BEGIN
    -- Get service requirements
    SELECT 
        requires_consultation,
        consultation_validity_days,
        name
    INTO service_record
    FROM services
    WHERE id = p_service_id;

    -- If service doesn't require consultation, always allowed
    IF NOT service_record.requires_consultation THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'reason', 'Service does not require prior consultation'
        );
    END IF;

    -- ✅ CRITICAL FIX: Check for recent consultation at this clinic
    -- Now checks BOTH booking_type (NEW) and appointment_type (OLD) for backward compatibility
    SELECT MAX(a.appointment_date) INTO last_consultation_date
    FROM appointments a
    WHERE a.patient_id = p_patient_id
    AND a.clinic_id = p_clinic_id
    AND a.status = 'completed'
    AND (
        -- ✅ NEW: Check booking_type column (used by current system)
        a.booking_type IN ('consultation_only', 'consultation_with_service')
        OR 
        -- ✅ OLD: Check appointment_type column (for backward compatibility)
        a.appointment_type IN ('consultation_only', 'consultation_with_service')
    );

    IF last_consultation_date IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Consultation required before booking this service',
            'message', format('Service "%s" requires a consultation first', service_record.name)
        );
    END IF;

    days_since_consultation := CURRENT_DATE - last_consultation_date;

    IF days_since_consultation > service_record.consultation_validity_days THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Previous consultation expired',
            'message', format('Your last consultation was %s days ago. Please book a new consultation.', days_since_consultation),
            'last_consultation_date', last_consultation_date
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'Recent consultation found',
        'last_consultation_date', last_consultation_date,
        'days_valid_remaining', service_record.consultation_validity_days - days_since_consultation
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_cancel_appointment(p_appointment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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

    -- Check if found and valid status for cancellation
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- ✅ UPDATED: Only pending and confirmed appointments can be cancelled
    -- Completed appointments cannot be cancelled (ongoing treatments protection)
    IF appointment_record.status NOT IN ('pending', 'confirmed') THEN
        RETURN FALSE;
    END IF;

    -- Log for debugging
    RAISE LOG 'Appointment %: Hours until = %, Policy = %, Status = %', 
              p_appointment_id, 
              appointment_record.hours_until_appointment, 
              appointment_record.policy_hours,
              appointment_record.status;

    -- Return true if enough time remains
    RETURN appointment_record.hours_until_appointment >= appointment_record.policy_hours;

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in can_cancel_appointment: %', SQLERRM;
        RETURN FALSE;
END;
$function$
;

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
        -- ✅ RULE 3: Calculate hours until appointment
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
    
    -- ✅ RULE 3: Enhanced cancellation policy enforcement
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
        
        -- ✅ ENHANCED: Return comprehensive cancellation data with Rule 3 info
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
                -- ✅ RULE 3: Detailed cancellation policy info
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
$function$
;

CREATE OR REPLACE FUNCTION public.check_appointment_availability(p_doctor_id uuid, p_appointment_date date, p_appointment_time time without time zone, p_duration_minutes integer DEFAULT NULL::integer, p_exclude_appointment_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$DECLARE
    conflict_count INTEGER;
    end_time TIME;
    clinic_operating_hours JSONB;
    is_within_hours BOOLEAN := false;
BEGIN
    -- Input validation
    IF p_doctor_id IS NULL OR p_appointment_date IS NULL OR p_appointment_time IS NULL THEN
        RETURN FALSE;
    END IF;

    -- ✅ Validate appointment is in future (not today)
    IF p_appointment_date <= CURRENT_DATE THEN
        RETURN FALSE;
    END IF;

    -- ✅ Prevent too far advance (e.g. max 30 days)
    IF p_appointment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RETURN FALSE;
    END IF;

    -- ✅ Duration check (already good in your code)
    IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
        p_duration_minutes := 30; -- fallback default
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.check_appointment_limit(p_patient_id uuid, p_clinic_id uuid, p_appointment_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    clinic_current_count INTEGER := 0;
    clinic_limit INTEGER;
    future_appointments_count INTEGER := 0;
    existing_appointment RECORD;
    cross_clinic_appointments JSONB;
    cross_clinic_minimal JSONB;
    max_future_appointments INTEGER := 3;
    current_user_context JSONB;
    user_role TEXT;
BEGIN
    -- Get current user context
    current_user_context := get_current_user_context();
    user_role := current_user_context->>'user_type';
    
    -- Input validation
    IF p_patient_id IS NULL OR p_clinic_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'invalid_parameters',
            'message', 'Patient ID and Clinic ID are required'
        );
    END IF;
    
    -- Get clinic limit
    SELECT appointment_limit_per_patient
    INTO clinic_limit
    FROM clinics 
    WHERE id = p_clinic_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'clinic_not_found',
            'message', 'Clinic not found'
        );
    END IF;

    -- ✅ RULE 1: Check for existing ACTIVE appointment on the same day
    IF p_appointment_date IS NOT NULL THEN
        -- Look for ANY active appointment on this date (any clinic, any doctor)
        SELECT 
            a.id,
            a.appointment_time,
            a.status,
            a.clinic_id,
            a.doctor_id,
            c.name as clinic_name,
            d.first_name || ' ' || d.last_name as doctor_name
        INTO existing_appointment
        FROM appointments a
        JOIN clinics c ON a.clinic_id = c.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = p_patient_id 
            AND a.appointment_date = p_appointment_date
            AND a.status IN ('pending', 'confirmed') -- Only active appointments block
        ORDER BY a.created_at -- Get the first one created
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'daily_appointment_exists',
                'message', 'You already have an active appointment scheduled for this date. To book another appointment today, please cancel your existing appointment first.',
                'data', jsonb_build_object(
                    'existing_appointment', jsonb_build_object(
                        'id', existing_appointment.id,
                        'time', existing_appointment.appointment_time,
                        'status', existing_appointment.status,
                        'clinic_name', existing_appointment.clinic_name,
                        'doctor_name', existing_appointment.doctor_name,
                        'can_cancel', true, -- They can cancel this to rebook
                        'is_same_clinic', existing_appointment.clinic_id = p_clinic_id
                    ),
                    'policy', 'Rule 1: Maximum 1 active appointment per day',
                    'action_required', 'Cancel existing appointment first',
                    'cancellation_note', 'You can cancel your existing appointment and then book a new one for the same day'
                )
            );
        END IF;
    END IF;

    -- Rule 2: Check future appointments limit (across all clinics)
    SELECT COUNT(*) INTO future_appointments_count
    FROM appointments
    WHERE patient_id = p_patient_id
        AND appointment_date >= CURRENT_DATE
        AND status NOT IN ('cancelled', 'no_show', 'completed');

    IF future_appointments_count >= max_future_appointments THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'future_appointments_limit_exceeded',
            'message', format('Maximum %s future appointments allowed. Please complete or cancel existing appointments first.', max_future_appointments),
            'data', jsonb_build_object(
                'current_future_appointments', future_appointments_count,
                'max_allowed', max_future_appointments,
                'policy', 'Rule 2: Global future appointments limit'
            )
        );
    END IF;

    -- Rule 3: Check clinic-specific appointment count
    SELECT current_count, limit_count
    INTO clinic_current_count, clinic_limit
    FROM patient_appointment_limits
    WHERE patient_id = p_patient_id AND clinic_id = p_clinic_id;

    IF NOT FOUND THEN
        INSERT INTO patient_appointment_limits (
            patient_id, clinic_id, current_count, limit_count
        ) VALUES (
            p_patient_id, p_clinic_id, 0, 
            (SELECT appointment_limit_per_patient FROM clinics WHERE id = p_clinic_id)
        );
        clinic_current_count := 0;
    END IF;

    -- Cross-clinic visibility logic (unchanged from your original)
    WITH clinic_appointments AS (
        SELECT 
            c.id as clinic_id,
            c.name as clinic_name,
            c.city as clinic_city,
            a.id as appointment_id,
            a.appointment_date,
            a.appointment_time,
            a.status,
            a.duration_minutes
        FROM appointments a
        JOIN clinics c ON a.clinic_id = c.id
        WHERE a.patient_id = p_patient_id
            AND a.clinic_id != p_clinic_id
            AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
            AND a.status NOT IN ('cancelled', 'no_show')
    ),
    clinic_summary_full AS (
        SELECT 
            clinic_id,
            clinic_name,
            clinic_city,
            COUNT(*) as appointment_count,
            jsonb_agg(
                jsonb_build_object(
                    'id', appointment_id,
                    'date', appointment_date,
                    'time', appointment_time,
                    'status', status,
                    'duration_minutes', duration_minutes
                ) ORDER BY appointment_date
            ) as appointments
        FROM clinic_appointments
        GROUP BY clinic_id, clinic_name, clinic_city
    ),
    clinic_summary_minimal AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'date', appointment_date,
                    'has_conflict', CASE 
                        WHEN appointment_date = p_appointment_date THEN true 
                        ELSE false 
                    END
                ) ORDER BY appointment_date
            ) as appointments_minimal
        FROM clinic_appointments
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'clinic_id', clinic_id,
                'clinic_name', clinic_name,
                'clinic_city', clinic_city,
                'appointment_count', appointment_count,
                'appointments', appointments
            )
        ),
        (SELECT appointments_minimal FROM clinic_summary_minimal)
    INTO cross_clinic_appointments, cross_clinic_minimal
    FROM clinic_summary_full;

    -- Success - booking allowed
    RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'within_limits',
        'message', 'Appointment booking allowed',
        'data', jsonb_build_object(
            'clinic_current_count', clinic_current_count,
            'clinic_limit', clinic_limit,
            'future_appointments_count', future_appointments_count,
            'max_future_appointments', max_future_appointments,
            'cross_clinic_appointments', CASE 
                WHEN user_role = 'admin' THEN COALESCE(cross_clinic_appointments, '[]'::jsonb)
                ELSE '[]'::jsonb
            END,
            'cross_clinic_minimal', CASE 
                WHEN user_role = 'staff' THEN COALESCE(cross_clinic_minimal, '[]'::jsonb)
                ELSE '[]'::jsonb
            END,
            'cross_clinic_count', COALESCE(jsonb_array_length(cross_clinic_appointments), 0)
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
            'error_details', SQLERRM
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_patient_reliability(p_patient_id uuid, p_clinic_id uuid DEFAULT NULL::uuid, p_lookback_months integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$DECLARE
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
        
    ELSIF reliability_stats.completion_rate >= 80 THEN
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_identifier text, p_action_type text, p_max_attempts integer, p_time_window_minutes integer, p_success boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    time_window_start TIMESTAMP WITH TIME ZONE;
    rate_record RECORD;
BEGIN
    time_window_start := NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;

    -- Clean old entries
    DELETE FROM rate_limits
    WHERE last_attempt < time_window_start
      AND blocked_until IS NULL;

    -- ✅ Reset attempts only if success AND action_type = login or clinic_search
    IF p_success AND p_action_type IN ('login', 'clinic_search') THEN
        UPDATE rate_limits
        SET attempt_count = 0,
            blocked_until = NULL,
            last_attempt = NOW(),
            first_attempt = NOW()
        WHERE user_identifier = p_user_identifier
          AND action_type = p_action_type;
        RETURN TRUE;
    END IF;

    -- Handle failed attempt (or success but action must still be counted, e.g., booking/feedback)
    INSERT INTO rate_limits (user_identifier, action_type, attempt_count, first_attempt, last_attempt)
    VALUES (p_user_identifier, p_action_type, 1, NOW(), NOW())
    ON CONFLICT (user_identifier, action_type)
    DO UPDATE SET 
        last_attempt = NOW(),
        attempt_count = CASE
            WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW() THEN
                rate_limits.attempt_count
            WHEN rate_limits.last_attempt < time_window_start THEN
                1
            ELSE
                rate_limits.attempt_count + 1
        END,
        blocked_until = CASE
            WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW() THEN
                rate_limits.blocked_until
            WHEN rate_limits.last_attempt < time_window_start THEN
                NULL
            ELSE
                rate_limits.blocked_until
        END
    RETURNING attempt_count, blocked_until INTO rate_record;

    -- Check if blocked
    IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > NOW() THEN
        RETURN FALSE;
    END IF;

    -- Check exceeded attempts
    IF rate_record.attempt_count >= p_max_attempts THEN
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
        RAISE LOG 'Rate limit error for % %: %', p_user_identifier, p_action_type, SQLERRM;
        RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit_unified(p_user_email character varying, p_action_type character varying, p_max_attempts integer, p_window_minutes integer DEFAULT 1440, p_is_success boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP;
    is_blocked BOOLEAN := false;
BEGIN
    -- Kung success ang login, huwag i-log as attempt
    IF p_is_success THEN
        RETURN true; -- ✅ laging true kung tama login
    END IF;

    window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Check if user is currently blocked
    SELECT blocked_until > NOW() INTO is_blocked
    FROM rate_limits
    WHERE user_identifier = p_user_email
      AND action_type = p_action_type;
    
    IF is_blocked THEN
        RETURN false;
    END IF;
    
    -- Count recent wrong attempts
    SELECT COUNT(*) INTO current_count
    FROM rate_limits
    WHERE user_identifier = p_user_email
      AND action_type = p_action_type
      AND last_attempt >= window_start;
    
    -- Update or insert rate limit record for wrong attempt only
    INSERT INTO rate_limits (user_identifier, action_type, attempt_count, last_attempt, blocked_until)
    VALUES (
        p_user_email, 
        p_action_type, 
        1, 
        NOW(),
        CASE WHEN current_count + 1 > p_max_attempts 
             THEN NOW() + INTERVAL '1 hour' 
             ELSE NULL END
    )
    ON CONFLICT (user_identifier, action_type)
    DO UPDATE SET 
        attempt_count = CASE 
            WHEN rate_limits.last_attempt < window_start THEN 1
            ELSE rate_limits.attempt_count + 1
        END,
        last_attempt = NOW(),
        blocked_until = CASE 
            WHEN rate_limits.attempt_count + 1 > p_max_attempts 
            THEN NOW() + INTERVAL '1 hour'
            ELSE rate_limits.blocked_until
        END;
    
    RETURN (current_count + 1) <= p_max_attempts;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_appointments_feedback_status(
    p_appointment_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_auth_id UUID;
    current_user_id UUID;
    result JSONB;
BEGIN
    -- Get current auth user
    current_auth_id := auth.uid();
    
    IF current_auth_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- ✅ CRITICAL FIX: Convert auth.uid() to public.users.id
    SELECT id INTO current_user_id
    FROM public.users
    WHERE auth_user_id = current_auth_id;
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User profile not found',
            'debug_auth_id', current_auth_id
        );
    END IF;
    
    -- Bypass RLS
    SET LOCAL row_security = off;
    
    -- Get feedback status for these appointments
    WITH feedback_check AS (
        SELECT 
            f.appointment_id,
            f.id as feedback_id,
            f.clinic_rating,
            f.doctor_rating,
            f.created_at,
            TRUE as has_feedback
        FROM feedback f
        WHERE f.appointment_id = ANY(p_appointment_ids)
        AND f.patient_id = current_user_id  -- ✅ Now using correct public.users.id
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', COALESCE(
            jsonb_object_agg(
                appointment_id::text,
                jsonb_build_object(
                    'id', feedback_id,
                    'clinic_rating', clinic_rating,
                    'doctor_rating', doctor_rating,
                    'created_at', created_at,
                    'has_feedback', has_feedback
                )
            ),
            '{}'::jsonb
        ),
        'debug', jsonb_build_object(
            'auth_id', current_auth_id,
            'user_id', current_user_id,
            'appointments_checked', array_length(p_appointment_ids, 1)
        )
    ) INTO result
    FROM feedback_check;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to check feedback status',
            'details', SQLERRM
        );
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_appointments_feedback_status TO authenticated;

CREATE OR REPLACE FUNCTION public.check_staff_profile_completion_status(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_context JSONB;
    target_user_id UUID;
    invitation_record RECORD;
    completion_status JSONB;
BEGIN
    -- Get current user context
    current_context := get_current_user_context();
    
    -- ✅ Allow both authenticated and non-authenticated for initial checks
    IF current_context IS NULL THEN
        -- Try to get from auth.uid() directly
        target_user_id := auth.uid();
        
        IF target_user_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
        END IF;
        
        -- Get user_id from auth_user_id
        SELECT id INTO target_user_id
        FROM users
        WHERE auth_user_id = target_user_id;
    ELSE
        target_user_id := COALESCE(p_user_id, (current_context->>'user_id')::UUID);
    END IF;
    
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
        -- ✅ Return a default response for users without invitations
        RETURN jsonb_build_object(
            'success', true,
            'is_completed', false,
            'invitation_status', 'none',
            'completion_percentage', 0,
            'clinic_name', NULL,
            'note', 'No staff invitation found. This user may not be a staff member.'
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
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_incomplete_staff_profiles(p_days_threshold integer DEFAULT 7, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.complete_appointment(p_appointment_id uuid, p_completion_notes text DEFAULT NULL::text, p_services_completed uuid[] DEFAULT NULL::uuid[], p_follow_up_required boolean DEFAULT false, p_follow_up_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$DECLARE
    current_context JSONB;
    appointment_record RECORD;
    v_current_role TEXT;
    clinic_id_val UUID;
    completed_services JSONB;
BEGIN
    -- ✅ Get current user context
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

    -- ✅ Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;

    -- ✅ Get appointment
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

    -- ✅ Status validation
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

    -- ✅ Date validation
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

    -- ✅ Validate services completed
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

    -- ✅ Transaction
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

        -- ✅ Insert medical history (aligned with schema)
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

        -- ✅ Feedback request notification
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

        -- ✅ Follow-up reminder notification
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

        -- ✅ Final return
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.complete_staff_signup_from_invitation(p_invitation_id uuid, p_email character varying, p_password character varying, p_first_name character varying, p_last_name character varying, p_phone character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog', 'auth'
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.create_appointment_with_validation(p_doctor_id uuid, p_clinic_id uuid, p_appointment_date date, p_appointment_time time without time zone, p_service_type character varying DEFAULT NULL::character varying, p_symptoms text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_direct_staff_invitation(p_email character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_user_context JSONB;
    admin_clinic_id UUID;
    result JSONB;
BEGIN
    -- Security check
    current_user_context := get_current_user_context();
    
    IF NOT (current_user_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF (current_user_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only admins can invite staff');
    END IF;
    
    -- Get admin's default clinic (first active clinic)
    SELECT id INTO admin_clinic_id 
    FROM clinics 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF admin_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active clinic found. Please create a clinic first.');
    END IF;
    
    -- Use existing create_staff_invitation function
    result := create_staff_invitation(
        p_email,
        admin_clinic_id,
        'Staff',
        'General',
        NULL,
        NULL
    );
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_direct_staff_invitation(p_email character varying, p_clinic_id uuid, p_position character varying DEFAULT 'Staff'::character varying, p_department character varying DEFAULT NULL::character varying, p_first_name character varying DEFAULT NULL::character varying, p_last_name character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_user_context JSONB;
    result JSONB;
BEGIN
    -- Security check
    current_user_context := get_current_user_context();
    
    IF NOT (current_user_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF (current_user_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only admins can invite staff');
    END IF;
    
    -- Validate clinic exists
    IF NOT EXISTS (SELECT 1 FROM clinics WHERE id = p_clinic_id AND is_active = true) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found or inactive');
    END IF;
    
    -- Use existing create_staff_invitation function
    result := create_staff_invitation(
        p_email,
        p_clinic_id,
        p_position,
        p_department,
        p_first_name,
        p_last_name
    );
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_staff_invitation(p_email character varying, p_clinic_id uuid, p_position character varying, p_department character varying DEFAULT NULL::character varying, p_first_name character varying DEFAULT NULL::character varying, p_last_name character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    invitation_id UUID;
    temp_password TEXT;
    invitation_token TEXT;
    current_user_context JSONB;
    clinic_name VARCHAR;
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
    
    -- Generate temporary password and invitation token using UUID
    temp_password := replace(gen_random_uuid()::text, '-', '');
    invitation_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    
    -- Create invitation record
    INSERT INTO staff_invitations (
        email,
        clinic_id,
        position,
        department,
        temp_password,
        invitation_token,
        expires_at,
        status
    ) VALUES (
        p_email,
        p_clinic_id,
        COALESCE(p_position, 'Staff'),
        p_department,
        temp_password,
        invitation_token,
        NOW() + INTERVAL '7 days',
        'pending'
    ) RETURNING id INTO invitation_id;
    
    -- Prepare email data for Resend
    SELECT send_staff_invitation_email(
        jsonb_build_object(
            'invitation_id', invitation_id,
            'invitation_token', invitation_token,
            'email', p_email,
            'clinic_name', clinic_name,
            'position', COALESCE(p_position, 'Staff'),
            'first_name', COALESCE(p_first_name, ''),
            'last_name', COALESCE(p_last_name, '')
        )
    ) INTO email_data;
    
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_staff_invitation_with_clinic_data(p_email character varying, p_clinic_metadata jsonb, p_position character varying, p_department character varying DEFAULT NULL::character varying, p_first_name character varying DEFAULT NULL::character varying, p_last_name character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_treatment_plan(p_patient_id uuid, p_clinic_id uuid, p_treatment_name character varying, p_description text DEFAULT NULL::text, p_treatment_category character varying DEFAULT NULL::character varying, p_total_visits_planned integer DEFAULT NULL::integer, p_follow_up_interval_days integer DEFAULT 30, p_initial_appointment_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
  current_context JSONB;
  treatment_plan_id UUID;
  current_user_role TEXT;
  staff_clinic_id UUID;
BEGIN
  -- Get current user context
  current_context := get_current_user_context();
  
  IF NOT (current_context->>'authenticated')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  current_user_role := current_context->>'user_type';
  
  -- Only staff can create treatment plans
  IF current_user_role != 'staff' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only staff can create treatment plans');
  END IF;
  
  -- Get staff's clinic_id from staff_profiles (CRITICAL FIX)
  SELECT sp.clinic_id INTO staff_clinic_id
  FROM staff_profiles sp
  JOIN user_profiles up ON sp.user_profile_id = up.id
  WHERE up.user_id = (current_context->>'user_id')::UUID
  AND sp.is_active = true;
  
  IF staff_clinic_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff profile not found or inactive');
  END IF;
  
  -- Validate clinic access (FIXED: use staff_clinic_id)
  IF staff_clinic_id != p_clinic_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot create treatment plan for different clinic');
  END IF;
  
  -- Validate patient exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_patient_id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
  END IF;
  
  -- Validate initial appointment belongs to this patient and clinic (CRITICAL FIX)
  IF p_initial_appointment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = p_initial_appointment_id 
      AND patient_id = p_patient_id 
      AND clinic_id = p_clinic_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid appointment for this patient/clinic');
    END IF;
  END IF;
  
  -- Create treatment plan
  INSERT INTO treatment_plans (
    patient_id,
    clinic_id,
    created_by_staff_id,
    treatment_name,
    description,
    treatment_category,
    status,
    start_date,
    total_visits_planned,
    follow_up_interval_days
  ) VALUES (
    p_patient_id,
    p_clinic_id,
    (current_context->>'user_id')::UUID,
    p_treatment_name,
    p_description,
    p_treatment_category,
    'active',
    CURRENT_DATE,
    p_total_visits_planned,
    p_follow_up_interval_days
  )
  RETURNING id INTO treatment_plan_id;
  
  -- Link initial appointment if provided
  IF p_initial_appointment_id IS NOT NULL THEN
    INSERT INTO treatment_plan_appointments (
      treatment_plan_id,
      appointment_id,
      visit_number,
      visit_purpose
    ) VALUES (
      treatment_plan_id,
      p_initial_appointment_id,
      1,
      'Initial Visit'
    );
    
    -- Update next visit info (FIXED: get appointment date)
    UPDATE treatment_plans
    SET 
      next_visit_appointment_id = p_initial_appointment_id,
      next_visit_date = (SELECT appointment_date FROM appointments WHERE id = p_initial_appointment_id)
    WHERE id = treatment_plan_id;
    
    -- Link appointment services to treatment plan (CRITICAL ADDITION)
    UPDATE appointment_services 
    SET treatment_plan_id = treatment_plan_id
    WHERE appointment_id = p_initial_appointment_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Treatment plan created successfully',
    'data', jsonb_build_object(
      'treatment_plan_id', treatment_plan_id,
      'patient_id', p_patient_id,
      'clinic_id', p_clinic_id,
      'status', 'active',
      'initial_appointment_linked', p_initial_appointment_id IS NOT NULL
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create treatment plan: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_user_email_only(p_email character varying, p_first_name character varying, p_last_name character varying, p_user_type user_type DEFAULT 'patient'::user_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_id UUID;
    profile_id UUID;
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
    
    -- Get auth user ID (should be set by Supabase Auth)
    auth_user_id := auth.uid();
    
    IF auth_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    -- Check if user already exists
    SELECT id INTO user_id FROM users WHERE auth_user_id = auth_user_id;
    
    IF user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User already exists');
    END IF;
    
    BEGIN
        -- Create user record
        INSERT INTO users (auth_user_id, email, email_verified, is_active)
        VALUES (auth_user_id, p_email, true, true) -- Email verified through Supabase Auth
        RETURNING id INTO user_id;
        
        -- Create user profile
        INSERT INTO user_profiles (user_id, user_type, first_name, last_name)
        VALUES (user_id, p_user_type, p_first_name, p_last_name)
        RETURNING id INTO profile_id;
        
        -- Create role-specific profile
        CASE p_user_type
            WHEN 'patient' THEN
                INSERT INTO patient_profiles (user_profile_id, email_notifications, sms_notifications)
                VALUES (profile_id, true, false); -- Only email for free plan
            WHEN 'staff' THEN
                -- Staff profiles need clinic assignment through invitation system
                NULL; -- Will be handled by staff invitation process
            WHEN 'admin' THEN
                INSERT INTO admin_profiles (user_profile_id, access_level, permissions)
                VALUES (profile_id, 1, '{"manage_users": true, "system_analytics": true}'::jsonb);
        END CASE;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'User created successfully',
            'data', jsonb_build_object(
                'user_id', user_id,
                'profile_id', profile_id,
                'email', p_email,
                'user_type', p_user_type,
                'name', p_first_name || ' ' || p_last_name
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Failed to create user: ' || SQLERRM
            );
    END;
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_patient_profile_update_constraints()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_staff_profile_update_constraints()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.evaluate_clinic_badges(p_clinic_id uuid DEFAULT NULL::uuid, p_evaluation_period_days integer DEFAULT 90, p_auto_award boolean DEFAULT false, p_badge_types text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.find_nearest_clinics(p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision, max_distance_km double precision DEFAULT 50.0, limit_count integer DEFAULT 20, services_filter text[] DEFAULT NULL::text[], min_rating numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    result JSONB;
    current_context JSONB;
    current_user_id UUID;
    user_location geography;
BEGIN
    -- ✅ Input validation with safe bounds
    max_distance_km := LEAST(GREATEST(COALESCE(max_distance_km, 50.0), 1.0), 200.0);
    limit_count := LEAST(GREATEST(COALESCE(limit_count, 20), 1), 50);
    
    -- ✅ Construct geography from lat/lng parameters
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        user_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
        RAISE LOG 'User location constructed: lat=%, lng=%', p_latitude, p_longitude;
    ELSE
        user_location := NULL;
        RAISE LOG 'No user location provided';
    END IF;
    
    -- ✅ Get current user using existing function
    current_context := get_current_user_context();
    IF (current_context->>'authenticated')::boolean THEN
        current_user_id := (current_context->>'user_id')::UUID;
    END IF;
    
    -- ✅ Smart location fallback using patient preferences
    IF user_location IS NULL AND current_user_id IS NOT NULL THEN
        SELECT pp.preferred_location INTO user_location 
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        JOIN patient_profiles pp ON up.id = pp.user_profile_id
        WHERE u.id = current_user_id
        AND pp.preferred_location IS NOT NULL;
    END IF;
    
    -- ✅ FIXED: Main query with proper services join
    WITH clinic_services AS (
        -- Get all services for each clinic
        SELECT 
            s.clinic_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.name,
                    'description', s.description,
                    'category', s.category,
                    'duration_minutes', s.duration_minutes,
                    'min_price', s.min_price,
                    'max_price', s.max_price,
                    'priority', s.priority
                )
                ORDER BY s.priority ASC, s.name ASC
            ) AS services_offered,
            -- Create array of service names for filtering
            array_agg(LOWER(s.name)) AS service_names
        FROM services s
        WHERE s.is_active = true
        GROUP BY s.clinic_id
    ),
    clinic_data AS (
        SELECT 
            c.id,
            c.name,
            c.description,
            c.address,
            c.city,
            c.province,
            c.zip_code,
            c.country,
            c.phone,
            c.email,
            c.website_url,
            c.rating,
            c.total_reviews,
            c.operating_hours,
            c.image_url,
            c.location,
            c.timezone,
            c.appointment_limit_per_patient,
            c.cancellation_policy_hours,
            c.created_at,
            cs.services_offered,
            cs.service_names,
            -- ✅ Safe distance calculation
            CASE 
                WHEN user_location IS NULL THEN 0::FLOAT
                ELSE ROUND((ST_Distance(c.location::geography, user_location) / 1000.0)::NUMERIC, 2)
            END AS distance_km
        FROM clinics c
        LEFT JOIN clinic_services cs ON c.id = cs.clinic_id
        WHERE 
            c.is_active = true
            -- ✅ Distance filter
            AND (user_location IS NULL OR 
                 ST_DWithin(c.location::geography, user_location, max_distance_km * 1000))
            -- Rating filter
            AND (min_rating IS NULL OR c.rating >= min_rating)
            -- ✅ FIXED: Services filter using actual services table
            AND (services_filter IS NULL OR 
                 cs.service_names && (SELECT array_agg(LOWER(unnest)) FROM unnest(services_filter)))
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
        AND cba.clinic_id IN (SELECT id FROM clinic_data)
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
                    'description', cd.description,
                    'address', cd.address,
                    'city', cd.city,
                    'province', cd.province,
                    'zip_code', cd.zip_code,
                    'country', cd.country,
                    'phone', cd.phone,
                    'email', cd.email,
                    'website_url', cd.website_url,
                    'image_url', cd.image_url,
                    'timezone', cd.timezone,
                    'distance_km', cd.distance_km,
                    'rating', cd.rating,
                    'total_reviews', cd.total_reviews,
                    'services_offered', COALESCE(cd.services_offered, '[]'::jsonb),
                    'operating_hours', cd.operating_hours,
                    -- ✅ Calculate is_open based on clinic timezone
                    'is_open', (
                        SELECT CASE
                            WHEN cd.operating_hours IS NULL THEN false
                            ELSE (
                                WITH current_time_info AS (
                                    SELECT 
                                        LOWER(to_char(NOW() AT TIME ZONE COALESCE(cd.timezone, 'Asia/Manila'), 'Day')) as day_name,
                                        to_char(NOW() AT TIME ZONE COALESCE(cd.timezone, 'Asia/Manila'), 'HH24:MI') as current_time
                                ),
                                day_hours AS (
                                    SELECT 
                                        cti.current_time,
                                        -- ✅ Handle nested weekdays/weekends structure
                                        CASE 
                                            WHEN TRIM(cti.day_name) IN ('saturday', 'sunday') THEN
                                                cd.operating_hours->'weekends'->TRIM(cti.day_name)
                                            ELSE
                                                cd.operating_hours->'weekdays'->TRIM(cti.day_name)
                                        END as hours_for_day
                                    FROM current_time_info cti
                                )
                                SELECT 
                                    CASE 
                                        WHEN dh.hours_for_day IS NULL THEN false
                                        WHEN dh.hours_for_day->>'start' IS NULL OR dh.hours_for_day->>'end' IS NULL THEN false
                                        ELSE dh.current_time >= (dh.hours_for_day->>'start') 
                                             AND dh.current_time <= (dh.hours_for_day->>'end')
                                    END
                                FROM day_hours dh
                            )
                        END
                    ),
                    -- ✅ Add position coordinates for map display
                    'position', jsonb_build_object(
                        'lat', ST_Y(cd.location::geometry),
                        'lng', ST_X(cd.location::geometry)
                    ),
                    'appointment_limit_per_patient', cd.appointment_limit_per_patient,
                    'cancellation_policy_hours', cd.cancellation_policy_hours,
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
                'user_latitude', p_latitude,
                'user_longitude', p_longitude,
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
    
    -- ✅ Always return valid result
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
            'error', 'Clinic search failed: ' || SQLERRM,
            'data', jsonb_build_object('clinics', '[]'::jsonb)
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_nearest_clinics(user_location extensions.geography DEFAULT NULL::extensions.geography, max_distance_km double precision DEFAULT 50.0, limit_count integer DEFAULT 20, services_filter text[] DEFAULT NULL::text[], min_rating numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$DECLARE
    result JSONB;
    current_context JSONB;
    current_user_id UUID;
BEGIN
    -- ✅ Input validation with safe bounds
    max_distance_km := LEAST(GREATEST(COALESCE(max_distance_km, 50.0), 1.0), 200.0);
    limit_count := LEAST(GREATEST(COALESCE(limit_count, 20), 1), 50);
    
    -- ✅ Get current user using existing function
    current_context := get_current_user_context();
    IF (current_context->>'authenticated')::boolean THEN
        current_user_id := (current_context->>'user_id')::UUID;
    END IF;
    
    -- ✅ Smart location fallback using patient preferences
    IF user_location IS NULL AND current_user_id IS NOT NULL THEN
        SELECT pp.preferred_location INTO user_location 
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        JOIN patient_profiles pp ON up.id = pp.user_profile_id
        WHERE u.id = current_user_id
        AND pp.preferred_location IS NOT NULL;
    END IF;
    
    -- ✅ FIXED: Main query with proper services join
    WITH clinic_services AS (
        -- Get all services for each clinic
        SELECT 
            s.clinic_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.name,
                    'description', s.description,
                    'category', s.category,
                    'duration_minutes', s.duration_minutes,
                    'min_price', s.min_price,
                    'max_price', s.max_price,
                    'priority', s.priority
                )
                ORDER BY s.priority ASC, s.name ASC
            ) AS services_offered,
            -- Create array of service names for filtering
            array_agg(LOWER(s.name)) AS service_names
        FROM services s
        WHERE s.is_active = true
        GROUP BY s.clinic_id
    ),
    clinic_data AS (
        SELECT 
            c.id,
            c.name,
            c.description,
            c.address,
            c.city,
            c.province,
            c.zip_code,
            c.country,
            c.phone,
            c.email,
            c.website_url,
            c.rating,
            c.total_reviews,
            c.operating_hours,
            c.image_url,
            c.location,
            c.timezone,
            c.appointment_limit_per_patient,
            c.cancellation_policy_hours,
            c.created_at,
            cs.services_offered,
            cs.service_names,
            -- ✅ Safe distance calculation
            CASE 
                WHEN user_location IS NULL THEN 0::FLOAT
                ELSE ST_Distance(c.location::geometry, user_location::geometry) / 1000.0
            END AS distance_km
        FROM clinics c
        LEFT JOIN clinic_services cs ON c.id = cs.clinic_id
        WHERE 
            c.is_active = true
            -- ✅ Distance filter
            AND (user_location IS NULL OR 
                 ST_DWithin(c.location::geometry, user_location::geometry, max_distance_km * 1000))
            -- Rating filter
            AND (min_rating IS NULL OR c.rating >= min_rating)
            -- ✅ FIXED: Services filter using actual services table
            AND (services_filter IS NULL OR 
                 cs.service_names && (SELECT array_agg(LOWER(unnest)) FROM unnest(services_filter)))
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
        AND cba.clinic_id IN (SELECT id FROM clinic_data)
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
                    'description', cd.description,
                    'address', cd.address,
                    'city', cd.city,
                    'province', cd.province,
                    'zip_code', cd.zip_code,
                    'country', cd.country,
                    'phone', cd.phone,
                    'email', cd.email,
                    'website_url', cd.website_url,
                    'image_url', cd.image_url,
                    'timezone', cd.timezone,
                    'distance_km', ROUND(cd.distance_km::NUMERIC, 2),
                    'rating', cd.rating,
                    'total_reviews', cd.total_reviews,
                    'services_offered', COALESCE(cd.services_offered, '[]'::jsonb),
                    'operating_hours', cd.operating_hours,
                    -- ✅ NEW: Calculate is_open based on clinic timezone
                    'is_open', (
                        SELECT CASE
                            WHEN cd.operating_hours IS NULL THEN false
                            ELSE (
                                WITH current_time_info AS (
                                    SELECT 
                                        LOWER(to_char(NOW() AT TIME ZONE COALESCE(cd.timezone, 'Asia/Manila'), 'Day')) as day_name,
                                        to_char(NOW() AT TIME ZONE COALESCE(cd.timezone, 'Asia/Manila'), 'HH24:MI') as current_time
                                ),
                                day_hours AS (
                                    SELECT 
                                        cti.current_time,
                                        -- ✅ FIXED: Handle nested weekdays/weekends structure
                                        CASE 
                                            WHEN TRIM(cti.day_name) IN ('saturday', 'sunday') THEN
                                                cd.operating_hours->'weekends'->TRIM(cti.day_name)
                                            ELSE
                                                cd.operating_hours->'weekdays'->TRIM(cti.day_name)
                                        END as hours_for_day
                                    FROM current_time_info cti
                                )
                                SELECT 
                                    CASE 
                                        WHEN dh.hours_for_day IS NULL THEN false
                                        WHEN dh.hours_for_day->>'start' IS NULL OR dh.hours_for_day->>'end' IS NULL THEN false
                                        ELSE dh.current_time >= (dh.hours_for_day->>'start') 
                                             AND dh.current_time <= (dh.hours_for_day->>'end')
                                    END
                                FROM day_hours dh
                            )
                        END
                    ),
                    -- ✅ NEW: Add position coordinates for map display
                    'position', jsonb_build_object(
                        'lat', ST_Y(cd.location::geometry),
                        'lng', ST_X(cd.location::geometry)
                    ),
                    'appointment_limit_per_patient', cd.appointment_limit_per_patient,
                    'cancellation_policy_hours', cd.cancellation_policy_hours,
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
    
    -- ✅ Always return valid result
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.geocode_clinic_address(p_address text, p_city text DEFAULT 'San Jose Del Monte'::text, p_province text DEFAULT 'Bulacan'::text, p_country text DEFAULT 'Philippines'::text)
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_system_analytics(p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_include_trends boolean DEFAULT true, p_include_performance boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_appointment_with_patient_info(p_appointment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    current_user_context JSONB;
    user_role TEXT;
    appointment_data RECORD;
    patient_age INTEGER;
    result JSONB;
BEGIN
    -- Get current user context
    current_user_context := get_current_user_context();
    user_role := current_user_context->>'user_type';
    
    -- Only staff and admin can access this
    IF user_role NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Access denied. Staff or admin role required.'
        );
    END IF;
    
    -- Fetch appointment with patient demographics
    SELECT 
        a.id as appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.duration_minutes,
        a.status,
        a.symptoms,
        a.notes,
        
        -- Patient info
        u.email as patient_email,
        u.phone as patient_phone,
        up.first_name,
        up.last_name,
        up.gender,
        up.date_of_birth,
        CASE 
            WHEN up.date_of_birth IS NOT NULL THEN 
                EXTRACT(YEAR FROM AGE(up.date_of_birth))::INTEGER
            ELSE NULL
        END as age,
        
        pp.emergency_contact_name,
        pp.emergency_contact_phone,
        pp.medical_conditions,
        pp.allergies,
        
        -- Clinic info
        c.id as clinic_id,
        c.name as clinic_name,
        c.phone as clinic_phone,
        
        -- Doctor info
        d.id as doctor_id,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.specialization
        
    INTO appointment_data
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN patient_profiles pp ON up.id = pp.user_profile_id
    JOIN clinics c ON a.clinic_id = c.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = p_appointment_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Appointment not found'
        );
    END IF;
    
    -- Build result JSON
    result := jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'appointment', jsonb_build_object(
                'id', appointment_data.appointment_id,
                'date', appointment_data.appointment_date,
                'time', appointment_data.appointment_time,
                'duration_minutes', appointment_data.duration_minutes,
                'status', appointment_data.status,
                'symptoms', appointment_data.symptoms,
                'notes', appointment_data.notes
            ),
            'patient', jsonb_build_object(
                'name', COALESCE(appointment_data.first_name, '') || ' ' || COALESCE(appointment_data.last_name, ''),
                'first_name', appointment_data.first_name,
                'last_name', appointment_data.last_name,
                'email', appointment_data.patient_email,
                'phone', appointment_data.patient_phone,
                'gender', appointment_data.gender,
                'age', appointment_data.age,
                'date_of_birth', appointment_data.date_of_birth,
                'emergency_contact', jsonb_build_object(
                    'name', appointment_data.emergency_contact_name,
                    'phone', appointment_data.emergency_contact_phone
                ),
                'medical_info', jsonb_build_object(
                    'conditions', appointment_data.medical_conditions,
                    'allergies', appointment_data.allergies
                )
            ),
            'clinic', jsonb_build_object(
                'id', appointment_data.clinic_id,
                'name', appointment_data.clinic_name,
                'phone', appointment_data.clinic_phone
            ),
            'doctor', jsonb_build_object(
                'id', appointment_data.doctor_id,
                'name', COALESCE(appointment_data.doctor_first_name, '') || ' ' || COALESCE(appointment_data.doctor_last_name, ''),
                'specialization', appointment_data.specialization
            )
        )
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_appointment_with_patient_info: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to fetch appointment details'
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_appointments_by_role(p_status appointment_status[] DEFAULT NULL::appointment_status[], p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$DECLARE
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
    
    p_limit := LEAST(COALESCE(p_limit, 20), 100);
    p_offset := GREATEST(COALESCE(p_offset, 0), 0);
    
    CASE v_current_role
WHEN 'patient' THEN
    WITH patient_appointments AS (
        SELECT 
            a.id, a.appointment_date, a.appointment_time, a.status, 
            a.symptoms, a.notes, a.duration_minutes, a.created_at,
            a.booking_type, a.consultation_fee_charged,  -- ✅ ADDED
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
        -- ✅ ENHANCED: Order by date ASC (earliest first) for upcoming view
        ORDER BY 
          a.appointment_date ASC,  -- ✅ CHANGED: Earliest dates first
          a.appointment_time ASC,  -- ✅ CHANGED: Earliest times first
          CASE 
            WHEN a.status = 'pending' THEN 1
            WHEN a.status = 'confirmed' THEN 2
            ELSE 3
          END  -- ✅ NEW: Pending appointments show before confirmed
        LIMIT p_limit OFFSET p_offset
    ),
appointment_services_agg AS (
    SELECT 
        aps.appointment_id,
        (array_agg(aps.treatment_plan_id))[1] as treatment_plan_id,  -- ✅ FIXED: Get first non-null treatment_plan_id
        jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'duration_minutes', s.duration_minutes,
            'category', s.category,
            'requires_multiple_visits', s.requires_multiple_visits,
            'typical_visit_count', s.typical_visit_count
        )) FILTER (WHERE s.id IS NOT NULL) as services
    FROM appointment_services aps
    LEFT JOIN services s ON aps.service_id = s.id
    WHERE aps.appointment_id IN (SELECT id FROM patient_appointments)
    GROUP BY aps.appointment_id
),
    -- ✅ NEW CTE: Get treatment plan details
    treatment_plan_data AS (
        SELECT 
            asa.appointment_id,
            CASE 
                WHEN tp.id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', tp.id,
                        'treatment_name', tp.treatment_name,
                        'treatment_category', tp.treatment_category,
                        'progress_percentage', tp.progress_percentage,
                        'visits_completed', tp.visits_completed,
                        'total_visits_planned', tp.total_visits_planned,
                        'status', tp.status
                    )
                ELSE NULL
            END as treatment_plan
        FROM appointment_services_agg asa
        LEFT JOIN treatment_plans tp ON tp.id = asa.treatment_plan_id
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
                    'booking_type', pa.booking_type,  -- ✅ ADDED
                    'consultation_fee_charged', pa.consultation_fee_charged,  -- ✅ ADDED
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
                    'treatment_plan', tpd.treatment_plan,  -- ✅ ADDED
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
    LEFT JOIN appointment_services_agg asa ON pa.id = asa.appointment_id
    LEFT JOIN treatment_plan_data tpd ON pa.id = tpd.appointment_id;
            
        WHEN 'staff' THEN
            -- ✅ FIXED: Added services and patient reliability
            WITH staff_appointments AS (
                SELECT 
                    a.id, a.appointment_date, a.appointment_time, a.status, 
                    a.symptoms, a.notes, a.duration_minutes, a.created_at, a.patient_id,
                    u.id as user_id, u.email as patient_email, u.phone as patient_phone,
                    up.first_name || ' ' || up.last_name as patient_name,
                    d.id as doctor_id, d.specialization, d.first_name as doctor_first_name, d.last_name as doctor_last_name
                FROM appointments a
                JOIN users u ON a.patient_id = u.id
                JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN doctors d ON a.doctor_id = d.id
                LEFT JOIN archive_items ai ON ai.item_id = a.id 
                    AND ai.item_type IN ('clinic_appointment', 'appointment')
                    AND ai.scope_type = 'clinic'
                    AND ai.scope_id = clinic_id_val
                    AND ai.is_archived = true
                WHERE a.clinic_id = clinic_id_val
                AND ai.id IS NULL  -- ✅ Only show non-archived
                AND (p_status IS NULL OR a.status = ANY(p_status))
                AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
                AND (p_date_to IS NULL OR a.appointment_date <= p_date_to)
                ORDER BY 
                    CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END,
                    a.appointment_date ASC, 
                    a.appointment_time ASC
                LIMIT p_limit OFFSET p_offset
            ),
            appointment_services_agg AS (
                SELECT 
                    aps.appointment_id,
                    jsonb_agg(jsonb_build_object(
                        'id', s.id,
                        'name', s.name,
                        'duration_minutes', s.duration_minutes,
                        'category', s.category,
                        'requires_multiple_visits', s.requires_multiple_visits,  -- ✅ ADDED
                        'typical_visit_count', s.typical_visit_count            -- ✅ ADDED
                    )) as services
                FROM appointment_services aps
                JOIN services s ON aps.service_id = s.id
                WHERE aps.appointment_id IN (SELECT id FROM staff_appointments)
                GROUP BY aps.appointment_id
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
                                'id', sa.user_id,
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
                            -- ✅ NEW: Include services
                            'services', COALESCE(asa.services, '[]'::jsonb),
                            -- ✅ NEW: Include patient reliability
                            'patient_reliability', check_patient_reliability(sa.patient_id, clinic_id_val, 6),
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
            FROM staff_appointments sa
            LEFT JOIN appointment_services_agg asa ON sa.id = asa.appointment_id;
            
        WHEN 'admin' THEN
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
        RAISE LOG 'Error in get_appointments_by_role: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to fetch appointments: ' || SQLERRM);
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_doctor_id uuid, p_appointment_date date, p_service_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_cataglog', 'extensions'
AS $function$DECLARE
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
    
    -- ✅ FIX: Allow tomorrow, just not past dates
    IF p_appointment_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot book appointments in the past');
    END IF;
    
    -- ✅ Optional: Prevent booking too far in advance
    IF p_appointment_date > CURRENT_DATE + INTERVAL '60 days' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot book more than 90 days in advance');
    END IF;
    
    -- Calculate total duration if services provided
    IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 THEN
        SELECT COALESCE(SUM(duration_minutes), 60) INTO total_duration
        FROM services 
        WHERE id = ANY(p_service_ids) AND is_active = true;
    END IF;
    
    -- ✅ Enhanced: For same-day bookings, filter out past times
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
        SELECT 
            (TIME '09:00:00' + (slot_num * INTERVAL '30 minutes'))::TIME as slot_time
        FROM generate_series(0, 15) as slot_num
        WHERE (TIME '09:00:00' + (slot_num * INTERVAL '30 minutes'))::TIME <= TIME '16:30:00'
        -- ✅ NEW: If booking for today, only show future times (with 2-hour buffer)
        AND (
            p_appointment_date > CURRENT_DATE 
            OR 
            (TIME '09:00:00' + (slot_num * INTERVAL '30 minutes'))::TIME >= CURRENT_TIME + INTERVAL '2 hours'
        )
    ),
    availability_check AS (
        SELECT 
            ts.slot_time,
            ts.slot_time + (total_duration || ' minutes')::INTERVAL as slot_end_time,
            NOT EXISTS (
                SELECT 1 FROM existing_appointments ea
                WHERE (
                    ts.slot_time < ea.appointment_end_time AND 
                    (ts.slot_time + (total_duration || ' minutes')::INTERVAL) > ea.appointment_time
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
END;$function$
;

REATE OR REPLACE FUNCTION public.get_clinic_growth_analytics(
    p_clinic_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date,
    p_include_comparisons boolean DEFAULT true,
    p_include_patient_insights boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
    
    -- ✅ FIXED: Get comprehensive clinic information WITHOUT services_offered
    SELECT 
        c.id,
        c.name,
        c.description,
        c.address,
        c.city,
        c.province,
        c.phone,
        c.email,
        c.website_url,
        c.rating,
        c.total_reviews,
        c.operating_hours,
        c.is_active,
        c.image_url,
        c.timezone,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT sp.user_profile_id) as total_staff,
        COUNT(DISTINCT d.id) as total_doctors
    INTO clinic_info
    FROM clinics c
    LEFT JOIN staff_profiles sp ON c.id = sp.clinic_id AND sp.is_active = true
    LEFT JOIN doctor_clinics dc ON c.id = dc.clinic_id AND dc.is_active = true
    LEFT JOIN doctors d ON dc.doctor_id = d.id AND d.is_available = true
    WHERE c.id = target_clinic_id
    GROUP BY c.id, c.name, c.description, c.address, c.city, c.province, 
             c.phone, c.email, c.website_url, c.rating, c.total_reviews,
             c.operating_hours, c.is_active, c.image_url, c.timezone,
             c.created_at, c.updated_at;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found');
    END IF;
    
    -- ✅ Continue with existing logic for growth_metrics...
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
        AND a.created_at >= date_from - INTERVAL '4 weeks'
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
    
    -- ✅ Competitive analysis (if requested)
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
    
    -- ✅ Patient insights (if requested)
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
                ROUND(AVG(COALESCE(s.min_price, 0) + COALESCE(s.max_price, 0)) / 2, 2) as avg_price
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
    
    -- ✅ FIXED: Build result WITHOUT services_offered
    result := jsonb_build_object(
        'success', true,
        'clinic_info', jsonb_build_object(
            'id', clinic_info.id,
            'name', clinic_info.name,
            'rating', clinic_info.rating,
            'total_reviews', clinic_info.total_reviews,
            'total_staff', clinic_info.total_staff,
            'total_doctors', clinic_info.total_doctors,
            'created_at', clinic_info.created_at
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
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Analytics unavailable: ' || SQLERRM
        );
END;
$function$;
;

CREATE OR REPLACE FUNCTION public.get_clinic_performance_ranking(days_period integer DEFAULT 30, result_limit integer DEFAULT 10)
 RETURNS TABLE(clinic_id uuid, clinic_name character varying, total_appointments bigint, completed_appointments bigint, completion_rate numeric, average_rating numeric, total_reviews integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_clinic_resource_analytics(
    p_clinic_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date,
    p_include_forecasting boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    target_clinic_id UUID;
    clinic_info RECORD;
    date_from DATE;
    date_to DATE;
    result JSONB;
BEGIN
    
    current_context := get_current_user_context();
    
    -- Access control
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    CASE (current_context->>'user_type')
        WHEN 'staff' THEN
            target_clinic_id := COALESCE(p_clinic_id, (current_context->>'clinic_id')::UUID);
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
    
    -- ✅ FIXED: Get clinic resource information WITHOUT services_offered
    SELECT 
        c.id,
        c.name,
        c.address,
        c.phone,
        c.email,
        c.rating,
        c.total_reviews,
        c.operating_hours,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT sp.user_profile_id) as active_staff_count,
        COUNT(DISTINCT dc.doctor_id) as active_doctor_count,
        COUNT(DISTINCT s.id) as available_services_count
    INTO clinic_info
    FROM clinics c
    LEFT JOIN staff_profiles sp ON c.id = sp.clinic_id AND sp.is_active = true
    LEFT JOIN doctor_clinics dc ON c.id = dc.clinic_id AND dc.is_active = true
    LEFT JOIN services s ON c.id = s.clinic_id AND s.is_active = true
    WHERE c.id = target_clinic_id
    GROUP BY c.id, c.name, c.address, c.phone, c.email, c.rating, 
             c.total_reviews, c.operating_hours, c.is_active, 
             c.created_at, c.updated_at;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found');
    END IF;
    
    -- ✅ Build result (simplified for now - full implementation needed)
    result := jsonb_build_object(
        'success', true,
        'clinic_id', target_clinic_id,
        'date_range', jsonb_build_object('from', date_from, 'to', date_to),
        'resource_summary', jsonb_build_object(
            'staff_count', clinic_info.active_staff_count,
            'doctor_count', clinic_info.active_doctor_count,
            'service_count', clinic_info.available_services_count
        ),
        'message', 'Resource analytics available'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Resource analytics unavailable: ' || SQLERRM
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_clinic_timezone(p_clinic_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    clinic_tz VARCHAR(50);
BEGIN
    SELECT timezone INTO clinic_tz FROM clinics WHERE id = p_clinic_id;
    RETURN COALESCE(clinic_tz, 'Asia/Manila');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_staff_clinic_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS user_type
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_cataglog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_doctor_feedback(
    p_doctor_id uuid, 
    p_limit integer DEFAULT 20, 
    p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF p_doctor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Doctor ID is required');
  END IF;
  
  SET LOCAL row_security = off;
  
  WITH doctor_feedback AS (
    SELECT 
      f.id,
      f.doctor_rating,
      f.comment,
      f.is_anonymous,
      f.feedback_type,
      f.created_at,
      f.response,
      f.responded_at,
      CASE 
        WHEN f.is_anonymous THEN NULL
        ELSE up.first_name || ' ' || up.last_name
      END as patient_name,
      CASE 
        WHEN f.is_anonymous THEN NULL
        ELSE up.profile_image_url
      END as patient_image,
      c.name as clinic_name,
      (SELECT jsonb_agg(s.name) 
       FROM appointment_services aps 
       JOIN services s ON aps.service_id = s.id 
       WHERE aps.appointment_id = f.appointment_id
      ) as services
    FROM feedback f
    -- ✅ FIXED: Join users first, then user_profiles
    LEFT JOIN users u ON f.patient_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN clinics c ON f.clinic_id = c.id
    WHERE f.doctor_id = p_doctor_id
    AND f.doctor_rating IS NOT NULL
    AND f.is_public = true
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  doctor_stats AS (
    SELECT
      d.rating,
      d.total_reviews,
      COUNT(*) FILTER (WHERE f.doctor_rating = 5) as five_star,
      COUNT(*) FILTER (WHERE f.doctor_rating = 4) as four_star,
      COUNT(*) FILTER (WHERE f.doctor_rating = 3) as three_star,
      COUNT(*) FILTER (WHERE f.doctor_rating = 2) as two_star,
      COUNT(*) FILTER (WHERE f.doctor_rating = 1) as one_star
    FROM doctors d
    LEFT JOIN feedback f ON f.doctor_id = d.id AND f.doctor_rating IS NOT NULL
    WHERE d.id = p_doctor_id
    GROUP BY d.rating, d.total_reviews
  ),
  total_count AS (
    SELECT COUNT(*) as count
    FROM feedback
    WHERE doctor_id = p_doctor_id
    AND doctor_rating IS NOT NULL
    AND is_public = true
  )
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'feedback', COALESCE((SELECT jsonb_agg(row_to_json(doctor_feedback)) FROM doctor_feedback), '[]'::jsonb),
      'statistics', (SELECT row_to_json(doctor_stats) FROM doctor_stats),
      'pagination', jsonb_build_object(
        'total_count', (SELECT count FROM total_count),
        'limit', p_limit,
        'offset', p_offset
      )
    )
  ) INTO result;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to fetch doctor feedback',
      'details', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_incomplete_staff_signups(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_ongoing_treatments(p_patient_id uuid DEFAULT NULL::uuid, p_include_paused boolean DEFAULT false)
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
  -- Get current user context
  current_context := get_current_user_context();
  
  IF NOT (current_context->>'authenticated')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Determine patient ID
  IF (current_context->>'user_type') = 'patient' THEN
    patient_id_val := (current_context->>'user_id')::UUID;
  ELSIF p_patient_id IS NOT NULL AND (current_context->>'user_type') IN ('staff', 'admin') THEN
    patient_id_val := p_patient_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid patient ID');
  END IF;
  
  -- Get active treatment plans with appointment details
  WITH treatment_details AS (
    SELECT 
      tp.id,
      tp.treatment_name,
      tp.treatment_category,
      tp.description,
      tp.status,
      tp.progress_percentage,
      tp.start_date,
      tp.expected_end_date,
      tp.total_visits_planned,
      tp.visits_completed,
      tp.next_visit_date,
      tp.follow_up_interval_days,
      
      -- Clinic info
      c.name as clinic_name,
      c.address as clinic_address,
      c.phone as clinic_phone,
      
      -- Next appointment info
      a.appointment_date as next_appointment_date,
      a.appointment_time as next_appointment_time,
      a.status as next_appointment_status,
      
      -- Doctor info (if assigned to next appointment)
      d.first_name || ' ' || d.last_name as doctor_name,
      d.specialization as doctor_specialization,
      
      -- Treatment history
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'appointment_id', tpa.appointment_id,
            'visit_number', tpa.visit_number,
            'visit_purpose', tpa.visit_purpose,
            'is_completed', tpa.is_completed,
            'appointment_date', a2.appointment_date,
            'appointment_time', a2.appointment_time
          )
          ORDER BY tpa.visit_number DESC
        )
        FROM treatment_plan_appointments tpa
        JOIN appointments a2 ON tpa.appointment_id = a2.id
        WHERE tpa.treatment_plan_id = tp.id
        LIMIT 5
      ) as recent_visits,
      
      -- Calculate days since last visit
      (
        SELECT CURRENT_DATE - MAX(a3.appointment_date)
        FROM treatment_plan_appointments tpa2
        JOIN appointments a3 ON tpa2.appointment_id = a3.id
        WHERE tpa2.treatment_plan_id = tp.id
        AND a3.status = 'completed'
      ) as days_since_last_visit,
      
      -- Check if overdue for follow-up
      CASE 
        WHEN tp.next_visit_date IS NOT NULL AND tp.next_visit_date < CURRENT_DATE THEN true
        WHEN tp.follow_up_interval_days IS NOT NULL AND (
          SELECT CURRENT_DATE - MAX(a4.appointment_date)
          FROM treatment_plan_appointments tpa3
          JOIN appointments a4 ON tpa3.appointment_id = a4.id
          WHERE tpa3.treatment_plan_id = tp.id
          AND a4.status = 'completed'
        ) > tp.follow_up_interval_days THEN true
        ELSE false
      END as is_overdue
      
    FROM treatment_plans tp
    JOIN clinics c ON tp.clinic_id = c.id
    LEFT JOIN appointments a ON tp.next_visit_appointment_id = a.id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE tp.patient_id = patient_id_val
    AND (
      tp.status = 'active' 
      OR (p_include_paused AND tp.status = 'paused')
    )
    ORDER BY 
      CASE WHEN tp.next_visit_date IS NOT NULL AND tp.next_visit_date < CURRENT_DATE THEN 0 ELSE 1 END,
      tp.next_visit_date ASC NULLS LAST,
      tp.start_date DESC
  )
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'ongoing_treatments', COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'treatment_name', treatment_name,
          'treatment_category', treatment_category,
          'description', description,
          'status', status,
          'progress', jsonb_build_object(
            'percentage', progress_percentage,
            'visits_completed', visits_completed,
            'total_visits_planned', total_visits_planned,
            'completion_ratio', CASE 
              WHEN total_visits_planned > 0 THEN 
                ROUND((visits_completed::NUMERIC / total_visits_planned * 100), 1)
              ELSE NULL
            END
          ),
          'timeline', jsonb_build_object(
            'start_date', start_date,
            'expected_end_date', expected_end_date,
            'days_since_last_visit', days_since_last_visit,
            'is_overdue', is_overdue
          ),
          'clinic', jsonb_build_object(
            'name', clinic_name,
            'address', clinic_address,
            'phone', clinic_phone
          ),
          'next_appointment', CASE 
            WHEN next_appointment_date IS NOT NULL THEN
              jsonb_build_object(
                'date', next_appointment_date,
                'time', next_appointment_time,
                'status', next_appointment_status,
                'doctor', CASE 
                  WHEN doctor_name IS NOT NULL THEN
                    jsonb_build_object(
                      'name', doctor_name,
                      'specialization', doctor_specialization
                    )
                  ELSE NULL
                END
              )
            ELSE NULL
          END,
          'recent_visits', COALESCE(recent_visits, '[]'::jsonb),
          'follow_up_interval_days', follow_up_interval_days,
          'requires_scheduling', next_visit_date IS NULL OR is_overdue,
          'alert_level', CASE 
            WHEN is_overdue THEN 'urgent'
            WHEN next_visit_date IS NOT NULL AND next_visit_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
            ELSE 'normal'
          END
        )
      ), '[]'::jsonb),
      'summary', jsonb_build_object(
        'total_active', COUNT(*),
        'overdue_count', COUNT(*) FILTER (WHERE is_overdue = true),
        'scheduled_count', COUNT(*) FILTER (WHERE next_appointment_date IS NOT NULL),
        'needs_scheduling', COUNT(*) FILTER (WHERE next_visit_date IS NULL OR is_overdue)
      )
    )
  ) INTO result
  FROM treatment_details;
  
  RETURN COALESCE(result, jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'ongoing_treatments', '[]'::jsonb,
      'summary', jsonb_build_object(
        'total_active', 0,
        'overdue_count', 0,
        'scheduled_count', 0,
        'needs_scheduling', 0
      )
    )
  ));
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to retrieve ongoing treatments: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partnership_requests(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_user_context jsonb;
    requests jsonb;
BEGIN
    -- Security check - only admins can access
    current_user_context := get_current_user_context();
    
    IF current_user_context->>'user_type' != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Get requests with filtering
    SELECT jsonb_build_object(
        'success', true,
        'data', COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', cpr.id,
                'clinic_name', cpr.clinic_name,
                'email', cpr.email,
                'address', cpr.address,
                'reason', cpr.reason,
                'status', cpr.status::text,
                'created_at', cpr.created_at,
                'reviewed_by', cpr.reviewed_by,
                'reviewed_at', cpr.reviewed_at,
                'admin_notes', cpr.admin_notes
            )
            ORDER BY cpr.created_at DESC
        ), '[]'::jsonb),
        'total', COUNT(*)::int
    ) INTO requests
    FROM clinic_partnership_requests cpr
    WHERE (p_status IS NULL OR cpr.status::text = p_status)
    LIMIT p_limit OFFSET p_offset;
    
    RETURN requests;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_patient_analytics(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_patient_feedback_history(p_patient_id uuid DEFAULT NULL::uuid, p_include_archived boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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
      f.clinic_rating,
      f.doctor_rating,
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
      a.appointment_date,
      a.appointment_time,
      c.name as clinic_name,
      c.address as clinic_address,
      c.rating as current_clinic_rating,
      c.total_reviews as clinic_total_reviews,
      CASE 
        WHEN f.doctor_id IS NOT NULL 
        THEN d.first_name || ' ' || d.last_name 
        ELSE NULL 
      END as doctor_name,
      d.specialization as doctor_specialization,
      d.rating as current_doctor_rating,
      d.total_reviews as doctor_total_reviews,
      CASE 
        WHEN f.responded_by IS NOT NULL 
        THEN resp_up.first_name || ' ' || resp_up.last_name 
        ELSE NULL 
      END as responder_name,
      (SELECT jsonb_agg(s.name) 
       FROM appointment_services aps 
       JOIN services s ON aps.service_id = s.id 
       WHERE aps.appointment_id = f.appointment_id
      ) as services
    FROM feedback f
    LEFT JOIN appointments a ON f.appointment_id = a.id
    LEFT JOIN clinics c ON f.clinic_id = c.id
    LEFT JOIN doctors d ON f.doctor_id = d.id
    LEFT JOIN user_profiles resp_up ON f.responded_by = resp_up.user_id
    WHERE f.patient_id = patient_id_val
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  total_count AS (
    SELECT COUNT(*) as count
    FROM feedback
    WHERE patient_id = patient_id_val
  )
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'feedback_history', (SELECT jsonb_agg(row_to_json(feedback_data)) FROM feedback_data),
      'total_count', (SELECT count FROM total_count),
      'limit', p_limit,
      'offset', p_offset
    )
  ) INTO result;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to fetch feedback history',
      'details', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_patient_health_analytics(p_patient_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_patient_ongoing_treatments_for_booking(p_patient_id uuid, p_clinic_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    current_context JSONB;
    result JSONB;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    -- Only allow patients to see their own treatments
    IF (current_context->>'user_type') = 'patient' AND 
       (current_context->>'user_id')::UUID != p_patient_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
    
    -- ✅ OPTIMIZED: Filter by clinic_id in SQL (not client-side)
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'has_ongoing_treatments', COUNT(*) > 0,
            'treatments', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', tp.id,
                    'treatment_name', tp.treatment_name,
                    'treatment_category', tp.treatment_category,
                    'clinic_name', c.name,
                    'clinic_id', tp.clinic_id,
                    'visits_completed', tp.visits_completed,
                    'total_visits_planned', tp.total_visits_planned,
                    'progress_percentage', tp.progress_percentage,
                    'next_visit_due', tp.next_visit_date,
                    'is_overdue', CASE 
                        WHEN tp.next_visit_date IS NOT NULL AND tp.next_visit_date < CURRENT_DATE THEN true
                        ELSE false
                    END
                )
            ), '[]'::jsonb)
        )
    ) INTO result
    FROM treatment_plans tp
    JOIN clinics c ON tp.clinic_id = c.id
    WHERE tp.patient_id = p_patient_id
    AND tp.status = 'active'
    AND (p_clinic_id IS NULL OR tp.clinic_id = p_clinic_id);  -- ✅ NEW: Clinic filter
    
    RETURN COALESCE(result, jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'has_ongoing_treatments', false,
            'treatments', '[]'::jsonb
        )
    ));
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Failed to fetch ongoing treatments: ' || SQLERRM
        );
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.get_qualified_doctors_for_service(p_service_id uuid, p_clinic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'doctor_id', d.id,
                'doctor_name', d.first_name || ' ' || d.last_name,
                'specialization', d.specialization,
                'consultation_fee', d.consultation_fee,
                'is_primary', ds.is_primary_provider,
                'proficiency', ds.proficiency_level
            )
        ), '[]'::jsonb)
        FROM doctor_services ds
        JOIN doctors d ON ds.doctor_id = d.id
        WHERE ds.service_id = p_service_id
        AND ds.clinic_id = p_clinic_id
        AND d.is_available = true
    );
END;
$function$
;

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
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User not authenticated'
        );
    END IF;
    
    IF (current_context->>'user_type') NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Staff or Admin access required'
        );
    END IF;
    
    IF p_clinic_id IS NULL THEN
        SELECT sp.clinic_id INTO staff_clinic_id
        FROM staff_profiles sp
        JOIN user_profiles up ON sp.user_profile_id = up.id
        WHERE up.user_id = (current_context->>'user_id')::UUID
        AND sp.is_active = true
        LIMIT 1;
        
        IF staff_clinic_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'No active clinic association found'
            );
        END IF;
    ELSE
        staff_clinic_id := p_clinic_id;
    END IF;
    
    SET LOCAL row_security = off;
    
    WITH feedback_data AS (
        SELECT 
            f.id,
            f.rating,
            f.clinic_rating,
            f.doctor_rating,
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
            f.patient_id,
            -- ✅ FIXED: Join users AND user_profiles to get both email and profile data
            CASE 
                WHEN f.is_anonymous THEN NULL
                ELSE COALESCE(up.first_name || ' ' || up.last_name, 'Anonymous Patient')
            END as patient_name,
            CASE 
                WHEN f.is_anonymous THEN NULL
                ELSE u.email  -- ✅ Get email from users table
            END as patient_email,
            CASE 
                WHEN f.is_anonymous THEN NULL
                ELSE up.profile_image_url  -- ✅ Get image from user_profiles table
            END as patient_image,
            a.appointment_date,
            a.appointment_time,
            CASE 
                WHEN f.doctor_id IS NOT NULL 
                THEN d.first_name || ' ' || d.last_name 
                ELSE NULL 
            END as doctor_name,
            d.specialization as doctor_specialization,
            d.rating as current_doctor_rating,
            d.total_reviews as doctor_total_reviews,
            CASE 
                WHEN f.responded_by IS NOT NULL 
                THEN resp_up.first_name || ' ' || resp_up.last_name 
                ELSE NULL 
            END as responder_name,
            (SELECT jsonb_agg(s.name) 
             FROM appointment_services aps 
             JOIN services s ON aps.service_id = s.id 
             WHERE aps.appointment_id = f.appointment_id
            ) as services
        FROM feedback f
        LEFT JOIN appointments a ON f.appointment_id = a.id
        -- ✅ CRITICAL FIX: Join both users AND user_profiles
        LEFT JOIN users u ON f.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN doctors d ON f.doctor_id = d.id
        LEFT JOIN user_profiles resp_up ON f.responded_by = resp_up.user_id
        WHERE f.clinic_id = staff_clinic_id
        ORDER BY f.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ),
    statistics AS (
        SELECT
            COUNT(*) as total_feedback,
            COUNT(*) FILTER (WHERE clinic_rating IS NOT NULL) as clinic_ratings_count,
            COUNT(*) FILTER (WHERE doctor_rating IS NOT NULL) as doctor_ratings_count,
            ROUND(AVG(COALESCE(clinic_rating, 0))::NUMERIC, 2) as avg_clinic_rating,
            ROUND(AVG(COALESCE(doctor_rating, 0))::NUMERIC, 2) as avg_doctor_rating,
            COUNT(*) FILTER (WHERE response IS NOT NULL) as responded_count,
            COUNT(*) FILTER (WHERE response IS NULL) as pending_responses
        FROM feedback
        WHERE clinic_id = staff_clinic_id
    ),
    total_count AS (
        SELECT COUNT(*) as count
        FROM feedback
        WHERE clinic_id = staff_clinic_id
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'feedback_list', COALESCE((SELECT jsonb_agg(row_to_json(feedback_data)) FROM feedback_data), '[]'::jsonb),
            'statistics', (SELECT row_to_json(statistics) FROM statistics),
            'pagination', jsonb_build_object(
                'total_count', (SELECT count FROM total_count),
                'limit', p_limit,
                'offset', p_offset,
                'has_more', (SELECT count FROM total_count) > (p_offset + p_limit)
            ),
            'clinic_id', staff_clinic_id
        )
    ) INTO result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to fetch feedback list',
            'details', SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$function$;

-- 3️⃣ Grant permissions
GRANT EXECUTE ON FUNCTION get_staff_feedback_list TO authenticated;
GRANT EXECUTE ON FUNCTION get_doctor_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_feedback TO authenticated;

CREATE OR REPLACE FUNCTION public.get_staff_invitation_status(p_invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_staff_invitations(p_clinic_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_staff_performance_analytics(p_staff_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_include_comparisons boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_appointments(p_status text[] DEFAULT NULL::text[], p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_user_auth_status(p_auth_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_location()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    user_id_val UUID;
    patient_location GEOGRAPHY;
    result JSONB;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN current_context;
    END IF;
    
    user_id_val := (current_context->>'user_id')::UUID;
    
    -- Get patient preferred location
    SELECT pp.preferred_location INTO patient_location
    FROM patient_profiles pp
    JOIN user_profiles up ON pp.user_profile_id = up.id
    WHERE up.user_id = user_id_val;
    
    IF patient_location IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'has_location', false,
                'message', 'No location set',
                'suggestion', 'Please set your location for better clinic discovery'
            )
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'has_location', true,
            'latitude', ST_Y(patient_location::geometry),
            'longitude', ST_X(patient_location::geometry),
            'location_type', 'preferred_location'
        )
    );
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.get_users_list(p_user_type user_type DEFAULT NULL::user_type, p_clinic_id uuid DEFAULT NULL::uuid, p_search_term text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_email_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_phone_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_profile_complete(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.manage_appointment_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.manage_partnership_request(p_request_id uuid, p_action text, p_admin_notes text DEFAULT NULL::text, p_clinic_data jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_user_context JSONB;
    request_record RECORD;
    new_clinic_id UUID;
    invitation_result JSONB;
    clinic_name_parts TEXT[];
    first_name TEXT;
    last_name TEXT;
BEGIN
    -- Security check
    current_user_context := get_current_user_context();
    
    IF NOT (current_user_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF (current_user_context->>'user_type') != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
    END IF;
    
    -- Get request details
    SELECT * INTO request_record 
    FROM clinic_partnership_requests 
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Partnership request not found or already processed');
    END IF;
    
    -- Validate action
    IF p_action NOT IN ('approve', 'reject') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Use approve or reject');
    END IF;
    
    -- Handle approval
    IF p_action = 'approve' THEN
        -- Create clinic first
        INSERT INTO clinics (
            name,
            description,
            address,
            city,
            province,
            country,
            email,
            location,
            is_active
        ) VALUES (
            request_record.clinic_name,
            'Clinic created from partnership request',
            request_record.address,
            'San Jose Del Monte', -- Default city
            'Bulacan', -- Default province  
            'Philippines',
            request_record.email,
            ST_GeomFromText('POINT(121.0447 14.8113)', 4326), -- Default SJDM coordinates
            true
        ) RETURNING id INTO new_clinic_id;
        
        -- Extract first and last name from clinic name or email
        -- Simple logic: if email has a name part, use it; otherwise use clinic name
        IF position('@' in request_record.email) > 1 THEN
            first_name := split_part(split_part(request_record.email, '@', 1), '.', 1);
            last_name := COALESCE(split_part(split_part(request_record.email, '@', 1), '.', 2), 'Staff');
        ELSE
            first_name := split_part(request_record.clinic_name, ' ', 1);
            last_name := 'Staff';
        END IF;
        
        -- Create staff invitation
        invitation_result := create_staff_invitation(
            request_record.email,
            new_clinic_id,
            'Clinic Manager', -- Default position
            'Administration', -- Default department
            first_name,
            last_name
        );
        
        IF NOT (invitation_result->>'success')::boolean THEN
            -- Rollback clinic creation if invitation fails
            DELETE FROM clinics WHERE id = new_clinic_id;
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
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Partnership request approved successfully',
            'clinic_id', new_clinic_id,
            'invitation_data', invitation_result
        );
        
    -- Handle rejection
    ELSE
        UPDATE clinic_partnership_requests 
        SET 
            status = 'rejected',
            admin_notes = p_admin_notes,
            reviewed_by = (current_user_context->>'user_id')::uuid,
            reviewed_at = NOW()
        WHERE id = p_request_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Partnership request rejected'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to process request: ' || SQLERRM);
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.manage_ui_components(p_action text, p_component_id uuid DEFAULT NULL::uuid, p_component_data jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

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
$function$
;

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
$function$
;

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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.protect_email_communications_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.queue_staff_invitation_email(p_invitation_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    queue_id UUID;
    invitation_link TEXT;
    email_body TEXT;
BEGIN
    -- Build invitation link
    invitation_link := format(
        '%s/staff-signup?invitation=%s&token=%s',
        'http://localhost:5173', -- Replace with your domain
        p_invitation_data->>'invitation_id',
        p_invitation_data->>'invitation_token'
    );
    
    -- Build email body
    email_body := format(
        'Hello %s,

You have been invited to join %s as %s.

Your temporary login credentials:
Email: %s
Password: %s

Please click the link below to complete your registration:
%s

This invitation expires on %s.

Best regards,
DentServe Team',
        COALESCE(p_invitation_data->>'first_name', 'there'),
        p_invitation_data->>'clinic_name',
        p_invitation_data->>'position',
        p_invitation_data->>'email',
        p_invitation_data->>'temp_password',
        invitation_link,
        p_invitation_data->>'expires_at'
    );
    
    -- Queue email
    INSERT INTO email_queue (
        to_email,
        subject,
        body_text,
        email_type,
        priority,
        metadata
    ) VALUES (
        p_invitation_data->>'email',
        'Staff Invitation - ' || (p_invitation_data->>'clinic_name'),
        email_body,
        'staff_invitation',
        2, -- High priority
        p_invitation_data
    ) RETURNING id INTO queue_id;
    
    RETURN queue_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reject_appointment(p_appointment_id uuid, p_rejection_reason text, p_rejection_category rejection_category DEFAULT 'other'::rejection_category, p_suggest_reschedule boolean DEFAULT true, p_alternative_dates date[] DEFAULT NULL::date[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.reject_partnership_request(p_request_id uuid, p_admin_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_user_context jsonb;
    request_record record;
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
    
    -- Update request status
    UPDATE clinic_partnership_requests 
    SET 
        status = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_by = (current_user_context->>'user_id')::uuid,
        reviewed_at = NOW()
    WHERE id = p_request_id;
    
    -- Create notification record (without metadata column)
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        created_at
    ) VALUES (
        (current_user_context->>'user_id')::uuid,
        'partnership_request',
        'Partnership Request Rejected',
        format('Partnership request for %s has been rejected. %s', 
            request_record.clinic_name,
            CASE 
                WHEN p_admin_notes IS NOT NULL THEN 'Reason: ' || p_admin_notes
                ELSE 'Please contact us if you have any questions.'
            END
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Partnership request rejected successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to reject partnership request: ' || SQLERRM
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.respond_to_feedback(
    p_feedback_id uuid,
    p_response text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
DECLARE
    current_context JSONB;
    staff_clinic_id UUID;
    feedback_record RECORD;
BEGIN
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') NOT IN ('staff', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff or Admin access required');
    END IF;
    
    SELECT sp.clinic_id INTO staff_clinic_id
    FROM staff_profiles sp
    JOIN user_profiles up ON sp.user_profile_id = up.id
    WHERE up.user_id = (current_context->>'user_id')::UUID
    AND sp.is_active = true;
    
    IF staff_clinic_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No clinic association found');
    END IF;
    
    SET LOCAL row_security = off;
    
    SELECT 
        f.patient_id,
        f.appointment_id,
        f.clinic_id,
        f.doctor_id
    INTO feedback_record
    FROM feedback f
    WHERE f.id = p_feedback_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feedback not found');
    END IF;
    
    IF feedback_record.clinic_id != staff_clinic_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied - feedback belongs to different clinic');
    END IF;
    
    -- Update feedback with response
    UPDATE feedback
    SET 
        response = p_response,
        responded_by = (current_context->>'user_id')::UUID,
        responded_at = NOW()
    WHERE id = p_feedback_id;
    
    -- ✅ FIXED: Use correct column names
    INSERT INTO notifications (
        user_id,
        notification_type,    -- ✅ FIXED: was 'type'
        title,
        message,
        related_appointment_id
        -- ✅ REMOVED: metadata column doesn't exist
    ) VALUES (
        feedback_record.patient_id,
        'feedback_response',
        'Response to Your Feedback',
        'The clinic has responded to your feedback. Check it out!',
        feedback_record.appointment_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Response sent successfully',
        'patient_notified', true
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to respond to feedback',
            'details', SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION respond_to_feedback TO authenticated;

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
$function$
;

CREATE OR REPLACE FUNCTION public.send_batch_profile_completion_reminders(p_days_before_expiry integer DEFAULT 2)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.send_profile_completion_reminder(p_invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.send_reschedule_reminder(p_appointment_id uuid, p_reason text, p_suggested_dates date[] DEFAULT NULL::date[])
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
    current_user_id UUID;
    patient_contact RECORD;
    reminder_message TEXT;
BEGIN
    -- ✅ Get current user context
    current_context := get_current_user_context();
    
    IF NOT (current_context->>'authenticated')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    v_current_role := current_context->>'user_type';
    current_user_id := (current_context->>'user_id')::UUID;
    
    -- ✅ Only staff can send reschedule reminders
    IF v_current_role != 'staff' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Staff only');
    END IF;
    
    clinic_id_val := (current_context->>'clinic_id')::UUID;
    
    -- ✅ Input validation
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment ID is required');
    END IF;
    
    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reason is required');
    END IF;
    
    -- ✅ Get appointment details with patient info
    SELECT 
        a.id,
        a.patient_id,
        a.clinic_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        c.name as clinic_name,
        c.phone as clinic_phone,
        c.email as clinic_email,
        up.first_name || ' ' || up.last_name as patient_name,
        u.email as patient_email,
        u.phone as patient_phone,
        COALESCE(d.first_name || ' ' || d.last_name, 'Dr. ' || d.specialization) as doctor_name
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
    
    -- ✅ Verify appointment is cancelled (can only send reminder for cancelled appointments)
    IF appointment_record.status != 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Can only send reschedule reminder for cancelled appointments. Current status: %s', appointment_record.status)
        );
    END IF;
    
    -- ✅ Build reminder message
    reminder_message := format(
        'Your appointment on %s at %s was cancelled. Reason: %s. You can reschedule your appointment at your convenience. Please contact us at %s or book online.',
        appointment_record.appointment_date::text,
        appointment_record.appointment_time::text,
        p_reason,
        COALESCE(appointment_record.clinic_phone, appointment_record.clinic_email, 'the clinic')
    );
    
    -- ✅ Add suggested dates if provided
    IF p_suggested_dates IS NOT NULL AND array_length(p_suggested_dates, 1) > 0 THEN
        reminder_message := reminder_message || E'\n\nSuggested available dates: ' || 
            array_to_string(p_suggested_dates, ', ');
    END IF;
    
    -- ✅ Create notification for patient
    BEGIN
        INSERT INTO notifications (
            user_id,
            notification_type,
            title,
            message,
            related_appointment_id,
            scheduled_for,
            created_at
        ) VALUES (
            appointment_record.patient_id,
            'appointment_cancelled',
            'Appointment Cancellation - Reschedule Available',
            reminder_message,
            p_appointment_id,
            NOW(),
            NOW()
        );
        
        -- ✅ Log analytics event
        INSERT INTO analytics_events (
            clinic_id,
            user_id,
            event_type,
            metadata
        ) VALUES (
            clinic_id_val,
            current_user_id,
            'reschedule_reminder_sent',
            jsonb_build_object(
                'appointment_id', p_appointment_id,
                'patient_id', appointment_record.patient_id,
                'suggested_dates_count', COALESCE(array_length(p_suggested_dates, 1), 0)
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to create reschedule reminder notification: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to send notification: ' || SQLERRM);
    END;
    
    -- ✅ Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reschedule reminder sent successfully',
        'data', jsonb_build_object(
            'appointment_id', p_appointment_id,
            'patient_name', appointment_record.patient_name,
            'patient_email', appointment_record.patient_email,
            'notification_sent', true
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in send_reschedule_reminder: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to send reschedule reminder: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_staff_invitation_email(p_invitation_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    queue_id UUID;
BEGIN
    -- Log email to queue table for backup/tracking
    INSERT INTO email_queue (
        to_email,
        subject,
        body,
        email_type,
        status
    ) VALUES (
        p_invitation_data->>'email',
        format('Welcome to %s - Complete Your Registration', p_invitation_data->>'clinic_name'),
        'Email content will be generated by backend',
        'staff_invitation',
        'queued_for_backend'
    ) RETURNING id INTO queue_id;
    
    -- Return data needed for backend email service
    RETURN jsonb_build_object(
        'success', true,
        'queue_id', queue_id,
        'to_email', p_invitation_data->>'email',
        'subject', format('Welcome to %s - Complete Your Registration', p_invitation_data->>'clinic_name'),
        'clinic_name', p_invitation_data->>'clinic_name',
        'position', p_invitation_data->>'position',
        'first_name', p_invitation_data->>'first_name',
        'last_name', p_invitation_data->>'last_name',
        'invitation_id', p_invitation_data->>'invitation_id',
        'invitation_token', p_invitation_data->>'invitation_token'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to prepare email: ' || SQLERRM
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_clinic_partnership_request(p_clinic_name character varying, p_email character varying, p_address text, p_reason text, p_staff_name character varying DEFAULT NULL::character varying, p_contact_number character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    request_id UUID;
    admin_users UUID[];
    existing_request_id UUID;
BEGIN
    -- Check if request with this email already exists and is pending
    SELECT id INTO existing_request_id 
    FROM clinic_partnership_requests 
    WHERE email = p_email AND status = 'pending';
    
    IF existing_request_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'A pending partnership request already exists for this email'
        );
    END IF;
    
    -- Rate limiting check (max 3 per day per email)
    IF (
        SELECT COUNT(*) 
        FROM clinic_partnership_requests 
        WHERE email = p_email 
        AND created_at >= CURRENT_DATE 
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    ) >= 3 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Rate limit exceeded. Maximum 3 applications per day allowed.'
        );
    END IF;
    
    -- Insert partnership request (using existing table structure)
    INSERT INTO clinic_partnership_requests (
        clinic_name,
        email,
        address,
        reason,
        status
    ) VALUES (
        p_clinic_name,
        p_email,
        p_address,
        p_reason,
        'pending'
    ) RETURNING id INTO request_id;
    
    -- Get all admin users for notification
    SELECT ARRAY_AGG(u.id) INTO admin_users
    FROM users u 
    JOIN user_profiles up ON u.id = up.user_id
    WHERE up.user_type = 'admin' AND u.is_active = true;
    
    -- Create notifications for all admins
    IF admin_users IS NOT NULL AND array_length(admin_users, 1) > 0 THEN
        INSERT INTO notifications (user_id, notification_type, title, message)
        SELECT 
            unnest(admin_users),
            'partnership_request',
            'New Partnership Application',
            format('New partnership application from %s (%s) for clinic: %s', 
                   COALESCE(p_staff_name, 'Staff'), p_email, p_clinic_name);
    END IF;
    
    -- Log the request
    RAISE LOG 'Partnership request submitted: %, %, %', request_id, p_email, p_clinic_name;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Partnership application submitted successfully',
        'request_id', request_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Failed to submit partnership request: ' || SQLERRM
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_feedback(p_clinic_rating integer DEFAULT NULL::integer, p_doctor_rating integer DEFAULT NULL::integer, p_comment text DEFAULT NULL::text, p_appointment_id uuid DEFAULT NULL::uuid, p_feedback_type feedback_type DEFAULT 'general'::feedback_type, p_is_anonymous boolean DEFAULT false)
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
    doctor_record RECORD;
    feedback_id UUID;
    existing_feedback_count INTEGER;
    doctor_id_val UUID;
    clinic_id_val UUID;
    avg_rating NUMERIC;
BEGIN
    current_context := get_current_user_context();
    
    -- Only authenticated patients can submit feedback
    IF NOT (current_context->>'authenticated')::boolean OR 
       (current_context->>'user_type') != 'patient' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient access required');
    END IF;
    
    patient_id_val := (current_context->>'user_id')::UUID;
    
    -- ✅ REQUIRE APPOINTMENT
    IF p_appointment_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Feedback requires a completed appointment. Please select an appointment to review.'
        );
    END IF;
    
    -- ✅ VALIDATION: At least one rating must be provided
    IF p_clinic_rating IS NULL AND p_doctor_rating IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'At least one rating (clinic or doctor) is required');
    END IF;
    
    -- Validate clinic rating range
    IF p_clinic_rating IS NOT NULL AND (p_clinic_rating < 1 OR p_clinic_rating > 5) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic rating must be between 1 and 5');
    END IF;
    
    -- Validate doctor rating range
    IF p_doctor_rating IS NOT NULL AND (p_doctor_rating < 1 OR p_doctor_rating > 5) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor rating must be between 1 and 5');
    END IF;
    
    -- Validate comment
    IF p_comment IS NULL OR TRIM(p_comment) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comment is required');
    END IF;
    
    IF LENGTH(p_comment) > 1000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comment must be under 1000 characters');
    END IF;
    
    IF LENGTH(TRIM(p_comment)) < 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comment must be at least 10 characters');
    END IF;
    
    -- ✅ GET AND VALIDATE APPOINTMENT
    SELECT 
        a.id,
        a.clinic_id,
        a.doctor_id,
        a.status,
        a.appointment_date,
        a.appointment_time,
        c.name as clinic_name,
        c.is_active as clinic_active,
        c.rating as clinic_current_rating,
        c.total_reviews as clinic_total_reviews
    INTO appointment_record
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    WHERE a.id = p_appointment_id
    AND a.patient_id = patient_id_val;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Appointment not found or you do not have permission to review it'
        );
    END IF;
    
    -- ✅ ONLY ALLOW FEEDBACK FOR COMPLETED APPOINTMENTS
    IF appointment_record.status != 'completed' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Feedback can only be submitted for completed appointments',
            'current_status', appointment_record.status,
            'message', 'Please wait until your appointment is marked as completed'
        );
    END IF;
    
    clinic_id_val := appointment_record.clinic_id;
    doctor_id_val := appointment_record.doctor_id;
    
    -- ✅ VALIDATION: If doctor_rating provided but no doctor in appointment
    IF p_doctor_rating IS NOT NULL AND doctor_id_val IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Cannot rate doctor - no doctor was assigned to this appointment'
        );
    END IF;
    
    -- ✅ CHECK FOR DUPLICATE FEEDBACK ON SAME APPOINTMENT
    SELECT COUNT(*) INTO existing_feedback_count
    FROM feedback
    WHERE appointment_id = p_appointment_id
    AND patient_id = patient_id_val;
    
    IF existing_feedback_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'You have already submitted feedback for this appointment',
            'message', 'Each appointment can only be reviewed once'
        );
    END IF;
    
    -- ✅ Get doctor information if exists
    IF doctor_id_val IS NOT NULL THEN
        SELECT 
            d.id,
            d.first_name || ' ' || d.last_name as doctor_name,
            d.specialization,
            d.rating as current_doctor_rating,
            d.total_reviews as current_doctor_reviews,
            d.is_available
        INTO doctor_record
        FROM doctors d
        WHERE d.id = doctor_id_val;
        
        IF NOT FOUND THEN
            RAISE WARNING 'Doctor record not found for doctor_id: %', doctor_id_val;
        END IF;
    END IF;
    
    -- ✅ RATE LIMITING: Max 3 feedback per day (prevent spam)
    SELECT COUNT(*) INTO existing_feedback_count
    FROM feedback
    WHERE patient_id = patient_id_val
    AND created_at >= CURRENT_DATE;
    
    IF existing_feedback_count >= 3 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Maximum 3 feedback submissions per day reached. Please try again tomorrow.'
        );
    END IF;
    
    -- ✅ Calculate average rating for legacy 'rating' field
    IF p_clinic_rating IS NOT NULL AND p_doctor_rating IS NOT NULL THEN
        avg_rating := ROUND((p_clinic_rating + p_doctor_rating) / 2.0);
    ELSIF p_clinic_rating IS NOT NULL THEN
        avg_rating := p_clinic_rating;
    ELSE
        avg_rating := p_doctor_rating;
    END IF;
    
    -- ✅ INSERT FEEDBACK with dual ratings
    INSERT INTO feedback (
        patient_id,
        clinic_id,
        doctor_id,
        appointment_id,
        feedback_type,
        rating,
        clinic_rating,
        doctor_rating,
        comment,
        is_anonymous,
        is_public
    ) VALUES (
        patient_id_val,
        clinic_id_val,
        doctor_id_val,
        p_appointment_id,
        p_feedback_type,
        avg_rating,
        p_clinic_rating,
        p_doctor_rating,
        TRIM(p_comment),
        COALESCE(p_is_anonymous, false),
        NOT COALESCE(p_is_anonymous, false)
    ) RETURNING id INTO feedback_id;
    
    -- ✅ CORRECTED: CREATE NOTIFICATIONS for clinic staff
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        related_appointment_id  -- ✅ FIXED: Correct column name
    )
    SELECT 
        u.id,
        'feedback_request'::notification_type,
        CASE 
            WHEN avg_rating >= 4 THEN '🌟 New Positive Feedback'
            WHEN avg_rating = 3 THEN '📝 New Feedback Received'
            ELSE '⚠️ Feedback Needs Attention'
        END,
        format(
            'New feedback for appointment on %s%s%s: "%s"',
            TO_CHAR(appointment_record.appointment_date, 'Mon DD, YYYY'),
            CASE WHEN p_clinic_rating IS NOT NULL THEN format(' | Clinic: %s★', p_clinic_rating) ELSE '' END,
            CASE WHEN p_doctor_rating IS NOT NULL THEN format(' | Doctor: %s★', p_doctor_rating) ELSE '' END,
            LEFT(p_comment, 80) || CASE WHEN LENGTH(p_comment) > 80 THEN '...' ELSE '' END
        ),
        p_appointment_id  -- ✅ Link to appointment
    FROM staff_profiles sp
    JOIN user_profiles up ON sp.user_profile_id = up.id
    JOIN users u ON up.user_id = u.id
    WHERE sp.clinic_id = clinic_id_val 
    AND sp.is_active = true;
    
    -- ✅ ANALYTICS EVENT
    INSERT INTO analytics_events (
        clinic_id,
        user_id,
        event_type,
        metadata
    ) VALUES (
        clinic_id_val,
        patient_id_val,
        'feedback_submitted',
        jsonb_build_object(
            'feedback_id', feedback_id,
            'appointment_id', p_appointment_id,
            'clinic_rating', p_clinic_rating,
            'doctor_rating', p_doctor_rating,
            'average_rating', avg_rating,
            'doctor_id', doctor_id_val,
            'is_anonymous', COALESCE(p_is_anonymous, false),
            'feedback_type', p_feedback_type,
            'comment_length', LENGTH(p_comment),
            'has_clinic_rating', p_clinic_rating IS NOT NULL,
            'has_doctor_rating', p_doctor_rating IS NOT NULL,
            'appointment_date', appointment_record.appointment_date
        )
    );
    
    -- ✅ RETURN SUCCESS with detailed information
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Thank you for your feedback! Your review helps us improve our service.',
        'data', jsonb_build_object(
            'feedback_id', feedback_id,
            'submitted_at', NOW(),
            'appointment', jsonb_build_object(
                'id', appointment_record.id,
                'date', appointment_record.appointment_date,
                'time', appointment_record.appointment_time
            ),
            'clinic_info', jsonb_build_object(
                'id', clinic_id_val,
                'name', appointment_record.clinic_name,
                'previous_rating', appointment_record.clinic_current_rating,
                'total_reviews', appointment_record.clinic_total_reviews,
                'your_rating', p_clinic_rating
            ),
            'doctor_info', CASE 
                WHEN doctor_record.id IS NOT NULL THEN jsonb_build_object(
                    'id', doctor_record.id,
                    'name', doctor_record.doctor_name,
                    'specialization', doctor_record.specialization,
                    'previous_rating', doctor_record.current_doctor_rating,
                    'total_reviews', doctor_record.current_doctor_reviews,
                    'your_rating', p_doctor_rating
                )
                ELSE NULL
            END,
            'average_rating', avg_rating,
            'staff_notified', true
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error submitting feedback: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'An error occurred while submitting feedback',
            'details', SQLERRM
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.track_appointment_deletion_in_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE patient_medical_history 
    SET appointment_deleted_at = NOW()
    WHERE appointment_id = OLD.id;
    
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_update_treatment_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM update_treatment_plan_progress(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_admin_profile(p_profile_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
    current_context JSONB;
    admin_user_id UUID;
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
    
    -- 1️⃣ UPDATE BASE USER DATA
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
    
    -- 3️⃣ ENSURE ADMIN PROFILE EXISTS (basic info only)
    INSERT INTO admin_profiles (user_profile_id, created_at)
    VALUES (profile_id, NOW())
    ON CONFLICT (user_profile_id) DO UPDATE SET updated_at = NOW();
    
    result := result || jsonb_build_object('admin_profile_updated', true);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Admin profile updated successfully',
        'updates', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_clinic_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  clinic_uuid UUID;
BEGIN
  -- Get clinic_id from NEW or OLD record
  clinic_uuid := COALESCE(NEW.clinic_id, OLD.clinic_id);
  
  UPDATE public.clinics 
  SET
    rating = (
      SELECT COALESCE(ROUND(AVG(clinic_rating)::NUMERIC, 2), 0.00)
      FROM public.feedback
      WHERE clinic_id = clinic_uuid
      AND clinic_rating IS NOT NULL
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.feedback
      WHERE clinic_id = clinic_uuid
      AND clinic_rating IS NOT NULL
    ),
    updated_at = NOW()
  WHERE id = clinic_uuid;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating clinic rating for clinic_id %: %', clinic_uuid, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_doctor_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  doctor_uuid UUID;
BEGIN
  -- Get doctor_id from NEW or OLD record
  doctor_uuid := COALESCE(NEW.doctor_id, OLD.doctor_id);
  
  -- Only update if doctor_id exists
  IF doctor_uuid IS NOT NULL THEN
    UPDATE public.doctors 
    SET
      rating = (
        SELECT COALESCE(ROUND(AVG(doctor_rating)::NUMERIC, 2), 0.00)
        FROM public.feedback
        WHERE doctor_id = doctor_uuid
        AND doctor_rating IS NOT NULL
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM public.feedback
        WHERE doctor_id = doctor_uuid
        AND doctor_rating IS NOT NULL
      ),
      updated_at = NOW()
    WHERE id = doctor_uuid;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating doctor rating for doctor_id %: %', doctor_uuid, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.update_staff_complete_profile_v2(p_profile_data jsonb DEFAULT '{}'::jsonb, p_clinic_data jsonb DEFAULT '{}'::jsonb, p_services_data jsonb DEFAULT '[]'::jsonb, p_doctors_data jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog', 'auth'
AS $function$
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
    doctor_record JSONB;
    services_created INTEGER := 0;
    doctors_created INTEGER := 0;
    new_doctor_id UUID;
BEGIN
    -- ✅ Get auth user ID directly
    current_auth_uid := auth.uid();
    
    IF current_auth_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- ✅ Get user even if is_active = false
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
            true,
            NOW()
        );
    ELSE
        UPDATE staff_profiles 
        SET 
            is_active = true,
            updated_at = NOW()
        WHERE id = invitation_record.staff_profile_id;
    END IF;
    
    -- ========================================
    -- 4️⃣ UPDATE CLINIC INFORMATION (🆕 WITH IMAGE)
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
            image_url = p_clinic_data->>'image_url',  -- 🆕 ADD CLINIC IMAGE
            operating_hours = CASE 
                WHEN p_clinic_data ? 'operating_hours'
                THEN p_clinic_data->'operating_hours'
                ELSE operating_hours
            END,
            is_active = true,
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
    -- 🆕 6️⃣ CREATE DOCTORS IN DOCTORS TABLE (WITH IMAGES)
    -- ========================================
    IF jsonb_typeof(p_doctors_data) = 'array' AND jsonb_array_length(p_doctors_data) > 0 THEN
        FOR doctor_record IN SELECT * FROM jsonb_array_elements(p_doctors_data)
        LOOP
            IF doctor_record->>'first_name' IS NOT NULL 
               AND doctor_record->>'last_name' IS NOT NULL 
               AND doctor_record->>'license_number' IS NOT NULL THEN
                
                -- Insert doctor
                INSERT INTO doctors (
                    first_name,
                    last_name,
                    license_number,
                    specialization,
                    education,
                    experience_years,
                    bio,
                    consultation_fee,
                    image_url,  -- 🆕 ADD DOCTOR IMAGE
                    languages_spoken,
                    is_available,
                    created_at
                ) VALUES (
                    doctor_record->>'first_name',
                    doctor_record->>'last_name',
                    doctor_record->>'license_number',
                    COALESCE(doctor_record->>'specialization', 'General Dentistry'),
                    doctor_record->>'education',
                    CASE 
                        WHEN doctor_record->>'experience_years' IS NOT NULL 
                        THEN (doctor_record->>'experience_years')::integer 
                        ELSE NULL 
                    END,
                    doctor_record->>'bio',
                    CASE 
                        WHEN doctor_record->>'consultation_fee' IS NOT NULL 
                        THEN (doctor_record->>'consultation_fee')::numeric 
                        ELSE NULL 
                    END,
                    doctor_record->>'image_url',  -- 🆕 DOCTOR IMAGE URL
                    CASE 
                        WHEN doctor_record->'languages_spoken' IS NOT NULL 
                        THEN ARRAY(SELECT jsonb_array_elements_text(doctor_record->'languages_spoken'))
                        ELSE ARRAY['English']::text[]
                    END,
                    COALESCE((doctor_record->>'is_available')::boolean, true),
                    NOW()
                ) RETURNING id INTO new_doctor_id;
                
                -- Link doctor to clinic
                INSERT INTO doctor_clinics (
                    doctor_id,
                    clinic_id,
                    is_active,
                    created_at
                ) VALUES (
                    new_doctor_id,
                    clinic_id_val,
                    true,
                    NOW()
                );
                
                doctors_created := doctors_created + 1;
            END IF;
        END LOOP;
    END IF;
    
    -- ========================================
    -- 7️⃣ ACTIVATE USER & MARK INVITATION AS COMPLETED
    -- ========================================
    
    UPDATE users
    SET 
        is_active = true,
        updated_at = NOW()
    WHERE id = user_id_val;
    
    UPDATE staff_invitations 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- ========================================
    -- 8️⃣ RETURN SUCCESS RESPONSE
    -- ========================================
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile completed successfully',
        'data', jsonb_build_object(
            'clinic_id', clinic_id_val,
            'profile_id', profile_id,
            'services_created', services_created,
            'doctors_created', doctors_created,
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_staff_profile(p_profile_data jsonb DEFAULT '{}'::jsonb, p_staff_data jsonb DEFAULT '{}'::jsonb, p_clinic_data jsonb DEFAULT '{}'::jsonb, p_services_data jsonb DEFAULT '{}'::jsonb, p_doctors_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
    current_context JSONB;
    staff_user_id UUID;
    profile_id UUID;
    staff_clinic_id UUID;
    staff_permissions JSONB;
    result JSONB := '{}';
    service_record JSONB;
    doctor_record JSONB;
    services_created INTEGER := 0;
    services_updated INTEGER := 0;
    services_deleted INTEGER := 0;
    doctors_created INTEGER := 0;
    doctors_updated INTEGER := 0;
    doctors_deleted INTEGER := 0;
    temp_service_id UUID;
    temp_doctor_id UUID;
    new_doctor_id UUID;
BEGIN
    SET search_path = public, pg_catalog;
    
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
    
    -- Get profile ID, clinic ID, and permissions
    SELECT up.id, sp.clinic_id, sp.permissions 
    INTO profile_id, staff_clinic_id, staff_permissions
    FROM user_profiles up
    JOIN staff_profiles sp ON up.id = sp.user_profile_id
    WHERE up.user_id = staff_user_id AND sp.is_active = true;
    
    IF profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Staff profile not found');
    END IF;
    
    -- Check if staff has permission to manage clinic data
    IF NOT COALESCE((staff_permissions->>'manage_clinic')::boolean, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to manage clinic data');
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
        WHERE id = staff_user_id;
        
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
    
    -- 3️⃣ UPDATE STAFF-SPECIFIC DATA
    UPDATE staff_profiles 
    SET 
        position = COALESCE(p_staff_data->>'position', position),
        department = COALESCE(p_staff_data->>'department', department),
        updated_at = NOW()
    WHERE user_profile_id = profile_id;
    
    result := result || jsonb_build_object('staff_profile_updated', true);
    
    -- 4️⃣ CLINIC MANAGEMENT
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
            appointment_limit_per_patient = COALESCE((p_clinic_data->>'appointment_limit_per_patient')::integer, appointment_limit_per_patient),
            cancellation_policy_hours = COALESCE((p_clinic_data->>'cancellation_policy_hours')::integer, cancellation_policy_hours),
            updated_at = NOW()
        WHERE id = staff_clinic_id;
        
        result := result || jsonb_build_object('clinic_updated', true);
    END IF;
    
    -- 5️⃣ SERVICES MANAGEMENT - FULL CRUD OPERATIONS
    IF jsonb_typeof(p_services_data) = 'array' AND staff_clinic_id IS NOT NULL THEN
        -- Check if staff has permission to manage services
        IF NOT COALESCE((staff_permissions->>'manage_services')::boolean, false) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to manage services');
        END IF;
        
        -- Process each service in the array
        FOR service_record IN SELECT * FROM jsonb_array_elements(p_services_data)
        LOOP
            -- Handle DELETE operation
            IF service_record ? '_action' AND service_record->>'_action' = 'delete' THEN
                IF service_record ? 'id' AND service_record->>'id' IS NOT NULL THEN
                    temp_service_id := (service_record->>'id')::UUID;
                    
                    DELETE FROM services 
                    WHERE id = temp_service_id AND clinic_id = staff_clinic_id;
                    
                    IF FOUND THEN
                        services_deleted := services_deleted + 1;
                    END IF;
                END IF;
                
            -- Handle UPDATE operation
            ELSIF service_record ? 'id' AND service_record->>'id' IS NOT NULL THEN
                temp_service_id := (service_record->>'id')::UUID;
                
                UPDATE services 
                SET 
                    name = COALESCE(service_record->>'name', name),
                    description = COALESCE(service_record->>'description', description),
                    category = COALESCE(service_record->>'category', category),
                    duration_minutes = COALESCE((service_record->>'duration_minutes')::integer, duration_minutes),
                    min_price = COALESCE((service_record->>'min_price')::numeric, min_price),
                    max_price = COALESCE((service_record->>'max_price')::numeric, max_price),
                    priority = COALESCE((service_record->>'priority')::integer, priority),
                    is_active = COALESCE((service_record->>'is_active')::boolean, is_active),
                    updated_at = NOW()
                WHERE id = temp_service_id AND clinic_id = staff_clinic_id;
                
                IF FOUND THEN
                    services_updated := services_updated + 1;
                END IF;
                
            -- Handle CREATE operation
            ELSE
                -- Validate required fields for new service
                IF service_record->>'name' IS NULL OR trim(service_record->>'name') = '' THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Service name is required for new services');
                END IF;
                
                INSERT INTO services (
                    clinic_id, 
                    name, 
                    description, 
                    category, 
                    duration_minutes, 
                    min_price, 
                    max_price, 
                    priority, 
                    is_active
                ) VALUES (
                    staff_clinic_id,
                    trim(service_record->>'name'),
                    service_record->>'description',
                    service_record->>'category',
                    COALESCE((service_record->>'duration_minutes')::integer, 30),
                    (service_record->>'min_price')::numeric,
                    (service_record->>'max_price')::numeric,
                    COALESCE((service_record->>'priority')::integer, 10),
                    COALESCE((service_record->>'is_active')::boolean, true)
                );
                
                services_created := services_created + 1;
            END IF;
        END LOOP;
        
        result := result || jsonb_build_object(
            'services_created', services_created,
            'services_updated', services_updated,
            'services_deleted', services_deleted
        );
    END IF;
    
    -- 6️⃣ DOCTORS MANAGEMENT - FULL CRUD OPERATIONS
    IF jsonb_typeof(p_doctors_data) = 'array' AND staff_clinic_id IS NOT NULL THEN
        -- Check if staff has permission to manage doctors
        IF NOT COALESCE((staff_permissions->>'manage_doctors')::boolean, false) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to manage doctors');
        END IF;
        
        -- Process each doctor in the array
        FOR doctor_record IN SELECT * FROM jsonb_array_elements(p_doctors_data)
        LOOP
            -- Handle DELETE operation
            IF doctor_record ? '_action' AND doctor_record->>'_action' = 'delete' THEN
                IF doctor_record ? 'id' AND doctor_record->>'id' IS NOT NULL THEN
                    temp_doctor_id := (doctor_record->>'id')::UUID;
                    
                    -- First remove from doctor_clinics relationship
                    DELETE FROM doctor_clinics 
                    WHERE doctor_id = temp_doctor_id AND clinic_id = staff_clinic_id;
                    
                    -- Then delete the doctor (only if not associated with other clinics)
                    DELETE FROM doctors 
                    WHERE id = temp_doctor_id 
                    AND NOT EXISTS (
                        SELECT 1 FROM doctor_clinics dc WHERE dc.doctor_id = temp_doctor_id
                    );
                    
                    doctors_deleted := doctors_deleted + 1;
                END IF;
                
            -- Handle UPDATE operation
            ELSIF doctor_record ? 'id' AND doctor_record->>'id' IS NOT NULL THEN
                temp_doctor_id := (doctor_record->>'id')::UUID;
                
                UPDATE doctors 
                SET 
                    first_name = COALESCE(trim(doctor_record->>'first_name'), first_name),
                    last_name = COALESCE(trim(doctor_record->>'last_name'), last_name),
                    specialization = COALESCE(trim(doctor_record->>'specialization'), specialization),
                    education = COALESCE(doctor_record->>'education', education),
                    experience_years = COALESCE((doctor_record->>'experience_years')::integer, experience_years),
                    bio = COALESCE(doctor_record->>'bio', bio),
                    consultation_fee = COALESCE((doctor_record->>'consultation_fee')::numeric, consultation_fee),
                    image_url = COALESCE(doctor_record->>'image_url', image_url),
                    languages_spoken = COALESCE(
                        CASE 
                            WHEN doctor_record ? 'languages_spoken' THEN 
                                ARRAY(SELECT jsonb_array_elements_text(doctor_record->'languages_spoken'))
                            ELSE languages_spoken 
                        END, 
                        languages_spoken
                    ),
                    awards = COALESCE(
                        CASE 
                            WHEN doctor_record ? 'awards' THEN 
                                ARRAY(SELECT jsonb_array_elements_text(doctor_record->'awards'))
                            ELSE awards 
                        END, 
                        awards
                    ),
                    certifications = COALESCE(doctor_record->'certifications', certifications),
                    is_available = COALESCE((doctor_record->>'is_available')::boolean, is_available),
                    updated_at = NOW()
                WHERE id = temp_doctor_id;
                
                IF FOUND THEN
                    -- Update or create doctor-clinic relationship
                    INSERT INTO doctor_clinics (doctor_id, clinic_id, schedule, is_active)
                    VALUES (temp_doctor_id, staff_clinic_id, doctor_record->'schedule', true)
                    ON CONFLICT (doctor_id, clinic_id) 
                    DO UPDATE SET 
                        schedule = COALESCE(doctor_record->'schedule', doctor_clinics.schedule),
                        is_active = COALESCE((doctor_record->>'is_active')::boolean, doctor_clinics.is_active);
                    
                    doctors_updated := doctors_updated + 1;
                END IF;
                
            -- Handle CREATE operation
            ELSE
                -- Validate required fields for new doctor
                IF doctor_record->>'license_number' IS NULL OR trim(doctor_record->>'license_number') = '' THEN
                    RETURN jsonb_build_object('success', false, 'error', 'License number is required for new doctors');
                END IF;
                
                IF doctor_record->>'specialization' IS NULL OR trim(doctor_record->>'specialization') = '' THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Specialization is required for new doctors');
                END IF;
                
                IF doctor_record->>'first_name' IS NULL OR trim(doctor_record->>'first_name') = '' THEN
                    RETURN jsonb_build_object('success', false, 'error', 'First name is required for new doctors');
                END IF;
                
                IF doctor_record->>'last_name' IS NULL OR trim(doctor_record->>'last_name') = '' THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Last name is required for new doctors');
                END IF;
                
                -- Insert new doctor (user_id is optional as you correctly noted)
                INSERT INTO doctors (
                    user_id,  -- This can be NULL
                    license_number,
                    specialization,
                    first_name,
                    last_name,
                    education,
                    experience_years,
                    bio,
                    consultation_fee,
                    image_url,
                    languages_spoken,
                    certifications,
                    awards,
                    is_available
                ) VALUES (
                    CASE WHEN doctor_record->>'user_id' IS NOT NULL THEN (doctor_record->>'user_id')::UUID ELSE NULL END,
                    trim(doctor_record->>'license_number'),
                    trim(doctor_record->>'specialization'),
                    trim(doctor_record->>'first_name'),
                    trim(doctor_record->>'last_name'),
                    doctor_record->>'education',
                    (doctor_record->>'experience_years')::integer,
                    doctor_record->>'bio',
                    (doctor_record->>'consultation_fee')::numeric,
                    doctor_record->>'image_url',
                    CASE 
                        WHEN doctor_record ? 'languages_spoken' THEN 
                            ARRAY(SELECT jsonb_array_elements_text(doctor_record->'languages_spoken'))
                        ELSE NULL 
                    END,
                    doctor_record->'certifications',
                    CASE 
                        WHEN doctor_record ? 'awards' THEN 
                            ARRAY(SELECT jsonb_array_elements_text(doctor_record->'awards'))
                        ELSE NULL 
                    END,
                    COALESCE((doctor_record->>'is_available')::boolean, true)
                ) RETURNING id INTO new_doctor_id;
                
                -- Create doctor-clinic relationship
                INSERT INTO doctor_clinics (doctor_id, clinic_id, schedule, is_active)
                VALUES (new_doctor_id, staff_clinic_id, doctor_record->'schedule', true);
                
                doctors_created := doctors_created + 1;
            END IF;
        END LOOP;
        
        result := result || jsonb_build_object(
            'doctors_created', doctors_created,
            'doctors_updated', doctors_updated,
            'doctors_deleted', doctors_deleted
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Staff profile updated successfully',
        'updates', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_treatment_plan_progress(p_appointment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  treatment_plan_record RECORD;
  new_visits_completed INTEGER;
  new_progress INTEGER;
BEGIN
  -- Find treatment plan linked to this appointment
  SELECT 
    tp.*,
    tpa.visit_number,
    tpa.id as tpa_id,
    tpa.is_completed as already_completed
  INTO treatment_plan_record
  FROM treatment_plan_appointments tpa
  JOIN treatment_plans tp ON tpa.treatment_plan_id = tp.id
  WHERE tpa.appointment_id = p_appointment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'No treatment plan linked to this appointment');
  END IF;
  
  -- Don't double-count already completed visits (CRITICAL FIX)
  IF treatment_plan_record.already_completed THEN
    RETURN jsonb_build_object('success', true, 'message', 'Visit already marked as completed');
  END IF;
  
  -- Mark this visit as completed
  UPDATE treatment_plan_appointments
  SET 
    is_completed = true,
    completion_notes = 'Completed on ' || CURRENT_DATE::TEXT
  WHERE id = treatment_plan_record.tpa_id;
  
  -- Calculate new progress
  new_visits_completed := treatment_plan_record.visits_completed + 1;
  
  IF treatment_plan_record.total_visits_planned > 0 THEN
    new_progress := LEAST(ROUND((new_visits_completed::NUMERIC / treatment_plan_record.total_visits_planned * 100)), 100);
  ELSE
    new_progress := treatment_plan_record.progress_percentage;
  END IF;
  
  -- Update treatment plan progress
  UPDATE treatment_plans
  SET 
    visits_completed = new_visits_completed,
    progress_percentage = new_progress,
    updated_at = NOW(),
    -- Clear next appointment if this was it (CRITICAL FIX)
    next_visit_appointment_id = CASE 
      WHEN next_visit_appointment_id = p_appointment_id THEN NULL 
      ELSE next_visit_appointment_id 
    END,
    next_visit_date = CASE 
      WHEN next_visit_appointment_id = p_appointment_id THEN NULL 
      ELSE next_visit_date 
    END
  WHERE id = treatment_plan_record.id;
  
  -- Check if treatment should be completed
  IF treatment_plan_record.total_visits_planned IS NOT NULL AND 
     new_visits_completed >= treatment_plan_record.total_visits_planned THEN
    
    UPDATE treatment_plans
    SET 
      status = 'completed',
      actual_end_date = CURRENT_DATE,
      completed_at = NOW(),
      progress_percentage = 100,
      next_visit_appointment_id = NULL,
      next_visit_date = NULL
    WHERE id = treatment_plan_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Treatment plan completed successfully!',
      'data', jsonb_build_object(
        'treatment_plan_id', treatment_plan_record.id,
        'treatment_completed', true,
        'visits_completed', new_visits_completed,
        'progress_percentage', 100
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Treatment progress updated successfully',
    'data', jsonb_build_object(
      'treatment_plan_id', treatment_plan_record.id,
      'treatment_completed', false,
      'visits_completed', new_visits_completed,
      'progress_percentage', new_progress
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update treatment progress: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_location(latitude double precision, longitude double precision)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_profile(p_user_id uuid DEFAULT NULL::uuid, p_profile_data jsonb DEFAULT '{}'::jsonb, p_role_specific_data jsonb DEFAULT '{}'::jsonb, p_clinic_data jsonb DEFAULT '{}'::jsonb, p_services_data jsonb DEFAULT '{}'::jsonb, p_doctors_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_and_signup_staff(p_invitation_id uuid, p_email character varying, p_first_name character varying, p_last_name character varying, p_phone character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_and_signup_staff_v2(p_invitation_id uuid, p_email character varying, p_first_name character varying, p_last_name character varying, p_phone character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_appointment_services()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    appointment_clinic_id UUID;
    service_clinic_id UUID;
    service_name VARCHAR;
BEGIN
    -- Get the clinic ID from the appointment
    SELECT clinic_id INTO appointment_clinic_id 
    FROM appointments 
    WHERE id = NEW.appointment_id;
    
    -- Get the clinic ID and name from the service
    SELECT clinic_id, name INTO service_clinic_id, service_name
    FROM services 
    WHERE id = NEW.service_id AND is_active = true;
    
    -- Check if service exists and is active
    IF service_clinic_id IS NULL THEN
        RAISE EXCEPTION 'Service % does not exist or is not active', NEW.service_id;
    END IF;
    
    -- Verify clinic match
    IF appointment_clinic_id != service_clinic_id THEN
        RAISE EXCEPTION 'Service "%" does not belong to the appointment clinic', service_name;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_appointment_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_doctor_clinic_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Verify doctor works at this clinic and is active
    IF NOT EXISTS (
        SELECT 1 FROM doctor_clinics dc 
        WHERE dc.doctor_id = NEW.doctor_id 
        AND dc.clinic_id = NEW.clinic_id 
        AND dc.is_active = true
    ) THEN
        RAISE EXCEPTION 'Doctor % does not work at clinic % or is not active', NEW.doctor_id, NEW.clinic_id;
    END IF;
    
    RETURN NEW;
END;
$function$
;

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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_partnership_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
$function$
;

create policy "Admins can view own profile"
on "public"."admin_profiles"
as permissive
for select
to public
using ((user_profile_id = get_current_user_id()));


create policy "Consolidated analytics policy"
on "public"."analytics_events"
as permissive
for all
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN (user_id = get_current_user_id())
    ELSE false
END)
with check (true);


create policy "Appointment services access policy"
on "public"."appointment_services"
as permissive
for all
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (appointment_id IN ( SELECT appointments.id
       FROM appointments
      WHERE (appointments.clinic_id = get_current_staff_clinic_id())))
    WHEN 'patient'::user_type THEN (appointment_id IN ( SELECT appointments.id
       FROM appointments
      WHERE (appointments.patient_id = get_current_user_id())))
    ELSE false
END);


create policy "Appointment creation access"
on "public"."appointments"
as permissive
for insert
to authenticated
with check (((get_current_user_role() = 'patient'::user_type) AND (patient_id = get_current_user_id()) AND (status = 'pending'::appointment_status)));


create policy "Appointment deletion access"
on "public"."appointments"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Appointment update access"
on "public"."appointments"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN ((patient_id = get_current_user_id()) AND (status = ANY (ARRAY['pending'::appointment_status, 'confirmed'::appointment_status])))
    ELSE false
END)
with check (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN ((patient_id = get_current_user_id()) AND (status = 'cancelled'::appointment_status) AND (cancellation_reason IS NOT NULL))
    ELSE false
END);


create policy "Appointment view access"
on "public"."appointments"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN (patient_id = get_current_user_id())
    ELSE false
END);


create policy "Staff can manage own clinic appointments"
on "public"."appointments"
as permissive
for all
to authenticated
using (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'admin'::user_type THEN true
    WHEN 'patient'::user_type THEN (patient_id = get_current_user_id())
    ELSE false
END);


create policy "archive_items_role_access"
on "public"."archive_items"
as permissive
for all
to authenticated
using (((archived_by_user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))) OR ((archived_by_role = 'staff'::user_type) AND (scope_type = 'clinic'::text) AND (scope_id = ( SELECT sp.clinic_id
   FROM ((users u
     JOIN user_profiles up ON ((u.id = up.user_id)))
     JOIN staff_profiles sp ON ((up.id = sp.user_profile_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (up.user_type = 'staff'::user_type))))) OR (EXISTS ( SELECT 1
   FROM (users u
     JOIN user_profiles up ON ((u.id = up.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (up.user_type = 'admin'::user_type))))));


create policy "Badge award creation access"
on "public"."clinic_badge_awards"
as permissive
for insert
to authenticated
with check (((get_current_user_role() = 'admin'::user_type) AND (awarded_by = get_current_user_id()) AND (EXISTS ( SELECT 1
   FROM clinics c
  WHERE ((c.id = clinic_badge_awards.clinic_id) AND (c.is_active = true)))) AND ((is_current = false) OR (NOT (EXISTS ( SELECT 1
   FROM ((clinic_badge_awards cba
     JOIN clinic_badges cb ON ((cba.badge_id = cb.id)))
     JOIN clinic_badges new_cb ON ((new_cb.id = clinic_badge_awards.badge_id)))
  WHERE ((cba.clinic_id = clinic_badge_awards.clinic_id) AND ((cb.badge_name)::text = (new_cb.badge_name)::text) AND (cba.is_current = true))))))));


create policy "Badge award update access"
on "public"."clinic_badge_awards"
as permissive
for update
to authenticated
using ((get_current_user_role() = 'admin'::user_type))
with check (((get_current_user_role() = 'admin'::user_type) AND ((is_current = false) OR (NOT (EXISTS ( SELECT 1
   FROM ((clinic_badge_awards cba
     JOIN clinic_badges cb ON ((cba.badge_id = cb.id)))
     JOIN clinic_badges this_cb ON ((this_cb.id = clinic_badge_awards.badge_id)))
  WHERE ((cba.clinic_id = clinic_badge_awards.clinic_id) AND ((cb.badge_name)::text = (this_cb.badge_name)::text) AND (cba.is_current = true) AND (cba.id <> clinic_badge_awards.id))))))));


create policy "Badge award view access"
on "public"."clinic_badge_awards"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN ((is_current = true) AND (EXISTS ( SELECT 1
       FROM clinics c
      WHERE ((c.id = clinic_badge_awards.clinic_id) AND (c.is_active = true)))))
    ELSE false
END);


create policy "Admin badge delete"
on "public"."clinic_badges"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Admin badge management"
on "public"."clinic_badges"
as permissive
for insert
to authenticated
with check ((get_current_user_role() = 'admin'::user_type));


create policy "Admin badges updates"
on "public"."clinic_badges"
as permissive
for update
to authenticated
using ((get_current_user_role() = 'admin'::user_type))
with check ((get_current_user_role() = 'admin'::user_type));


create policy "Consolidated clinic badge"
on "public"."clinic_badges"
as permissive
for select
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    ELSE (is_active = true)
END);


create policy "Active clinics and admin can see all "
on "public"."clinics"
as permissive
for select
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    ELSE (is_active = true)
END);


create policy "Admin can create clinics"
on "public"."clinics"
as permissive
for insert
to authenticated
with check ((get_current_user_role() = 'admin'::user_type));


create policy "Admin can delete clinics"
on "public"."clinics"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Staff can update their clinic"
on "public"."clinics"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (id = get_current_staff_clinic_id())
    ELSE false
END)
with check (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (id = get_current_staff_clinic_id())
    ELSE false
END);


create policy "Doctor clinic relationship delete"
on "public"."doctor_clinics"
as permissive
for delete
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE false
END);


create policy "Doctor clinic relationship insert"
on "public"."doctor_clinics"
as permissive
for insert
to authenticated
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((clinic_id = get_current_staff_clinic_id()) AND (EXISTS ( SELECT 1
       FROM doctors d
      WHERE ((d.id = doctor_clinics.doctor_id) AND (d.is_available = true)))))
    ELSE false
END);


create policy "Doctor clinic relationship update"
on "public"."doctor_clinics"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE false
END)
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE false
END);


create policy "Doctor clinic relationship view"
on "public"."doctor_clinics"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((is_active = true) OR (clinic_id = get_current_staff_clinic_id()))
    ELSE (is_active = true)
END);


create policy "Anyone can view available doctor"
on "public"."doctors"
as permissive
for select
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((is_available = true) OR (id IN ( SELECT doctor_clinics.doctor_id
       FROM doctor_clinics
      WHERE (doctor_clinics.clinic_id = get_current_staff_clinic_id()))))
    ELSE (is_available = true)
END);


create policy "Doctors can create by admin and staff"
on "public"."doctors"
as permissive
for insert
to authenticated
with check ((get_current_user_role() = ANY (ARRAY['admin'::user_type, 'staff'::user_type])));


create policy "Doctors can delete by admin and staff"
on "public"."doctors"
as permissive
for delete
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (id IN ( SELECT doctor_clinics.doctor_id
       FROM doctor_clinics
      WHERE (doctor_clinics.clinic_id = get_current_staff_clinic_id())))
    ELSE false
END);


create policy "Doctors can update by staff not admin"
on "public"."doctors"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (id IN ( SELECT doctor_clinics.doctor_id
       FROM doctor_clinics
      WHERE (doctor_clinics.clinic_id = get_current_staff_clinic_id())))
    ELSE false
END)
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (id IN ( SELECT doctor_clinics.doctor_id
       FROM doctor_clinics
      WHERE (doctor_clinics.clinic_id = get_current_staff_clinic_id())))
    ELSE false
END);


create policy "Communication delete access"
on "public"."email_communications"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Communication update access"
on "public"."email_communications"
as permissive
for update
to authenticated
using (((from_user_id = get_current_user_id()) OR (to_user_id = get_current_user_id()) OR (get_current_user_role() = 'admin'::user_type)))
with check (true);


create policy "Users can send communications"
on "public"."email_communications"
as permissive
for insert
to authenticated
with check ((from_user_id = get_current_user_id()));


create policy "Users can view their communications"
on "public"."email_communications"
as permissive
for select
to authenticated
using (((from_user_id = get_current_user_id()) OR (to_user_id = get_current_user_id())));


create policy "Service role can manage email queue"
on "public"."email_queue"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Feedback view access"
on "public"."feedback"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((clinic_id = get_current_staff_clinic_id()) AND
    CASE
        WHEN (is_anonymous = true) THEN true
        ELSE true
    END)
    WHEN 'patient'::user_type THEN (patient_id = get_current_user_id())
    ELSE false
END);


create policy "Only patient can create feedback"
on "public"."feedback"
as permissive
for insert
to authenticated
with check (((get_current_user_role() = 'patient'::user_type) AND (patient_id = get_current_user_id())));


create policy "Staff can response to feedback patient can update it"
on "public"."feedback"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN (patient_id = get_current_user_id())
    ELSE false
END)
with check (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN (patient_id = get_current_user_id())
    ELSE false
END);


create policy "Staff can view own clinic feedback"
on "public"."feedback"
as permissive
for select
to authenticated
using (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'admin'::user_type THEN true
    WHEN 'patient'::user_type THEN (patient_id = get_current_user_id())
    ELSE false
END);


create policy "File access control for each role"
on "public"."file_uploads"
as permissive
for all
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((related_id = get_current_staff_clinic_id()) AND ((upload_purpose)::text = 'clinic_certificate'::text))
    ELSE (user_id = get_current_user_id())
END)
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((related_id = get_current_staff_clinic_id()) AND ((upload_purpose)::text = 'clinic_certificate'::text))
    ELSE (user_id = get_current_user_id())
END);


create policy "Notification template creation access"
on "public"."notification_templates"
as permissive
for insert
to authenticated
with check (((get_current_user_role() = 'admin'::user_type) AND (template_name IS NOT NULL) AND (template_type IS NOT NULL) AND (body_template IS NOT NULL) AND (length(TRIM(BOTH FROM template_name)) > 0) AND (length(TRIM(BOTH FROM body_template)) > 0) AND ((variables IS NULL) OR (jsonb_typeof(variables) = 'object'::text))));


create policy "Notification template deletion access"
on "public"."notification_templates"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Notification template update access"
on "public"."notification_templates"
as permissive
for update
to authenticated
using ((get_current_user_role() = 'admin'::user_type))
with check (((get_current_user_role() = 'admin'::user_type) AND (template_name IS NOT NULL) AND (template_type IS NOT NULL) AND (body_template IS NOT NULL) AND (length(TRIM(BOTH FROM template_name)) > 0) AND (length(TRIM(BOTH FROM body_template)) > 0) AND ((variables IS NULL) OR (jsonb_typeof(variables) = 'object'::text))));


create policy "Notification template view access"
on "public"."notification_templates"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    ELSE (is_active = true)
END);


create policy "Notification creation access"
on "public"."notifications"
as permissive
for insert
to authenticated
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((user_id = get_current_user_id()) OR (get_current_user_role() = 'admin'::user_type))));


create policy "Notification update access"
on "public"."notifications"
as permissive
for update
to authenticated
using ((user_id = get_current_user_id()))
with check ((user_id = get_current_user_id()));


create policy "Notification view access"
on "public"."notifications"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (user_id = get_current_user_id())
    WHEN 'patient'::user_type THEN (user_id = get_current_user_id())
    ELSE false
END);


create policy "Consolidated appointment limit policy"
on "public"."patient_appointment_limits"
as permissive
for all
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN (patient_id = get_current_user_id())
    ELSE false
END);


create policy "Medical history privacy protected"
on "public"."patient_medical_history"
as permissive
for all
to authenticated
using (((get_current_user_role() = 'staff'::user_type) AND (patient_id IN ( SELECT DISTINCT appointments.patient_id
   FROM appointments
  WHERE (appointments.clinic_id = get_current_staff_clinic_id())))));


create policy "Patient profile creation access"
on "public"."patient_profiles"
as permissive
for insert
to authenticated
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'patient'::user_type THEN (EXISTS ( SELECT 1
       FROM user_profiles up
      WHERE ((up.id = patient_profiles.user_profile_id) AND (up.user_id = get_current_user_id()))))
    ELSE false
END);


create policy "Patient profile deletion access"
on "public"."patient_profiles"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Patient profile update access"
on "public"."patient_profiles"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (EXISTS ( SELECT 1
       FROM (appointments a
         JOIN user_profiles up ON ((a.patient_id = up.user_id)))
      WHERE ((up.id = patient_profiles.user_profile_id) AND (a.clinic_id = get_current_staff_clinic_id()))
     LIMIT 1))
    WHEN 'patient'::user_type THEN (EXISTS ( SELECT 1
       FROM user_profiles up
      WHERE ((up.id = patient_profiles.user_profile_id) AND (up.user_id = get_current_user_id()))))
    ELSE false
END)
with check ((get_current_user_role() = ANY (ARRAY['admin'::user_type, 'staff'::user_type, 'patient'::user_type])));


create policy "Patient profile view access"
on "public"."patient_profiles"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (EXISTS ( SELECT 1
       FROM (appointments a
         JOIN user_profiles up ON ((a.patient_id = up.user_id)))
      WHERE ((up.id = patient_profiles.user_profile_id) AND (a.clinic_id = get_current_staff_clinic_id()))
     LIMIT 1))
    WHEN 'patient'::user_type THEN (EXISTS ( SELECT 1
       FROM user_profiles up
      WHERE ((up.id = patient_profiles.user_profile_id) AND (up.user_id = get_current_user_id()))))
    ELSE false
END);


create policy "Admins can manage rate limits"
on "public"."rate_limits"
as permissive
for all
to public
using ((( SELECT up.user_type
   FROM (users u
     JOIN user_profiles up ON ((u.id = up.user_id)))
  WHERE (u.auth_user_id = ( SELECT auth.uid() AS uid))) = 'admin'::user_type));


create policy "Service creation access"
on "public"."services"
as permissive
for insert
to authenticated
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE false
END);


create policy "Service deletion access"
on "public"."services"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Service update access"
on "public"."services"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE false
END)
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE false
END);


create policy "Service view access"
on "public"."services"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'patient'::user_type THEN ((is_active = true) AND (EXISTS ( SELECT 1
       FROM clinics c
      WHERE ((c.id = services.clinic_id) AND (c.is_active = true)))))
    ELSE false
END);


create policy "Staff can manage own clinic services"
on "public"."services"
as permissive
for all
to authenticated
using (
CASE get_current_user_role()
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    WHEN 'admin'::user_type THEN true
    ELSE false
END);


create policy "Staff invitation creation access"
on "public"."staff_invitations"
as permissive
for insert
to authenticated
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((clinic_id = get_current_staff_clinic_id()) AND (email IS NOT NULL) AND ("position" IS NOT NULL) AND (temp_password IS NOT NULL) AND (expires_at > now()) AND (status = 'pending'::text) AND ((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
    ELSE false
END);


create policy "Staff invitation deletion access"
on "public"."staff_invitations"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Staff invitation update access"
on "public"."staff_invitations"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE (((( SELECT auth.jwt() AS jwt) ->> 'email'::text) = (email)::text) AND (status = 'pending'::text) AND (expires_at > now()))
END);


create policy "Staff invitation view access"
on "public"."staff_invitations"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (clinic_id = get_current_staff_clinic_id())
    ELSE (((( SELECT auth.jwt() AS jwt) ->> 'email'::text) = (email)::text) AND (status = 'pending'::text) AND (expires_at > now()))
END);


create policy "Staff profile creation access"
on "public"."staff_profiles"
as permissive
for insert
to authenticated
with check ((get_current_user_role() = 'admin'::user_type));


create policy "Staff profile deletion access"
on "public"."staff_profiles"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Staff profile update access"
on "public"."staff_profiles"
as permissive
for update
to authenticated
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (EXISTS ( SELECT 1
       FROM user_profiles up
      WHERE ((up.id = staff_profiles.user_profile_id) AND (up.user_id = get_current_user_id()))))
    ELSE false
END)
with check (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN true
    ELSE false
END);


create policy "Staff profile view access"
on "public"."staff_profiles"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN (EXISTS ( SELECT 1
       FROM user_profiles up
      WHERE ((up.id = staff_profiles.user_profile_id) AND (up.user_id = get_current_user_id()))))
    ELSE false
END);


create policy "Admins can manage UI components"
on "public"."ui_components"
as permissive
for all
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "user_archive_prefs_own_access"
on "public"."user_archive_preferences"
as permissive
for all
to authenticated
using ((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))));


create policy "Profile creation access"
on "public"."user_profiles"
as permissive
for insert
to authenticated
with check ((user_id = get_current_user_id()));


create policy "Profile deletion access"
on "public"."user_profiles"
as permissive
for delete
to authenticated
using ((get_current_user_role() = 'admin'::user_type));


create policy "Profile update access"
on "public"."user_profiles"
as permissive
for update
to authenticated
using ((user_id = get_current_user_id()))
with check ((user_id = get_current_user_id()));


create policy "Profile view access"
on "public"."user_profiles"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((user_id = get_current_user_id()) OR ((user_type = 'patient'::user_type) AND (EXISTS ( SELECT 1
       FROM appointments a
      WHERE ((a.patient_id = user_profiles.user_id) AND (a.clinic_id = get_current_staff_clinic_id()))
     LIMIT 1))))
    WHEN 'patient'::user_type THEN (user_id = get_current_user_id())
    ELSE false
END);


create policy "Authenticated users can create profiles"
on "public"."users"
as permissive
for insert
to authenticated
with check (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (auth_user_id = ( SELECT auth.uid() AS uid))));


create policy "Role-based user access"
on "public"."users"
as permissive
for select
to public
using (
CASE get_current_user_role()
    WHEN 'admin'::user_type THEN true
    WHEN 'staff'::user_type THEN ((auth_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
       FROM appointments a
      WHERE ((a.patient_id = users.id) AND (a.clinic_id = get_current_staff_clinic_id()))
     LIMIT 1)))
    WHEN 'patient'::user_type THEN (auth_user_id = ( SELECT auth.uid() AS uid))
    ELSE false
END);


create policy "Users can update own profile"
on "public"."users"
as permissive
for update
to authenticated
using ((auth_user_id = ( SELECT auth.uid() AS uid)));


CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON public.admin_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER validate_appointment_services_trigger BEFORE INSERT OR UPDATE ON public.appointment_services FOR EACH ROW EXECUTE FUNCTION validate_appointment_services();

CREATE TRIGGER appointment_limits_trigger AFTER INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION manage_appointment_limits();

CREATE TRIGGER appointment_status_validation_trigger BEFORE UPDATE OF status ON public.appointments FOR EACH ROW EXECUTE FUNCTION validate_appointment_status_change();

CREATE TRIGGER track_appointment_deletion_trigger BEFORE DELETE ON public.appointments FOR EACH ROW EXECUTE FUNCTION track_appointment_deletion_in_history();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_progress_on_completion AFTER UPDATE ON public.appointments FOR EACH ROW WHEN ((new.status = 'completed'::appointment_status)) EXECUTE FUNCTION trigger_update_treatment_on_completion();

CREATE TRIGGER validate_doctor_clinic_trigger BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION validate_doctor_clinic_assignment();

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER protect_email_fields_trigger BEFORE UPDATE ON public.email_communications FOR EACH ROW EXECUTE FUNCTION protect_email_communications_fields();

CREATE TRIGGER clinic_rating_trigger AFTER INSERT OR UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION update_clinic_rating();

CREATE TRIGGER doctor_rating_trigger AFTER INSERT OR DELETE OR UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION update_doctor_rating();

CREATE TRIGGER feedback_core_field_protect BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION prevent_feedback_core_field_update();

CREATE TRIGGER feedback_rate_limit_trigger BEFORE INSERT ON public.feedback FOR EACH ROW EXECUTE FUNCTION validate_feedback_submission();

CREATE TRIGGER validate_feedback_appointment_trigger BEFORE INSERT OR UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION validate_feedback_appointment();

CREATE TRIGGER protect_file_upload_updates_trigger BEFORE UPDATE ON public.file_uploads FOR EACH ROW EXECUTE FUNCTION protect_file_upload_updates();

CREATE TRIGGER notification_update_restriction BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION restrict_notification_updates();

CREATE TRIGGER update_appointment_limits_updated_at BEFORE UPDATE ON public.patient_appointment_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_history_updated_at BEFORE UPDATE ON public.patient_medical_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_patient_profile_update_constraints BEFORE UPDATE ON public.patient_profiles FOR EACH ROW EXECUTE FUNCTION enforce_patient_profile_update_constraints();

CREATE TRIGGER update_patient_profiles_updated_at BEFORE UPDATE ON public.patient_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_staff_profile_update_constraints BEFORE UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION enforce_staff_profile_update_constraints();

CREATE TRIGGER update_staff_profiles_updated_at BEFORE UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_components_updated_at BEFORE UPDATE ON public.ui_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_user_profile_on_signup();

CREATE TRIGGER on_email_verified AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW WHEN (((old.email_confirmed_at IS NULL) AND (new.email_confirmed_at IS NOT NULL))) EXECUTE FUNCTION handle_email_verification();

CREATE TRIGGER on_phone_verified AFTER UPDATE OF phone_confirmed_at ON auth.users FOR EACH ROW WHEN (((old.phone_confirmed_at IS NULL) AND (new.phone_confirmed_at IS NOT NULL))) EXECUTE FUNCTION handle_phone_verification();


