import { desc } from "drizzle-orm";
import { requireOwnerApi } from "@/lib/owner";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import OwnerDashboard from "./owner-dashboard";
export const dynamic = "force-dynamic";
export default async function OwnerPage() {
  let user;
  try { user = await requireOwnerApi(); }
  catch {
    return <main className="owner-page"><div className="wrap owner-main"><div className="owner-card"><h1>Owner access only</h1><p>This dashboard requires the store owner's Cloudflare Access sign-in. During setup, product management remains locked.</p><a href="/">Return to the farm stand</a></div></div></main>;
  }
  const items = await getDb().select().from(products).orderBy(desc(products.createdAt));
  return <OwnerDashboard initialItems={items} displayName={user.displayName} />;
}
