import { getDeliveryTierForZip, localDeliveryTiers, type DeliveryTierId } from "@/lib/delivery-zips";

export type FulfillmentMethod = "pickup" | "mail" | "delivery";

export type CheckoutFulfillmentOption = {
  method: FulfillmentMethod;
  displayName: string;
  amountCents: number;
  minimumSubtotalCents?: number;
  deliveryTierId?: DeliveryTierId;
};

export const productFulfillmentChoices = [
  "Scheduled In-Town Pickup only",
  "Mail order only",
  "Local delivery only",
  "Scheduled In-Town Pickup or Mail order",
  "Scheduled In-Town Pickup or Local delivery",
  "Mail order or Local delivery (No Pickup)",
  "Scheduled In-Town Pickup, Mail order, or Local delivery",
];

const checkoutOptions: CheckoutFulfillmentOption[] = [
  {
    method: "pickup",
    displayName: "Scheduled In-Town Pickup ($0.00)",
    amountCents: 0,
  },
  {
    method: "mail",
    displayName: "Mail Order Shipping ($6.95)",
    amountCents: 695,
  },
  ...Object.values(localDeliveryTiers).map((tier) => ({
    method: "delivery" as const,
    deliveryTierId: tier.id,
    displayName: tier.checkoutDisplayName,
    amountCents: tier.amountCents,
    minimumSubtotalCents: tier.minimumSubtotalCents,
  })),
];

function supportsMethod(label: string, method: FulfillmentMethod) {
  const normalized = label.toLowerCase();
  if (method === "pickup") {
    if (normalized.includes("no pickup")) return false;
    if (normalized.includes("pickup")) return true;
    return !normalized.includes("only");
  }
  if (normalized.includes("only")) return normalized.includes(method === "mail" ? "mail order" : "local delivery");
  if (method === "mail") return normalized.includes("mail order");
  return normalized.includes("local delivery");
}

export function getProductFulfillmentDisplay(label: string) {
  const methods = (["pickup", "mail", "delivery"] as const)
    .filter((method) => supportsMethod(label, method))
    .map((method) => {
      if (method === "pickup") return "Scheduled In-Town Pickup";
      if (method === "mail") return "Mail order";
      return "Local delivery";
    });
  return methods.join(", ");
}

export function getCheckoutFulfillmentOptions(
  subtotalCents: number,
  productFulfillment: readonly string[],
  deliveryZip?: string,
) {
  if (productFulfillment.length === 0) return [];
  const deliveryTier = deliveryZip === undefined ? null : getDeliveryTierForZip(deliveryZip);

  return checkoutOptions.filter((option) => {
    const allProductsSupportMethod = productFulfillment.every((label) =>
      supportsMethod(label, option.method),
    );
    const matchesDeliveryZip =
      option.method !== "delivery" ||
      deliveryZip === undefined ||
      option.deliveryTierId === deliveryTier?.id;
    const meetsMinimum =
      option.minimumSubtotalCents === undefined ||
      subtotalCents >= option.minimumSubtotalCents;
    return allProductsSupportMethod && matchesDeliveryZip && meetsMinimum;
  });
}

export const fulfillmentPolicySections = [
  {
    heading: "Scheduled In-Town Pickup (Free)",
    paragraphs: [
      "Pickup at our farmstand property is not available, but we offer free scheduled in-town pickup in Cave Junction on designated pickup days. Pickup location and time are arranged by message/email after payment is finalized. Eligible fulfillment methods are noted on each product.",
    ],
  },
  {
    heading: "Mail Order Shipping ($6.95)",
    paragraphs: [
      "Flat-rate $6.95 via USPS or UPS. Oregon cottage food items can only be shipped within Oregon.",
    ],
  },
  {
    heading: "Local Delivery (within 50 miles)",
    paragraphs: [
      "Local delivery is available in the ZIP codes shown by the cart's delivery checker. The cart subtotal must meet the matching tier's minimum.",
    ],
    bullets: [
      "Up to 15 miles ($5 fee, $25 order minimum).",
      "15–30 miles ($8 fee, $35 order minimum).",
      "30–50 miles ($12 fee, $50 order minimum).",
      "Central Point and Medford (ZIPs 97502, 97501, and 97504) are included in the $12 fee, $50 minimum tier, with deliveries scheduled once per week.",
    ],
  },
  {
    heading: "Order Handling, Returns & Oregon Disclosure",
    paragraphs: [
      "Items are reserved only after an order is placed and paid. Orders are packed together and fulfilled on our scheduled shipping days or organized local delivery routes. Please allow extra processing time during peak seasons or holiday periods.",
      "Due to the perishable and personal-care nature of our products, all sales are final and returns are not accepted. If an item arrives damaged or defective, please contact us within 7 days of delivery with photos of the item and packaging so we can make it right.",
      "Cottage food pantry items include this Oregon disclosure: This product is homemade and is not prepared in an inspected food establishment",
    ],
  },
];
