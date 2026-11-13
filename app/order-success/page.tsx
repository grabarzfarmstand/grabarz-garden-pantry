"use client";

import { useEffect } from "react";

const CART_KEY = "grabarz-market-cart";

export default function OrderSuccessPage() {
  useEffect(() => {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event("grabarz-cart-change"));
  }, []);

  return (
    <main style={{ maxWidth: 680, margin: "10vh auto", padding: 24, color: "#30352a" }}>
      <p>Grabarz Garden & Pantry</p>
      <h1>Thank you for your order!</h1>
      <p>Your payment was submitted securely through Stripe. We’ll prepare your order after Stripe confirms the payment.</p>
      <p>Keep an eye out for your Stripe receipt and any follow-up from us about shipping.</p>
      <a className="button sage" href="/#shop" style={{ fontSize: "1.05rem", minHeight: 54 }}>
        Continue shopping
      </a>
    </main>
  );
}
