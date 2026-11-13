import { StorefrontFooter, StorefrontHeader } from "@/components/storefront";

type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function PolicyPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string;
  sections: PolicySection[];
}) {
  return (
    <main>
      <StorefrontHeader />
      <article className="policy-main wrap">
        <p className="eyebrow dark">Grabarz Garden & Pantry · Rustic Kettle Soap Co.</p>
        <h1>{title}</h1>
        <p className="policy-intro">{intro ?? "These policies apply to purchases from Grabarz Garden & Pantry and Rustic Kettle Soap Co."}</p>
        <div className="policy-sections">
          {sections.map((section) => (
            <section className="policy-section" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul className="policy-bullets">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
      <StorefrontFooter />
    </main>
  );
}
