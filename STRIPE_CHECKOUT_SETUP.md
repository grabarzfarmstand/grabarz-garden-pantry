# Stripe checkout setup

Checkout code is prepared, but payments stay unavailable until the two Stripe secrets are added to the Cloudflare Worker and the database migration is applied. Do not put secret values in GitHub, source files, or chat.

## Before going live

1. In Cloudflare, open the `grabarz-garden-pantry` Worker and add these as encrypted secrets under **Settings → Variables and Secrets**:
   - `STRIPE_SECRET_KEY` — use a Stripe **test-mode** secret key first.
   - `STRIPE_WEBHOOK_SECRET` — add after creating the webhook endpoint below.
2. In Stripe **test mode**, create a webhook endpoint for your website URL plus `/api/stripe/webhook`. Select `checkout.session.completed`. Copy its signing secret (it begins with `whsec_`) into Cloudflare as `STRIPE_WEBHOOK_SECRET`.
3. Apply migration `migrations/0002_stripe_orders.sql` to the Cloudflare D1 database before deploying this branch.
4. Deploy to a test/staging URL and run a test payment. Confirm the order returns to the thank-you page and product stock decreases once. Only then switch to Stripe live-mode secrets and a live-mode webhook.

The checkout uses the product price and stock stored on the server, accepts US shipping addresses, and adds $7.50 flat-rate shipping. It does not yet offer local-delivery checkout. The webhook verifies Stripe's signature and changes stock only for a confirmed paid order. A rare case where stock is no longer available at payment confirmation is flagged as `inventory_issue` for owner review/refund rather than allowing inventory to go negative.
