"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
};

type CartLine = Product & { quantity: number };

const CART_KEY = "grabarz-market-cart";

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
      {product.stock > 0 ? (added ? "Added!" : "Add to cart") : "Sold out"}
    </button>
  );
}

export function CartButton() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const update = () => setCart(readCart());
    update();
    window.addEventListener("grabarz-cart-change", update);

    const url = new URL(window.location.href);
    const checkoutResult = url.searchParams.get("checkout");
    if (checkoutResult === "success") {
      saveCart([]);
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
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map(({ id, quantity }) => ({ id, quantity })) }),
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
                <button type="button" onClick={startCheckout} disabled={checkingOut}>
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
