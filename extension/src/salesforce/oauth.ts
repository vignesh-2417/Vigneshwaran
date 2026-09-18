import {
  isConnectedAppConfigured,
  loginUrlForEnvironment,
  OAUTH_SCOPES,
  SALESFORCE_CONFIG,
  type SalesforceEnvironment
} from "./oauthConfig.js";
import { generateOAuthState, generatePKCE } from "./pkce.js";
import { SalesforceApiError, sanitizePublicError, type StoredSalesforceAuth } from "./authTypes.js";

export interface OAuthRuntime {
  getRedirectURL: () => string;
  launchWebAuthFlow: (details: { url: string; interactive: boolean }) => Promise<string>;
  fetch: typeof fetch;
  clientId?: string;
}

function chromeRuntime(): OAuthRuntime {
  return {
    getRedirectURL: () => chrome.identity.getRedirectURL(),
    launchWebAuthFlow: (details) =>
      new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(details, (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!redirectUrl) {
            reject(new Error("Salesforce authentication was cancelled."));
            return;
          }
          resolve(redirectUrl);
        });
      }),
    fetch
  };
}

export function buildAuthorizationUrl(input: {
  loginUrl: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    scope: OAUTH_SCOPES,
    state: input.state
  });
  return `${input.loginUrl}/services/oauth2/authorize?${params.toString()}`;
}

export function extractAuthorizationCode(
  redirectUrl: string,
  expectedState: string
): string {
  const url = new URL(redirectUrl);
  const params = new URLSearchParams(url.search || url.hash.replace(/^#/, ""));
  const error = params.get("error");
  if (error) {
    if (error === "access_denied") {
      throw new Error("Salesforce authentication was cancelled.");
    }
    throw new Error("Unable to connect to Salesforce.");
  }
  const state = params.get("state");
  if (!state || state !== expectedState) {
    throw new Error("Unable to connect to Salesforce.");
  }
  const code = params.get("code");
  if (!code) {
    throw new Error("Unable to connect to Salesforce.");
  }
  return code;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  instance_url?: string;
  id?: string;
  error?: string;
  error_description?: string;
}

interface UserInfoResponse {
  user_id?: string;
  organization_id?: string;
  preferred_username?: string;
  email?: string;
}

export async function exchangeAuthorizationCode(input: {
  loginUrl: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
  fetchImpl?: typeof fetch;
}): Promise<{ accessToken: string; refreshToken: string | null; instanceUrl: string; idUrl: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier
  });
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(`${input.loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });
  } catch {
    throw new SalesforceApiError("network", "Unable to reach Salesforce. Please check your connection.");
  }
  const data = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !data.access_token || !data.instance_url) {
    if (data.error === "invalid_grant") {
      throw new Error("Unable to connect to Salesforce.");
    }
    throw new Error("Unable to connect to Salesforce.");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    instanceUrl: data.instance_url.replace(/\/$/, ""),
    idUrl: data.id ?? ""
  };
}

export async function getCurrentSalesforceUser(
  instanceUrl: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ userId: string; orgId: string; username: string }> {
  let response: Response;
  try {
    response = await fetchImpl(`${instanceUrl}/services/oauth2/userinfo`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
  } catch {
    throw new SalesforceApiError("network", "Unable to reach Salesforce. Please check your connection.");
  }
  const data = (await response.json().catch(() => ({}))) as UserInfoResponse;
  if (!response.ok) {
    throw new Error("Unable to connect to Salesforce.");
  }
  const userId = data.user_id ?? "";
  const orgId = data.organization_id ?? "";
  const username = data.preferred_username || data.email || "Salesforce user";
  if (!userId || !username) {
    throw new Error("Unable to connect to Salesforce.");
  }
  return { userId, orgId, username };
}

export async function authenticateWithSalesforce(
  environment: SalesforceEnvironment,
  runtime: OAuthRuntime = chromeRuntime()
): Promise<StoredSalesforceAuth> {
  const clientId = runtime.clientId ?? SALESFORCE_CONFIG.clientId;
  if (!isConnectedAppConfigured(clientId)) {
    throw new Error(
      "Add your Salesforce Connected App consumer key to extension/src/salesforce/oauthConfig.ts, then rebuild."
    );
  }
  const loginUrl = loginUrlForEnvironment(environment);
  const redirectUri = runtime.getRedirectURL();
  const pkce = await generatePKCE();
  const state = generateOAuthState();
  const authorizeUrl = buildAuthorizationUrl({
    loginUrl,
    clientId,
    redirectUri,
    codeChallenge: pkce.codeChallenge,
    state
  });
  let redirectUrl: string;
  try {
    redirectUrl = await runtime.launchWebAuthFlow({ url: authorizeUrl, interactive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cancel|denied|closed|ended the auth/i.test(message)) {
      throw new Error("Salesforce authentication was cancelled.");
    }
    throw new Error("Unable to connect to Salesforce.");
  }
  const code = extractAuthorizationCode(redirectUrl, state);
  const tokens = await exchangeAuthorizationCode({
    loginUrl,
    clientId,
    redirectUri,
    code,
    codeVerifier: pkce.codeVerifier,
    fetchImpl: runtime.fetch
  });
  const user = await getCurrentSalesforceUser(tokens.instanceUrl, tokens.accessToken, runtime.fetch);
  return {
    isAuthenticated: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    instanceUrl: tokens.instanceUrl,
    userId: user.userId,
    username: user.username,
    orgId: user.orgId,
    environment
  };
}

export function mapOAuthFailure(error: unknown): string {
  if (error instanceof SalesforceApiError) {
    return error.message;
  }
  const message = error instanceof Error ? error.message : "Unable to connect to Salesforce.";
  return sanitizePublicError(message);
}
