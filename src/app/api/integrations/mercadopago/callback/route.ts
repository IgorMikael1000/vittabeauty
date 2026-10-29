import { errors, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getCurrentProfessionalId } from "@/lib/authenticated-professional";
import {
  getMercadoPagoOAuthConfiguration,
  getMercadoPagoOAuthStateSecret,
  MERCADOPAGO_OAUTH_STATE_COOKIE,
  MERCADOPAGO_OAUTH_VERIFIER_COOKIE,
  secureStringEqual,
} from "@/lib/mercadopago-oauth";

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
  cookieStore.delete(MERCADOPAGO_OAUTH_STATE_COOKIE);
  cookieStore.delete(MERCADOPAGO_OAUTH_VERIFIER_COOKIE);

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

  const currentProfessionalId = await getCurrentProfessionalId();
  if (currentProfessionalId !== statePayload.professionalId) {
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
    !tokenData.access_token
  ) {
    console.error("[mercadopago-oauth] Token response did not contain an access token.");
    return textResponse("O Mercado Pago não retornou um token válido.", 502);
  }
  const accessToken = tokenData.access_token;

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

  return textResponse(
    `Teste OAuth concluído com sucesso. ID da conta Mercado Pago: ${String(accountData.id)}. O token não foi armazenado; esta etapa apenas validou a conexão.`,
    200,
  );
}
