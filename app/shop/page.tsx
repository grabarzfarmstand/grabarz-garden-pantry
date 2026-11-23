import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import {
  CategoryLinks,
  FarmstandAnnouncementBanner,
  ProductGrid,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import { ComingSoonPage } from "@/components/coming-soon";
import { getFarmstandAnnouncement } from "@/lib/farmstand-announcement";
import { shouldShowComingSoon } from "@/lib/storefront-mode";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  if (await shouldShowComingSoon()) return <ComingSoonPage />;

  const [items, farmstandAnnouncement] = await Promise.all([
    getDb()
      .select()
      .from(products)
      .where(eq(products.status, "published"))
      .orderBy(desc(products.createdAt)),
    getFarmstandAnnouncement(),
  ]);

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
        <FarmstandAnnouncementBanner announcement={farmstandAnnouncement} />
        <ProductGrid
          items={items}
          emptyMessage="New products will appear here as they are published."
        />
      </section>
      <StorefrontFooter />
    </main>
  );
}
