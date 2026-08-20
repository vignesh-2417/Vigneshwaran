import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  MESSAGE_PROTOCOL_VERSION,
  parseExtensionResponse,
  type AnalyzeResponse,
  type SalesforceContext
} from "@sfcopilot/shared";
import { DEFAULT_BACKEND_URL } from "../config.js";
import type { AssistantApi } from "./assistantApi.js";

export class BackgroundAssistantApi implements AssistantApi {
  public async analyze(
    requirement: string,
    salesforceContext: SalesforceContext
  ): Promise<AnalyzeResponse> {
    const payload = AnalyzeRequestSchema.parse({ requirement, salesforceContext });
    const requestId = crypto.randomUUID();
    const raw = await chrome.runtime.sendMessage({
      v: MESSAGE_PROTOCOL_VERSION,
      type: "ANALYZE_REQUIREMENT",
      requestId,
      payload
    });
    const response = parseExtensionResponse(raw);
    if (!response.ok) {
      return {
        ok: false,
        correlationId: requestId,
        code: "INTERNAL_ERROR",
        message: response.error?.message ?? "Analyze request failed"
      };
    }
    return AnalyzeResponseSchema.parse(response.payload);
  }
}

export function backendUrl(): string {
  return DEFAULT_BACKEND_URL;
}
