import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { requireOwnerApi } from "@/lib/owner";
import {
  isSameOriginRequest,
} from "@/lib/owner-session";
import {
  STOREFRONT_MODE_ID,
  type StorefrontMode,
} from "@/lib/storefront-mode";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    await requireOwnerApi();
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Choose a valid storefront mode." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("mode" in body) ||
    (body.mode !== "coming_soon" && body.mode !== "open")
  ) {
    return Response.json({ error: "Choose a valid storefront mode." }, { status: 400 });
  }

  const mode: StorefrontMode = body.mode;
  await getDb()
    .insert(settings)
    .values({ id: STOREFRONT_MODE_ID, value: mode })
    .onConflictDoUpdate({
      target: settings.id,
      set: { value: mode },
    });

  return Response.json({ mode }, { headers: { "Cache-Control": "no-store" } });
}
