import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  MESSAGE_PROTOCOL_VERSION,
  SalesforceLoginPayloadSchema,
  assertAllowedSalesforceLoginHost,
  detectBlockedOperations,
  parseExtensionRequest,
  type ExtensionResponse
} from "@sfcopilot/shared";
import { DEFAULT_BACKEND_URL } from "../config.js";
import { analyzeRequirementLocally } from "../api/localAnalyze.js";
import { soapLogin } from "../salesforce/soapLogin.js";

const FETCH_TIMEOUT_MS = 8_000;
const SESSION_KEY = "sfcopilot.sfSession";
let mockAuthToken = "mock-session-token";
let memorySession: StoredSalesforceSession | null = null;

interface StoredSalesforceSession {
  username: string;
  instanceUrl: string;
  sessionId: string;
}

function jsonResponse(
  requestId: string,
  ok: boolean,
  payload?: unknown,
  error?: { code: string; message: string }
): ExtensionResponse {
  return {
    v: MESSAGE_PROTOCOL_VERSION,
    requestId,
    ok,
    ...(payload === undefined ? {} : { payload }),
    ...(error ? { error } : {})
  };
}

async function readSession(): Promise<StoredSalesforceSession | null> {
  const area = chrome.storage?.session;
  if (!area) {
    return memorySession;
  }
  const value = await area.get(SESSION_KEY);
  const stored = value[SESSION_KEY];
  if (
    stored &&
    typeof stored === "object" &&
    "username" in stored &&
    "instanceUrl" in stored &&
    "sessionId" in stored
  ) {
    memorySession = stored as StoredSalesforceSession;
    return memorySession;
  }
  return memorySession;
}

async function writeSession(session: StoredSalesforceSession | null): Promise<void> {
  memorySession = session;
  const area = chrome.storage?.session;
  if (!area) {
    return;
  }
  if (session) {
    await area.set({ [SESSION_KEY]: session });
    return;
  }
  await area.remove(SESSION_KEY);
}

function authPayload(session: StoredSalesforceSession | null) {
  return {
    authenticated: Boolean(session),
    username: session?.username ?? null,
    instanceUrl: session?.instanceUrl ?? null,
    mode: session ? "session" : "anonymous"
  };
}

async function analyzeViaBackend(payload: unknown) {
  const parsed = AnalyzeRequestSchema.parse(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${DEFAULT_BACKEND_URL}/api/requirements/analyze`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${mockAuthToken}`
      },
      body: JSON.stringify(parsed),
      signal: controller.signal
    });
    const data: unknown = await response.json();
    return AnalyzeResponseSchema.parse(data);
  } catch {
    return analyzeRequirementLocally(parsed.requirement, parsed.salesforceContext);
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    const request = parseExtensionRequest(message);
    if (request.type === "PING") {
      sendResponse(jsonResponse(request.requestId, true, { pong: true }));
      return false;
    }
    if (request.type === "GET_AUTH_STATE") {
      void readSession().then((session) => {
        sendResponse(jsonResponse(request.requestId, true, authPayload(session)));
      });
      return true;
    }
    if (request.type === "LOGOUT_SALESFORCE") {
      void writeSession(null).then(() => {
        sendResponse(jsonResponse(request.requestId, true, authPayload(null)));
      });
      return true;
    }
    if (request.type === "LOGIN_SALESFORCE") {
      void (async () => {
        const login = SalesforceLoginPayloadSchema.parse(request.payload);
        const loginHost = assertAllowedSalesforceLoginHost(login.loginHost);
        const session = await soapLogin(
          loginHost,
          login.username,
          login.password,
          login.securityToken
        );
        const stored = {
          username: session.username,
          instanceUrl: session.instanceUrl,
          sessionId: session.sessionId
        };
        await writeSession(stored);
        sendResponse(jsonResponse(request.requestId, true, authPayload(stored)));
      })().catch((error: unknown) => {
        const messageText =
          error instanceof Error ? error.message : "Salesforce login failed";
        sendResponse(
          jsonResponse(request.requestId, false, undefined, {
            code: "UNAUTHORIZED",
            message: messageText.slice(0, 400)
          })
        );
      });
      return true;
    }
    if (request.type === "ANALYZE_REQUIREMENT") {
      void (async () => {
        const parsed = AnalyzeRequestSchema.parse(request.payload);
        if (detectBlockedOperations(parsed.requirement).length > 0) {
          return analyzeRequirementLocally(parsed.requirement, parsed.salesforceContext);
        }
        return analyzeViaBackend(request.payload);
      })()
        .then((payload) => sendResponse(jsonResponse(request.requestId, true, payload)))
        .catch((error: unknown) => {
          const messageText =
            error instanceof Error ? error.message : "Analyze request failed";
          sendResponse(
            jsonResponse(request.requestId, false, undefined, {
              code: "INTERNAL_ERROR",
              message: messageText
            })
          );
        });
      return true;
    }
    sendResponse(
      jsonResponse(request.requestId, false, undefined, {
        code: "UNSUPPORTED",
        message: "Unsupported message type"
      })
    );
  } catch {
    sendResponse(
      jsonResponse(crypto.randomUUID(), false, undefined, {
        code: "INVALID_MESSAGE",
        message: "Message failed validation"
      })
    );
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  mockAuthToken = `mock-session-${Date.now()}`;
});
