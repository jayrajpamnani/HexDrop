import { NextRequest, NextResponse } from "next/server";
import { getFromS3 } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { decryptFile } from "@/lib/encryption";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key: keyStr } = await params;
    const key = parseInt(keyStr, 10);
    if (isNaN(key) || key < 100000 || key > 999999) {
      return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
    }

    // Validate key
    const fileTransfer = await prisma.fileTransfer.findUnique({
      where: { uniqueKey: key },
    });
    if (!fileTransfer) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    // Check download limits
    if (fileTransfer.downloadCount >= fileTransfer.maxDownloads) {
      return NextResponse.json({ error: "Download limit exceeded" }, { status: 403 });
    }

    // Fetch from S3
    const s3Response = await getFromS3({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileTransfer.s3Key,
    });

    if (!s3Response.Body) {
      return NextResponse.json({ error: "File not found in S3" }, { status: 404 });
    }

    // Decrypt file
    const encrypted = Buffer.from(await s3Response.Body.transformToByteArray());
    const decrypted = await decryptFile(
      encrypted,
      String(fileTransfer.uniqueKey),
      fileTransfer.encryptionIV,
      fileTransfer.authTag
    );

    // Update download count
    await prisma.fileTransfer.update({
      where: { id: fileTransfer.id },
      data: { downloadCount: { increment: 1 } },
    });

    // Stream to user
    return new NextResponse(decrypted, {
      headers: {
        "Content-Type": fileTransfer.mimeType,
        "Content-Disposition": `attachment; filename="${fileTransfer.fileName}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 