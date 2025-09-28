import React from "react";
import ImageUpload from "./ImageUpload";

const DoctorImageUpload = ({
  doctorId,
  currentImageUrl,
  onImageUpdate,
  className,
  variant = "avatar",
  size = "lg",
  ...props
}) => {
  return (
    <ImageUpload
      uploadType="doctor"
      entityId={doctorId}
      currentImageUrl={currentImageUrl}
      onImageUpdate={onImageUpdate}
      variant={variant}
      size={size}
      className={className}
      compressionOptions={{
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
      }}
      {...props}
    />
  );
};

export default DoctorImageUpload;
