import {
  CategoryCards,
  FarmstandAnnouncementBanner,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import { ComingSoonPage } from "@/components/coming-soon";
import { getFarmstandAnnouncement } from "@/lib/farmstand-announcement";
import { shouldShowComingSoon } from "@/lib/storefront-mode";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  if (await shouldShowComingSoon()) return <ComingSoonPage />;

  const checkoutResult = (await searchParams)?.checkout;
  const farmstandAnnouncement = await getFarmstandAnnouncement();

  return (
    <main>
      <StorefrontHeader />
      {checkoutResult === "success" && (
        <p
          role="status"
          aria-live="polite"
          style={{
            width: "min(1160px, calc(100% - 36px))",
            margin: "18px auto",
            padding: "16px 20px",
            border: "1px solid #dfc9a7",
            borderLeft: "5px solid #49634a",
            borderRadius: 12,
            background: "#f8efe2",
            color: "#29372c",
            fontWeight: 700,
          }}
        >
          Thank you! Your order and payment have been received. We’ll be in
          touch to coordinate any pickup or delivery details.
        </p>
      )}
      {checkoutResult === "cancelled" && (
        <p role="status">Checkout was cancelled. Your cart is still available.</p>
      )}

      <section className="hero" id="top">
        <div className="hero-shade" />
        <div className="hero-copy wrap">
          <p className="eyebrow">A seasonal farm & home market</p>
          <h1>Farm goodness, handmade essentials & found treasures.</h1>
          <p>
            Shop small-batch pantry favorites, seasonal garden goods,
            neighbor-made wares and thoughtfully gathered resale finds.
          </p>
          <a className="button rose" href="/shop">See what’s available</a>
          <div className="hero-soap-feature">
            <img
              src="/assets/rustic-kettle-logo-round.png"
              alt="Rustic Kettle Soap Co. logo"
            />
            <div className="hero-soap-feature-copy">
              <p className="hero-soap-eyebrow">Handmade Soap Line</p>
              <h2>Rustic Kettle Soap Co.</h2>
              <a href="/soap">Explore Soaps →</a>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <FarmstandAnnouncementBanner announcement={farmstandAnnouncement} />
      </div>

      <section className="section category-section">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">Explore the market</p>
              <h2>Something different each week</h2>
            </div>
            <p>
              The selection expands and contracts with the garden, curing
              shelf, kitchen and family schedule.
            </p>
          </div>
          <CategoryCards />
        </div>
      </section>

      <section className="section route" id="how">
        <div className="wrap">
          <div className="section-heading light">
            <div>
              <p className="eyebrow">Simple by design</p>
              <h2>One manageable weekly rhythm</h2>
            </div>
            <p>
              Only finished, counted items are offered. Choose scheduled
              in-town pickup, $6.95 mail shipping, or an eligible local
              delivery tier at checkout.
            </p>
          </div>
          <div className="steps">
            <div><b>1</b><h3>Shop what’s ready</h3><p>Fresh, seasonal and first come, first served.</p></div>
            <div><b>2</b><h3>Choose fulfillment</h3><p>Checkout shows the methods available for every item in your cart. Local delivery tiers appear when your subtotal meets their minimum.</p></div>
            <div><b>3</b><h3>Receive your order</h3><p>Pickup details are arranged after payment; shipping and local delivery follow scheduled days and routes.</p></div>
          </div>
          <a className="button sage" href="/how-it-works">See all fulfillment details</a>
        </div>
      </section>

      <StorefrontFooter />
    </main>
  );
}
