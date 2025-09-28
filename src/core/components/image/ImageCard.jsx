import React from "react";
import { motion } from "framer-motion";
import { FiEdit, FiTrash2, FiExternalLink, FiImage } from "react-icons/fi";
import ImageUpload from "./ImageUpload";

const ImageCard = ({
  title,
  description,
  imageUrl,
  onImageUpdate,
  onEdit,
  onDelete,
  onView,
  className = "",
  editable = false,
  showActions = true,

  // Image upload configuration
  uploadType = "general",
  entityId = null,
  uploadConfig = {},

  ...props
}) => {
  return (
    <motion.div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${className}`}
      whileHover={{ y: -2 }}
      {...props}
    >
      {/* Image Section */}
      <div className="relative">
        {editable ? (
          <ImageUpload
            uploadType={uploadType}
            entityId={entityId}
            currentImageUrl={imageUrl}
            onImageUpdate={onImageUpdate}
            variant="card"
            size="full"
            aspectRatio="wide"
            showPreview={true}
            showFileInfo={false}
            showGuidelines={false}
            className="border-0"
            {...uploadConfig}
          />
        ) : imageUrl ? (
          <div className="relative group">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-48 object-cover"
            />
            {showActions && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex gap-2">
                  {onView && (
                    <button
                      onClick={onView}
                      className="p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30 transition-all duration-200"
                    >
                      <FiExternalLink className="text-lg" />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30 transition-all duration-200"
                    >
                      <FiEdit className="text-lg" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <FiImage className="text-4xl mx-auto mb-2" />
              <p className="text-sm">No image</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-gray-600 text-sm mb-4">{description}</p>
        )}

        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex justify-end gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ImageCard;
