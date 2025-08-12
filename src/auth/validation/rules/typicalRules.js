// Helper function for validation results
const createValidation = (valid, message = null) => ({
  valid,
  message
});

// Email validation rule
export const validateEmail = (email) => {
  if (!email || email.trim() === "") return createValidation(false, "Email is required");
  if (email.length > 100) return createValidation(false, "Email is too long");
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return createValidation(false, "Please enter a valid email address");
  
  return createValidation(true);
};

// Phone validation rule
export const validatePhone = (phone) => {
  if (!phone || phone.trim() === "") return createValidation(false, "Phone number is required");
  
  const cleanedPhone = phone.replace(/\s+/g, "");
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  
  if (!phoneRegex.test(cleanedPhone)) return createValidation(false, "Please enter a valid phone number");
  
  return createValidation(true, cleanedPhone);
};

// Basic password rule
export const validatePassword = (password) => {
  if (!password || password.trim() === "") return createValidation(false, "Password is required");
  if (password.length < 6) return createValidation(false, "Password must be at least 6 characters");
  if (password.length > 100) return createValidation(false, "Password is too long");
  
  return createValidation(true);
};

// Strong password rule
export const validateStrongPassword = (password) => {
  const basic = validatePassword(password);
  if (!basic.valid) return basic;
  
  if (password.length < 8) return createValidation(false, "Password must be at least 8 characters");
  if (password.length > 128) return createValidation(false, "Password is too long");
  if (!/[A-Z]/.test(password)) return createValidation(false, "Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) return createValidation(false, "Password must contain at least one lowercase letter");
  if (!/\d/.test(password)) return createValidation(false, "Password must contain at least one number");
  if (!/[^A-Za-z0-9]/.test(password)) return createValidation(false, "Password must contain at least one special character");
  
  return createValidation(true);
};

// Password confirmation rule
export const validatePasswordConfirm = (password, confirmPassword) => {
  if (!confirmPassword || confirmPassword.trim() === "") return createValidation(false, "Password confirmation is required");
  if (password !== confirmPassword) return createValidation(false, "Passwords do not match");
  
  return createValidation(true);
};

// Throw error if validation fails (for your authService)
export const validateStrongPasswordThrow = (password) => {
  const result = validateStrongPassword(password);
  if (!result.valid) {
    throw new Error(result.message);
  }
  return true;
};

