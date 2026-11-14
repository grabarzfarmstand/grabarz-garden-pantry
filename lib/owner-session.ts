export const OWNER_SESSION_COOKIE = "__Host-grabarz_owner_session";
export const OWNER_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const MIN_OWNER_PASSWORD_LENGTH = 32;

const encoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function isSameOriginRequest(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === expectedOrigin;

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }
}

async function signSession(secret: string, email: string, expiresAt: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = encoder.encode(`owner-session:v1:${email.toLowerCase()}:${expiresAt}`);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return encodeBase64Url(new Uint8Array(signature));
}

export async function createOwnerSessionToken(
  email: string,
  secret: string,
  now = Date.now(),
) {
  const expiresAt = Math.floor(now / 1000) + OWNER_SESSION_TTL_SECONDS;
  const signature = await signSession(secret, email, expiresAt);
  return `v1.${expiresAt}.${signature}`;
}

export async function verifyOwnerSessionToken(
  token: string,
  email: string,
  secret: string,
  now = Date.now(),
) {
  if (token.length > 128) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^\d+$/.test(parts[1]) ||
      !/^[A-Za-z0-9_-]+$/.test(parts[2])) {
    return false;
  }

  const expiresAt = Number(parts[1]);
  const nowSeconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(expiresAt) ||
      expiresAt <= nowSeconds ||
      expiresAt > nowSeconds + OWNER_SESSION_TTL_SECONDS) {
    return false;
  }

  const expected = await signSession(secret, email, expiresAt);
  return constantTimeEqual(parts[2], expected);
}
