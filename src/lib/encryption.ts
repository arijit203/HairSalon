import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET = process.env.ENCRYPTION_KEY || "wyapar-secret-default-key-for-identity-proof-enc";

// Generate a 32-byte key from the SECRET using SHA-256
const KEY = crypto.createHash("sha256").update(SECRET).digest();

/**
 * Encrypts cleartext using AES-256-CBC.
 * Returns a colon-separated string of the IV and ciphertext.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts ciphertext back to plain text.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  const ivHex = parts.shift();
  if (!ivHex) throw new Error("Invalid encrypted data format (missing IV)");
  
  const iv = Buffer.from(ivHex, "hex");
  const encryptedHex = parts.join(":");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
