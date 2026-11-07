import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { requireOwnerApi } from "@/lib/owner";
export const dynamic = "force-dynamic";

export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) {
  try { await requireOwnerApi(); const {id}=await context.params; const body=await request.json() as {status?:string}; const status=body.status==="published"?"published":"draft"; await getDb().update(products).set({status,updatedAt:Date.now()}).where(eq(products.id,id)); return Response.json({ok:true}); }
  catch { return Response.json({error:"Unable to update product."},{status:403}); }
}
export async function DELETE(_request:Request,context:{params:Promise<{id:string}>}) {
  try { await requireOwnerApi(); const {id}=await context.params; const db=getDb(); const item=await db.select().from(products).where(eq(products.id,id)).limit(1); if(item[0]&&env.BUCKET) await env.BUCKET.delete(item[0].imageKey); await db.delete(products).where(eq(products.id,id)); return Response.json({ok:true}); }
  catch { return Response.json({error:"Unable to delete product."},{status:403}); }
}
