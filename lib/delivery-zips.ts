export type DeliveryTierId = "nearby" | "regional" | "extended" | "weekly";

export type LocalDeliveryTier = {
  id: DeliveryTierId;
  description: string;
  amountCents: number;
  minimumSubtotalCents: number;
  checkoutDisplayName: string;
};

export const localDeliveryTiers: Record<DeliveryTierId, LocalDeliveryTier> = {
  nearby: {
    id: "nearby",
    description: "0–15 road miles ($5 fee, $25 order minimum).",
    amountCents: 500,
    minimumSubtotalCents: 2500,
    checkoutDisplayName: "Local Delivery - 0–15 road miles ($5 fee; $25 minimum)",
  },
  regional: {
    id: "regional",
    description: "15–30 road miles ($8 fee, $35 order minimum).",
    amountCents: 800,
    minimumSubtotalCents: 3500,
    checkoutDisplayName: "Local Delivery - 15–30 road miles ($8 fee; $35 minimum)",
  },
  extended: {
    id: "extended",
    description: "30–50 road miles ($12 fee, $50 order minimum).",
    amountCents: 1200,
    minimumSubtotalCents: 5000,
    checkoutDisplayName: "Local Delivery - 30–50 road miles ($12 fee; $50 minimum)",
  },
  weekly: {
    id: "weekly",
    description: "Central Point and Medford: $12 fee, $50 order minimum; deliveries are scheduled once per week.",
    amountCents: 1200,
    minimumSubtotalCents: 5000,
    checkoutDisplayName:
      "Weekly Medford & Central Point Delivery ($12 fee; $50 minimum; once per week)",
  },
};

const zipDeliveryTiers: Record<string, DeliveryTierId> = {
  "97523": "nearby",
  "97531": "nearby",
  "97534": "nearby",
  "97538": "nearby",
  "97543": "regional",
  "97533": "regional",
  "97526": "regional",
  "97527": "regional",
  "97544": "regional",
  "97532": "extended",
  "97537": "extended",
  "97530": "extended",
  "97525": "extended",
  "95543": "extended",
  "97502": "weekly",
  "97501": "weekly",
  "97504": "weekly",
};

export function getDeliveryTierForZip(postalCode: string) {
  const match = postalCode.trim().match(/^(\d{5})(?:-\d{4})?$/);
  if (!match) return null;
  const tierId = zipDeliveryTiers[match[1]];
  return tierId ? localDeliveryTiers[tierId] : null;
}
