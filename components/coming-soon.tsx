import { StorefrontFooter } from "@/components/storefront";

/* eslint-disable @next/next/no-html-link-for-pages */

export function ComingSoonPage() {
  return (
    <div className="coming-soon-page">
      <div className="topbar">Seasonal · small-batch · first come, first served</div>
      <header className="coming-soon-header wrap">
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
      </header>
      <main className="coming-soon-main">
        <section className="coming-soon-card">
          <p className="eyebrow dark">A seasonal farm & home market</p>
          <h1>Getting Our Shelves Ready — Opening Soon</h1>
          <p>
            We’re gathering garden goodness, pantry favorites, handmade
            essentials and found treasures for the next season. We can’t wait
            to share a little piece of our home with you.
          </p>
          <p className="coming-soon-tagline">Grown · Gathered · Handmade</p>
          <nav className="coming-soon-links" aria-label="More about our farmstand">
            <a className="button sage" href="/about">Meet Sandi & learn our story</a>
            <a href="/contact">Contact us</a>
          </nav>
        </section>
      </main>
      <StorefrontFooter />
    </div>
  );
}
