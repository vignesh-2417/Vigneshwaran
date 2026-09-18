import type {
  AnalyzeResponse,
  CreateCustomFieldResult,
  SalesforceContext
} from "@sfcopilot/shared";
import { AnalyzeResponseSchema, parseCustomFieldRequirement } from "@sfcopilot/shared";
import type { PublicSalesforceAuthState, SalesforceEnvironment } from "../salesforce/authTypes.js";
import { ANONYMOUS_AUTH } from "../salesforce/authTypes.js";

export type SalesforceAuthState = PublicSalesforceAuthState;
export type { SalesforceEnvironment };

export interface AssistantApi {
  analyze(requirement: string, context: SalesforceContext): Promise<AnalyzeResponse>;
  createCustomField(
    requirement: string,
    objectApiName: string | null
  ): Promise<CreateCustomFieldResult>;
  getAuthState(): Promise<SalesforceAuthState>;
  connect(environment: SalesforceEnvironment): Promise<SalesforceAuthState>;
  logout(): Promise<void>;
}

export class MockAssistantApi implements AssistantApi {
  public constructor(private readonly impl: AssistantApi["analyze"]) {}

  public analyze(requirement: string, context: SalesforceContext): Promise<AnalyzeResponse> {
    return this.impl(requirement, context);
  }

  public async createCustomField(
    requirement: string,
    objectApiName: string | null
  ): Promise<CreateCustomFieldResult> {
    const field = parseCustomFieldRequirement(requirement, objectApiName);
    const fullName = `${field.objectApiName}.${field.apiName}`;
    return {
      fullName,
      id: "00N000000000001",
      created: true,
      alreadyExists: false,
      message: `Created ${fullName} in this org (mock).`
    };
  }

  public async getAuthState(): Promise<SalesforceAuthState> {
    return ANONYMOUS_AUTH;
  }

  public async connect(environment: SalesforceEnvironment): Promise<SalesforceAuthState> {
    return {
      authenticated: true,
      username: "user@example.com",
      userId: "005xx0000000001AAA",
      orgId: "00Dxx0000000001EAA",
      instanceUrl:
        environment === "sandbox"
          ? "https://example--full.sandbox.my.salesforce.com"
          : "https://nteli56-dev-ed.my.salesforce.com",
      environment
    };
  }

  public async logout(): Promise<void> {
    return;
  }
}

export function parseAnalyzeResponse(value: unknown): AnalyzeResponse {
  return AnalyzeResponseSchema.parse(value);
}
