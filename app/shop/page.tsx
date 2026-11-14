import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import {
  CategoryLinks,
  ProductGrid,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import { ComingSoonPage } from "@/components/coming-soon";
import { shouldShowComingSoon } from "@/lib/storefront-mode";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  if (await shouldShowComingSoon()) return <ComingSoonPage />;

  const items = await getDb()
    .select()
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(desc(products.createdAt));

  return (
    <main>
      <StorefrontHeader />
      <section className="section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">This week’s market</p>
            <h1>Shop the market</h1>
          </div>
          <p>Browse currently published pantry, garden, home and neighbor-made goods.</p>
        </div>
        <CategoryLinks />
        <ProductGrid
          items={items}
          emptyMessage="New products will appear here as they are published."
        />
      </section>
      <StorefrontFooter />
    </main>
  );
}
