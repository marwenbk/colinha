// Minimal structural types for the bindings we use (no workers-types package here).
export interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface AnalyticsEngineDataset {
  writeDataPoint(point: { indexes?: string[]; blobs?: string[]; doubles?: number[] }): void;
}

export interface Env {
  ASSETS: Fetcher;
  PASS_KEY_PKCS8: string;
  PASS_CERT_B64: string;
  WWDR_CERT_B64: string;
  /** Absent when the plan or config has no rate-limit binding; the check is then skipped. */
  SIGN_LIMITER?: RateLimit;
  /**
   * Counts signing outcomes (Analytics Engine). One data point per signed or
   * rate-limited request: the outcome and the country Cloudflare already
   * knows. Never the body, the IP or anything from the card. Absent: no count.
   */
  SIGN_STATS?: AnalyticsEngineDataset;
}
