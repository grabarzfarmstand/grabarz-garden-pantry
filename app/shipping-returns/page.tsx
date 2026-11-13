import { PolicyPage } from "@/components/policy-page";
import { fulfillmentPolicySections } from "@/lib/fulfillment";

export default function ShippingReturnsPage() {
  return (
    <PolicyPage
      title="Shipping, Local Delivery & Returns Policy"
      sections={fulfillmentPolicySections}
    />
  );
}
