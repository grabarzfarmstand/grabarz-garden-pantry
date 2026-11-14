import {
  isSameOriginRequest,
  OWNER_SESSION_COOKIE,
} from "@/lib/owner-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const headers = new Headers({
    Location: new URL("/owner?login=signed-out", request.url).toString(),
    "Cache-Control": "no-store",
    "Set-Cookie": `${OWNER_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
  });
  return new Response(null, { status: 303, headers });
}
