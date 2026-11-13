import { desc, gt } from "drizzle-orm";
import { requireOwnerApi } from "@/lib/owner";
import { getDb } from "@/db";
import { orders, products } from "@/db/schema";
import OwnerDashboard from "./owner-dashboard";
import { StorefrontFooter } from "@/components/storefront";
/* eslint-disable @next/next/no-html-link-for-pages */
export const dynamic = "force-dynamic";
export default async function OwnerPage() {
  let user;
  try { user = await requireOwnerApi(); }
  catch {
    return <><main className="owner-page"><div className="wrap owner-main"><div className="owner-card"><h1>Owner access only</h1><p>This dashboard requires the store owner&apos;s Cloudflare Access sign-in. During setup, product management remains locked.</p><a href="/">Return to the farm stand</a></div></div></main><StorefrontFooter /></>;
  }
  const db = getDb();
  const [items, recentOrders] = await Promise.all([
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(orders).where(gt(orders.totalPaidCents, 0)).orderBy(desc(orders.paidAt)).limit(50),
  ]);
  return <><OwnerDashboard initialItems={items} initialOrders={recentOrders} displayName={user.displayName} /><StorefrontFooter /></>;
}
