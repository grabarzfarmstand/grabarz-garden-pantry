import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { requireOwnerApi } from "@/lib/owner";
import { productFulfillmentChoices } from "@/lib/fulfillment";
export const dynamic = "force-dynamic";

const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireOwnerApi();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return Response.json({ error: "Please sign in again." }, { status: 401 });
    if (message === "FORBIDDEN" || message === "AUTH_NOT_CONFIGURED") return Response.json({ error: "Owner access only." }, { status: 403 });
    return Response.json({ error: "Unable to verify owner access." }, { status: 500 });
  }

  const { id } = await context.params;
  const db = getDb();

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json() as { status?: unknown };
    if (body.status !== "published" && body.status !== "draft") {
      return Response.json({ error: "Choose a valid product status." }, { status: 400 });
    }
    const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!existing[0]) return Response.json({ error: "Product not found." }, { status: 404 });
    await db.update(products)
      .set({ status: body.status, updatedAt: Date.now() })
      .where(eq(products.id, id));
    return Response.json({ ok: true });
  }

  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return Response.json({ error: "Use a product edit form to update details." }, { status: 415 });
  }

  const existing = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
  if (!existing) return Response.json({ error: "Product not found." }, { status: 404 });

  const data = await request.formData();
  const name = String(data.get("name") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const fulfillment = String(data.get("fulfillment") ?? "").trim();
  const rawPrice = data.get("price");
  const rawQuantity = data.get("quantity");
  const price = typeof rawPrice === "string" && rawPrice.trim() !== "" ? Number(rawPrice) : Number.NaN;
  const quantity = typeof rawQuantity === "string" && rawQuantity.trim() !== "" ? Number(rawQuantity) : Number.NaN;
  const priceCents = Math.round(price * 100);
  const validFulfillment =
    productFulfillmentChoices.some((choice) => choice === fulfillment) ||
    fulfillment === existing.fulfillment;
  if (!name || !description || !validFulfillment ||
      !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(priceCents) ||
      !Number.isSafeInteger(quantity) || quantity < 0) {
    return Response.json({ error: "Enter a product name, description, fulfillment method, valid price, and whole-number quantity." }, { status: 400 });
  }

  const photo = data.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto && !PHOTO_TYPES[photo.type]) {
    return Response.json({ error: "Please choose a JPG, PNG or WebP photo." }, { status: 400 });
  }
  if (hasPhoto && photo.size > 12 * 1024 * 1024) {
    return Response.json({ error: "That photo is larger than 12 MB. Please choose a smaller copy." }, { status: 400 });
  }

  let imageKey = existing.imageKey;
  let uploadedKey: string | undefined;
  if (hasPhoto) {
    if (!env.BUCKET) return Response.json({ error: "Photo storage is not available." }, { status: 500 });
    imageKey = `products/${id}-${crypto.randomUUID()}.${PHOTO_TYPES[photo.type]}`;
    uploadedKey = imageKey;
    await env.BUCKET.put(imageKey, await photo.arrayBuffer(), {
      httpMetadata: { contentType: photo.type },
    });
  }

  try {
    await db.update(products)
      .set({ name, description, fulfillment, priceCents, quantity, imageKey, updatedAt: Date.now() })
      .where(eq(products.id, id));
  } catch (error) {
    if (uploadedKey && env.BUCKET) {
      try {
        await env.BUCKET.delete(uploadedKey);
      } catch (cleanupError) {
        console.error("Could not remove the replacement product photo after a failed update.", cleanupError);
      }
    }
    throw error;
  }

  let warning: string | undefined;
  if (uploadedKey && env.BUCKET) {
    try {
      await env.BUCKET.delete(existing.imageKey);
    } catch (error) {
      console.error("Could not remove the previous product photo.", error);
      warning = "Product updated, but its previous photo could not be removed from storage.";
    }
  }

  const product = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
  return Response.json({ product, warning });
}
export async function DELETE(_request:Request,context:{params:Promise<{id:string}>}) {
  try { await requireOwnerApi(); const {id}=await context.params; const db=getDb(); const item=await db.select().from(products).where(eq(products.id,id)).limit(1); if(item[0]&&env.BUCKET) await env.BUCKET.delete(item[0].imageKey); await db.delete(products).where(eq(products.id,id)); return Response.json({ok:true}); }
  catch { return Response.json({error:"Unable to delete product."},{status:403}); }
}
