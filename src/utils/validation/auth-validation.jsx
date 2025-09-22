// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return { isValid: false, error: "Email is required" };
  if (!emailRegex.test(email))
    return { isValid: false, error: "Invalid email format" };
  return { isValid: true, error: null };
};

// Phone validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phone) return { isValid: false, error: "Phone number is required" };
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""))) {
    return { isValid: false, error: "Invalid phone number format" };
  }
  return { isValid: true, error: null };
};

// Password validation
export const validatePassword = (password) => {
  if (!password) return { isValid: false, error: "Password is required" };

  if (password.length < 8)
    return { isValid: false, error: "Password must be at least 8 characters" };

  if (!/(?=.*[a-z])/.test(password))
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };

  if (!/(?=.*[A-Z])/.test(password))
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };

  if (!/(?=.*\d)/.test(password))
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };

  if (!/(?=.*[\W_])/.test(password))
    return {
      isValid: false,
      error: "Password must contain at least one special character",
    };

  return { isValid: true, error: null };
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword)
    return { isValid: false, error: "Please confirm your password" };
  if (password !== confirmPassword)
    return { isValid: false, error: "Passwords do not match" };
  return { isValid: true, error: null };
};

// Name validation
export const validateName = (name, fieldName = "Name") => {
  if (!name) return { isValid: false, error: `${fieldName} is required` };
  if (name.length < 2)
    return {
      isValid: false,
      error: `${fieldName} must be at least 2 characters`,
    };
  if (!/^[a-zA-Z\s]+$/.test(name))
    return {
      isValid: false,
      error: `${fieldName} can only contain letters and spaces`,
    };
  return { isValid: true, error: null };
};

// OTP validation
export const validateOTP = (otp) => {
  if (!otp) return { isValid: false, error: "OTP is required" };
  if (!/^\d{6}$/.test(otp))
    return { isValid: false, error: "OTP must be 6 digits" };
  return { isValid: true, error: null };
};

// Login form validation
export const validateLoginForm = (credentials, loginMethod) => {
  const errors = {};

  // Email validation
  if (!credentials.email) {
    errors.email = "Email is required";
  } else if (!/^\S+@\S+\.\S+$/.test(credentials.email)) {
    errors.email = "Invalid email format";
  }

  // Password validation (only for email-password method)
  if (loginMethod === "email-password") {
    if (!credentials.password) {
      errors.password = "Password is required";
    } else if (credentials.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Signup form validation
export const validateSignupForm = (formData) => {
  const errors = {};

  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) errors.email = emailValidation.error;

  const firstNameValidation = validateName(formData.first_name, "First name");
  if (!firstNameValidation.isValid)
    errors.first_name = firstNameValidation.error;

  const lastNameValidation = validateName(formData.last_name, "Last name");
  if (!lastNameValidation.isValid) errors.last_name = lastNameValidation.error;

  const phoneValidation = validatePhone(formData.phone);
  if (!phoneValidation.isValid) errors.phone = phoneValidation.error;

  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) errors.password = passwordValidation.error;

  const confirmPasswordValidation = validateConfirmPassword(
    formData.password,
    formData.confirmPassword
  );
  if (!confirmPasswordValidation.isValid)
    errors.confirmPassword = confirmPasswordValidation.error;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
