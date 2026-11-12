import handler from "vinext/server/fetch-handler";
export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/owner/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      if (request.headers.get("origin") !== url.origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
      if (Number(request.headers.get("content-length") || "0") > 13 * 1024 * 1024) return new Response("Upload too large", { status: 413 });
    }
    return handler.fetch(request, env, ctx);
  },
};
