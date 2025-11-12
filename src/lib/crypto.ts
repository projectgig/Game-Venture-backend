import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

if (!process.env.TWO_FA_SECRET_KEY) {
  throw new Error(
    "Missing TWO_FA_SECRET_KEY in .env – generate a 32-byte (64-hex) key."
  );
}

if (process.env.TWO_FA_SECRET_KEY.length !== 64) {
  throw new Error(
    "TWO_FA_SECRET_KEY must be exactly 64 hex characters (32 bytes)."
  );
}

const ENCRYPTION_KEY = Buffer.from(process.env.TWO_FA_SECRET_KEY, "hex");

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (encrypted: string): string => {
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const [ivHex, authTagHex, encryptedTextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedText = Buffer.from(encryptedTextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};
