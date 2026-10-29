import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedProfessionalId } from "@/lib/authenticated-professional";
import {
  createMercadoPagoOAuthState,
  createMercadoPagoPKCEPair,
  getMercadoPagoOAuthConfiguration,
  getMercadoPagoOAuthStateSecret,
  MERCADOPAGO_OAUTH_CALLBACK_PATH,
  MERCADOPAGO_OAUTH_COOKIE_MAX_AGE_SECONDS,
  MERCADOPAGO_OAUTH_STATE_COOKIE,
  MERCADOPAGO_OAUTH_VERIFIER_COOKIE,
} from "@/lib/mercadopago-oauth";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const professionalId = await getAuthenticatedProfessionalId();
  const result = getMercadoPagoOAuthConfiguration();
  if (!result.configuration) {
    console.error("[mercadopago-oauth] Configuration is invalid.", {
      reason: result.error,
    });
    return new Response("A conexão com o Mercado Pago ainda não está configurada.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const state = createMercadoPagoOAuthState();
  const { verifier, challenge } = createMercadoPagoPKCEPair();
  const stateToken = await new SignJWT({ state, professionalId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("vitta-beauty")
    .setAudience("mercadopago-oauth")
    .setSubject(professionalId)
    .setIssuedAt()
    .setExpirationTime(`${MERCADOPAGO_OAUTH_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getMercadoPagoOAuthStateSecret());

  const authorizationUrl = new URL(
    "https://auth.mercadopago.com/authorization",
  );
  authorizationUrl.search = new URLSearchParams({
    client_id: result.configuration.clientId,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: result.configuration.redirectUri,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: MERCADOPAGO_OAUTH_CALLBACK_PATH,
    maxAge: MERCADOPAGO_OAUTH_COOKIE_MAX_AGE_SECONDS,
  };
  const cookieStore = await cookies();
  cookieStore.set(MERCADOPAGO_OAUTH_STATE_COOKIE, stateToken, cookieOptions);
  cookieStore.set(MERCADOPAGO_OAUTH_VERIFIER_COOKIE, verifier, cookieOptions);

  return NextResponse.redirect(authorizationUrl);
}
