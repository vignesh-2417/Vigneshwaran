import { SalesforceApiError, publicErrorForStatus, type StoredSalesforceAuth } from "./authTypes.js";

const API_VERSION = "62.0";

export function toolingPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/services/")) {
    return normalized;
  }
  return `/services/data/v${API_VERSION}${normalized}`;
}

/**
 * Authenticated Salesforce REST/Tooling request. Tokens stay in the service worker.
 */
export async function salesforceApiRequest(
  auth: StoredSalesforceAuth,
  path: string,
  options: RequestInit = {},
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("authorization", `Bearer ${auth.accessToken}`);
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  try {
    return await fetchImpl(`${auth.instanceUrl}${toolingPath(path)}`, {
      ...options,
      headers
    });
  } catch {
    throw new SalesforceApiError(
      "network",
      "Unable to reach Salesforce. Please check your connection."
    );
  }
}

export function throwIfSalesforceFailed(response: Response, body: unknown): void {
  if (response.ok) {
    return;
  }
  const extracted = extractSalesforceError(body);
  throw publicErrorForStatus(response.status, extracted || `Salesforce rejected the request (${response.status}).`);
}

export function extractSalesforceError(raw: unknown): string | null {
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object" && "message" in raw[0]) {
    const message = raw[0].message;
    return typeof message === "string" ? message : null;
  }
  if (raw && typeof raw === "object" && "message" in raw && typeof raw.message === "string") {
    return raw.message;
  }
  return null;
}
