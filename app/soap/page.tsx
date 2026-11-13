import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import {
  ProductGrid,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";

export const dynamic = "force-dynamic";

export default async function SoapPage() {
  const items = await getDb()
    .select()
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(desc(products.createdAt));
  const soapItems = items.filter((item) => item.category === "Bath & Home");

  return (
    <main>
      <StorefrontHeader />
      <section className="section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">Rustic Kettle Soap Co.</p>
            <h1>Soap & Body</h1>
          </div>
          <p>Handmade soaps and self-care goods, made in small batches.</p>
        </div>
        <ProductGrid
          items={soapItems}
          emptyMessage="Handmade soaps and home goods will appear here when published."
        />
      </section>
      <StorefrontFooter />
    </main>
  );
}
