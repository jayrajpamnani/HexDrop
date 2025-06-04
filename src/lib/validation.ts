import { z } from "zod";

// Constants
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
] as const;

// File validation schema
export const fileSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().max(MAX_FILE_SIZE),
  type: z.enum(ALLOWED_MIME_TYPES),
});

// Upload validation schema
export const uploadSchema = z.object({
  file: fileSchema,
});

// Key validation schema
export const keySchema = z
  .string()
  .length(6)
  .regex(/^\d{6}$/)
  .transform(Number);

// Type exports
export type FileSchema = z.infer<typeof fileSchema>;
export type UploadSchema = z.infer<typeof uploadSchema>;
export type KeySchema = z.infer<typeof keySchema>;

// Validation error messages
export const VALIDATION_MESSAGES = {
  FILE_TOO_LARGE: `File size must be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
  INVALID_FILE_TYPE: "File type not supported",
  INVALID_KEY: "Key must be a 6-digit number",
  REQUIRED_FIELD: "This field is required",
} as const; 