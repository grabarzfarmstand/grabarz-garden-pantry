import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { OWNER_SESSION_COOKIE, MIN_OWNER_PASSWORD_LENGTH, verifyOwnerSessionToken } from "@/lib/owner-session";

let keyDomain = "";
let keys: ReturnType<typeof createRemoteJWKSet> | undefined;

function readCookie(cookieHeader: string | null, name: string) {
  for (const cookie of cookieHeader?.split(";") ?? []) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return cookie.slice(separator + 1).trim();
  }
  return null;
}

export async function requireOwnerApi() {
  const requestHeaders = await headers();
  const ownerEmail = env.OWNER_EMAIL?.trim();
  if (!ownerEmail) throw new Error("AUTH_NOT_CONFIGURED");

  const domain = env.ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.ACCESS_AUD?.trim();
  const token = requestHeaders.get("cf-access-jwt-assertion");
  const assertedEmail = requestHeaders.get("cf-access-authenticated-user-email")?.trim();

  if (
    token &&
    assertedEmail &&
    domain &&
    /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) &&
    audience
  ) {
    if (!keys || keyDomain !== domain) {
      keyDomain = domain;
      keys = createRemoteJWKSet(new URL(`https://${domain}/cdn-cgi/access/certs`));
    }

    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer: `https://${domain}`,
        audience,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "iat", "sub", "email"],
      });
      if (typeof payload.email !== "string" || typeof payload.sub !== "string") {
        throw new Error("FORBIDDEN");
      }
      if (
        payload.email.toLowerCase() !== ownerEmail.toLowerCase() ||
        assertedEmail.toLowerCase() !== ownerEmail.toLowerCase() ||
        assertedEmail.toLowerCase() !== payload.email.toLowerCase()
      ) {
        throw new Error("FORBIDDEN");
      }
      return {
        userId: payload.sub,
        displayName: "Sandi",
        email: payload.email,
        authMethod: "access" as const,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") throw error;
    }
  }

  const ownerPassword = env.OWNER_PASSWORD;
  const sessionToken = readCookie(requestHeaders.get("cookie"), OWNER_SESSION_COOKIE);
  if (
    ownerPassword &&
    ownerPassword.length >= MIN_OWNER_PASSWORD_LENGTH &&
    sessionToken &&
    await verifyOwnerSessionToken(sessionToken, ownerEmail, ownerPassword)
  ) {
    return {
      userId: ownerEmail.toLowerCase(),
      displayName: "Sandi",
      email: ownerEmail,
      authMethod: "password" as const,
    };
  }

  throw new Error("UNAUTHENTICATED");
}
