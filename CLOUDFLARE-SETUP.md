# Grabarz Garden & Pantry — Cloudflare setup

The storefront runs on Cloudflare Workers with D1 and R2. The production Worker is
`grabarz-garden-pantry`; its D1 binding `DB` uses `grabarz-checkout-test`.

The production build, TypeScript checks, and public route checks have passed. The Owner dashboard requires Cloudflare Access authentication, so its signed-in experience still needs to be verified with the owner's account.

## What changed

- Vite/Worker configuration targets the owner's Cloudflare account, existing D1 database, and R2 bucket.
- Owner authorization verifies Cloudflare Access JWT signatures, issuer, audience, expiry, and the explicitly allowed owner email. No first-visitor ownership claim.
- Missing Access configuration locks owner access. Product APIs also verify authorization.
- Cross-origin product mutations are rejected. Photo MIME types are restricted to JPG, PNG, WebP.

## Setup and operations

1. Install dependencies with Node 22.13+ and pnpm 11.25: `pnpm install --frozen-lockfile`.
2. Configure a Cloudflare Access self-hosted application for the chosen hostname's `/owner` and `/api/owner/*` paths, including any additional hostnames used for administration. Allow ONLY `grabarzfarmstand@gmail.com`, with email one-time PIN or another explicitly chosen login method. Keep public storefront paths outside this policy. Do not create an Allow Everyone or Bypass rule for owner paths.
3. Set `ACCESS_TEAM_DOMAIN` (hostname only, ending in `.cloudflareaccess.com`) and `ACCESS_AUD` (the application's audience tag) in wrangler.jsonc. These are configuration identifiers, not API secrets. Verify the account's plan and any charge before enabling services.
4. Run `pnpm build`. Deploy through Cloudflare Workers, not Pages ZIP upload: `pnpm deploy`. This requires the owner's Cloudflare authorization. Never put API tokens in this repository or in chat.
5. Apply all pending D1 migrations to the existing database: `pnpm exec wrangler d1 migrations apply grabarz-checkout-test --remote`. Migration `0004` preserves the previous `orders` table as `orders_legacy` and creates the paid-orders table shape expected by the app. For local development, use `pnpm exec wrangler d1 migrations apply grabarz-checkout-test --local`.
6. Configure these Worker variables in Cloudflare's Worker settings (or locally in the ignored `.dev.vars` file):
   - `STRIPE_SECRET_KEY`: Stripe secret key, stored as a secret.
   - `STRIPE_WEBHOOK_SECRET`: signing secret for the configured Stripe webhook endpoint, stored as a secret.
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key. It is public, but must be from the same Stripe mode as the secret key.
   Use matching test keys while testing and matching live keys only after test checkout and webhook delivery work. Never commit or share the secret keys.
7. In Stripe's Webhooks settings, add `https://YOUR_PRODUCTION_HOST/api/stripe/webhook` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Use the endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`. Test and live mode have separate webhook endpoints/secrets.
8. Test public browsing, unauthorized owner access, owner sign-in, product/photo creation, publish/unpublish and deletion, plus a Stripe test checkout and webhook inventory update. Confirm the paid order appears in the Owner area's Recent Orders list with its contact, shipping, item, and total details. Confirm logout/expiry denies owner changes. Review draft image access (current image URLs are publicly readable if known).
9. Connect and verify the custom domain only after testing. Verify domain ownership and DNS state; a domain appearing in the dashboard is not proof of registration.

## Important limitations

This package is source code, not a drag-and-drop static website. GitHub must contain the unpacked source files, with package.json and wrangler.jsonc at repository root. Retain the old ZIP as a backup.

Stripe Checkout is implemented using server-side product prices and collects a US shipping address and phone number. A signed webhook records paid orders in D1 and decrements stock, and the Owner dashboard shows recent order details. Shipping calculations, refunds, and fulfillment workflows are not implemented. Photos have a 12 MB per-file limit; automatic compression is not yet implemented. Cloudflare free limits and possible R2 overages still apply; this migration is not a guarantee of zero costs or unlimited usage.

Legacy Sites helper files are retained for source completeness but the new build/owner paths do not use ChatGPT authentication. Do not publish via the legacy .openai manifest or old Sites scripts. Use only the build/deploy commands above.

No live Cloudflare resources, GitHub contents, paid plans, or original hosted website were modified during preparation.
