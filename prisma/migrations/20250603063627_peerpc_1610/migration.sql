-- CreateTable
CREATE TABLE "FileTransfer" (
    "id" TEXT NOT NULL,
    "uniqueKey" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "encryptionIV" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER NOT NULL DEFAULT 1,
    "password" TEXT,

    CONSTRAINT "FileTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileTransfer_uniqueKey_key" ON "FileTransfer"("uniqueKey");
