import { useSupabaseStorage } from './useSupabaseStorage';

/**
 * Document Upload Hook
 * For PDF, DOC, and other document files
 */
export const useDocumentUpload = (options = {}) => {
  return useSupabaseStorage({
    bucket: 'documents',
    folder: 'user-documents',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    uploadPurpose: 'document',
    ...options
  });
};