import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  MESSAGE_PROTOCOL_VERSION,
  parseExtensionResponse,
  type AnalyzeResponse,
  type SalesforceContext
} from "@sfcopilot/shared";
import { DEFAULT_BACKEND_URL } from "../config.js";
import type {
  AssistantApi,
  SalesforceAuthState,
  SalesforceLoginInput
} from "./assistantApi.js";
import { analyzeRequirementLocally } from "./localAnalyze.js";

function isRecoverableTransportError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  return /failed to fetch|networkerror|timeout|aborted/i.test(message);
}

async function send(
  type: "ANALYZE_REQUIREMENT" | "LOGIN_SALESFORCE" | "LOGOUT_SALESFORCE" | "GET_AUTH_STATE" | "PING",
  payload?: unknown
): Promise<unknown> {
  const raw = await chrome.runtime.sendMessage({
    v: MESSAGE_PROTOCOL_VERSION,
    type,
    requestId: crypto.randomUUID(),
    payload
  });
  const response = parseExtensionResponse(raw);
  if (!response.ok) {
    throw new Error(response.error?.message ?? "Extension request failed");
  }
  return response.payload;
}

export class BackgroundAssistantApi implements AssistantApi {
  public async analyze(
    requirement: string,
    salesforceContext: SalesforceContext
  ): Promise<AnalyzeResponse> {
    const payload = AnalyzeRequestSchema.parse({ requirement, salesforceContext });
    try {
      const result = await send("ANALYZE_REQUIREMENT", payload);
      return AnalyzeResponseSchema.parse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isRecoverableTransportError(message) || /extension request failed/i.test(message)) {
        return analyzeRequirementLocally(requirement, salesforceContext);
      }
      throw error;
    }
  }

  public async getAuthState(): Promise<SalesforceAuthState> {
    const payload = await send("GET_AUTH_STATE");
    return payload as SalesforceAuthState;
  }

  public async login(input: SalesforceLoginInput): Promise<SalesforceAuthState> {
    const payload = await send("LOGIN_SALESFORCE", input);
    return payload as SalesforceAuthState;
  }

  public async logout(): Promise<void> {
    await send("LOGOUT_SALESFORCE");
  }
}

export function backendUrl(): string {
  return DEFAULT_BACKEND_URL;
}
