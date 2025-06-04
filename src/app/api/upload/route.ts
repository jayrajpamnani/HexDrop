import { NextRequest, NextResponse } from "next/server";
import { encryptFile } from "@/lib/encryption";
import { uploadToS3 } from "@/lib/storage";
import { prisma } from "@/lib/db";

function generate6DigitKey() {
  return Math.floor(100000 + Math.random() * 900000);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Manual validation for file
    if (!file || typeof file !== "object" || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2GB)" }, { status: 400 });
    }
    if (!file.type) {
      return NextResponse.json({ error: "File type missing" }, { status: 400 });
    }

    // Generate a unique 6-digit key
    let uniqueKey = 0;
    let exists = true;
    while (exists) {
      uniqueKey = generate6DigitKey();
      exists = !!(await prisma.fileTransfer.findUnique({ where: { uniqueKey } }));
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Encrypt file
    const { encrypted, iv, authTag } = await encryptFile(buffer, String(uniqueKey));

    // Upload to S3
    const s3Key = `uploads/${uniqueKey}/${file.name}`;
    await uploadToS3({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      Body: encrypted,
      ContentType: file.type,
    });

    // Save metadata to database
    await prisma.fileTransfer.create({
      data: {
        uniqueKey,
        fileName: file.name,
        fileSize: BigInt(file.size),
        mimeType: file.type,
        s3Key,
        encryptionIV: iv,
        authTag,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return NextResponse.json({ key: uniqueKey });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 