import { decodeJwt } from "jose";
import {
  isSameOriginRequest,
  OWNER_ACCESS_SESSION_COOKIE,
  OWNER_SESSION_TTL_SECONDS,
} from "@/lib/owner-session";
import { requireOwnerApi } from "@/lib/owner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let user;
  try {
    user = await requireOwnerApi();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") {
      return Response.json({ error: "Please sign in again." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return Response.json({ error: "Owner access only." }, { status: 403 });
    }
    if (message === "AUTH_NOT_CONFIGURED") {
      return Response.json({ error: "Owner authentication is not configured." }, { status: 503 });
    }
    return Response.json({ error: "Unable to verify owner access." }, { status: 500 });
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (user.authMethod !== "access" || !token) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const expiration = decodeJwt(token).exp;
  const maxAge = typeof expiration === "number"
    ? Math.min(expiration - Math.floor(Date.now() / 1000), OWNER_SESSION_TTL_SECONDS)
    : 0;
  if (maxAge <= 0) {
    return Response.json({ error: "Your Cloudflare Access session has expired." }, { status: 401 });
  }

  const headers = new Headers({
    "Cache-Control": "no-store",
    "Set-Cookie": `${OWNER_ACCESS_SESSION_COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  });
  return new Response(null, { status: 204, headers });
}
