import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileAccepted: (file: File) => void;
  className?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
}

export function FileUploader({
  onFileAccepted,
  className,
  accept,
  maxSize,
  disabled = false,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
        isDragActive && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <input {...getInputProps()} aria-label="File upload" />
      {isDragActive ? (
        <p className="text-primary">Drop the file here ...</p>
      ) : isDragReject ? (
        <p className="text-destructive">File type not supported</p>
      ) : (
        <p>
          Drag &apos;n&apos; drop a file here, or click to select a file
          {maxSize && (
            <span className="block text-sm text-muted-foreground mt-1">
              Max file size: {Math.round(maxSize / 1024 / 1024)}MB
            </span>
          )}
        </p>
      )}
    </div>
  );
} 