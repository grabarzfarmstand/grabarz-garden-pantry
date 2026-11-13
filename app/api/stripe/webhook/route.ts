import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";

export const dynamic = "force-dynamic";

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function hasValidSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const signedPayload = new TextEncoder().encode(`${timestamp}.${payload}`);
  for (const signature of signatures) {
    if (!/^[a-f0-9]{64}$/i.test(signature)) continue;
    if (await crypto.subtle.verify("HMAC", key, hexToBytes(signature), signedPayload)) return true;
  }
  return false;
}

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  try {
    if (!await hasValidSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET)) {
      return Response.json({ error: "Invalid signature." }, { status: 400 });
    }

    const event = JSON.parse(payload) as {
      type?: string;
      data?: { object?: { client_reference_id?: string; payment_status?: string; mode?: string } };
    };
    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      return Response.json({ received: true });
    }

    const session = event.data?.object;
    if (!session || session.mode !== "payment" || session.payment_status !== "paid" || !session.client_reference_id) {
      return Response.json({ received: true });
    }

    const db = getDb();
    const order = await db.select({ id: orders.id, status: orders.status })
      .from(orders).where(eq(orders.id, session.client_reference_id)).limit(1);
    if (!order.length) {
      console.error("Paid Stripe Checkout session has no matching order", session.client_reference_id);
      return Response.json({ error: "Order not found." }, { status: 500 });
    }
    if (order[0].status !== "pending") return Response.json({ received: true });

    try {
      await db.update(orders).set({ status: "paid", paidAt: Date.now() }).where(eq(orders.id, order[0].id));
    } catch (error) {
      // Payment succeeded but available stock changed before the webhook arrived.
      // Do not ship an oversold order; flag for owner review/refund.
      await db.update(orders).set({ status: "inventory_issue", paidAt: Date.now() }).where(eq(orders.id, order[0].id));
      console.error("Paid order needs inventory review/refund", order[0].id, error);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return Response.json({ error: "Could not process payment event." }, { status: 500 });
  }
}
