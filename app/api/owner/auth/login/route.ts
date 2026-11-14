import { env } from "cloudflare:workers";
import {
  constantTimeEqual,
  createOwnerSessionToken,
  isSameOriginRequest,
  MIN_OWNER_PASSWORD_LENGTH,
  OWNER_SESSION_COOKIE,
  OWNER_SESSION_TTL_SECONDS,
} from "@/lib/owner-session";

export const dynamic = "force-dynamic";

function redirectToOwner(request: Request, loginState: string) {
  const headers = new Headers({
    Location: new URL(`/owner?login=${loginState}`, request.url).toString(),
    "Cache-Control": "no-store",
  });
  return new Response(null, { status: 303, headers });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return redirectToOwner(request, "invalid");
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return redirectToOwner(request, "invalid");
  }

  const ownerEmail = env.OWNER_EMAIL?.trim();
  const ownerPassword = env.OWNER_PASSWORD;
  if (
    !ownerEmail ||
    !ownerPassword ||
    ownerPassword.length < MIN_OWNER_PASSWORD_LENGTH
  ) {
    return redirectToOwner(request, "not-configured");
  }

  const email = data.get("email");
  const password = data.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 128 ||
    email.trim().toLowerCase() !== ownerEmail.toLowerCase() ||
    !constantTimeEqual(password, ownerPassword)
  ) {
    return redirectToOwner(request, "invalid");
  }

  const token = await createOwnerSessionToken(ownerEmail, ownerPassword);
  const responseHeaders = new Headers({
    Location: new URL("/owner", request.url).toString(),
    "Cache-Control": "no-store",
    "Set-Cookie": `${OWNER_SESSION_COOKIE}=${token}; Max-Age=${OWNER_SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  });
  return new Response(null, { status: 303, headers: responseHeaders });
}
