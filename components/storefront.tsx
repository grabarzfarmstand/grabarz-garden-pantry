import { AddToCartButton, CartButton } from "@/components/cart";

/* eslint-disable @next/next/no-html-link-for-pages */

export const storeCategories = [
  {
    slug: "pantry",
    name: "Pantry",
    description: "Small-batch jams, jellies and occasional baked goods.",
    image: "/assets/pantry-harvest-concept.png",
  },
  {
    slug: "garden",
    name: "Garden",
    description: "Seasonal greenhouse produce and farm-fresh eggs.",
    image: "/assets/pantry-harvest-concept.png",
  },
  {
    slug: "bath-home",
    name: "Bath & Home",
    description: "Rustic Kettle soaps and handmade farmhouse essentials.",
    image: "/assets/bath-home-concept.png",
  },
  {
    slug: "neighbor-made",
    name: "Neighbor-Made",
    description: "A rotating guest shelf for nearby makers.",
    image: "/assets/neighbor-made-concept.png",
  },
  {
    slug: "second-story-finds",
    name: "Second Story Finds",
    description: "Vintage, useful and one-of-a-kind resale finds.",
    image: "/assets/second-story-concept.png",
  },
] as const;

type StoreProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  priceCents: number;
  quantity: number;
  fulfillment: string;
  imageKey: string;
};

export function StorefrontHeader() {
  return (
    <>
      <div className="topbar">Seasonal · small-batch · first come, first served</div>
      <nav className="nav wrap">
        <a className="brand" href="/">
          <img
            src="/assets/8BDEB11B-B24B-4DF7-8EDA-F9BEE03B71BE.jpeg"
            alt="Grabarz Garden & Pantry logo"
          />
          <span>
            <strong>Grabarz Garden & Pantry</strong>
            <small>Grown · Gathered · Handmade</small>
          </span>
        </a>
        <div className="navlinks">
          <a href="/shop">Shop</a>
          <a className="how-link" href="/#how">How it works</a>
          <a className="owner-link" href="/owner">Owner area</a>
          <CartButton />
        </div>
      </nav>
    </>
  );
}

export function StorefrontFooter() {
  return (
    <footer>
      <div className="wrap">
        <strong>Grabarz Garden & Pantry</strong>
        <p>Seasonal Farm & Home Market · Grown · Gathered · Handmade</p>
        <small>Secure checkout is available for published items.</small>
        <nav className="footer-policy-links" aria-label="Store policies">
          <a href="/shipping-returns">Shipping, local delivery & returns</a>
          <a href="/terms">Terms & conditions</a>
          <a href="/privacy">Privacy policy</a>
        </nav>
      </div>
    </footer>
  );
}

export function CategoryCards() {
  return (
    <div className="category-grid">
      {storeCategories.map((category) => (
        <a className="category" href={`/category/${category.slug}`} key={category.slug}>
          <img src={category.image} alt="" />
          <div>
            <h3>{category.name}</h3>
            <p>{category.description}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export function CategoryLinks() {
  return (
    <nav className="category-links" aria-label="Shop by category">
      {storeCategories.map((category) => (
        <a href={`/category/${category.slug}`} key={category.slug}>
          {category.name}
        </a>
      ))}
    </nav>
  );
}

export function ProductGrid({
  items,
  emptyMessage,
}: {
  items: StoreProduct[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="empty-market">
        <h2>Nothing available just yet.</h2>
        <p>{emptyMessage}</p>
        <a className="button sage" href="/shop">Browse the market</a>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {items.map((item) => (
        <article className="product" key={item.id}>
          <img src={`/api/images?key=${encodeURIComponent(item.imageKey)}`} alt={item.name} />
          <div className="product-body">
            <div className="product-badges">
              <span className="pill">{item.category}</span>
              {item.quantity === 0 && <span className="sold-out-badge" role="status">Sold Out</span>}
            </div>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <div className="product-meta">
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(item.priceCents / 100)}
              </strong>
              <span>{item.quantity > 0 ? `${item.quantity} available` : "Sold out"}</span>
            </div>
            <div className="fulfillment">{item.fulfillment}</div>
            <AddToCartButton
              product={{
                id: item.id,
                name: item.name,
                priceCents: item.priceCents,
                stock: item.quantity,
              }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
