import React from "react";
import { FiCamera } from "react-icons/fi";
import { useImageUpload } from "@/core/hooks/useImageUpload";
import { FaBuilding } from "react-icons/fa";

/**
 * Clinic Avatar Component with immediate upload (no edit mode required)
 * Used in: Staff Profile, Clinic Management
 */
export const ClinicAvatar = ({
  clinicId,
  imageUrl,
  clinicName,
  onImageUpdate,
  size = "lg",
  editable = true,
  className = "",
}) => {
  const {
    uploadState,
    preview,
    error,
    success,
    isProcessing,
    selectAndUpload,
  } = useImageUpload({
    uploadType: "clinic",
    entityId: clinicId,
    onUploadSuccess: async (result) => {
      console.log("🏥 Clinic image uploaded successfully:", result.imageUrl);
      if (onImageUpdate) {
        await onImageUpdate(result.imageUrl);
      }
    },
    onUploadError: (error) => {
      console.error("🏥 Clinic image upload error:", error);
    },
  });

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
    xl: "w-24 h-24",
    xxl: "w-32 h-32",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
    xxl: "w-10 h-10",
  };

  // 🔥 **FIXED: Auto upload on file select**
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && clinicId) {
      await selectAndUpload(file);
    } else if (!clinicId) {
      console.error("Clinic ID is required for clinic image upload");
    }
    // Reset input value to allow selecting same file again
    event.target.value = "";
  };

  const currentImage = preview || imageUrl;

  if (!editable) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <div
          className={`${sizeClasses[size]} bg-muted rounded-lg overflow-hidden flex items-center justify-center border-2 border-border`}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={clinicName || "Clinic"}
              className="w-full h-full object-cover"
            />
          ) : (
            <FaBuilding
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
        } bg-muted rounded-lg overflow-hidden flex items-center justify-center border-2 border-border cursor-pointer transition-all duration-300 hover:border-primary ${
          isProcessing ? "opacity-70" : ""
        }`}
        onClick={() =>
          !isProcessing &&
          clinicId &&
          document.getElementById(`clinic-image-input-${clinicId}`)?.click()
        }
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={clinicName || "Clinic"}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <FaBuilding
            className={`${iconSizeClasses[size]} text-muted-foreground`}
          />
        )}

        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiCamera className="text-white text-xl" />
          )}
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-primary bg-opacity-20 flex items-center justify-center">
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
      {clinicId && (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground border-2 border-card flex items-center justify-center shadow-lg">
          <FiCamera className="w-3 h-3" />
        </div>
      )}

      {/* Hidden file input */}
      {clinicId && (
        <input
          id={`clinic-image-input-${clinicId}`}
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

      {/* Show clinic ID requirement */}
      {!clinicId && (
        <div className="absolute top-full left-0 right-0 mt-2 z-10">
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
            Clinic ID required for image upload
          </div>
        </div>
      )}
    </div>
  );
};
