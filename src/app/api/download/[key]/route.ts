import { NextRequest, NextResponse } from "next/server";
import { getFromS3 } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { decryptFile } from "@/lib/encryption";
import { z } from "zod";

const keySchema = z.string().regex(/^\d{6}$/).transform(Number);

interface RouteParams {
  key: string;
}

interface DownloadResponse {
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
): Promise<NextResponse<DownloadResponse | Buffer>> {
  try {
    // Validate key format
    const keyResult = keySchema.safeParse(params.key);
    if (!keyResult.success) {
      return NextResponse.json(
        { error: "Invalid key format" },
        { status: 400 }
      );
    }
    const key = keyResult.data;

    // Validate key and check expiry
    const fileTransfer = await prisma.fileTransfer.findUnique({
      where: { uniqueKey: key },
    });

    if (!fileTransfer) {
      return NextResponse.json(
        { error: "Key not found" },
        { status: 404 }
      );
    }

    if (fileTransfer.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "File has expired" },
        { status: 410 }
      );
    }

    // Check download limits
    if (fileTransfer.downloadCount >= fileTransfer.maxDownloads) {
      return NextResponse.json(
        { error: "Download limit exceeded" },
        { status: 403 }
      );
    }

    // Fetch from S3
    let s3Response;
    try {
      s3Response = await getFromS3({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileTransfer.s3Key,
      });
    } catch (error) {
      console.error("S3 fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: 500 }
      );
    }

    if (!s3Response.Body) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    // Decrypt file
    let decrypted: Buffer;
    try {
      const encrypted = Buffer.from(await s3Response.Body.transformToByteArray());
      decrypted = await decryptFile(
        encrypted,
        String(fileTransfer.uniqueKey),
        fileTransfer.encryptionIV,
        fileTransfer.authTag
      );
    } catch (error) {
      console.error("Decryption error:", error);
      return NextResponse.json(
        { error: "Failed to decrypt file" },
        { status: 500 }
      );
    }

    // Update download count
    try {
      await prisma.fileTransfer.update({
        where: { id: fileTransfer.id },
        data: { downloadCount: { increment: 1 } },
      });
    } catch (error) {
      console.error("Database update error:", error);
      // Continue with download even if count update fails
    }

    // Stream to user
    return new NextResponse(decrypted, {
      headers: {
        "Content-Type": fileTransfer.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileTransfer.fileName)}"`,
        "Content-Length": decrypted.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 