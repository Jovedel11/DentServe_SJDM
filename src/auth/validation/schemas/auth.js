import { z } from "zod";
import { emailRule, phoneRule, passwordRule, strongPasswordRule } from "../rules/typicalRules";

// Identifier field - can be email OR phone
export const identifierField = z
  .string()
  .min(1, "Email or phone is required")
  .refine(
    (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      
      const isEmail = emailRegex.test(value);
      const isPhone = phoneRegex.test(value.replace(/\s+/g, ""));
      
      return isEmail || isPhone;
    },
    {
      message: "Please enter a valid email address or phone number",
    }
  );

// Individual field schemas for flexibility
export const emailField = emailRule;
export const phoneField = phoneRule;
export const passwordField = passwordRule;
export const strongPasswordField = strongPasswordRule;

// Common optional fields
export const rememberMeField = z.boolean().optional();
export const otpField = z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits");

// First and last name fields
export const firstNameField = z
  .string()
  .min(1, "First name is required")
  .min(2, "First name must be at least 2 characters")
  .max(50, "First name is too long")
  .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces");

export const lastNameField = z
  .string()
  .min(1, "Last name is required")
  .min(2, "Last name must be at least 2 characters")
  .max(50, "Last name is too long")
  .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces");