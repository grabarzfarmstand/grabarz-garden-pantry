import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { AddToCartButton, CartButton } from "@/components/cart";

export const dynamic = "force-dynamic";

const categories = [
  ["Pantry", "Small-batch jams, jellies and occasional baked goods.", "/assets/pantry-harvest-concept.png"],
  ["Garden", "Seasonal greenhouse produce and farm-fresh eggs.", "/assets/pantry-harvest-concept.png"],
  ["Bath & Home", "Rustic Kettle soaps and handmade farmhouse essentials.", "/assets/bath-home-concept.png"],
  ["Neighbor-Made", "A rotating guest shelf for nearby makers.", "/assets/neighbor-made-concept.png"],
  ["Second Story Finds", "Vintage, useful and one-of-a-kind resale finds.", "/assets/second-story-concept.png"],
] as const;

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function Home() {
  const items = await getDb().select().from(products).where(eq(products.status, "published")).orderBy(desc(products.createdAt));
  const soapItems = items.filter((item) => item.category === "Bath & Home");
const marketItems = items.filter((item) => item.category !== "Bath & Home");
  return (
    <main>
      <div className="topbar">Seasonal · small-batch · first come, first served</div>
      <nav className="nav wrap">
        <a className="brand" href="#top"><img src="/assets/8BDEB11B-B24B-4DF7-8EDA-F9BEE03B71BE.jpeg" alt="Grabarz Garden & Pantry logo" /><span><strong>Grabarz Garden & Pantry</strong><small>Grown · Gathered · Handmade</small></span></a>
        <div className="navlinks"><a href="#shop">Shop</a><a href="#how">How it works</a><a className="owner-link" href="/owner">Owner area</a><CartButton /></div>
      </nav>
      <section className="hero" id="top"><div className="hero-shade" /><div className="hero-copy wrap"><p className="eyebrow">A seasonal farm & home market</p><h1>Farm goodness, handmade essentials & found treasures.</h1><p>Shop small-batch pantry favorites, seasonal garden goods, Rustic Kettle soaps, neighbor-made wares and thoughtfully gathered resale finds.</p><a className="button rose" href="#shop">See what’s available</a></div></section>
      
      <section className="section wrap" id="shop">
        <div className="section-heading"><div><p className="eyebrow dark">This week’s market</p><h2>Available now</h2></div><p>Quantities are limited. An item is reserved only after ordering and payment are complete.</p></div>
        {items.length ? <div className="product-grid">{items.map((item) => <article className="product" key={item.id}><img src={"/api/images/" + encodeURIComponent(item.imageKey)} alt={item.name} /><div className="product-body"><span className="pill">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><div className="product-meta"><strong>{money(item.priceCents)}</strong><span>{item.quantity} available</span></div><div className="fulfillment">{item.fulfillment}</div><AddToCartButton product={{ id: item.id, name: item.name, priceCents: item.priceCents, stock: item.quantity }} /></div></article>)}</div> : <div className="empty-market"><h3>Real product photos are coming next.</h3><p>As products are uploaded and marked “Published” in the owner area, they will appear here automatically.</p><a className="button sage" href="/owner">Add the first product</a></div>}
      </section>
      <a className="soap-strip wrap"><img src="/assets/rustic-kettle-logo-wide.png" alt="Rustic Kettle Soap Co. by Grabarz Garden & Pantry" /><div><p className="eyebrow dark">Our handmade soap line</p><h2>Rustic, useful and made in small batches.</h2><p>Old-fashioned farmhouse character for cleansing bars, solid hair care and home essentials.</p></div></a>
      <section className="section wrap" id="soap-products">
  <div className="section-heading">
    <div>
      <p className="eyebrow dark">Rustic Kettle Soap Co.</p>
      <h2>Soap & Body</h2>
    </div>
    <p>Handmade soaps and self-care goods, made in small batches.</p>
  </div>
  {soapItems.length ? (
    <div className="product-grid">
      {soapItems.map((item) => (
        <article className="product" key={item.id}>
          <img src={"/api/images/" + encodeURIComponent(item.imageKey)} alt={item.name} />
          <div className="product-body">
            <span className="pill">{item.category}</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <div className="product-meta">
              <strong>{money(item.priceCents)}</strong>
              <span>{item.quantity} available</span>
            </div>
            <div className="fulfillment">{item.fulfillment}</div>
            <AddToCartButton product={{ id: item.id, name: item.name, priceCents: item.priceCents, stock: item.quantity }} />
          </div>
        </article>
      ))}
    </div>
  ) : (
    <div className="empty-market">
      <h3>Our handmade soaps are coming soon.</h3>
      <p>Check back as Rustic Kettle products are ready to share.</p>
    </div>
  )}
</section>  
      <section className="section category-section"><div className="wrap"><div className="section-heading"><div><p className="eyebrow dark">Explore the market</p><h2>Something different each week</h2></div><p>The selection expands and contracts with the garden, curing shelf, kitchen and family schedule.</p></div><div className="category-grid">{categories.map(([name,copy,image]) => <article className="category" key={name}><img src={image} alt="" /><div><h3>{name}</h3><p>{copy}</p></div></article>)}</div></div></section>
      <section className="section route" id="how"><div className="wrap"><div className="section-heading light"><div><p className="eyebrow">Simple by design</p><h2>One manageable weekly rhythm</h2></div><p>Only finished, counted items are offered. Orders are packed together, then shipped or delivered on one planned day.</p></div><div className="steps"><div><b>1</b><h3>Shop what’s ready</h3><p>Fresh, seasonal and first come, first served.</p></div><div><b>2</b><h3>Choose fulfillment</h3><p>Eligible items show mail order, local delivery or both.</p></div><div><b>3</b><h3>Receive your order</h3><p>One shipping day and one organized Valley delivery route.</p></div></div></div></section>
      <footer><div className="wrap"><strong>Grabarz Garden & Pantry</strong><p>Seasonal Farm & Home Market · Grown · Gathered · Handmade</p><small>Secure card checkout is handled by Stripe. Online orders currently ship within the U.S.; local delivery checkout is coming soon.</small></div></footer>
    </main>
  );
}
