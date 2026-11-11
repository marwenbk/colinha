// Minimal structural types for the bindings we use (no workers-types package here).
export interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ASSETS: Fetcher;
  PASS_KEY_PKCS8: string;
  PASS_CERT_B64: string;
  WWDR_CERT_B64: string;
  /** Absent when the plan or config has no rate-limit binding; the check is then skipped. */
  SIGN_LIMITER?: RateLimit;
}
