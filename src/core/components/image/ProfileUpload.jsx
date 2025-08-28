import React from "react";
import ImageUpload from "@/core/components/image/ImageUpload";

const ProfileUpload = ({
  currentImageUrl,
  onImageUpdate,
  className,
  variant = "avatar",
  size = "lg",
  showFileInfo = true,
  showGuidelines = true,
  ...props
}) => {
  return (
    <ImageUpload
      currentImageUrl={currentImageUrl}
      onImageUpdate={onImageUpdate}
      variant={variant}
      size={size}
      showFileInfo={showFileInfo}
      showGuidelines={showGuidelines}
      className={className}
      {...props}
    />
  );
};

export default ProfileUpload;
