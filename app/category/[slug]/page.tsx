import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import {
  CategoryLinks,
  ProductGrid,
  StorefrontFooter,
  StorefrontHeader,
  storeCategories,
} from "@/components/storefront";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = storeCategories.find((item) => item.slug === slug);
  if (!category) notFound();

  const publishedItems = await getDb()
    .select()
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(desc(products.createdAt));
  const items = publishedItems.filter((item) => item.category === category.name);

  return (
    <main>
      <StorefrontHeader />
      <section className="section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">Explore the market</p>
            <h1>{category.name}</h1>
          </div>
          <p>{category.description}</p>
        </div>
        <CategoryLinks />
        <ProductGrid
          items={items}
          emptyMessage={`Published ${category.name.toLowerCase()} items will appear here.`}
        />
      </section>
      <StorefrontFooter />
    </main>
  );
}
