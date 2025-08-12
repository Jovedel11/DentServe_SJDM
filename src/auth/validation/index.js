// Export all validators
export {
  validatePasswordLogin,
  validateOtpRequest,
  validateOtpVerify,
  validateAdminLogin,
  validateSignup,
  validateAdminSignup,
  validateProfileUpdate,
  validatePasswordChange
} from "./schemas/user.js";

// Export field validators
export {
  validateIdentifier,
  validateEmailField as validateEmail,
  validatePhoneField as validatePhone,
  validatePasswordField as validatePassword,
  validateStrongPasswordField as validateStrongPassword,
  validateFirstName,
  validateLastName,
  validateOtp
} from "./schemas/auth.js";

// Export rules
export * from "./rules/typicalRules.js";