import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Integration secrets are encrypted at rest with AES-256-GCM.
 * The key is derived from ENCRYPTION_KEY so rotating the env var invalidates
 * old ciphertexts loudly instead of silently returning garbage.
 */
function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set to at least 32 characters");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !dataPart) {
    throw new Error("Malformed credential ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Mask a secret for display: sk-…4f2a */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 8) return "•".repeat(plaintext.length);
  return `${plaintext.slice(0, 3)}…${plaintext.slice(-4)}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
