import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3({
  Bucket,
  Key,
  Body,
  ContentType,
}: {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ContentType: string;
}) {
  const command = new PutObjectCommand({ Bucket, Key, Body, ContentType });
  return s3.send(command);
}

export async function getFromS3({
  Bucket,
  Key,
}: {
  Bucket: string;
  Key: string;
}) {
  const command = new GetObjectCommand({ Bucket, Key });
  return s3.send(command);
} 