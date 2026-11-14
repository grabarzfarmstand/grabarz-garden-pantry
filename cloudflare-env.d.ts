declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OWNER_EMAIL?: string;
    OWNER_PASSWORD?: string;
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
    STRIPE_SECRET_KEY?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
  }
}
