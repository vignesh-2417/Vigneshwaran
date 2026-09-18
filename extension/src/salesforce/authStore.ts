import {
  ANONYMOUS_AUTH,
  AUTH_STORAGE_KEY,
  toPublicAuthState,
  type PublicSalesforceAuthState,
  type StoredSalesforceAuth
} from "./authTypes.js";

let memoryAuth: StoredSalesforceAuth | null = null;

function isStoredAuth(value: unknown): value is StoredSalesforceAuth {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.isAuthenticated === true &&
    typeof record.accessToken === "string" &&
    typeof record.instanceUrl === "string" &&
    typeof record.username === "string" &&
    (record.environment === "production" || record.environment === "sandbox")
  );
}

export async function getAuthState(): Promise<StoredSalesforceAuth | null> {
  const area = chrome.storage?.session;
  if (!area) {
    return memoryAuth;
  }
  const value = await area.get(AUTH_STORAGE_KEY);
  const stored = value[AUTH_STORAGE_KEY];
  if (isStoredAuth(stored)) {
    memoryAuth = stored;
    return stored;
  }
  return memoryAuth;
}

export async function setAuthState(auth: StoredSalesforceAuth): Promise<void> {
  memoryAuth = auth;
  const area = chrome.storage?.session;
  if (area) {
    await area.set({ [AUTH_STORAGE_KEY]: auth });
  }
}

export async function clearAuthState(): Promise<void> {
  memoryAuth = null;
  const area = chrome.storage?.session;
  if (area) {
    await area.remove(AUTH_STORAGE_KEY);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const auth = await getAuthState();
  return Boolean(auth?.accessToken);
}

export async function logoutSalesforce(): Promise<PublicSalesforceAuthState> {
  await clearAuthState();
  return ANONYMOUS_AUTH;
}

export async function getPublicAuthState(): Promise<PublicSalesforceAuthState> {
  return toPublicAuthState(await getAuthState());
}
