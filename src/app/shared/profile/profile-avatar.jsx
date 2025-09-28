import React from "react";
import { FiCamera, FiUser } from "react-icons/fi";
import ProfileUpload from "@/core/components/image/ProfileUpload";
import { useAuth } from "@/auth/context/AuthProvider";
import ClinicImageUpload from "@/core/components/image/ClinicImageUpload";
import DoctorImageUpload from "@/core/components/image/DoctorImageUpload";

/**
 * Reusable ProfileAvatar Component
 * Used across: Patient Profile, Staff Profile, Admin Profile, Doctor Cards
 * Purpose: Consistent avatar display with upload functionality
 */
export const ProfileAvatar = ({
  imageUrl,
  name,
  onImageUpdate,
  size = "lg",
  editable = true,
  className = "",
}) => {
  const { isStaff, isAdmin } = useAuth();

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
    xl: "w-24 h-24",
  };

  if (editable && onImageUpdate) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        {isStaff ? (
          <ClinicImageUpload
            currentImageUrl={imageUrl}
            onImageUpdate={onImageUpdate}
            variant="avatar"
            size={size}
            showFileInfo={false}
            showGuidelines={false}
          />
        ) : (
          <DoctorImageUpload
            currentImageUrl={imageUrl}
            onImageUpdate={onImageUpdate}
            variant="avatar"
            size={size}
            showFileInfo={false}
            showGuidelines={false}
          />
        )}
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground border-4 border-card flex items-center justify-center shadow-lg">
          <FiCamera className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-muted rounded-full overflow-hidden flex items-center justify-center`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name || "Profile"}
            className="w-full h-full object-cover"
          />
        ) : (
          <FiUser
            className={`${
              size === "lg" ? "w-8 h-8" : "w-6 h-6"
            } text-muted-foreground`}
          />
        )}
      </div>
    </div>
  );
};
