import { fulfillmentPolicySections } from "@/lib/fulfillment";
import { PolicyPage } from "@/components/policy-page";

export default function HowItWorksPage() {
  return (
    <PolicyPage
      title="How It Works"
      intro="Choose one of the eligible fulfillment options below at checkout."
      sections={fulfillmentPolicySections}
    />
  );
}
