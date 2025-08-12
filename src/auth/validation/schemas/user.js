import {
  validateIdentifier,
  validateEmailField,
  validatePhoneField,
  validateStrongPasswordField,
  validateRememberMe,
  validateOtp,
  validateFirstName,
  validateLastName
} from "./auth.js";
import { validatePasswordConfirm } from "../rules/typicalRules.js";

// Base login validation
const validateBaseLogin = (data) => {
  const errors = {};
  
  const identifierResult = validateIdentifier(data.identifier);
  if (!identifierResult.valid) errors.identifier = identifierResult.message;
  
  const rememberResult = validateRememberMe(data.rememberMe);
  if (!rememberResult.valid) errors.rememberMe = rememberResult.message;
  
  return errors;
};

// Password login
export const validatePasswordLogin = (data) => {
  const errors = validateBaseLogin(data);
  
  const passwordResult = validatePasswordField(data.password);
  if (!passwordResult.valid) errors.password = passwordResult.message;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// OTP request
export const validateOtpRequest = (data) => {
  const errors = validateBaseLogin(data);
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// OTP verification
export const validateOtpVerify = (data) => {
  const errors = validateBaseLogin(data);
  
  const otpResult = validateOtp(data.otp);
  if (!otpResult.valid) errors.otp = otpResult.message;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Admin login
export const validateAdminLogin = (data) => {
  const errors = validateBaseLogin(data);
  
  const passwordResult = validateStrongPasswordField(data.password);
  if (!passwordResult.valid) errors.password = passwordResult.message;
  
  if (data.adminCode && data.adminCode.trim() === "") {
    errors.adminCode = "Admin code is required";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Signup validation
export const validateSignup = (data) => {
  const errors = {};
  
  // Personal info
  const firstNameResult = validateFirstName(data.firstName);
  if (!firstNameResult.valid) errors.firstName = firstNameResult.message;
  
  const lastNameResult = validateLastName(data.lastName);
  if (!lastNameResult.valid) errors.lastName = lastNameResult.message;
  
  // Contact info
  const emailResult = validateEmailField(data.email);
  if (!emailResult.valid) errors.email = emailResult.message;
  
  if (data.phone) {
    const phoneResult = validatePhoneField(data.phone);
    if (!phoneResult.valid) errors.phone = phoneResult.message;
  }
  
  // Password info
  const passwordResult = validateStrongPasswordField(data.password);
  if (!passwordResult.valid) errors.password = passwordResult.message;
  
  const confirmResult = validatePasswordConfirm(data.password, data.confirmPassword);
  if (!confirmResult.valid) errors.confirmPassword = confirmResult.message;
  
  // Agreements
  if (data.agreeToTerms !== true) {
    errors.agreeToTerms = "You must agree to the terms and conditions";
  }
  
  if (data.subscribeNewsletter && typeof data.subscribeNewsletter !== "boolean") {
    errors.subscribeNewsletter = "Invalid newsletter preference";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Admin signup
export const validateAdminSignup = (data) => {
  const baseResult = validateSignup(data);
  
  if (!baseResult.isValid) return baseResult;
  
  const errors = baseResult.errors;
  
  if (!data.adminInviteCode || data.adminInviteCode.trim() === "") {
    errors.adminInviteCode = "Admin invite code is required";
  }
  
  if (!data.department || data.department.trim() === "") {
    errors.department = "Department is required";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Profile update
export const validateProfileUpdate = (data) => {
  const errors = {};
  
  if (data.firstName) {
    const result = validateFirstName(data.firstName);
    if (!result.valid) errors.firstName = result.message;
  }
  
  if (data.lastName) {
    const result = validateLastName(data.lastName);
    if (!result.valid) errors.lastName = result.message;
  }
  
  if (data.phone) {
    const result = validatePhoneField(data.phone);
    if (!result.valid) errors.phone = result.message;
  }
  
  if (data.email) {
    const result = validateEmailField(data.email);
    if (!result.valid) errors.email = result.message;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Password change
export const validatePasswordChange = (data) => {
  const errors = {};
  
  const currentResult = validatePasswordField(data.currentPassword);
  if (!currentResult.valid) errors.currentPassword = currentResult.message;
  
  const newResult = validateStrongPasswordField(data.newPassword);
  if (!newResult.valid) errors.newPassword = newResult.message;
  
  const confirmResult = validatePasswordConfirm(data.newPassword, data.confirmNewPassword);
  if (!confirmResult.valid) errors.confirmNewPassword = confirmResult.message;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};