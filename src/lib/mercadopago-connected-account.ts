import "server-only";

import { MercadoPagoConfig, Payment } from "mercadopago";
import { getPrismaClient } from "@/lib/prisma";
import {
  decryptMercadoPagoToken,
  encryptMercadoPagoToken,
} from "@/lib/mercadopago-token-crypto";
import { getMercadoPagoOAuthConfiguration } from "@/lib/mercadopago-oauth";

const TOKEN_REFRESH_MARGIN_MS = 2 * 60 * 1000;

type OAuthTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  user_id?: unknown;
  live_mode?: unknown;
  scope?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTokenResponse(
  value: unknown,
  expectedAccountId: string,
  expectedLiveMode: boolean,
): {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} {
  if (!isRecord(value)) {
    throw new Error("Mercado Pago returned an invalid OAuth token response.");
  }
  const tokenData = value as OAuthTokenResponse;
  if (
    typeof tokenData.access_token !== "string" ||
    !tokenData.access_token ||
    typeof tokenData.refresh_token !== "string" ||
    !tokenData.refresh_token ||
    typeof tokenData.expires_in !== "number" ||
    !Number.isFinite(tokenData.expires_in) ||
    tokenData.expires_in <= 0 ||
    String(tokenData.user_id) !== expectedAccountId ||
    tokenData.live_mode !== expectedLiveMode
  ) {
    throw new Error(
      "Mercado Pago returned OAuth tokens that do not match the connected account.",
    );
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
  };
}

async function refreshMercadoPagoConnection(
  connection: {
    professionalId: string;
    accountId: string;
    refreshTokenEncrypted: string;
    liveMode: boolean;
  },
): Promise<string> {
  const configurationResult = getMercadoPagoOAuthConfiguration();
  if (!configurationResult.configuration) {
    throw new Error(configurationResult.error);
  }
  const configuration = configurationResult.configuration;
  const refreshToken = decryptMercadoPagoToken(
    connection.refreshTokenEncrypted,
  );
  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new Error("Mercado Pago OAuth token refresh request failed.", {
      cause: error,
    });
  }

  if (!response.ok) {
    const latestConnection = await getPrismaClient().mercadoPagoConnection.findUnique({
      where: { professionalId: connection.professionalId },
    });
    if (
      latestConnection &&
      latestConnection.tokenExpiresAt.getTime() >
        Date.now() + TOKEN_REFRESH_MARGIN_MS
    ) {
      return decryptMercadoPagoToken(latestConnection.accessTokenEncrypted);
    }
    throw new Error(
      `Mercado Pago rejected OAuth token refresh with status ${response.status}.`,
    );
  }

  let tokenResponse: unknown;
  try {
    tokenResponse = await response.json();
  } catch (error) {
    throw new Error("Mercado Pago OAuth refresh response was not valid JSON.", {
      cause: error,
    });
  }

  const renewed = parseTokenResponse(
    tokenResponse,
    connection.accountId,
    connection.liveMode,
  );
  const updateResult = await getPrismaClient().mercadoPagoConnection.updateMany({
    where: {
      professionalId: connection.professionalId,
      refreshTokenEncrypted: connection.refreshTokenEncrypted,
    },
    data: {
      accessTokenEncrypted: encryptMercadoPagoToken(renewed.accessToken),
      refreshTokenEncrypted: encryptMercadoPagoToken(renewed.refreshToken),
      tokenExpiresAt: renewed.expiresAt,
      scopes:
        isRecord(tokenResponse) && typeof tokenResponse.scope === "string"
          ? tokenResponse.scope
          : undefined,
    },
  });

  if (updateResult.count === 1) return renewed.accessToken;

  const latestConnection = await getPrismaClient().mercadoPagoConnection.findUnique({
    where: { professionalId: connection.professionalId },
  });
  if (
    latestConnection &&
    latestConnection.tokenExpiresAt.getTime() >
      Date.now() + TOKEN_REFRESH_MARGIN_MS
  ) {
    return decryptMercadoPagoToken(latestConnection.accessTokenEncrypted);
  }
  throw new Error("Mercado Pago OAuth tokens changed during refresh.");
}

export async function getMercadoPagoConnectedAccount(
  professionalId: string,
): Promise<{
  accountId: string;
  liveMode: boolean;
  accessToken: string;
}> {
  const connection = await getPrismaClient().mercadoPagoConnection.findUnique({
    where: { professionalId },
  });
  if (!connection) {
    throw new Error("This professional has no Mercado Pago OAuth connection.");
  }

  const accessToken = decryptMercadoPagoToken(
    connection.accessTokenEncrypted,
  );
  if (
    connection.tokenExpiresAt.getTime() <=
    Date.now() + TOKEN_REFRESH_MARGIN_MS
  ) {
    return {
      accountId: connection.accountId,
      liveMode: connection.liveMode,
      accessToken: await refreshMercadoPagoConnection(connection),
    };
  }

  return {
    accountId: connection.accountId,
    liveMode: connection.liveMode,
    accessToken,
  };
}

export function getMercadoPagoPaymentClient(accessToken: string): Payment {
  return new Payment(new MercadoPagoConfig({ accessToken }));
}
