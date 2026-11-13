import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { productFulfillmentChoices } from "@/lib/fulfillment";
import { products } from "@/db/schema";
import { requireOwnerApi } from "@/lib/owner";
export const dynamic = "force-dynamic";

export async function POST(request:Request) {
  try {
    await requireOwnerApi();
    if(!env.BUCKET) return Response.json({error:"Photo storage is not available."},{status:500});
    const data=await request.formData();
    const photo=data.get("photo");
    if(!(photo instanceof File)||!["image/jpeg","image/png","image/webp"].includes(photo.type)) return Response.json({error:"Please choose a JPG, PNG or WebP photo."},{status:400});
    if(photo.size>12*1024*1024) return Response.json({error:"That photo is larger than 12 MB. Please choose a smaller copy."},{status:400});
    const name=String(data.get("name")??"").trim(), description=String(data.get("description")??"").trim(), category=String(data.get("category")??"").trim(), fulfillment=String(data.get("fulfillment")??"").trim();
    const priceCents=Math.round(Number(data.get("price"))*100), quantity=Math.max(0,Math.floor(Number(data.get("quantity"))));
    if(!name||!description||!category||!productFulfillmentChoices.some((choice)=>choice===fulfillment)||!Number.isFinite(priceCents)||priceCents<0||!Number.isFinite(quantity)) return Response.json({error:"Please complete every field."},{status:400});
    const id=crypto.randomUUID(), extension=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg", imageKey="products/"+id+"."+extension;
    await env.BUCKET.put(imageKey,await photo.arrayBuffer(),{httpMetadata:{contentType:photo.type}});
    const now=Date.now();
    const product={id,name,category,priceCents,quantity,description,fulfillment,imageKey,status:data.get("published")==="yes"?"published":"draft",createdAt:now,updatedAt:now};
    await getDb().insert(products).values(product);
    return Response.json({product});
  } catch(error) {
    const message=error instanceof Error?error.message:"";
    if(message==="UNAUTHENTICATED") return Response.json({error:"Please sign in again."},{status:401});
    if(message==="FORBIDDEN") return Response.json({error:"Owner access only."},{status:403});
    return Response.json({error:"We could not save that product. Please try again."},{status:500});
  }
}
