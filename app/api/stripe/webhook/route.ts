import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { checkoutOrders, orders } from "@/db/schema";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

const SIGNATURE_TOLERANCE_SECONDS = 300;

type CheckoutItem = { id: string; quantity: number };
type StripeEvent = {
  id: string;
  type: string;
  created?: number;
  data: { object: CheckoutSession };
};
type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};
type StripeShippingDetails = {
  name?: string | null;
  phone?: string | null;
  address?: StripeAddress | null;
};
type CheckoutSession = {
  id: string;
  mode: string;
  payment_status: string;
  currency: string | null;
  amount_total: number | null;
  client_reference_id: string | null;
  customer_email?: string | null;
  customer_details?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  shipping_details?: StripeShippingDetails | null;
  collected_information?: {
    shipping_details?: StripeShippingDetails | null;
  } | null;
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

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOrderCustomerDetails(session: CheckoutSession) {
  const shipping = session.shipping_details ?? session.collected_information?.shipping_details;
  const address = shipping?.address;
  const shippingAddress = address
    ? {
        line1: nonEmptyString(address.line1),
        line2: nonEmptyString(address.line2),
        city: nonEmptyString(address.city),
        state: nonEmptyString(address.state),
        postalCode: nonEmptyString(address.postal_code),
        country: nonEmptyString(address.country),
      }
    : null;
  const hasAddress = shippingAddress && Object.values(shippingAddress).some(Boolean);

  return {
    customerName: nonEmptyString(session.customer_details?.name) ?? nonEmptyString(shipping?.name),
    customerEmail: nonEmptyString(session.customer_details?.email) ?? nonEmptyString(session.customer_email),
    customerPhone: nonEmptyString(session.customer_details?.phone) ?? nonEmptyString(shipping?.phone),
    shippingAddressJson: hasAddress ? JSON.stringify(shippingAddress) : null,
  };
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

  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.currency !== order.currency ||
    session.amount_total !== order.amountCents ||
    (order.stripeSessionId !== null && order.stripeSessionId !== session.id)
  ) {
    console.error("Paid Checkout session does not match the stored order.", orderId);
    return Response.json({ error: "Checkout session does not match the order." }, { status: 400 });
  }

  const items = parseItems(order.itemsJson);
  if (!items) {
    console.error("Stored Checkout order has invalid item data.", orderId);
    return Response.json({ error: "Order item data is invalid." }, { status: 500 });
  }

  const customer = getOrderCustomerDetails(session);
  const eventCreated = event.created;
  const paidAt = typeof eventCreated === "number" && Number.isSafeInteger(eventCreated) && eventCreated > 0
    ? eventCreated * 1000
    : Date.now();
  const orderValues = [
    order.id,
    session.id,
    customer.customerName,
    customer.customerEmail,
    customer.customerPhone,
    customer.shippingAddressJson,
    order.itemsJson,
    session.amount_total,
    session.currency,
    order.createdAt,
    paidAt,
  ];
  const insertPaidOrder = env.DB.prepare(
    `INSERT OR IGNORE INTO orders (
       id, stripe_session_id, customer_name, customer_email, customer_phone,
       shipping_address_json, items_json, total_paid_cents, currency, created_at, paid_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(...orderValues);

  if (order.status === "paid") {
    if (order.stripeSessionId !== session.id) {
      return Response.json({ error: "Checkout session does not match the order." }, { status: 400 });
    }
    await insertPaidOrder.run();
    return Response.json({ received: true });
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

  const recordPaidOrder = env.DB.prepare(
    `INSERT OR IGNORE INTO orders (
       id, stripe_session_id, customer_name, customer_email, customer_phone,
       shipping_address_json, items_json, total_paid_cents, currency, created_at, paid_at
     )
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     WHERE EXISTS (
       SELECT 1 FROM checkout_orders
       WHERE id = ? AND status = 'paid' AND stripe_session_id = ?
     )`,
  ).bind(...orderValues, orderId, session.id);

  const results = await env.DB.batch([updateInventory, markOrderPaid, recordPaidOrder]);
  if (
    results[0].meta.changes !== items.length ||
    results[1].meta.changes !== 1 ||
    results[2].meta.changes !== 1
  ) {
    const [currentOrder] = await db
      .select({ status: checkoutOrders.status, stripeSessionId: checkoutOrders.stripeSessionId })
      .from(checkoutOrders)
      .where(eq(checkoutOrders.id, orderId))
      .limit(1);
    const [savedOrder] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.stripeSessionId, session.id))
      .limit(1);
    if (currentOrder?.status === "paid" && currentOrder.stripeSessionId === session.id && savedOrder) {
      return Response.json({ received: true });
    }
    console.error("Inventory could not be decremented for paid Checkout session.", {
      orderId,
      sessionId: session.id,
      inventoryChanges: results[0].meta.changes,
      orderChanges: results[1].meta.changes,
      savedOrderChanges: results[2].meta.changes,
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
