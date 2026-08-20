import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  MESSAGE_PROTOCOL_VERSION,
  parseExtensionRequest,
  type ExtensionResponse
} from "@sfcopilot/shared";
import { DEFAULT_BACKEND_URL } from "../config.js";

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

async function analyzeViaBackend(payload: unknown): Promise<unknown> {
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        correlationId: crypto.randomUUID(),
        code: "TIMEOUT",
        message: "The analysis request timed out."
      };
    }
    throw error;
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
      sendResponse(
        jsonResponse(request.requestId, true, {
          authenticated: Boolean(mockAuthToken),
          mode: "mock"
        })
      );
      return false;
    }
    if (request.type === "ANALYZE_REQUIREMENT") {
      void analyzeViaBackend(request.payload)
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
