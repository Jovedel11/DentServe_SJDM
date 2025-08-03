// Export all schemas for easy importing
export {
  // Login schemas
  passwordLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
  adminLoginSchema,
  
  // Signup schemas
  signupSchema,
  userSignupSchema,
  adminSignupSchema,
  
  // Profile schemas
  profileUpdateSchema,
  passwordChangeSchemaWithValidation,
} from "./schemas/user.js";

// Export individual field validators for custom forms
export {
  identifierField,
  emailField,
  phoneField,
  passwordField,
  strongPasswordField,
  firstNameField,
  lastNameField,
  otpField,
} from "./schemas/auth.js";

// Export validation rules for custom schemas
export * from "./rules/typicalRules.js";