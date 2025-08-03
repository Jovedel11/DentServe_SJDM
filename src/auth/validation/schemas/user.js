import { z } from "zod";
import {
  identifierField,
  emailField,
  phoneField,
  passwordField,
  strongPasswordField,
  rememberMeField,
  otpField,
  firstNameField,
  lastNameField,
} from "./auth.js";
import { addPasswordMatchValidation, createPasswordConfirmRule } from "../rules/typicalRules.js";

// for login

// Base login schema - works for both regular and admin login
export const baseLoginSchema = z.object({
  identifier: identifierField,
  rememberMe: rememberMeField,
});

// Password login - extends base login
export const passwordLoginSchema = baseLoginSchema.extend({
  password: passwordField,
  loginType: z.literal("password"),
});

// OTP request schema
export const otpRequestSchema = baseLoginSchema.extend({
  loginType: z.literal("otp-request"),
});

// OTP verification schema
export const otpVerifySchema = baseLoginSchema.extend({
  otp: otpField,
  loginType: z.literal("otp-verify"),
});

// Admin-specific login (might require stronger password or additional fields)
export const adminLoginSchema = baseLoginSchema.extend({
  password: strongPasswordField, // Admins might need stronger passwords
  loginType: z.literal("password"),
  adminCode: z.string().min(1, "Admin code is required").optional(), // Optional admin verification
});

// for signup

// Base signup information
const baseSignupSchema = z.object({
  firstName: firstNameField,
  lastName: lastNameField,
  email: emailField,
  phone: phoneField.optional(), // Phone might be optional in signup
  password: strongPasswordField,
  confirmPassword: createPasswordConfirmRule(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
  subscribeNewsletter: z.boolean().optional(),
});

// Add password matching validation
export const signupSchema = addPasswordMatchValidation(baseSignupSchema);

// User signup with role
export const userSignupSchema = signupSchema.extend({
  role: z.literal("user"),
});

// Admin signup (might have different requirements)
export const adminSignupSchema = signupSchema.extend({
  role: z.literal("admin"),
  adminInviteCode: z.string().min(1, "Admin invite code is required"),
  department: z.string().min(1, "Department is required"),
});

// Profile update schema (reuses fields but makes some optional)
export const profileUpdateSchema = z.object({
  firstName: firstNameField.optional(),
  lastName: lastNameField.optional(),
  phone: phoneField.optional(),
  // Email changes might need special verification
  email: emailField.optional(),
});

// Password change schema
const passwordChangeSchema = z.object({
  currentPassword: passwordField,
  newPassword: strongPasswordField,
  confirmNewPassword: createPasswordConfirmRule("newPassword"),
});

export const passwordChangeSchemaWithValidation = addPasswordMatchValidation(
  passwordChangeSchema,
  "newPassword",
  "confirmNewPassword"
);