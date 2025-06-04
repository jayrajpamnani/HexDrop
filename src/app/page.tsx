"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressTracker } from "@/components/ProgressTracker";
import { toast } from "sonner";

interface UploadResponse {
  key: number;
  error?: string;
}

interface DownloadResponse {
  error?: string;
}

export default function HomePage() {
  // Send state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedKey, setGeneratedKey] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receive state
  const [receiveKey, setReceiveKey] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setGeneratedKey(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as UploadResponse;

      if (response.ok && data.key) {
        setGeneratedKey(data.key);
        toast.success("File uploaded successfully!");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during upload.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file download
  const handleDownload = async () => {
    if (!receiveKey.match(/^\d{6}$/)) {
      toast.error("Please enter a valid 6-digit key.");
      return;
    }
    setDownloading(true);
    setDownloadProgress(0);

    try {
      const response = await fetch(`/api/download/${receiveKey}`);
      if (!response.ok) {
        const data = (await response.json()) as DownloadResponse;
        toast.error(data.error || "Download failed");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      let filename = "downloaded-file";
      if (disposition) {
        // Parse RFC 6266 format: filename*=UTF-8''encoded-filename
        const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        } else {
          // Fallback to regular filename if RFC 6266 format is not present
          const fallbackMatch = disposition.match(/filename="([^"]+)"/);
          if (fallbackMatch && fallbackMatch[1]) {
            filename = fallbackMatch[1];
          }
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("File downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("An error occurred during download.");
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <h1 className="text-4xl font-bold mb-8 text-red-600 text-center drop-shadow">
        HexDrop: Private, encrypted file delivery
      </h1>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-2xl">
        {/* Send Card */}
        <Card className="flex-1 p-6 flex flex-col items-center bg-white border-red-200 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-black">Send</h2>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
            aria-label="Select file to upload"
          />
          <Button
            className="bg-red-600 hover:bg-red-700 text-white w-16 h-16 rounded-full text-4xl flex items-center justify-center mb-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Open file selector"
          >
            +
          </Button>
          {file && (
            <div className="mb-2 text-sm text-gray-700" role="status">
              Selected file: {file.name}
            </div>
          )}
          <Button
            className="bg-red-600 hover:bg-red-700 text-white w-full mt-2"
            onClick={handleUpload}
            disabled={!file || uploading}
            aria-label={uploading ? "Uploading file..." : "Upload file"}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          {uploading && (
            <ProgressTracker
              progress={uploadProgress}
              label="Uploading..."
              aria-label={`Upload progress: ${uploadProgress}%`}
            />
          )}
          {generatedKey && (
            <div className="mt-4 text-center">
              <div className="text-gray-700 mb-1">Share this key with the receiver:</div>
              <div
                className="text-3xl font-mono text-red-600 bg-gray-100 rounded px-4 py-2 inline-block"
                role="status"
                aria-label={`Generated key: ${generatedKey}`}
              >
                {generatedKey}
              </div>
            </div>
          )}
        </Card>
        {/* Receive Card */}
        <Card className="flex-1 p-6 flex flex-col items-center bg-white border-red-200 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-black">Receive</h2>
          <input
            type="text"
            placeholder="Input key"
            className="border border-red-200 rounded px-4 py-2 mb-4 w-full text-center text-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            value={receiveKey}
            onChange={(e) =>
              setReceiveKey(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
            }
            disabled={downloading}
            maxLength={6}
            aria-label="Enter 6-digit key"
            pattern="[0-9]*"
            inputMode="numeric"
          />
          <Button
            className="bg-red-600 hover:bg-red-700 text-white w-full"
            onClick={handleDownload}
            disabled={downloading || receiveKey.length !== 6}
            aria-label={downloading ? "Downloading file..." : "Download file"}
          >
            {downloading ? "Downloading..." : "Download"}
          </Button>
          {downloading && (
            <ProgressTracker
              progress={downloadProgress}
              label="Downloading..."
              aria-label={`Download progress: ${downloadProgress}%`}
            />
          )}
        </Card>
      </div>
    </main>
  );
}
