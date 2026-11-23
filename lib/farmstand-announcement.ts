import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";

import {
  DEFAULT_FARMSTAND_ANNOUNCEMENT,
  FARMSTAND_ANNOUNCEMENT_ID,
  FARMSTAND_ANNOUNCEMENT_MAX_LENGTH,
  type FarmstandAnnouncement,
} from "@/lib/farmstand-announcement-contract";

export {
  DEFAULT_FARMSTAND_ANNOUNCEMENT,
  FARMSTAND_ANNOUNCEMENT_ID,
  FARMSTAND_ANNOUNCEMENT_MAX_LENGTH,
  type FarmstandAnnouncement,
} from "@/lib/farmstand-announcement-contract";

export async function getFarmstandAnnouncement(): Promise<FarmstandAnnouncement> {
  const [setting] = await getDb()
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.id, FARMSTAND_ANNOUNCEMENT_ID))
    .limit(1);

  if (!setting) {
    return { enabled: true, message: DEFAULT_FARMSTAND_ANNOUNCEMENT };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(setting.value);
  } catch {
    throw new Error("FARMSTAND_ANNOUNCEMENT_INVALID");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("enabled" in parsed) ||
    typeof parsed.enabled !== "boolean" ||
    !("message" in parsed) ||
    typeof parsed.message !== "string" ||
    parsed.message.trim().length === 0 ||
    parsed.message.length > FARMSTAND_ANNOUNCEMENT_MAX_LENGTH
  ) {
    throw new Error("FARMSTAND_ANNOUNCEMENT_INVALID");
  }

  return { enabled: parsed.enabled, message: parsed.message };
}
