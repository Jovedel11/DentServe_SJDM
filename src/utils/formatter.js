// Utility functions that work with our validation
export const detectInputType = (identifier) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(identifier) ? "email" : "phone";
};

export const formatPhone = (phone) => {
  return phone.replace(/[^\d+]/g, "");
};

export const formatFormErrors = (zodError) => {
  const fieldErrors = {};
  zodError?.error?.forEach((error) => {
    const path = error.path[0];
    if (path) {
      fieldErrors[path] = error.message;
    }
  });
  return fieldErrors;
};