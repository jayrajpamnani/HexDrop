import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3ServiceException,
} from "@aws-sdk/client-s3";

if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION environment variable is not set");
}

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID environment variable is not set");
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY environment variable is not set");
}

if (!process.env.AWS_S3_BUCKET) {
  throw new Error("AWS_S3_BUCKET environment variable is not set");
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
});

interface UploadParams {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ContentType: string;
  CacheControl?: string;
  Metadata?: Record<string, string>;
}

interface GetParams {
  Bucket: string;
  Key: string;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly code?: string
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export async function uploadToS3(params: UploadParams): Promise<void> {
  try {
    const command = new PutObjectCommand({
      ...params,
      CacheControl: params.CacheControl || "no-cache",
      Metadata: {
        ...params.Metadata,
        uploadedAt: new Date().toISOString(),
      },
    } as PutObjectCommandInput);

    await s3.send(command);
  } catch (error) {
    if (error instanceof S3ServiceException) {
      throw new StorageError(
        `Failed to upload file to S3: ${error.message}`,
        error,
        error.$metadata?.httpStatusCode?.toString()
      );
    }
    throw new StorageError("Failed to upload file to S3", error);
  }
}

export async function getFromS3(params: GetParams) {
  try {
    const command = new GetObjectCommand(params as GetObjectCommandInput);
    return await s3.send(command);
  } catch (error) {
    if (error instanceof S3ServiceException) {
      throw new StorageError(
        `Failed to get file from S3: ${error.message}`,
        error,
        error.$metadata?.httpStatusCode?.toString()
      );
    }
    throw new StorageError("Failed to get file from S3", error);
  }
} 