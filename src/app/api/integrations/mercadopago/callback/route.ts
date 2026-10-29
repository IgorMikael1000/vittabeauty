import { errors, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentProfessionalId } from "@/lib/authenticated-professional";
import {
  getMercadoPagoOAuthConfiguration,
  getMercadoPagoOAuthStateSecret,
  MERCADOPAGO_OAUTH_STATE_COOKIE,
  MERCADOPAGO_OAUTH_VERIFIER_COOKIE,
  MERCADOPAGO_OAUTH_CALLBACK_PATH,
  secureStringEqual,
} from "@/lib/mercadopago-oauth";
import { getPrismaClient } from "@/lib/prisma";
import { encryptMercadoPagoToken } from "@/lib/mercadopago-token-crypto";

export const runtime = "nodejs";

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const stateToken = cookieStore.get(MERCADOPAGO_OAUTH_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(MERCADOPAGO_OAUTH_VERIFIER_COOKIE)?.value;
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: MERCADOPAGO_OAUTH_CALLBACK_PATH,
    maxAge: 0,
  };
  cookieStore.set(MERCADOPAGO_OAUTH_STATE_COOKIE, "", cookieOptions);
  cookieStore.set(MERCADOPAGO_OAUTH_VERIFIER_COOKIE, "", cookieOptions);

  const url = new URL(request.url);
  const returnedState = url.searchParams.get("state");
  const authorizationCode = url.searchParams.get("code");
  if (!stateToken || !verifier || !returnedState) {
    return textResponse(
      "Não foi possível validar esta autorização. Inicie novamente pelo link de conexão.",
      400,
    );
  }

  let statePayload;
  try {
    ({ payload: statePayload } = await jwtVerify(
      stateToken,
      getMercadoPagoOAuthStateSecret(),
      {
        algorithms: ["HS256"],
        audience: "mercadopago-oauth",
        issuer: "vitta-beauty",
        requiredClaims: ["sub", "iat", "exp"],
      },
    ));
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return textResponse(
        "A autorização expirou ou não é válida. Inicie novamente pelo link de conexão.",
        400,
      );
    }
    throw error;
  }

  if (
    typeof statePayload.state !== "string" ||
    typeof statePayload.professionalId !== "string" ||
    statePayload.sub !== statePayload.professionalId ||
    !secureStringEqual(returnedState, statePayload.state)
  ) {
    return textResponse(
      "Não foi possível validar esta autorização. Inicie novamente pelo link de conexão.",
      400,
    );
  }
  const authorizedProfessionalId = statePayload.professionalId;

  const currentProfessionalId = await getCurrentProfessionalId();
  if (currentProfessionalId !== authorizedProfessionalId) {
    return textResponse(
      "A sessão mudou ou expirou. Entre novamente e inicie a conexão pelo link.",
      401,
    );
  }

  if (url.searchParams.has("error") || !authorizationCode) {
    return textResponse(
      "A autorização no Mercado Pago foi cancelada ou não foi concluída.",
      400,
    );
  }

  const result = getMercadoPagoOAuthConfiguration();
  if (!result.configuration) {
    console.error("[mercadopago-oauth] Callback configuration is invalid.", {
      reason: result.error,
    });
    return textResponse("A conexão com o Mercado Pago não está configurada.", 503);
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: result.configuration.clientId,
        client_secret: result.configuration.clientSecret,
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: result.configuration.redirectUri,
        code_verifier: verifier,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[mercadopago-oauth] Token exchange request failed.", {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return textResponse(
      "Não foi possível concluir a autorização com o Mercado Pago. Tente novamente.",
      502,
    );
  }

  if (!tokenResponse.ok) {
    console.error("[mercadopago-oauth] Token exchange was rejected.", {
      status: tokenResponse.status,
    });
    return textResponse(
      "O Mercado Pago não aceitou a autorização. Confira a configuração e tente novamente.",
      502,
    );
  }

  let tokenData: unknown;
  try {
    tokenData = await tokenResponse.json();
  } catch {
    console.error("[mercadopago-oauth] Token response was not valid JSON.");
    return textResponse("O Mercado Pago retornou uma resposta inválida.", 502);
  }
  if (
    typeof tokenData !== "object" ||
    tokenData === null ||
    !("access_token" in tokenData) ||
    typeof tokenData.access_token !== "string" ||
    !tokenData.access_token ||
    !("refresh_token" in tokenData) ||
    typeof tokenData.refresh_token !== "string" ||
    !tokenData.refresh_token ||
    !("user_id" in tokenData) ||
    (typeof tokenData.user_id !== "number" &&
      typeof tokenData.user_id !== "string") ||
    !("expires_in" in tokenData) ||
    typeof tokenData.expires_in !== "number" ||
    !Number.isFinite(tokenData.expires_in) ||
    tokenData.expires_in <= 0 ||
    !("live_mode" in tokenData) ||
    typeof tokenData.live_mode !== "boolean" ||
    !("scope" in tokenData) ||
    typeof tokenData.scope !== "string" ||
    !tokenData.scope.split(/\s+/).includes("offline_access")
  ) {
    console.error(
      "[mercadopago-oauth] Token response is missing required offline-access fields.",
    );
    return textResponse(
      "O Mercado Pago não autorizou a renovação automática. Inicie novamente a conexão e aceite o acesso offline.",
      502,
    );
  }
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const accountId = String(tokenData.user_id);
  const expiresIn = tokenData.expires_in;
  const liveMode = tokenData.live_mode;
  const scopes = tokenData.scope;

  let accountResponse: Response;
  try {
    accountResponse = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[mercadopago-oauth] Account validation request failed.", {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return textResponse(
      "A autorização foi recebida, mas não foi possível validar a conta. Tente novamente.",
      502,
    );
  }

  if (!accountResponse.ok) {
    console.error("[mercadopago-oauth] Account validation was rejected.", {
      status: accountResponse.status,
    });
    return textResponse(
      "A autorização foi recebida, mas não foi possível validar o acesso à conta.",
      502,
    );
  }

  let accountData: unknown;
  try {
    accountData = await accountResponse.json();
  } catch {
    console.error("[mercadopago-oauth] Account response was not valid JSON.");
    return textResponse("O Mercado Pago retornou uma resposta inválida.", 502);
  }
  if (
    typeof accountData !== "object" ||
    accountData === null ||
    !("id" in accountData) ||
    (typeof accountData.id !== "number" &&
      typeof accountData.id !== "string") ||
    !String(accountData.id)
  ) {
    console.error("[mercadopago-oauth] Account response did not contain an account ID.");
    return textResponse("Não foi possível identificar a conta autorizada.", 502);
  }

  if (String(accountData.id) !== accountId) {
    console.error("[mercadopago-oauth] OAuth account identity did not match.");
    return textResponse(
      "A conta Mercado Pago retornada não corresponde à autorização.",
      502,
    );
  }

  let encryptedAccessToken: string;
  let encryptedRefreshToken: string;
  try {
    encryptedAccessToken = encryptMercadoPagoToken(accessToken);
    encryptedRefreshToken = encryptMercadoPagoToken(refreshToken);
  } catch (error) {
    console.error("[mercadopago-oauth] Token encryption is not configured.", {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return textResponse(
      "A conexão não pôde ser armazenada com segurança. A configuração do servidor está incompleta.",
      503,
    );
  }

  try {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (transaction) => {
      await transaction.mercadoPagoConnection.upsert({
        where: { professionalId: authorizedProfessionalId },
        create: {
          professionalId: authorizedProfessionalId,
          accountId,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: new Date(
            Date.now() + expiresIn * 1000,
          ),
          liveMode,
          scopes,
          connectedAt: new Date(),
        },
        update: {
          accountId,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: new Date(
            Date.now() + expiresIn * 1000,
          ),
          liveMode,
          scopes,
          connectedAt: new Date(),
        },
      });
      await transaction.professional.update({
        where: { id: authorizedProfessionalId },
        data: { pixDepositMode: "AUTOMATIC" },
      });
    });
  } catch (error) {
    console.error("[mercadopago-oauth] Failed to save the account connection.", {
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return textResponse(
      "A conta foi autorizada, mas não foi possível salvar a conexão. Tente novamente.",
      500,
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard/services/signal?connected=1", url.origin),
    { status: 303 },
  );
}
