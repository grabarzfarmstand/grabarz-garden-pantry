import { PolicyPage } from "@/components/policy-page";

export default function ShippingReturnsPage() {
  return (
    <PolicyPage
      title="Shipping, Local Delivery & Returns Policy"
      sections={[
        {
          heading: "Fulfillment options (no pickup)",
          paragraphs: [
            "We offer mail order shipping or local delivery only. Customer pickup is not available. Eligible fulfillment methods are noted on each product.",
          ],
        },
        {
          heading: "Mail order shipping",
          paragraphs: [
            "Flat-rate shipping is $7.50 via USPS or UPS.",
          ],
        },
        {
          heading: "Local delivery fees & minimums",
          paragraphs: [
            "Local delivery is available within 50 miles of our farmstand. The distance from our farmstand determines the delivery tier and order minimum.",
          ],
          bullets: [
            "Up to 15 miles: $5 delivery fee, with a $25 order minimum.",
            "More than 15 and up to 30 miles: $8 delivery fee, with a $35 order minimum.",
            "More than 30 and up to 50 miles: $12 delivery fee, with a $50 order minimum.",
          ],
        },
        {
          heading: "Order handling & timing",
          paragraphs: [
            "Items are reserved only after an order is placed and paid. Orders are packed together and fulfilled on our scheduled shipping days or organized local delivery routes. Please allow extra processing time during peak seasons or holiday periods.",
          ],
        },
        {
          heading: "Returns & refunds",
          paragraphs: [
            "Due to the perishable and personal-care nature of our products, all sales are final and returns are not accepted. If an item arrives damaged or defective, please contact us within 7 days of delivery with photos of the item and packaging so we can make it right.",
          ],
        },
      ]}
    />
  );
}
