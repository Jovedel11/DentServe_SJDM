-- Update RLS policies to ensure staff can only manage their clinic's data
CREATE POLICY "Staff can manage own clinic appointments" ON "public"."appointments" 
FOR ALL TO "authenticated" 
USING (
    CASE get_current_user_role()
        WHEN 'staff' THEN clinic_id = get_current_staff_clinic_id()
        WHEN 'admin' THEN true
        WHEN 'patient' THEN patient_id = get_current_user_id()
        ELSE false
    END
);

CREATE POLICY "Staff can manage own clinic services" ON "public"."services"
FOR ALL TO "authenticated"
USING (
    CASE get_current_user_role()
        WHEN 'staff' THEN clinic_id = get_current_staff_clinic_id()
        WHEN 'admin' THEN true
        ELSE false
    END
);

CREATE POLICY "Staff can view own clinic feedback" ON "public"."feedback"
FOR SELECT TO "authenticated"
USING (
    CASE get_current_user_role()
        WHEN 'staff' THEN clinic_id = get_current_staff_clinic_id()
        WHEN 'admin' THEN true
        WHEN 'patient' THEN patient_id = get_current_user_id()
        ELSE false
    END
);