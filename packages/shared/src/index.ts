/**
 * Shared types for Setu.
 * Only genuinely cross-cutting types belong here.
 * Business-domain types will be added in later tasks as the schema matures.
 */

/** Standard envelope used by every API response. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Payload returned by GET /api/v1/health */
export interface HealthResponse {
  status: "ok";
  timestamp: string;
  version: string;
}
