import { and, eq, inArray } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { checkoutOrders, products } from "@/db/schema";
import { getDb } from "@/db";
import { getCheckoutFulfillmentOptions } from "@/lib/fulfillment";
import { getStripeConfig } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

const MAX_CART_LINES = 30;
const MAX_QUANTITY = 99;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const config = getStripeConfig(
    env.STRIPE_SECRET_KEY,
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  if ("error" in config) {
    return Response.json({ error: config.error }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("items" in body) ||
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    body.items.length > MAX_CART_LINES
  ) {
    return Response.json({ error: "Your cart is empty or invalid." }, { status: 400 });
  }

  let deliveryZip: string | undefined;
  if ("deliveryZip" in body) {
    if (typeof body.deliveryZip !== "string" || !/^\d{5}$/.test(body.deliveryZip)) {
      return Response.json({ error: "Enter a valid 5-digit delivery ZIP code." }, { status: 400 });
    }
    deliveryZip = body.deliveryZip;
  }

  const quantities = new Map<string, number>();
  for (const item of body.items) {
    if (
      !item ||
      typeof item !== "object" ||
      !("id" in item) ||
      typeof item.id !== "string" ||
      item.id.length === 0 ||
      item.id.length > 100 ||
      !("quantity" in item) ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY
    ) {
      return Response.json({ error: "Your cart contains an invalid item." }, { status: 400 });
    }

    const quantity = (quantities.get(item.id) ?? 0) + item.quantity;
    if (quantity > MAX_QUANTITY) {
      return Response.json({ error: "An item quantity exceeds the checkout limit." }, { status: 400 });
    }
    quantities.set(item.id, quantity);
  }

  try {
    const db = getDb();
    const ids = [...quantities.keys()];
    const availableProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.status, "published"), inArray(products.id, ids)));
    const productById = new Map(availableProducts.map((product) => [product.id, product]));

    if (productById.size !== ids.length) {
      return Response.json({ error: "One or more items are no longer available." }, { status: 409 });
    }

    const lineItems: {
      id: string;
      quantity: number;
      name: string;
      priceCents: number;
      category: string;
      fulfillment: string;
    }[] = [];
    let amountCents = 0;
    for (const [id, quantity] of quantities) {
      const product = productById.get(id);
      if (!product || product.quantity < quantity) {
        return Response.json({ error: "One or more items no longer have enough stock." }, { status: 409 });
      }
      if (
        !Number.isSafeInteger(product.priceCents) ||
        product.priceCents < 1 ||
        product.priceCents > 99_999_999
      ) {
        return Response.json({ error: "An item has an invalid price and cannot be purchased." }, { status: 409 });
      }
      amountCents += product.priceCents * quantity;
      lineItems.push({
        id,
        quantity,
        name: product.name,
        priceCents: product.priceCents,
        category: product.category,
        fulfillment: product.fulfillment,
      });
    }

    if (!Number.isSafeInteger(amountCents) || amountCents > 99_999_999) {
      return Response.json({ error: "The cart total is too large." }, { status: 400 });
    }

    const fulfillmentOptions = getCheckoutFulfillmentOptions(
      amountCents,
      lineItems.map((item) => item.fulfillment),
      deliveryZip ?? "",
    );
    if (fulfillmentOptions.length === 0) {
      return Response.json(
        { error: "No fulfillment option is available for every item in your cart and its subtotal." },
        { status: 409 },
      );
    }
    if (amountCents + Math.max(...fulfillmentOptions.map((option) => option.amountCents)) > 99_999_999) {
      return Response.json({ error: "The cart total is too large." }, { status: 400 });
    }

    const orderId = crypto.randomUUID();
    const now = Date.now();
    await db.insert(checkoutOrders).values({
      id: orderId,
      itemsJson: JSON.stringify(lineItems),
      amountCents,
      currency: "usd",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({
      mode: "payment",
      client_reference_id: orderId,
      "metadata[order_id]": orderId,
      "phone_number_collection[enabled]": "true",
      "shipping_address_collection[allowed_countries][0]": "US",
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    if (deliveryZip) params.set("metadata[delivery_zip]", deliveryZip);
    const deliveryOption = fulfillmentOptions.find((option) => option.method === "delivery");
    if (deliveryOption?.deliveryTierId) {
      params.set("metadata[delivery_tier]", deliveryOption.deliveryTierId);
    }
    fulfillmentOptions.forEach((option, index) => {
      const optionPrefix = `shipping_options[${index}][shipping_rate_data]`;
      params.set(`${optionPrefix}[type]`, "fixed_amount");
      params.set(`${optionPrefix}[display_name]`, option.displayName);
      params.set(`${optionPrefix}[fixed_amount][amount]`, String(option.amountCents));
      params.set(`${optionPrefix}[fixed_amount][currency]`, "usd");
    });
    if (
      lineItems.some((item) => item.category === "Pantry") &&
      fulfillmentOptions.some((option) => option.method === "mail")
    ) {
      params.set(
        "custom_text[shipping_address][message]",
        "Cottage food pantry items can only be shipped within Oregon. The owner verifies addresses before fulfillment.",
      );
    }
    lineItems.forEach((item, index) => {
      params.set(`line_items[${index}][price_data][currency]`, "usd");
      params.set(`line_items[${index}][price_data][unit_amount]`, String(item.priceCents));
      params.set(`line_items[${index}][price_data][product_data][name]`, item.name);
      params.set(`line_items[${index}][quantity]`, String(item.quantity));
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!stripeResponse.ok) {
      console.error("Stripe Checkout session creation failed.", stripeResponse.status);
      return Response.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502 });
    }

    let session: unknown;
    try {
      session = await stripeResponse.json();
    } catch {
      console.error("Stripe returned an unreadable Checkout session response.");
      return Response.json({ error: "Stripe returned an invalid checkout response." }, { status: 502 });
    }
    if (
      !session ||
      typeof session !== "object" ||
      !("id" in session) ||
      typeof session.id !== "string" ||
      !("url" in session) ||
      typeof session.url !== "string" ||
      !session.url.startsWith("https://checkout.stripe.com/")
    ) {
      console.error("Stripe returned an invalid Checkout session response.");
      return Response.json({ error: "Stripe returned an invalid checkout response." }, { status: 502 });
    }

    await db
      .update(checkoutOrders)
      .set({ stripeSessionId: session.id, updatedAt: Date.now() })
      .where(eq(checkoutOrders.id, orderId));

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout setup failed.", error);
    return Response.json({ error: "We could not start checkout. Please try again." }, { status: 500 });
  }
}
