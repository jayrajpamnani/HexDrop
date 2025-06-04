/*
  Warnings:

  - Added the required column `authTag` to the `FileTransfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileTransfer" ADD COLUMN     "authTag" TEXT NOT NULL;
