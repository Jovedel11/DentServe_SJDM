import React from "react";
import { FiCamera } from "react-icons/fi";
import { useClinicImageUpload } from "@/core/hooks/useClinicImageUpload";
import { FaBuilding } from "react-icons/fa";

export const ClinicAvatar = ({
  imageUrl,
  name,
  clinicId,
  onImageUpdate,
  size = "lg",
  editable = true,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
    xl: "w-24 h-24",
  };

  const {
    selectFile,
    uploadFile,
    preview,
    isProcessing,
    canUpload,
    error,
    success,
  } = useClinicImageUpload(clinicId, {
    onUploadSuccess: (result) => {
      if (onImageUpdate) {
        onImageUpdate(result.imageUrl);
      }
    },
  });

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const result = await selectFile(file);
      if (result.success && canUpload) {
        await uploadFile();
      }
    }
  };

  const currentImage = preview || imageUrl;

  if (!editable) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <div
          className={`${sizeClasses[size]} bg-muted rounded-lg overflow-hidden flex items-center justify-center`}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={name || "Clinic"}
              className="w-full h-full object-cover"
            />
          ) : (
            <FaBuilding
              className={`${
                size === "lg" ? "w-8 h-8" : "w-6 h-6"
              } text-muted-foreground`}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-muted rounded-lg overflow-hidden flex items-center justify-center cursor-pointer group relative`}
        onClick={() =>
          document.getElementById(`clinic-file-${clinicId}`)?.click()
        }
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={name || "Clinic"}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <FaBuilding
            className={`${
              size === "lg" ? "w-8 h-8" : "w-6 h-6"
            } text-muted-foreground`}
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiCamera className="text-white text-xl" />
          )}
        </div>
      </div>

      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground border-4 border-card flex items-center justify-center shadow-lg">
        <FiCamera className="w-4 h-4" />
      </div>

      <input
        id={`clinic-file-${clinicId}`}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={isProcessing}
        className="hidden"
      />

      {/* Status Messages */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
          {success}
        </div>
      )}
    </div>
  );
};
