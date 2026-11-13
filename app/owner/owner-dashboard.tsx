"use client";

import Link from "next/link";
import { useState } from "react";

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

function imageUrl(imageKey: string) {
  return `/api/images?key=${encodeURIComponent(imageKey)}`;
}

export default function OwnerDashboard({ initialItems, displayName }: { initialItems: Product[]; displayName: string }) {
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
    <header className="owner-header"><div className="wrap"><div><h1>Owner Dashboard</h1><p>Welcome, {displayName}. Add and manage your market products here.</p></div><Link href="/">View the storefront →</Link></div></header>
    <div className="owner-main wrap">
      <section className="owner-intro"><h2>Your simple upload routine</h2><ol><li>Choose one clear product photo.</li><li>Fill in the product details.</li><li>Save it as a draft, or check “Show in the store” when it is ready.</li></ol></section>
      <div className="owner-grid">
        <section className="owner-card"><h2>Add a product</h2><p className="helper">Start with one item. You can repeat this whenever you have something new.</p>
          <form className="product-form" onSubmit={addProduct}>
            <div className="field"><label htmlFor="photo">Product photo</label><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /><small>JPG, PNG or WebP. A bright, clear photo works best.</small></div>
            <div className="field"><label htmlFor="name">Product name</label><input id="name" name="name" placeholder="Example: Dirty Chai Soap" required /></div>
            <div className="field"><label htmlFor="category">Department</label><select id="category" name="category" required><option>Pantry</option><option>Garden</option><option>Bath & Home</option><option>Neighbor-Made</option><option>Second Story Finds</option></select></div>
            <div className="two-fields"><div className="field"><label htmlFor="price">Price</label><input id="price" name="price" type="number" min="0" step=".01" placeholder="8.00" required /></div><div className="field"><label htmlFor="quantity">Quantity available</label><input id="quantity" name="quantity" type="number" min="0" step="1" defaultValue="1" required /></div></div>
            <div className="field"><label htmlFor="fulfillment">How customers receive it</label><select id="fulfillment" name="fulfillment" required><option>Local delivery</option><option>Mail order</option><option>Mail order or local delivery</option></select></div>
            <div className="field"><label htmlFor="description">Short description</label><textarea id="description" name="description" placeholder="Tell customers what makes it special." required /></div>
            <label className="checkline"><input name="published" type="checkbox" value="yes" /> Show this product in the store immediately</label>
            {listMessage && <p className="form-message" role="status">{listMessage}</p>}
            <button className="save-button" disabled={busy}>{busy ? "Uploading and saving…" : "Upload product"}</button>
          </form>
        </section>
        <section className="owner-card"><h2>Your products</h2><p className="helper">Drafts stay hidden. Published products appear under “Available now.”</p>
          {message && <p className="form-message" role="status">{message}</p>}
          <div className="owner-list">{items.length ? items.map((item) => <article className="owner-item" key={item.id}>
            <div className="owner-thumbnail"><img src={imageUrl(item.imageKey)} alt={item.name} onError={(event) => {
              event.currentTarget.hidden = true;
              event.currentTarget.parentElement?.classList.add("missing");
            }} /></div>
            <div className="owner-item-content">
              <span className={"status " + item.status}>{item.status}</span><h3>{item.name}</h3>
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
    </div>
  </main>;
}
