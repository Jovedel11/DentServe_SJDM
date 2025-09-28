import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUpload,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiLoader,
  FiImage,
  FiCamera,
} from "react-icons/fi";
import { useImageUpload } from "@/core/hooks/useImageUpload";
import { FaCompress } from "react-icons/fa";

const ImageUpload = ({
  // Upload configuration
  uploadType = "general", // 'profile', 'clinic', 'doctor', 'general'
  entityId = null, // For clinic/doctor uploads

  // Current state
  currentImageUrl,
  onImageUpdate,

  // Styling
  className = "",
  variant = "default", // 'default', 'avatar', 'card', 'banner'
  size = "md", // 'sm', 'md', 'lg', 'xl', 'full'
  aspectRatio = "square", // 'square', 'wide', 'tall', 'auto'

  // Display options
  showPreview = true,
  showProgress = true,
  showFileInfo = true,
  showGuidelines = true,

  // Upload options
  allowedTypes,
  maxFileSize,
  compressionOptions,
  cloudinaryOptions,

  ...props
}) => {
  const fileInputRef = useRef(null);

  const {
    uploadState,
    preview,
    originalFile,
    compressedFile,
    error,
    success,
    isProcessing,
    canUpload,
    uploadConfig,
    selectFile,
    uploadFile,
    cancelUpload,
    reset,
  } = useImageUpload({
    uploadType,
    entityId,
    onUploadSuccess: (result) => {
      if (onImageUpdate) {
        onImageUpdate(result.imageUrl);
      }
    },
    allowedTypes,
    maxFileSize,
    ...compressionOptions,
    ...cloudinaryOptions,
  });

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    await selectFile(file);
  };

  // Handle upload
  const handleUpload = async () => {
    await uploadFile();
  };

  // Size configurations
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-48 h-48",
    full: "w-full",
  };

  // Aspect ratio configurations
  const aspectRatioClasses = {
    square: "aspect-square",
    wide: "aspect-video",
    tall: "aspect-[3/4]",
    auto: "",
  };

  // Variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case "avatar":
        return "rounded-full border-4 border-white shadow-lg";
      case "card":
        return "rounded-xl border-2 border-gray-200";
      case "banner":
        return "rounded-lg w-full h-48";
      default:
        return "rounded-lg border-2 border-gray-200";
    }
  };

  // Get size classes based on variant and size
  const getSizeClasses = () => {
    if (variant === "banner" || size === "full") {
      return "w-full h-48";
    }
    return sizeClasses[size];
  };

  const currentImage = preview || currentImageUrl;

  return (
    <div className={`image-upload ${className}`} {...props}>
      {/* Image Display */}
      {showPreview && (
        <div className="relative group mb-4">
          <div
            className={`relative overflow-hidden ${getVariantClasses()} ${
              aspectRatio === "auto" ? "" : aspectRatioClasses[aspectRatio]
            } ${getSizeClasses()}`}
          >
            {currentImage ? (
              <img
                src={currentImage}
                alt={`${uploadType} preview`}
                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <FiImage className="text-4xl text-gray-400" />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <FiCamera className="text-white text-2xl" />
            </div>

            {/* Processing overlay */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center text-white">
                    {uploadState.isCompressing ? (
                      <>
                        <FaCompress className="text-2xl mb-2 mx-auto animate-pulse" />
                        <span className="text-xs">Compressing...</span>
                      </>
                    ) : (
                      <>
                        <FiLoader className="text-2xl mb-2 mx-auto animate-spin" />
                        <span className="text-xs">
                          {showProgress && uploadState.progress > 0
                            ? `${Math.round(uploadState.progress)}%`
                            : "Uploading..."}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress ring for circular progress */}
          <AnimatePresence>
            {showProgress &&
              uploadState.isUploading &&
              uploadState.progress > 0 &&
              variant === "avatar" && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="2"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: uploadState.progress / 100 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{
                        pathLength: uploadState.progress / 100,
                        strokeDasharray: "1 1",
                      }}
                    />
                  </svg>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={
          allowedTypes?.join(",") || "image/jpeg,image/jpg,image/png,image/webp"
        }
        onChange={handleFileSelect}
        disabled={isProcessing}
        className="hidden"
      />

      {/* Upload Button */}
      <div className="space-y-3">
        <motion.button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: isProcessing ? 1 : 1.02 }}
          whileTap={{ scale: isProcessing ? 1 : 0.98 }}
        >
          <FiImage className="text-lg" />
          <span className="font-medium">
            {isProcessing
              ? "Processing..."
              : currentImage
              ? `Change ${uploadType} Image`
              : `Choose ${uploadType} Image`}
          </span>
        </motion.button>

        {/* File Info */}
        <AnimatePresence>
          {showFileInfo && originalFile && (
            <motion.div
              className="p-3 bg-gray-50 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Original:</span>
                <span className="font-medium">
                  {(originalFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              {compressedFile && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Compressed:</span>
                  <span className="font-medium text-green-600">
                    {(compressedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <AnimatePresence>
          {preview && !success && (
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {!uploadState.isUploading ? (
                <>
                  <motion.button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all duration-300 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: canUpload ? 1.02 : 1 }}
                    whileTap={{ scale: canUpload ? 0.98 : 1 }}
                  >
                    <FiUpload className="text-lg" />
                    <span>Upload</span>
                  </motion.button>
                  <motion.button
                    onClick={reset}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium transition-all duration-300 hover:bg-gray-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiX className="text-lg" />
                  </motion.button>
                </>
              ) : (
                <motion.button
                  onClick={cancelUpload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium transition-all duration-300 hover:bg-red-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiX className="text-lg" />
                  <span>Cancel Upload</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <FiAlertCircle className="text-lg flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <FiCheck className="text-lg flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Guidelines */}
      {showGuidelines && (
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>
            • Maximum file size:{" "}
            {Math.round(
              (uploadConfig.maxSizeMB || maxFileSize || 5 * 1024 * 1024) /
                1024 /
                1024
            )}
            MB (auto-compressed)
          </p>
          <p>
            • Supported formats:{" "}
            {(allowedTypes || ["JPEG", "PNG", "WebP"])
              .map((type) =>
                type.includes("/") ? type.split("/")[1].toUpperCase() : type
              )
              .join(", ")}
          </p>
          <p>• Images are automatically optimized for {uploadType} use</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
