import { PolicyPage } from "@/components/policy-page";

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      sections={[
        {
          heading: "Information we collect",
          paragraphs: [
            "We collect only the customer information needed to fulfill orders: your name, email, phone number for delivery coordination, shipping or delivery address, and order details.",
            "If you send us a Contact Us message, we also collect the name, email address, topic, and message you submit. We save that inquiry in our database so the store owner can review and respond.",
          ],
        },
        {
          heading: "Payments",
          paragraphs: [
            "Payments are securely processed through Stripe. We never see or store your full credit card number.",
          ],
        },
        {
          heading: "How we handle your information",
          paragraphs: [
            "We use order information to fulfill and coordinate your order, and contact-form information to respond to your inquiry. We never sell or rent customer information to third parties.",
          ],
        },
      ]}
    />
  );
}
