import { NextRequest, NextResponse } from "next/server";
import { encryptFile } from "@/lib/encryption";
import { uploadToS3 } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const EXPIRY_HOURS = 24;

const fileSchema = z.object({
  name: z.string().min(1),
  size: z.number().max(MAX_FILE_SIZE),
  type: z.string().min(1),
});

function generate6DigitKey(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

interface UploadResponse {
  key?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    // Validate file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded or invalid file" },
        { status: 400 }
      );
    }

    // Validate file properties
    try {
      fileSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((issue) => issue.message);
        return NextResponse.json(
          { error: `Invalid file: ${issues.join(", ")}` },
          { status: 400 }
        );
      }
      throw error;
    }

    // Generate a unique 6-digit key
    let uniqueKey = 0;
    let exists = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (exists && attempts < MAX_ATTEMPTS) {
      uniqueKey = generate6DigitKey();
      exists = !!(await prisma.fileTransfer.findUnique({ where: { uniqueKey } }));
      attempts++;
    }

    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Failed to generate unique key" },
        { status: 500 }
      );
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Encrypt file
    const { encrypted, iv, authTag } = await encryptFile(buffer, String(uniqueKey));

    // Upload to S3
    const s3Key = `uploads/${uniqueKey}/${file.name}`;
    try {
      await uploadToS3({
        Bucket: process.env["AWS_S3_BUCKET"]!,
        Key: s3Key,
        Body: encrypted,
        ContentType: file.type,
      });
    } catch (error) {
      console.error("S3 upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Save metadata to database
    try {
      await prisma.fileTransfer.create({
        data: {
          uniqueKey,
          fileName: file.name,
          fileSize: BigInt(file.size),
          mimeType: file.type,
          s3Key,
          encryptionIV: iv,
          authTag,
          expiresAt: new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      console.error("Database error:", error);
      // Attempt to clean up S3 upload
      try {
        await prisma.$transaction(async (tx) => {
          await tx.fileTransfer.delete({ where: { uniqueKey } });
        });
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
      return NextResponse.json(
        { error: "Failed to save file metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({ key: uniqueKey });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 