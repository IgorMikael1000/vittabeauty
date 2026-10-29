import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("MERCADOPAGO_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (
    key.byteLength !== 32 ||
    key.toString("base64").replace(/=+$/, "") !==
      encodedKey.replace(/=+$/, "")
  ) {
    throw new Error(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return key;
}

export function encryptMercadoPagoToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptMercadoPagoToken(encryptedToken: string): string {
  const [version, encodedIv, encodedTag, encodedData, ...extra] =
    encryptedToken.split(".");
  if (
    version !== "v1" ||
    !encodedIv ||
    !encodedTag ||
    !encodedData ||
    extra.length > 0
  ) {
    throw new Error("Stored Mercado Pago token has an invalid format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedData, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
