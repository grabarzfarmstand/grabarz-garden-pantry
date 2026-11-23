import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { requireOwnerApi } from "@/lib/owner";
import { isSameOriginRequest } from "@/lib/owner-session";
import {
  FARMSTAND_ANNOUNCEMENT_ID,
  FARMSTAND_ANNOUNCEMENT_MAX_LENGTH,
  type FarmstandAnnouncement,
} from "@/lib/farmstand-announcement-contract";

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
    return Response.json({ error: "Enter a valid farmstand announcement." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("enabled" in body) ||
    typeof body.enabled !== "boolean" ||
    !("message" in body) ||
    typeof body.message !== "string"
  ) {
    return Response.json({ error: "Enter a valid farmstand announcement." }, { status: 400 });
  }

  const message = body.message.trim();
  if (message.length === 0) {
    return Response.json({ error: "Announcement text cannot be empty." }, { status: 400 });
  }
  if (message.length > FARMSTAND_ANNOUNCEMENT_MAX_LENGTH) {
    return Response.json({
      error: `Announcement text must be ${FARMSTAND_ANNOUNCEMENT_MAX_LENGTH} characters or fewer.`,
    }, { status: 400 });
  }

  const announcement: FarmstandAnnouncement = { enabled: body.enabled, message };
  await getDb()
    .insert(settings)
    .values({ id: FARMSTAND_ANNOUNCEMENT_ID, value: JSON.stringify(announcement) })
    .onConflictDoUpdate({
      target: settings.id,
      set: { value: JSON.stringify(announcement) },
    });

  return Response.json({ announcement }, { headers: { "Cache-Control": "no-store" } });
}
