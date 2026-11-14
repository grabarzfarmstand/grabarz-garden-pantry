import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { requireOwnerApi } from "@/lib/owner";

export const STOREFRONT_MODE_ID = "storefront_mode";
export type StorefrontMode = "coming_soon" | "open";

export async function getStorefrontMode(): Promise<StorefrontMode> {
  const [setting] = await getDb()
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.id, STOREFRONT_MODE_ID))
    .limit(1);

  if (!setting) return "coming_soon";
  if (setting.value === "coming_soon" || setting.value === "open") {
    return setting.value;
  }
  throw new Error("STOREFRONT_MODE_INVALID");
}

export async function shouldShowComingSoon() {
  if (await getStorefrontMode() === "open") return false;

  try {
    await requireOwnerApi();
    return false;
  } catch (error) {
    if (
      error instanceof Error &&
      ["UNAUTHENTICATED", "FORBIDDEN", "AUTH_NOT_CONFIGURED"].includes(error.message)
    ) {
      return true;
    }
    throw error;
  }
}
