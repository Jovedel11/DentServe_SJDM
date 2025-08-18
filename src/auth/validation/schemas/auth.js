import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateStrongPassword,
  createValidation
} from "../rules/typicalRules.js";

// Identifier validation (email or phone)
export const validateIdentifier = (identifier) => {
  if (!identifier || identifier.trim() === "") return createValidation(false, "Email or phone is required");
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanedPhone = identifier.replace(/\s+/g, "");
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  
  const isEmail = emailRegex.test(identifier);
  const isPhone = phoneRegex.test(cleanedPhone);
  
  if (!isEmail && !isPhone) return createValidation(false, "Please enter a valid email address or phone number");
  
  return createValidation(false, "Please enter a valid email address or phone number", identifier);
};

// Individual field validators
export const validateEmailField = validateEmail;
export const validatePhoneField = validatePhone;
export const validatePasswordField = validatePassword;
export const validateStrongPasswordField = validateStrongPassword;

// Other field validators
export const validateRememberMe = (value) => 
  (typeof value === "boolean") 
    ? createValidation(true) 
    : createValidation(false, "Invalid remember me value");

export const validateOtp = (otp) => 
  (/^\d{6}$/.test(otp))
    ? createValidation(true, null, otp)
    : createValidation(false, "OTP must be exactly 6 digits");

export const validateName = (name, fieldName) => {
  if (!name || name.trim() === "")
    return createValidation(false, `${fieldName} is required`, name);

  if (name.length < 2)
    return createValidation(false, `${fieldName} must be at least 2 characters`, name);

  if (name.length > 50)
    return createValidation(false, `${fieldName} is too long`, name);

  if (!/^[a-zA-Z\s]+$/.test(name))
    return createValidation(false, `${fieldName} can only contain letters and spaces`, name);

  return createValidation(true, null, name.trim());
}

export const validateFirstName = (name) => validateName(name, "First name");
export const validateLastName = (name) => validateName(name, "Last name");