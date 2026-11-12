import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
let keyDomain = "";
let keys: ReturnType<typeof createRemoteJWKSet>;
export async function requireOwnerApi() {
  const config = env as unknown as Record<string, string>;
  const domain = config.ACCESS_TEAM_DOMAIN, audience = config.ACCESS_AUD, ownerEmail = config.OWNER_EMAIL;
  // Fail closed until configured. Never trust unsigned email or ChatGPT headers.
  if (!domain || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) || !audience || !ownerEmail) throw new Error("AUTH_NOT_CONFIGURED");
  const token = (await headers()).get("cf-access-jwt-assertion");
  if (!token) throw new Error("UNAUTHENTICATED");
  if (!keys || keyDomain !== domain) {
    keyDomain = domain;
    keys = createRemoteJWKSet(new URL(`https://${domain}/cdn-cgi/access/certs`));
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(token, keys, { issuer: `https://${domain}`, audience, algorithms: ["RS256"], requiredClaims: ["exp", "iat", "sub", "email"] }));
  } catch { throw new Error("UNAUTHENTICATED"); }
  if (typeof payload.email !== "string" || payload.email.toLowerCase() !== ownerEmail.toLowerCase()) throw new Error("FORBIDDEN");
  return { userId: payload.sub!, displayName: "Sandi", email: payload.email };
}
