import React from "react";
import { FiCamera, FiUser, FiSave } from "react-icons/fi";
import { useImageUpload } from "@/core/hooks/useImageUpload";

/**
 * Doctor Avatar Component with immediate upload (no edit mode required)
 * Used in: Staff Profile, Doctor Management
 */
export const DoctorAvatar = ({
  doctorId,
  imageUrl,
  doctorName,
  onImageUpdate,
  size = "lg",
  editable = true,
  className = "",
}) => {
  // 🔥 **IMPROVED: Better validation for doctor IDs**
  const isValidDoctorId =
    doctorId &&
    !doctorId.toString().startsWith("new_") &&
    doctorId.toString().length > 10; // UUID length check

  const {
    uploadState,
    preview,
    error,
    success,
    isProcessing,
    selectAndUpload,
  } = useImageUpload({
    uploadType: "doctor",
    entityId: isValidDoctorId ? doctorId : null,
    onUploadSuccess: async (result) => {
      console.log("👨‍⚕️ Doctor image uploaded successfully:", result.imageUrl);
      if (onImageUpdate) {
        await onImageUpdate(result.imageUrl);
      }
    },
    onUploadError: (error) => {
      console.error("👨‍⚕️ Doctor image upload error:", error);
    },
  });

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    xxl: "w-24 h-24",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
    xxl: "w-10 h-10",
  };

  // 🔥 **IMPROVED: Auto upload with better error handling**
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && isValidDoctorId) {
      await selectAndUpload(file);
    } else if (!isValidDoctorId) {
      console.error("Valid doctor ID is required for doctor image upload");
    }
    // Reset input value to allow selecting same file again
    event.target.value = "";
  };

  const currentImage = preview || imageUrl;

  if (!editable) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <div
          className={`${sizeClasses[size]} bg-muted rounded-full overflow-hidden flex items-center justify-center border-2 border-border`}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={doctorName || "Doctor"}
              className="w-full h-full object-cover"
            />
          ) : (
            <FiUser
              className={`${iconSizeClasses[size]} text-muted-foreground`}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 group ${className}`}>
      <div
        className={`${
          sizeClasses[size]
        } bg-muted rounded-full overflow-hidden flex items-center justify-center border-2 border-border transition-all duration-300 ${
          isValidDoctorId
            ? "cursor-pointer hover:border-primary"
            : "cursor-not-allowed opacity-60"
        } ${isProcessing ? "opacity-70" : ""}`}
        onClick={() =>
          !isProcessing &&
          isValidDoctorId &&
          document.getElementById(`doctor-image-input-${doctorId}`)?.click()
        }
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={doctorName || "Doctor"}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <FiUser
            className={`${iconSizeClasses[size]} text-muted-foreground`}
          />
        )}

        {/* Upload overlay */}
        {isValidDoctorId && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full">
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiCamera className="text-white text-sm" />
            )}
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-primary bg-opacity-20 flex items-center justify-center rounded-full">
            <div className="text-center text-primary">
              {uploadState.isCompressing ? (
                <div className="text-xs font-medium">Compressing...</div>
              ) : (
                <div className="text-xs font-medium">
                  {uploadState.progress > 0
                    ? `${Math.round(uploadState.progress)}%`
                    : "Uploading..."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Camera icon indicator */}
      {isValidDoctorId && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground border-2 border-card flex items-center justify-center shadow-lg">
          <FiCamera className="w-2.5 h-2.5" />
        </div>
      )}

      {/* Save indicator for new doctors */}
      {!isValidDoctorId && doctorId?.toString().startsWith("new_") && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 text-white border-2 border-card flex items-center justify-center shadow-lg">
          <FiSave className="w-2.5 h-2.5" />
        </div>
      )}

      {/* Hidden file input */}
      {isValidDoctorId && (
        <input
          id={`doctor-image-input-${doctorId}`}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={isProcessing}
          className="hidden"
        />
      )}

      {/* Status messages */}
      {(error || success) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-10">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
              {success}
            </div>
          )}
        </div>
      )}

      {/* Show requirements */}
      {!isValidDoctorId && (
        <div className="absolute top-full left-0 right-0 mt-2 z-10">
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
            {doctorId?.toString().startsWith("new_")
              ? "Save doctor first to upload image"
              : "Doctor ID required for image upload"}
          </div>
        </div>
      )}
    </div>
  );
};
