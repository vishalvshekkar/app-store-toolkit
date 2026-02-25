import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import jwt from "jsonwebtoken";
const { sign } = jwt;
import { readLocalConfig } from "../store/config.js";

/** Cached token and its expiry */
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/** How many seconds before expiry to refresh (10 min mark on 20 min max) */
const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000;

/** Maximum token lifetime allowed by Apple (20 minutes) */
const TOKEN_LIFETIME_SECONDS = 20 * 60;

/**
 * Generate a JWT for App Store Connect API authentication.
 * Caches the token and refreshes at the 10-minute mark.
 */
export async function getToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 10-min buffer)
  if (cachedToken && now < tokenExpiresAt - REFRESH_BEFORE_EXPIRY_MS) {
    return cachedToken;
  }

  const localConfig = await readLocalConfig();
  if (!localConfig) {
    throw new Error(
      "No API credentials configured. Run /app-store-toolkit:setup to add your App Store Connect API key."
    );
  }

  const { key_id, issuer_id, p8_key_path } = localConfig;

  if (!existsSync(p8_key_path)) {
    throw new Error(
      `Private key file not found: ${p8_key_path}. Check your p8_key_path in .appstore/config.local.json`
    );
  }

  const privateKey = await readFile(p8_key_path, "utf-8");

  const nowSeconds = Math.floor(now / 1000);
  const payload = {
    iss: issuer_id,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    aud: "appstoreconnect-v1",
  };

  const token = sign(payload, privateKey, {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: key_id,
      typ: "JWT",
    },
  });

  cachedToken = token;
  tokenExpiresAt = now + TOKEN_LIFETIME_SECONDS * 1000;

  return token;
}

/** Clear the cached token (useful for forcing re-auth) */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}

/** Check if API credentials are configured */
export async function hasCredentials(): Promise<boolean> {
  const config = await readLocalConfig();
  return config !== null;
}
