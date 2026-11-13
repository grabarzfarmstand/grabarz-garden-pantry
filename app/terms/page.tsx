import { PolicyPage } from "@/components/policy-page";

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms & Conditions"
      sections={[
        {
          heading: "Handmade & small-batch variations",
          paragraphs: [
            "Because our goods are handmade in small batches, slight variations in color, scent, weight, texture, and packaging may occur. These differences are part of the natural character of handmade items.",
          ],
        },
        {
          heading: "Product photos",
          paragraphs: [
            "Product photos are representative. Actual items may vary slightly from batch to batch.",
          ],
        },
        {
          heading: "Ingredients & allergen notice",
          paragraphs: [
            "All ingredients are listed on product labels and/or product pages. Customers are responsible for reviewing ingredients prior to purchase, especially if they have allergies or skin sensitivities.",
          ],
        },
        {
          heading: "Orders, pricing & taxes",
          paragraphs: [
            "Items are reserved only upon completed payment. Applicable taxes and fulfillment fees are calculated at checkout. We reserve the right to limit quantities or cancel and refund orders if an item becomes unavailable or falls outside our local delivery service area.",
          ],
        },
      ]}
    />
  );
}
