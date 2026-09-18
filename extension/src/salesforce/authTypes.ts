export type SalesforceEnvironment = "production" | "sandbox";

export interface StoredSalesforceAuth {
  isAuthenticated: true;
  accessToken: string;
  refreshToken: string | null;
  instanceUrl: string;
  userId: string;
  username: string;
  orgId: string;
  environment: SalesforceEnvironment;
}

export interface PublicSalesforceAuthState {
  authenticated: boolean;
  username: string | null;
  userId: string | null;
  orgId: string | null;
  instanceUrl: string | null;
  environment: SalesforceEnvironment | null;
}

export const ANONYMOUS_AUTH: PublicSalesforceAuthState = {
  authenticated: false,
  username: null,
  userId: null,
  orgId: null,
  instanceUrl: null,
  environment: null
};

export const AUTH_STORAGE_KEY = "sfcopilot.sfAuth";

export function toPublicAuthState(
  stored: StoredSalesforceAuth | null
): PublicSalesforceAuthState {
  if (!stored) {
    return ANONYMOUS_AUTH;
  }
  return {
    authenticated: true,
    username: stored.username,
    userId: stored.userId,
    orgId: stored.orgId,
    instanceUrl: stored.instanceUrl,
    environment: stored.environment
  };
}

export function sanitizePublicError(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "[redacted]")
    .replace(/access_token[=:]\S+/gi, "[redacted]")
    .replace(/refresh_token[=:]\S+/gi, "[redacted]")
    .replace(/code_verifier[=:]\S+/gi, "[redacted]")
    .replace(/[?&]code=[^&\s]+/gi, "[redacted]")
    .replace(/client_secret[=:]\S+/gi, "[redacted]")
    .slice(0, 400);
}

export class SalesforceApiError extends Error {
  public override readonly name = "SalesforceApiError";
  public readonly status: number;
  public readonly code: "expired" | "forbidden" | "validation" | "network" | "unknown";

  public constructor(
    code: SalesforceApiError["code"],
    message: string,
    status = 0
  ) {
    super(sanitizePublicError(message));
    this.code = code;
    this.status = status;
  }
}

export function publicErrorForStatus(status: number, fallback: string): SalesforceApiError {
  if (status === 401) {
    return new SalesforceApiError(
      "expired",
      "Your Salesforce session has expired.",
      401
    );
  }
  if (status === 403) {
    return new SalesforceApiError(
      "forbidden",
      "You don't have permission to perform this operation.",
      403
    );
  }
  if (status === 400) {
    return new SalesforceApiError("validation", fallback, 400);
  }
  return new SalesforceApiError("unknown", fallback, status);
}
