import type { AnalyzeResponse, SalesforceContext } from "@sfcopilot/shared";
import { AnalyzeResponseSchema } from "@sfcopilot/shared";

export interface SalesforceAuthState {
  authenticated: boolean;
  username: string | null;
  instanceUrl: string | null;
  mode: "session" | "anonymous";
}

export interface SalesforceLoginInput {
  username: string;
  password: string;
  securityToken: string;
  loginHost: string;
}

export interface AssistantApi {
  analyze(requirement: string, context: SalesforceContext): Promise<AnalyzeResponse>;
  getAuthState(): Promise<SalesforceAuthState>;
  login(input: SalesforceLoginInput): Promise<SalesforceAuthState>;
  logout(): Promise<void>;
}

const ANONYMOUS_AUTH: SalesforceAuthState = {
  authenticated: false,
  username: null,
  instanceUrl: null,
  mode: "anonymous"
};

export class MockAssistantApi implements AssistantApi {
  public constructor(private readonly impl: AssistantApi["analyze"]) {}

  public analyze(requirement: string, context: SalesforceContext): Promise<AnalyzeResponse> {
    return this.impl(requirement, context);
  }

  public async getAuthState(): Promise<SalesforceAuthState> {
    return ANONYMOUS_AUTH;
  }

  public async login(input: SalesforceLoginInput): Promise<SalesforceAuthState> {
    return {
      authenticated: true,
      username: input.username,
      instanceUrl: input.loginHost,
      mode: "session"
    };
  }

  public async logout(): Promise<void> {
    return;
  }
}

export function parseAnalyzeResponse(value: unknown): AnalyzeResponse {
  return AnalyzeResponseSchema.parse(value);
}
