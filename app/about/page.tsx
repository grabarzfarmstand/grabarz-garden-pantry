import { StorefrontFooter, StorefrontHeader } from "@/components/storefront";

export default function AboutPage() {
  return (
    <main>
      <StorefrontHeader />
      <section className="policy-main about-main">
        <div className="wrap">
          <p className="eyebrow dark">Grown · Gathered · Handmade</p>
          <h1>About Sandi &amp; Grabarz Garden &amp; Pantry</h1>
          <div className="about-copy">
            <p>
              I’ve always been drawn to a small-homestead, farm-style way of life—gardening,
              caring for our chickens, canning, baking, and making things by hand. I love
              seeing possibility in the everyday, then adding a little creativity and care
              to make something useful or beautiful. I’ve also long wanted to build a small
              business of my own, rooted in the things I love.
            </p>
            <p>
              That dream began to feel real when we set up a little pop-up farmstand on a
              friend’s property. We shared what we’d grown and made, met people stopping
              by, and discovered how much joy there was in that simple exchange. I loved
              being able to offer a little piece of our home and hard work to others.
            </p>
            <p>
              When the colder months came, I didn’t want the farmstand feeling to disappear
              until spring. Grabarz Garden &amp; Pantry is our way of carrying it forward
              online—a seasonal place to find garden and pantry goods, handmade essentials,
              and other treasures as they’re ready. We hope to make it easier to shop
              through local delivery and mail order, with offerings changing along with
              the season.
            </p>
            <p>
              Some things will be grown, some gathered, and some made by hand. Everything
              reflects the homegrown, practical, creative spirit I want this little
              business to share.
            </p>
          </div>
          <p className="about-tagline">Grown • Gathered • Handmade</p>
        </div>
      </section>
      <StorefrontFooter />
    </main>
  );
}
