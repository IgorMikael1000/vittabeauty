import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  decryptMercadoPagoToken,
  encryptMercadoPagoToken,
} from "./mercadopago-token-crypto";

const originalEncryptionKey = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (originalEncryptionKey === undefined) {
    delete process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;
  } else {
    process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY = originalEncryptionKey;
  }
});

describe("Mercado Pago token encryption", () => {
  it("encrypts tokens and decrypts them with the same key", () => {
    process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY =
      randomBytes(32).toString("base64");

    const encrypted = encryptMercadoPagoToken("access-token-secret");

    expect(encrypted).not.toContain("access-token-secret");
    expect(decryptMercadoPagoToken(encrypted)).toBe("access-token-secret");
  });

  it("rejects a token modified after encryption", () => {
    process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY =
      randomBytes(32).toString("base64");
    const encrypted = encryptMercadoPagoToken("refresh-token-secret");
    const [version, iv, tag, data] = encrypted.split(".");

    process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY =
      randomBytes(32).toString("base64");
    expect(() =>
      decryptMercadoPagoToken([version, iv, tag, data].join(".")),
    ).toThrow();
  });

  it("rejects missing or incorrectly sized encryption keys", () => {
    delete process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptMercadoPagoToken("token")).toThrow(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY is not configured.",
    );

    process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY = randomBytes(16).toString(
      "base64",
    );
    expect(() => encryptMercadoPagoToken("token")).toThrow(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  });
});
