"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getDeliveryTierForZip } from "@/lib/delivery-zips";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
};

type CartLine = Product & { quantity: number };

const CART_KEY = "grabarz-market-cart";
const checkoutButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: 16,
  border: 0,
  borderRadius: 999,
  padding: "14px 18px",
  backgroundColor: "#2f4d36",
  color: "#fff",
  fontSize: "1rem",
  fontWeight: 800,
};

function readCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartLine[];
  } catch {
    return [];
  }
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function deliveryZipMessage(zip: string, subtotalCents: number) {
  if (!zip) return "Enter your ZIP code to check local delivery availability.";
  if (zip.length < 5) return "Enter all 5 digits to check local delivery.";

  const tier = getDeliveryTierForZip(zip);
  if (!tier) {
    return "Local delivery is not available for this ZIP. Choose $6.95 Mail Order Shipping or free Scheduled In-Town Pickup in Cave Junction at checkout.";
  }
  if (subtotalCents < tier.minimumSubtotalCents) {
    return `${tier.description} Add ${money(tier.minimumSubtotalCents - subtotalCents)} to your cart to qualify.`;
  }
  return `${tier.description} Your matching delivery option will appear at checkout.`;
}

function saveCart(cart: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("grabarz-cart-change"));
}

export function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  function addToCart() {
    const cart = readCart();
    const existing = cart.find((line) => line.id === product.id);

    if (existing) {
      if (existing.quantity >= product.stock) return;
      existing.quantity += 1;
    } else {
      if (product.stock < 1) return;
      cart.push({ ...product, quantity: 1 });
    }

    saveCart(cart);
  }

  return (
    <button type="button" onClick={() => {
  addToCart();
  setAdded(true);
  window.setTimeout(() => setAdded(false), 3000);
}} disabled={product.stock < 1}>
      {product.stock > 0 ? (added ? "Added!" : "Add to cart") : "Sold Out"}
    </button>
  );
}

export function CartButton() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [deliveryZip, setDeliveryZip] = useState("");

  useEffect(() => {
    const update = () => setCart(readCart());
    window.addEventListener("grabarz-cart-change", update);

    const url = new URL(window.location.href);
    const checkoutResult = url.searchParams.get("checkout");
    if (checkoutResult === "success") {
      saveCart([]);
    } else {
      update();
    }
    if (checkoutResult === "success" || checkoutResult === "cancelled") {
      url.searchParams.delete("checkout");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url);
    }

    return () => window.removeEventListener("grabarz-cart-change", update);
  }, []);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce(
    (sum, line) => sum + line.priceCents * line.quantity,
    0,
  );

  function changeQuantity(id: string, amount: number) {
    const next = readCart()
      .map((line) =>
        line.id === id
          ? {
              ...line,
              quantity: Math.min(line.stock, line.quantity + amount),
            }
          : line,
      )
      .filter((line) => line.quantity > 0);

    saveCart(next);
  }

  function removeItem(id: string) {
    saveCart(readCart().filter((line) => line.id !== id));
  }

  async function startCheckout() {
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const requestBody: {
        items: { id: string; quantity: number }[];
        deliveryZip?: string;
      } = {
        items: cart.map(({ id, quantity }) => ({ id, quantity })),
      };
      if (/^\d{5}$/.test(deliveryZip)) requestBody.deliveryZip = deliveryZip;

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new Error("We could not start checkout. Please try again.");
      }
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("url" in result) ||
        typeof result.url !== "string"
      ) {
        const message =
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "We could not start checkout. Please try again.";
        throw new Error(message);
      }
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "We could not start checkout. Please try again.");
      setCheckingOut(false);
    }
  }

  return (
    <>
      <button className="cart-button" type="button" onClick={() => setOpen(true)}>
        Cart ({itemCount})
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              background: "#fffdf8",
              color: "#30352a",
              width: "min(420px, 100%)",
              height: "100%",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
            <h2>Your cart</h2>
            <section className="cart-delivery-check" aria-labelledby="cart-delivery-title">
              <h3 id="cart-delivery-title">Check local delivery</h3>
              <label htmlFor="cart-delivery-zip">Delivery ZIP code</label>
              <input
                id="cart-delivery-zip"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={deliveryZip}
                onChange={(event) =>
                  setDeliveryZip(event.target.value.replace(/\D/g, "").slice(0, 5))
                }
              />
              <p role="status" aria-live="polite">
                {deliveryZipMessage(deliveryZip, total)}
              </p>
            </section>

            {cart.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              <>
                {cart.map((line) => (
                  <div
                    key={line.id}
                    style={{
                      borderBottom: "1px solid #ddd6c8",
                      padding: "14px 0",
                    }}
                  >
                    <strong>{line.name}</strong>
                    <p>{money(line.priceCents)} each</p>
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.id, -1)}
                    >
                      −
                    </button>{" "}
                    {line.quantity}{" "}
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.id, 1)}
                      disabled={line.quantity >= line.stock}
                    >
                      +
                    </button>{" "}
                    <button
                      type="button"
                      onClick={() => removeItem(line.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <h3>Subtotal: {money(total)}</h3>
                {checkoutError && <p role="alert">{checkoutError}</p>}
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={checkingOut}
                  aria-busy={checkingOut}
                  style={{
                    ...checkoutButtonStyle,
                    cursor: checkingOut ? "wait" : "pointer",
                    opacity: checkingOut ? 0.75 : 1,
                  }}
                >
                  {checkingOut ? "Opening checkout…" : "Checkout"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
