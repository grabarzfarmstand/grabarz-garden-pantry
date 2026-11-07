import { env } from "cloudflare:workers";
export const dynamic = "force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{key:string}>}) {
  if(!env.BUCKET) return new Response("Not found",{status:404});
  const {key}=await context.params;
  const object=await env.BUCKET.get(decodeURIComponent(key));
  if(!object) return new Response("Not found",{status:404});
  const headers=new Headers(); object.writeHttpMetadata(headers); headers.set("etag",object.httpEtag); headers.set("cache-control","public, max-age=3600");
  return new Response(object.body,{headers});
}
