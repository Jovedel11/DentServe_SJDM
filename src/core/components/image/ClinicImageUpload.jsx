import React from "react";
import ImageUpload from "./ImageUpload";

const ClinicImageUpload = ({
  clinicId,
  currentImageUrl,
  onImageUpdate,
  className,
  variant = "card",
  size = "full",
  aspectRatio = "wide",
  ...props
}) => {
  return (
    <ImageUpload
      uploadType="clinic"
      entityId={clinicId}
      currentImageUrl={currentImageUrl}
      onImageUpdate={onImageUpdate}
      variant={variant}
      size={size}
      aspectRatio={aspectRatio}
      className={className}
      compressionOptions={{
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
      }}
      {...props}
    />
  );
};

export default ClinicImageUpload;
