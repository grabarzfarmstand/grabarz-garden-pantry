import { env } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, products } from "@/db/schema";

export const dynamic = "force-dynamic";
const SHIPPING_CENTS = 750;

type CartRequest = { items?: Array<{ id?: unknown; quantity?: unknown }> };

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) {
    return Response.json({ error: "Please start checkout from the shop website." }, { status: 403 });
  }
  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Online checkout is being set up. Please check back soon." }, { status: 503 });
  }

  try {
    const body = await request.json() as CartRequest;
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
      return Response.json({ error: "Your cart is empty or too large. Please review it and try again." }, { status: 400 });
    }

    const requested = new Map<string, number>();
    for (const line of body.items) {
      if (typeof line.id !== "string" || !/^[\w-]{1,100}$/.test(line.id) ||
          typeof line.quantity !== "number" || !Number.isInteger(line.quantity) ||
          line.quantity < 1 || line.quantity > 99) {
        return Response.json({ error: "Please review the quantities in your cart." }, { status: 400 });
      }
      requested.set(line.id, (requested.get(line.id) ?? 0) + line.quantity);
    }

    const db = getDb();
    const ids = [...requested.keys()];
    const found = await db.select().from(products).where(inArray(products.id, ids));
    if (found.length !== ids.length) {
      return Response.json({ error: "A product in your cart is no longer available. Please refresh the shop." }, { status: 409 });
    }

    const lines = [];
    let subtotalCents = 0;
    for (const product of found) {
      const quantity = requested.get(product.id)!;
      if (product.status !== "published" || product.quantity < quantity) {
        return Response.json({ error: "Stock changed while you were shopping. Please update your cart and try again." }, { status: 409 });
      }
      if (!/mail|ship/i.test(product.fulfillment)) {
        return Response.json({ error: "One item in your cart is not available for mail order yet." }, { status: 400 });
      }
      if (!Number.isSafeInteger(product.priceCents) || product.priceCents < 1) {
        return Response.json({ error: "A product price needs to be corrected before checkout." }, { status: 400 });
      }
      subtotalCents += product.priceCents * quantity;
      lines.push({ id: product.id, name: product.name, priceCents: product.priceCents, quantity });
    }

    const orderId = crypto.randomUUID();
    const now = Date.now();
    await db.insert(orders).values({
      id: orderId,
      status: "pending",
      itemsJson: JSON.stringify(lines.map(({ id, quantity }) => ({ id, quantity }))),
      subtotalCents,
      shippingCents: SHIPPING_CENTS,
      createdAt: now,
    });

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("client_reference_id", orderId);
    form.set("success_url", `${url.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${url.origin}/?checkout=cancelled#shop`);
    form.set("shipping_address_collection[allowed_countries][0]", "US");
    form.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    form.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(SHIPPING_CENTS));
    form.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    form.set("shipping_options[0][shipping_rate_data][display_name]", "USPS flat-rate shipping");
    form.set("metadata[order_id]", orderId);
    form.set("payment_intent_data[metadata][order_id]", orderId);
    form.set("payment_method_types[0]", "card");
    lines.forEach((line, index) => {
      form.set(`line_items[${index}][price_data][currency]`, "usd");
      form.set(`line_items[${index}][price_data][unit_amount]`, String(line.priceCents));
      form.set(`line_items[${index}][price_data][product_data][name]`, line.name);
      form.set(`line_items[${index}][quantity]`, String(line.quantity));
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": orderId,
      },
      body: form,
    });
    const session = await stripeResponse.json() as { id?: string; url?: string; error?: { code?: string; message?: string; type?: string; param?: string } };
    if (!stripeResponse.ok || !session.id || !session.url) {
      await db.update(orders).set({ status: "checkout_error" }).where(eq(orders.id, orderId));
      console.error("Stripe Checkout session creation failed", session.error?.message ?? stripeResponse.status);
      const diagnostic = (session.error?.message ?? session.error?.code ?? session.error?.type ?? `Stripe HTTP ${stripeResponse.status}`).replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+/gi, "[redacted key]").slice(0, 180);
      return Response.json({ error: "We couldn't open secure checkout. Please try again.", diagnostic }, { status: 502 });
    }

    await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, orderId));
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout request failed", error);
    return Response.json({ error: "We couldn't start checkout. Please try again." }, { status: 500 });
  }
}
