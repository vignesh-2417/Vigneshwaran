/**
 * Connected App consumer key only. Never put a client secret in the extension.
 * Replace clientId with the Consumer Key from your Salesforce Connected App.
 */
export const SALESFORCE_CONFIG = {
  clientId: "YOUR_CONNECTED_APP_CLIENT_ID",
  productionLoginUrl: "https://login.salesforce.com",
  sandboxLoginUrl: "https://test.salesforce.com"
} as const;

export type SalesforceEnvironment = "production" | "sandbox";

export function loginUrlForEnvironment(environment: SalesforceEnvironment): string {
  return environment === "sandbox"
    ? SALESFORCE_CONFIG.sandboxLoginUrl
    : SALESFORCE_CONFIG.productionLoginUrl;
}

export function isConnectedAppConfigured(clientId: string = SALESFORCE_CONFIG.clientId): boolean {
  return Boolean(clientId) && !clientId.startsWith("YOUR_");
}

export const OAUTH_SCOPES = "api id refresh_token";
