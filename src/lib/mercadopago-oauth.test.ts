import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createMercadoPagoOAuthState,
  createMercadoPagoPKCEPair,
  secureStringEqual,
} from "./mercadopago-oauth";

describe("Mercado Pago OAuth helpers", () => {
  it("creates an S256 PKCE pair with a verifier accepted by OAuth", () => {
    const { verifier, challenge } = createMercadoPagoPKCEPair();
    const expectedChallenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(challenge).toBe(expectedChallenge);
    expect(challenge).not.toBe(verifier);
  });

  it("creates distinct, URL-safe OAuth states", () => {
    const first = createMercadoPagoOAuthState();
    const second = createMercadoPagoOAuthState();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });

  it("compares OAuth state values without accepting different lengths", () => {
    expect(secureStringEqual("same-state", "same-state")).toBe(true);
    expect(secureStringEqual("same-state", "other-state")).toBe(false);
    expect(secureStringEqual("short", "longer")).toBe(false);
  });
});
