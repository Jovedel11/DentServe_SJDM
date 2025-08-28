import imageCompression from "browser-image-compression";

export const validateFile = (file, options = {}) => {
  const {
    allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxFileSize = 5 * 1024 * 1024, // 5MB
  } = options;

  if (!file) {
    return "No file provided";
  }

  if (!allowedTypes.includes(file.type)) {
    return `Please select a valid image file (${allowedTypes
      .map((type) => type.split("/")[1].toUpperCase())
      .join(", ")})`;
  }

  if (file.size > maxFileSize) {
    return `File size must be less than ${Math.round(
      maxFileSize / 1024 / 1024
    )}MB`;
  }

  return null;
};

export const compressImage = async (file, options = {}) => {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    quality: 0.8,
    ...options,
  };

  try {
    console.log(
      "Original file size:",
      (file.size / 1024 / 1024).toFixed(2),
      "MB"
    );

    const compressedFile = await imageCompression(file, defaultOptions);

    console.log(
      "Compressed file size:",
      (compressedFile.size / 1024 / 1024).toFixed(2),
      "MB"
    );

    return compressedFile;
  } catch (error) {
    console.error("Image compression failed:", error);
    return file; // Return original if compression fails
  }
};

export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error("Failed to create preview"));
    reader.readAsDataURL(file);
  });
};

// Helper to get image dimensions
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};

// Helper to resize image on canvas
export const resizeImage = (file, maxWidth, maxHeight, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      const { width, height } = img;

      let newWidth = width;
      let newHeight = height;

      if (width > height) {
        if (width > maxWidth) {
          newHeight = (height * maxWidth) / width;
          newWidth = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          newWidth = (width * maxHeight) / height;
          newHeight = maxHeight;
        }
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(resolve, file.type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
};
