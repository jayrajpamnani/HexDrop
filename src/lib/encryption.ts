import crypto from "crypto";

interface EncryptionResult {
  encrypted: Buffer;
  iv: string;
  authTag: string;
}

const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

export async function encryptFile(
  file: Buffer,
  key: string
): Promise<EncryptionResult> {
  const iv = crypto.randomBytes(IV_LENGTH);
  // Derive a 32-byte key from the recipient key string
  const hashedKey = crypto.createHash("sha256").update(key).digest();
  
  if (hashedKey.length !== KEY_LENGTH) {
    throw new Error("Invalid key length");
  }

  const cipher = crypto.createCipheriv(ALGORITHM, hashedKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(file),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return { 
    encrypted, 
    iv: iv.toString("hex"), 
    authTag: authTag.toString("hex") 
  };
}

export async function decryptFile(
  encrypted: Buffer,
  key: string,
  ivHex: string,
  authTagHex: string
): Promise<Buffer> {
  const iv = Buffer.from(ivHex, "hex");
  const hashedKey = crypto.createHash("sha256").update(key).digest();
  
  if (hashedKey.length !== KEY_LENGTH) {
    throw new Error("Invalid key length");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, hashedKey, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted;
} 