import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { checkoutOrders } from "@/db/schema";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

const SIGNATURE_TOLERANCE_SECONDS = 300;

type CheckoutItem = { id: string; quantity: number };
type StripeEvent = {
  id: string;
  type: string;
  data: { object: CheckoutSession };
};
type CheckoutSession = {
  id: string;
  mode: string;
  payment_status: string;
  currency: string | null;
  amount_total: number | null;
  client_reference_id: string | null;
  metadata?: { order_id?: string } | null;
};

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  let timestamp: number | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t" && /^\d+$/.test(value)) timestamp = Number(value);
    if (key === "v1" && /^[a-f\d]{64}$/i.test(value)) signatures.push(value.toLowerCase());
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    timestamp === undefined ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS ||
    signatures.length === 0
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedPayload = new TextEncoder().encode(`${timestamp}.${payload}`);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signedPayload));
  const expected = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}

function parseItems(itemsJson: string): CheckoutItem[] | null {
  try {
    const parsed: unknown = JSON.parse(itemsJson);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 30) return null;
    const items: CheckoutItem[] = [];
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== "object" ||
        !("id" in item) ||
        typeof item.id !== "string" ||
        !("quantity" in item) ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return null;
      }
      items.push({ id: item.id, quantity: item.quantity });
    }
    if (new Set(items.map((item) => item.id)).size !== items.length) return null;
    return items;
  } catch {
    return null;
  }
}

async function applyPaidCheckout(event: StripeEvent, session: CheckoutSession) {
  const orderId = session.client_reference_id || session.metadata?.order_id;
  if (!orderId || !env.DB) {
    console.error("Paid Checkout session is missing its order reference or D1 binding.");
    return Response.json({ error: "Order could not be matched." }, { status: 500 });
  }

  const db = getDb();
  const [order] = await db
    .select()
    .from(checkoutOrders)
    .where(eq(checkoutOrders.id, orderId))
    .limit(1);
  if (!order) {
    console.error("Paid Checkout session references an unknown order.", orderId);
    return Response.json({ error: "Order could not be matched." }, { status: 500 });
  }
  if (order.status === "paid") return Response.json({ received: true });

  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.currency !== order.currency ||
    session.amount_total !== order.amountCents
  ) {
    console.error("Paid Checkout session does not match the stored order.", orderId);
    return Response.json({ error: "Checkout session does not match the order." }, { status: 400 });
  }

  const items = parseItems(order.itemsJson);
  if (!items) {
    console.error("Stored Checkout order has invalid item data.", orderId);
    return Response.json({ error: "Order item data is invalid." }, { status: 500 });
  }

  const caseClauses = items.map(() => "WHEN ? THEN ?").join(" ");
  const idPlaceholders = items.map(() => "?").join(", ");
  const stockChecks = items.map(() => "(id = ? AND quantity >= ?)").join(" OR ");
  const updateInventory = env.DB.prepare(
    `UPDATE products
     SET quantity = quantity - CASE id ${caseClauses} ELSE 0 END, updated_at = ?
     WHERE id IN (${idPlaceholders})
       AND (SELECT COUNT(*) FROM products WHERE ${stockChecks}) = ?
       AND EXISTS (
         SELECT 1 FROM checkout_orders
         WHERE id = ? AND status = 'pending'
           AND (stripe_session_id IS NULL OR stripe_session_id = ?)
       )`,
  ).bind(
    ...items.flatMap((item) => [item.id, item.quantity]),
    Date.now(),
    ...items.map((item) => item.id),
    ...items.flatMap((item) => [item.id, item.quantity]),
    items.length,
    orderId,
    session.id,
  );
  const markOrderPaid = env.DB.prepare(
    `UPDATE checkout_orders
     SET status = 'paid', stripe_session_id = COALESCE(stripe_session_id, ?),
         stripe_event_id = ?, updated_at = ?
     WHERE id = ? AND status = 'pending'
       AND (stripe_session_id IS NULL OR stripe_session_id = ?)
       AND changes() = ?`,
  ).bind(session.id, event.id, Date.now(), orderId, session.id, items.length);

  const results = await env.DB.batch([updateInventory, markOrderPaid]);
  if (results[0].meta.changes !== items.length || results[1].meta.changes !== 1) {
    console.error("Inventory could not be decremented for paid Checkout session.", {
      orderId,
      sessionId: session.id,
      inventoryChanges: results[0].meta.changes,
      orderChanges: results[1].meta.changes,
    });
    return Response.json(
      { error: "Inventory could not be updated for this paid order." },
      { status: 500 },
    );
  }

  return Response.json({ received: true });
}

export async function POST(request: Request) {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Stripe webhook secret is not configured." }, { status: 503 });
  }
  if (Number(request.headers.get("content-length") || "0") > 1_000_000) {
    return new Response("Webhook payload too large.", { status: 413 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  if (payload.length > 1_000_000) {
    return new Response("Webhook payload too large.", { status: 413 });
  }
  try {
    if (!(await verifyStripeSignature(payload, signature, webhookSecret))) {
      return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
    }
  } catch (error) {
    console.error("Stripe webhook signature verification failed.", error);
    return Response.json({ error: "Could not verify Stripe signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return Response.json({ error: "Invalid Stripe event payload." }, { status: 400 });
  }

  if (
    typeof event.id !== "string" ||
    typeof event.type !== "string" ||
    !event.data ||
    !event.data.object ||
    typeof event.data.object.id !== "string"
  ) {
    return Response.json({ error: "Invalid Stripe event shape." }, { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    return Response.json({ received: true });
  }

  try {
    return await applyPaidCheckout(event, session);
  } catch (error) {
    console.error("Stripe webhook could not update inventory.", error);
    return Response.json({ error: "Could not process the paid order." }, { status: 500 });
  }
}
