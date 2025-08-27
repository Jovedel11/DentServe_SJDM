import React, { useState, useRef } from "react";
import { validateFile } from "@/utils/validation/file-validation";
import { useAuth } from "@/auth/context/AuthProvider";
import { imageService } from "@/services/imageService";

const ProfileUpload = ({ currentImageUrl, onImageUpdate }) => {
  const { session } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  const access_token = session?.access_token;

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setError("");
    setSuccess("");

    if (!file) {
      setPreview(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setPreview(null);
      return;
    }

    // create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("profileImage", file);

      //call service
      const result = await imageService.uploadImage(access_token, formData);

      setSuccess("Profile image updated successfully!");
      setPreview(null);
      fileInputRef.current.value = "";

      if (onImageUpdate) {
        onImageUpdate(result.imageUrl);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePreview = () => {
    setPreview(null);
    fileInputRef.current.value = "";
    setError("");
    setSuccess("");
  };

  return (
    <div className="profile-image-upload">
      <div className="current-image">
        <img
          src={preview || currentImageUrl || "/default-avatar.png"}
          alt="Profile"
          className="profile-image-preview"
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #e2e8f0",
          }}
        />
      </div>

      <div className="upload-controls" style={{ marginTop: "1rem" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          style={{ marginBottom: "1rem" }}
          disabled={isUploading}
        />

        <div className="button-group">
          <button
            onClick={handleUpload}
            disabled={isUploading || !fileInputRef.current?.files[0]}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: isUploading ? "#cbd5e0" : "#3182ce",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              cursor: isUploading ? "not-allowed" : "pointer",
              marginRight: "0.5rem",
            }}
          >
            {isUploading ? "Uploading..." : "Upload Image"}
          </button>

          {preview && (
            <button
              onClick={handleRemovePreview}
              disabled={isUploading}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#e53e3e",
                color: "white",
                border: "none",
                borderRadius: "0.25rem",
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div
          className="error-message"
          style={{
            color: "#e53e3e",
            marginTop: "0.5rem",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="success-message"
          style={{
            color: "#38a169",
            marginTop: "0.5rem",
            fontSize: "0.875rem",
          }}
        >
          {success}
        </div>
      )}

      {/* Upload guidelines */}
      <div
        className="upload-guidelines"
        style={{
          marginTop: "1rem",
          fontSize: "0.75rem",
          color: "#718096",
        }}
      >
        <p>• Maximum file size: 5MB</p>
        <p>• Supported formats: JPEG, PNG, WebP</p>
        <p>• Image will be automatically cropped to square</p>
      </div>
    </div>
  );
};

export default ProfileUpload;
