export const validateFile = (file) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return "Please select a valid image file (JPEG, PNG, or WebP)";
  }

  if (file.size > maxSize) {
    return "File size must be less than 5MB";
  }

  return null;
};
