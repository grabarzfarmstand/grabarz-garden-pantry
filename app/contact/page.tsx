import { ContactForm } from "@/components/contact-form";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront";

export default function ContactPage() {
  return (
    <main>
      <StorefrontHeader />
      <section className="contact-main wrap">
        <p className="eyebrow dark">Grabarz Garden & Pantry · Rustic Kettle Soap Co.</p>
        <h1>Contact Us</h1>
        <p className="contact-intro">
          Questions about an order, in-town pickup, Medford delivery, or our handmade soaps?
          We&apos;re happy to help.
        </p>
        <div className="contact-grid">
          <section className="owner-card">
            <h2>Get in touch</h2>
            <p>
              We&apos;re located in Cave Junction, Oregon. Pickup and delivery details are
              coordinated after an order is placed.
            </p>
            <p>
              Email us at{" "}
              <a href="mailto:grabarzfarmstand@gmail.com">grabarzfarmstand@gmail.com</a>.
            </p>
            <p className="contact-note">
              Sending the form saves your message for the store owner to review. For a
              time-sensitive question, email us directly.
            </p>
          </section>
          <section className="owner-card">
            <h2>Send us a message</h2>
            <p className="helper">We&apos;ll use your email to reply to your inquiry.</p>
            <ContactForm />
            <p className="contact-fallback">
              Form not working?{" "}
              <a href="mailto:grabarzfarmstand@gmail.com?subject=Website%20inquiry">
                Email us directly
              </a>.
            </p>
          </section>
        </div>
      </section>
      <StorefrontFooter />
    </main>
  );
}
