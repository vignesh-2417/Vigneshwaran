import type { AnalyzeResponse, SalesforceContext } from "@sfcopilot/shared";
import { AnalyzeResponseSchema } from "@sfcopilot/shared";

export interface AssistantApi {
  analyze(requirement: string, context: SalesforceContext): Promise<AnalyzeResponse>;
}

export class MockAssistantApi implements AssistantApi {
  public constructor(private readonly impl: AssistantApi["analyze"]) {}

  public analyze(requirement: string, context: SalesforceContext): Promise<AnalyzeResponse> {
    return this.impl(requirement, context);
  }
}

export function parseAnalyzeResponse(value: unknown): AnalyzeResponse {
  return AnalyzeResponseSchema.parse(value);
}
