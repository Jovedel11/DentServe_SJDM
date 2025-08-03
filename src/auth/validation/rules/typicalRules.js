import { z } from 'zod';

// email validation rule 
export const emailRule = z
  .string()
  .min(1, "Email is required")
  .email('Please enter a valid email address')
  .max(100, 'Email is too long');

// phone validation rule
export const phoneRule = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
  .transform((phone) => phone.replace(/\s+/g, ""))

// based password rule 
export const passwordRule = z
  .string()
  .min(1, "Password is required")
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long')

// strong password rule
export const strongPasswordRule = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// password confirmation 
export const createPasswordConfirmRule = (passwordFieldName = "password") => (
  z.string().min(1, "Password confirmation is required")
)

// password match refinement
export const addPasswordMatchValidation = (schema, passwordField = "password", confirmField = "confirmPassword") => 
  schema.refine((data) => data[passwordField] === data[confirmField], {
    message: "Passwords do not match",
    path: [confirmField],
  })

// optionals email and phone (for forms where email or phone might be optional)
export const optionalEmailRule = emailRule.optional();
export const optionalPhoneRule = phoneRule.optional();