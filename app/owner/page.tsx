import { env } from "cloudflare:workers";
import { desc, gt } from "drizzle-orm";
import { requireOwnerApi } from "@/lib/owner";
import { getDb } from "@/db";
import { customerMessages, orders, products } from "@/db/schema";
import { MIN_OWNER_PASSWORD_LENGTH } from "@/lib/owner-session";
import OwnerDashboard from "./owner-dashboard";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront";
/* eslint-disable @next/next/no-html-link-for-pages */
export const dynamic = "force-dynamic";

export default async function OwnerPage({
  searchParams,
}: {
  searchParams?: Promise<{ login?: string }>;
}) {
  let user;
  try {
    user = await requireOwnerApi();
  } catch (error) {
    const loginState = (await searchParams)?.login;
    const errorCode = error instanceof Error ? error.message : "UNAUTHENTICATED";
    const passwordLoginConfigured =
      typeof env.OWNER_PASSWORD === "string" &&
      env.OWNER_PASSWORD.length >= MIN_OWNER_PASSWORD_LENGTH;
    const notice = loginState === "invalid"
      ? "The owner email or password was not correct."
      : loginState === "not-configured"
        ? "Password sign-in is not configured. Add the OWNER_PASSWORD Worker secret in Cloudflare Production."
        : loginState === "signed-out"
          ? "You have been signed out of this device."
          : errorCode === "FORBIDDEN"
            ? "Cloudflare Access is signed in with a different email. Use the store owner's identity or sign in below."
            : null;

    return (
      <>
        <StorefrontHeader />
        <main className="owner-page">
          <div className="wrap owner-main owner-sign-in">
            <section className="owner-card">
              <p className="eyebrow dark">Grabarz Garden & Pantry</p>
              <h1>Owner sign-in</h1>
              <p>
                Cloudflare Access signs you in automatically when available. Otherwise,
                use the owner email and password to open your dashboard on this device.
              </p>
              {notice && (
                <p className="form-message" role={loginState === "signed-out" ? "status" : "alert"}>
                  {notice}
                </p>
              )}
              {!passwordLoginConfigured && (
                <p className="owner-login-setup" role="note">
                  Password sign-in needs a Cloudflare Worker secret named <code>OWNER_PASSWORD</code>{" "}
                  with at least 32 characters. The password is not stored in the site code.
                </p>
              )}
              <form className="product-form" method="post" action="/api/owner/auth/login">
                <div className="field">
                  <label htmlFor="owner-email">Owner email</label>
                  <input
                    id="owner-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    defaultValue={env.OWNER_EMAIL ?? ""}
                    maxLength={254}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-password">Owner password</label>
                  <input
                    id="owner-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    minLength={MIN_OWNER_PASSWORD_LENGTH}
                    maxLength={128}
                    required
                  />
                </div>
                <button className="save-button" type="submit" disabled={!passwordLoginConfigured}>
                  Sign in
                </button>
              </form>
              <a href="/">Return to the storefront</a>
            </section>
          </div>
        </main>
        <StorefrontFooter />
      </>
    );
  }
  const db = getDb();
  const [items, recentOrders, messages] = await Promise.all([
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(orders).where(gt(orders.totalPaidCents, 0)).orderBy(desc(orders.paidAt)).limit(50),
    db.select().from(customerMessages).orderBy(desc(customerMessages.createdAt)).limit(100),
  ]);
  return <><OwnerDashboard initialItems={items} initialOrders={recentOrders} initialMessages={messages} displayName={user.displayName} authMethod={user.authMethod} /><StorefrontFooter /></>;
}
