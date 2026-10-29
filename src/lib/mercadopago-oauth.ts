import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MERCADOPAGO_OAUTH_CALLBACK_PATH =
  "/api/integrations/mercadopago/callback";
export const MERCADOPAGO_OAUTH_STATE_COOKIE = "vitta_mp_oauth_state";
export const MERCADOPAGO_OAUTH_VERIFIER_COOKIE = "vitta_mp_oauth_verifier";
export const MERCADOPAGO_OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export type MercadoPagoOAuthConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getMercadoPagoOAuthConfiguration():
  | { configuration: MercadoPagoOAuthConfiguration; error?: never }
  | { configuration?: never; error: string } {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  const redirectUri = process.env.MERCADOPAGO_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return {
      error:
        "MERCADOPAGO_CLIENT_ID, MERCADOPAGO_CLIENT_SECRET e MERCADOPAGO_OAUTH_REDIRECT_URI devem estar configurados.",
    };
  }

  let parsedRedirectUri: URL;
  try {
    parsedRedirectUri = new URL(redirectUri);
  } catch {
    return { error: "MERCADOPAGO_OAUTH_REDIRECT_URI não é uma URL válida." };
  }

  const isLocalhost =
    parsedRedirectUri.hostname === "localhost" ||
    parsedRedirectUri.hostname === "127.0.0.1";
  if (
    (parsedRedirectUri.protocol !== "https:" &&
      !(isLocalhost && parsedRedirectUri.protocol === "http:")) ||
    parsedRedirectUri.pathname !== MERCADOPAGO_OAUTH_CALLBACK_PATH ||
    parsedRedirectUri.search ||
    parsedRedirectUri.hash
  ) {
    return {
      error:
        "MERCADOPAGO_OAUTH_REDIRECT_URI deve ser HTTPS e apontar exatamente para a rota de callback, sem parâmetros.",
    };
  }

  return {
    configuration: { clientId, clientSecret, redirectUri },
  };
}

export function createMercadoPagoPKCEPair(): {
  verifier: string;
  challenge: string;
} {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function createMercadoPagoOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function getMercadoPagoOAuthStateSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export function secureStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
