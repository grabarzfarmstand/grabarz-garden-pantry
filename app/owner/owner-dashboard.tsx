"use client";

import { useState } from "react";
import { productFulfillmentChoices } from "@/lib/fulfillment";
import { getDeliveryTierForZip } from "@/lib/delivery-zips";

/* eslint-disable @next/next/no-html-link-for-pages */

type Product = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  quantity: number;
  description: string;
  fulfillment: string;
  imageKey: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

type RecentOrder = {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddressJson: string | null;
  itemsJson: string;
  totalPaidCents: number;
  currency: string;
  fulfillmentOption: string;
  shippingCents: number;
  paidAt: number;
};

type CustomerMessage = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  createdAt: number;
};

type OrderLine = {
  name: string;
  quantity: number;
  priceCents?: number;
  category?: string;
};

type ShippingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function imageUrl(imageKey: string) {
  return `/api/images?key=${encodeURIComponent(imageKey)}`;
}

function parseOrderItems(json: string): OrderLine[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const lines: OrderLine[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object" || !("quantity" in item) ||
        typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return null;
    }
    const id = "id" in item && typeof item.id === "string" ? item.id : "";
    const name = "name" in item && typeof item.name === "string" ? item.name : id;
    const priceCents = "priceCents" in item && typeof item.priceCents === "number" &&
      Number.isSafeInteger(item.priceCents) && item.priceCents >= 0
      ? item.priceCents
      : undefined;
    const category = "category" in item && typeof item.category === "string"
      ? item.category
      : undefined;
    lines.push({ name: name || "Item", quantity: item.quantity, priceCents, category });
  }
  return lines;
}

function parseShippingAddress(json: string | null): ShippingAddress | null {
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const read = (key: keyof ShippingAddress) => {
    const value = parsed[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  const address = {
    line1: read("line1"),
    line2: read("line2"),
    city: read("city"),
    state: read("state"),
    postalCode: read("postalCode"),
    country: read("country"),
  };
  return Object.values(address).some(Boolean) ? address : null;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function addressLines(address: ShippingAddress | null) {
  if (!address) return [];
  const cityState = [address.city, [address.state, address.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [address.line1, address.line2, cityState, address.country].filter((line): line is string => Boolean(line));
}

export default function OwnerDashboard({
  initialItems,
  initialOrders,
  initialMessages,
  displayName,
  authMethod,
}: {
  initialItems: Product[];
  initialOrders: RecentOrder[];
  initialMessages: CustomerMessage[];
  displayName: string;
  authMethod: "access" | "password";
}) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [listMessage, setListMessage] = useState("");

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/owner/products", { method: "POST", body: new FormData(form) });
      const data = await response.json() as { error?: string; product?: Product };
      const newProduct = data.product;
      if (!response.ok || !newProduct) {
        setMessage(data.error ?? "We could not save that product.");
        return;
      }
      setItems((old) => [newProduct, ...old]);
      form.reset();
      setMessage("Saved! Your product is in the list on the right.");
    } catch {
      setMessage("We could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updateProduct(event: React.FormEvent<HTMLFormElement>, item: Product) {
    event.preventDefault();
    setSavingId(item.id);
    setMessage("");
    try {
      const response = await fetch(`/api/owner/products/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: new FormData(event.currentTarget),
      });
      const data = await response.json() as { error?: string; warning?: string; product?: Product };
      const updatedProduct = data.product;
      if (!response.ok || !updatedProduct) {
        setListMessage(data.error ?? "We could not update that product.");
        return;
      }
      setItems((old) => old.map((product) => product.id === item.id ? updatedProduct : product));
      setEditingId(null);
      setListMessage(data.warning ?? "Product updated.");
    } catch {
      setListMessage("We could not reach the server. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function changeStatus(item: Product) {
    const status = item.status === "published" ? "draft" : "published";
    setListMessage("");
    try {
      const response = await fetch(`/api/owner/products/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setListMessage(data.error ?? "We could not change this product's status.");
        return;
      }
      setItems((old) => old.map((product) => product.id === item.id ? { ...product, status } : product));
    } catch {
      setListMessage("We could not reach the server. Please try again.");
    }
  }

  async function remove(item: Product) {
    if (!confirm(`Remove “${item.name}” and its photo?`)) return;
    setListMessage("");
    try {
      const response = await fetch(`/api/owner/products/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setListMessage(data.error ?? "We could not remove that product.");
        return;
      }
      setItems((old) => old.filter((product) => product.id !== item.id));
    } catch {
      setListMessage("We could not reach the server. Please try again.");
    }
  }

  return <main className="owner-page">
    <header className="owner-header"><div className="wrap"><div><h1>Owner Dashboard</h1><p>Welcome, {displayName}. Add and manage your market products here.</p></div><div className="owner-header-actions"><a href="/">View the storefront →</a>{authMethod === "password" && <form method="post" action="/api/owner/auth/logout"><button type="submit">Sign out</button></form>}</div></div></header>
    <div className="owner-main wrap">
      <section className="owner-intro"><h2>Your simple upload routine</h2><ol><li>Choose one clear product photo.</li><li>Fill in the product details.</li><li>Save it as a draft, or check “Show in the store” when it is ready.</li></ol></section>
      <div className="owner-grid">
        <section className="owner-card"><h2>Add a product</h2><p className="helper">Start with one item. You can repeat this whenever you have something new.</p>
          <form className="product-form" onSubmit={addProduct}>
            <div className="field"><label htmlFor="photo">Product photo</label><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /><small>JPG, PNG or WebP. A bright, clear photo works best.</small></div>
            <div className="field"><label htmlFor="name">Product name</label><input id="name" name="name" placeholder="Example: Dirty Chai Soap" required /></div>
            <div className="field"><label htmlFor="category">Department</label><select id="category" name="category" required><option>Pantry</option><option>Garden</option><option>Bath & Home</option><option>Neighbor-Made</option><option>Second Story Finds</option></select></div>
            <div className="two-fields"><div className="field"><label htmlFor="price">Price</label><input id="price" name="price" type="number" min="0" step=".01" placeholder="8.00" required /></div><div className="field"><label htmlFor="quantity">Quantity available</label><input id="quantity" name="quantity" type="number" min="0" step="1" defaultValue="1" required /></div></div>
            <div className="field"><label htmlFor="fulfillment">How customers receive it</label><select id="fulfillment" name="fulfillment" defaultValue="" required>
              <option value="" disabled>Choose fulfillment options</option>
              {productFulfillmentChoices.map((choice) => <option key={choice}>{choice}</option>)}
            </select><small>Pickup is included unless you choose an “only” option or “No Pickup.”</small></div>
            <div className="field"><label htmlFor="description">Short description</label><textarea id="description" name="description" placeholder="Tell customers what makes it special." required /></div>
            <label className="checkline"><input name="published" type="checkbox" value="yes" /> Show this product in the store immediately</label>
            {message && <p className="form-message" role="status">{message}</p>}
            <button className="save-button" disabled={busy}>{busy ? "Uploading and saving…" : "Upload product"}</button>
          </form>
        </section>
        <section className="owner-card"><h2>Your products</h2><p className="helper">Drafts stay hidden. Published products appear under “Available now.”</p>
          {listMessage && <p className="form-message" role="status">{listMessage}</p>}
          <div className="owner-list">{items.length ? items.map((item) => <article className="owner-item" key={item.id}>
            <div className="owner-thumbnail"><img src={imageUrl(item.imageKey)} alt={item.name} onError={(event) => {
              event.currentTarget.hidden = true;
              event.currentTarget.parentElement?.classList.add("missing");
            }} /></div>
            <div className="owner-item-content">
              <span className={"status " + item.status}>{item.status === "published" ? "Published" : "Hidden"}</span><h3>{item.name}</h3>
              <p>${(item.priceCents / 100).toFixed(2)} · {item.quantity} available · {item.category}</p>
              <div className="owner-actions">
                <button onClick={() => changeStatus(item)}>{item.status === "published" ? "Hide from store" : "Publish to store"}</button>
                <button type="button" onClick={() => { setListMessage(""); setEditingId(editingId === item.id ? null : item.id); }}>Edit</button>
                <button className="danger" onClick={() => remove(item)}>Delete</button>
              </div>
              {editingId === item.id && <form className="product-form owner-edit-form" onSubmit={(event) => updateProduct(event, item)}>
                <div className="field"><label htmlFor={`edit-name-${item.id}`}>Product name</label><input id={`edit-name-${item.id}`} name="name" defaultValue={item.name} required /></div>
                <div className="two-fields">
                  <div className="field"><label htmlFor={`edit-price-${item.id}`}>Price</label><input id={`edit-price-${item.id}`} name="price" type="number" min="0" step=".01" defaultValue={(item.priceCents / 100).toFixed(2)} required /></div>
                  <div className="field"><label htmlFor={`edit-quantity-${item.id}`}>Quantity available</label><input id={`edit-quantity-${item.id}`} name="quantity" type="number" min="0" step="1" defaultValue={item.quantity} required /></div>
                </div>
                <div className="field"><label htmlFor={`edit-description-${item.id}`}>Description</label><textarea id={`edit-description-${item.id}`} name="description" defaultValue={item.description} required /></div>
                <div className="field"><label htmlFor={`edit-fulfillment-${item.id}`}>How customers receive it</label><select id={`edit-fulfillment-${item.id}`} name="fulfillment" defaultValue={item.fulfillment} required>
                  {productFulfillmentChoices.map((choice) => <option key={choice}>{choice}</option>)}
                  {!productFulfillmentChoices.includes(item.fulfillment) && <option>{item.fulfillment}</option>}
                </select><small>Pickup is included unless you choose an “only” option or “No Pickup.”</small></div>
                <div className="field"><label htmlFor={`edit-photo-${item.id}`}>Replace photo (optional)</label><input id={`edit-photo-${item.id}`} name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><small>Leave blank to keep the current photo.</small></div>
                <div className="owner-edit-actions">
                  <button className="save-button" disabled={savingId === item.id}>{savingId === item.id ? "Saving…" : "Save changes"}</button>
                  <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </form>}
            </div>
          </article>) : <div className="owner-empty">No products yet. Your first upload will appear here.</div>}</div>
        </section>
      </div>
      <section className="owner-card recent-orders-card">
        <h2>Recent Orders</h2>
        <p className="helper">Latest paid orders, with customer and fulfillment details.</p>
        {initialOrders.length === 0 ? (
          <div className="owner-empty">No completed orders yet.</div>
        ) : (
          <div className="recent-orders">
            {initialOrders.map((order) => {
              const lines = parseOrderItems(order.itemsJson);
              const parsedAddress = parseShippingAddress(order.shippingAddressJson);
              const address = addressLines(parsedAddress);
              const hasPantryItems = lines?.some((line) => line.category === "Pantry") ?? false;
              const shippingState = parsedAddress?.state?.trim().toUpperCase();
              const deliveryTierForAddress = parsedAddress?.postalCode
                ? getDeliveryTierForZip(parsedAddress.postalCode)
                : null;
              const selectedWeeklyRoute =
                order.fulfillmentOption.startsWith("Weekly Medford & Central Point");
              const usesLocalDelivery =
                order.fulfillmentOption.startsWith("Local Delivery") || selectedWeeklyRoute;
              const deliveryNeedsReview =
                usesLocalDelivery &&
                (!deliveryTierForAddress ||
                  deliveryTierForAddress.amountCents !== order.shippingCents ||
                  (deliveryTierForAddress.id === "weekly") !== selectedWeeklyRoute);
              const requiresOregonAddressReview =
                order.fulfillmentOption.startsWith("Mail Order") &&
                hasPantryItems &&
                shippingState !== "OR" &&
                shippingState !== "OREGON";
              const date = new Date(order.paidAt);
              return <article className="recent-order" key={order.id}>
                <header className="recent-order-header">
                  <h3>{order.customerName || "Name not provided"}</h3>
                  <time dateTime={date.toISOString()}>{date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time>
                </header>
                <div className="recent-order-details">
                  <div>
                    <strong>Customer</strong>
                    <p>{order.customerEmail || "Email not provided"}</p>
                    <p>{order.customerPhone || "Phone not provided"}</p>
                  </div>
                  <div>
                    <strong>Shipping / delivery address</strong>
                    {address.length > 0 ? (
                      <address>{address.map((line) => <span key={line}>{line}</span>)}</address>
                    ) : <p>Address not provided</p>}
                    {requiresOregonAddressReview && (
                      <p className="order-warning" role="note">
                        <strong>Oregon address review:</strong> cottage food pantry items can only be shipped within Oregon. Verify this address before shipping.
                      </p>
                    )}
                    {deliveryNeedsReview && (
                      <p className="order-warning" role="note">
                        <strong>Delivery ZIP review:</strong> the shipping address may not match the ZIP-based delivery tier selected at checkout. Confirm the correct fee and schedule before delivery.
                      </p>
                    )}
                  </div>
                  <div>
                    <strong>Fulfillment</strong>
                    <p>{order.fulfillmentOption}</p>
                    <p>{order.shippingCents === 0 ? "Free" : `${formatMoney(order.shippingCents, order.currency)} fee`}</p>
                  </div>
                  <div>
                    <strong>Items ordered</strong>
                    {lines === null ? (
                      <p>Order details unavailable.</p>
                    ) : lines.length > 0 ? (
                      <ul className="recent-order-items">
                        {lines.map((line, index) => <li key={`${line.name}-${index}`}>
                          {line.name} × {line.quantity}
                          {line.priceCents === undefined ? "" : ` · ${formatMoney(line.priceCents * line.quantity, order.currency)}`}
                        </li>)}
                      </ul>
                    ) : <p>No line items recorded.</p>}
                  </div>
                  <p className="recent-order-total"><strong>Total paid</strong><span>{formatMoney(order.totalPaidCents, order.currency)}</span></p>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
      <section className="owner-card customer-messages-card">
        <h2>Customer Messages</h2>
        <p className="helper">Inquiries submitted through the Contact Us page.</p>
        {initialMessages.length === 0 ? (
          <div className="owner-empty">No customer messages yet.</div>
        ) : (
          <div className="customer-messages">
            {initialMessages.map((customerMessage) => {
              const date = new Date(customerMessage.createdAt);
              return (
                <article className="recent-order" key={customerMessage.id}>
                  <header className="recent-order-header">
                    <h3>{customerMessage.topic}</h3>
                    <time dateTime={date.toISOString()}>
                      {date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </header>
                  <p><strong>{customerMessage.name}</strong> ·{" "}
                    <a href={`mailto:${customerMessage.email}?subject=${encodeURIComponent(`Re: ${customerMessage.topic}`)}`}>
                      {customerMessage.email}
                    </a>
                  </p>
                  <p className="customer-message-body">{customerMessage.message}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  </main>;
}
