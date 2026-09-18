import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  CreateCustomFieldPayloadSchema,
  MESSAGE_PROTOCOL_VERSION,
  SalesforceConnectPayloadSchema,
  detectBlockedOperations,
  parseExtensionRequest,
  type ExtensionResponse
} from "@sfcopilot/shared";
import { DEFAULT_BACKEND_URL } from "../config.js";
import { analyzeRequirementLocally } from "../api/localAnalyze.js";
import { assertFieldReadyToCreate } from "../salesforce/assertFieldCreate.js";
import { createCustomFieldWithAccessToken } from "../salesforce/toolingField.js";
import { authenticateWithSalesforce, mapOAuthFailure } from "../salesforce/oauth.js";
import {
  clearAuthState,
  getAuthState,
  getPublicAuthState,
  logoutSalesforce,
  setAuthState
} from "../salesforce/authStore.js";
import { SalesforceApiError } from "../salesforce/authTypes.js";

const FETCH_TIMEOUT_MS = 8_000;
let mockAuthToken = "mock-session-token";

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
      void getPublicAuthState().then((payload) => {
        sendResponse(jsonResponse(request.requestId, true, payload));
      });
      return true;
    }
    if (request.type === "LOGOUT_SALESFORCE") {
      void logoutSalesforce().then((payload) => {
        sendResponse(jsonResponse(request.requestId, true, payload));
      });
      return true;
    }
    if (request.type === "CONNECT_SALESFORCE") {
      void (async () => {
        const payload = SalesforceConnectPayloadSchema.parse(request.payload);
        const auth = await authenticateWithSalesforce(payload.environment);
        await setAuthState(auth);
        return getPublicAuthState();
      })()
        .then((payload) => sendResponse(jsonResponse(request.requestId, true, payload)))
        .catch((error: unknown) => {
          sendResponse(
            jsonResponse(request.requestId, false, undefined, {
              code: "UNAUTHORIZED",
              message: mapOAuthFailure(error)
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
    if (request.type === "CREATE_CUSTOM_FIELD") {
      void (async () => {
        const auth = await getAuthState();
        if (!auth) {
          throw new SalesforceApiError(
            "expired",
            "Your Salesforce session has expired."
          );
        }
        const payload = CreateCustomFieldPayloadSchema.parse(request.payload);
        const field = assertFieldReadyToCreate(
          payload.requirement,
          payload.objectApiName,
          auth.instanceUrl
        );
        const result = await createCustomFieldWithAccessToken(auth, field);
        return {
          fullName: `${field.objectApiName}.${field.apiName}`,
          id: result.id,
          created: result.created,
          alreadyExists: result.alreadyExists,
          message: result.message
        };
      })()
        .then((payload) => sendResponse(jsonResponse(request.requestId, true, payload)))
        .catch(async (error: unknown) => {
          if (error instanceof SalesforceApiError && error.code === "expired") {
            await clearAuthState();
          }
          const messageText =
            error instanceof Error ? error.message : "Field create failed";
          sendResponse(
            jsonResponse(request.requestId, false, undefined, {
              code: error instanceof SalesforceApiError ? error.code.toUpperCase() : "INTERNAL_ERROR",
              message: messageText.slice(0, 400)
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
