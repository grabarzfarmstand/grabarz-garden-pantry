type StripeMode = "live" | "test";

type StripeConfig =
  | { secretKey: string }
  | { error: string };

function getStripeMode(key: string | undefined, prefixes: readonly string[]): StripeMode | null {
  const normalized = key?.trim();
  if (!normalized) return null;
  if (prefixes.some((prefix) => normalized.startsWith(`${prefix}_live_`))) return "live";
  if (prefixes.some((prefix) => normalized.startsWith(`${prefix}_test_`))) return "test";
  return null;
}

export function getStripeConfig(
  secretKeyValue: string | undefined,
  publishableKeyValue: string | undefined,
): StripeConfig {
  const secretKey = secretKeyValue?.trim();
  const publishableKey = publishableKeyValue?.trim();
  const secretMode = getStripeMode(secretKey, ["sk", "rk"]);
  const publishableMode = publishableKey ? getStripeMode(publishableKey, ["pk"]) : null;

  if (!secretKey || !secretMode || (publishableKey && !publishableMode)) {
    return { error: "Stripe keys are missing or invalid." };
  }
  if (publishableMode && secretMode !== publishableMode) {
    return { error: "Stripe secret and publishable keys must use the same mode." };
  }

  return { secretKey };
}
