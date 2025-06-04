import crypto from "crypto";

export async function encryptFile(
  file: Buffer,
  key: string
): Promise<{ encrypted: Buffer; iv: string; authTag: string }> {
  const iv = crypto.randomBytes(16);
  // Derive a 32-byte key from the recipient key string
  const hashedKey = crypto.createHash("sha256").update(key).digest();
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    hashedKey,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(file),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return { encrypted, iv: iv.toString("hex"), authTag: authTag.toString("hex") };
}

export async function decryptFile(
  encrypted: Buffer,
  key: string,
  ivHex: string,
  authTagHex: string
): Promise<Buffer> {
  const iv = Buffer.from(ivHex, "hex");
  const hashedKey = crypto.createHash("sha256").update(key).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", hashedKey, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  return decrypted;
} 