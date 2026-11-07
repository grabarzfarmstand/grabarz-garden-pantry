"use client";
import { useState } from "react";

type Product = { id:string; name:string; category:string; priceCents:number; quantity:number; description:string; fulfillment:string; imageKey:string; status:string; createdAt:number; updatedAt:number; };

export default function OwnerDashboard({ initialItems, displayName }: { initialItems: Product[]; displayName: string }) {
  const [items,setItems]=useState(initialItems);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function addProduct(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form=event.currentTarget;
    const response=await fetch("/api/owner/products",{method:"POST",body:new FormData(form)});
    const data=await response.json() as { error?: string; product: Product };
    if(!response.ok) setMessage(data.error??"We could not save that product.");
    else { setItems((old)=>[data.product,...old]); form.reset(); setMessage("Saved! Your product is in the list on the right."); }
    setBusy(false);
  }
  async function changeStatus(item:Product) {
    const status=item.status==="published"?"draft":"published";
    const response=await fetch("/api/owner/products/"+item.id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    if(response.ok) setItems((old)=>old.map((p)=>p.id===item.id?{...p,status}:p));
  }
  async function remove(item:Product) {
    if(!confirm("Remove “"+item.name+"” and its photo?")) return;
    const response=await fetch("/api/owner/products/"+item.id,{method:"DELETE"});
    if(response.ok) setItems((old)=>old.filter((p)=>p.id!==item.id));
  }

  return <main className="owner-page">
    <header className="owner-header"><div className="wrap"><div><h1>Owner Dashboard</h1><p>Welcome, {displayName}. Add and manage your market products here.</p></div><a href="/">View the storefront →</a></div></header>
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
            {message&&<p className="form-message" role="status">{message}</p>}
            <button className="save-button" disabled={busy}>{busy?"Uploading and saving…":"Upload product"}</button>
          </form>
        </section>
        <section className="owner-card"><h2>Your products</h2><p className="helper">Drafts stay hidden. Published products appear under “Available now.”</p>
          <div className="owner-list">{items.length?items.map((item)=><article className="owner-item" key={item.id}><img src={"/api/images/"+encodeURIComponent(item.imageKey)} alt="" /><div><span className={"status "+item.status}>{item.status}</span><h3>{item.name}</h3><p>${(item.priceCents/100).toFixed(2)} · {item.quantity} available · {item.category}</p><div className="owner-actions"><button onClick={()=>changeStatus(item)}>{item.status==="published"?"Hide from store":"Publish to store"}</button><button className="danger" onClick={()=>remove(item)}>Delete</button></div></div></article>):<div className="owner-empty">No products yet. Your first upload will appear here.</div>}</div>
        </section>
      </div>
    </div>
  </main>;
}
