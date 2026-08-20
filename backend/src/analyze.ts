import { z } from "zod";
import {
  AnalyzeRequestSchema,
  detectBlockedOperations,
  minimizeSalesforceContext,
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
  type AnalyzeSuccessResponse
} from "@sfcopilot/shared";
import { createCorrelationId, logSafeEvent } from "./logger.js";

const MOCK_AUTH_PREFIX = "mock-session";
const ANALYZE_TIMEOUT_MS = 8_000;

function errorResponse(
  correlationId: string,
  code: AnalyzeErrorResponse["code"],
  message: string
): AnalyzeErrorResponse {
  return { ok: false, correlationId, code, message };
}

function mockPlan(requirement: string, objectApiName: string | null, correlationId: string): AnalyzeSuccessResponse {
  const objectName = objectApiName ?? "Account";
  return {
    ok: true,
    correlationId,
    blockedOperations: [],
    clarifyingQuestions: [],
    structuredRequirement: {
      summary: requirement.slice(0, 500),
      objectApiName: objectName,
      requestedChanges: ["Create Customer_Tier__c picklist"]
    },
    implementationPlan: [
      {
        id: "create-field",
        title: "Create Customer_Tier__c",
        detail: `Create a picklist field on ${objectName}. No deployment command is generated during analysis.`,
        metadataType: "CustomField"
      }
    ],
    metadataArtifacts: [
      {
        filePath: `force-app/main/default/objects/${objectName}/fields/Customer_Tier__c.field-meta.xml`,
        metadataType: "CustomField",
        before: null,
        after:
          "<CustomField><fullName>Customer_Tier__c</fullName><label>Customer Tier</label><type>Picklist</type></CustomField>"
      }
    ],
    validation: {
      status: "passed",
      issues: [
        {
          severity: "info",
          message: "Mock validation succeeded. The org was not modified.",
          filePath: null
        }
      ]
    },
    deploymentStatus: "not_requested",
    warning: null
  };
}

export interface AnalyzeHandlerOptions {
  timeoutMs?: number;
  now?: () => number;
  failAfterMs?: number;
}

export async function handleAnalyze(
  rawBody: unknown,
  authorizationHeader: string | null,
  options: AnalyzeHandlerOptions = {}
): Promise<{ status: number; body: AnalyzeResponse }> {
  const correlationId = createCorrelationId();
  const timeoutMs = options.timeoutMs ?? ANALYZE_TIMEOUT_MS;

  if (!authorizationHeader?.startsWith("Bearer ") || !authorizationHeader.includes(MOCK_AUTH_PREFIX)) {
    logSafeEvent(correlationId, "unauthorized", { status: 401 });
    return {
      status: 401,
      body: errorResponse(correlationId, "UNAUTHORIZED", "Mock authentication failed")
    };
  }

  if (rawBody === null || rawBody === undefined || typeof rawBody !== "object") {
    logSafeEvent(correlationId, "malformed", { status: 400 });
    return {
      status: 400,
      body: errorResponse(correlationId, "INVALID_REQUEST", "Malformed JSON request")
    };
  }

  if (!("salesforceContext" in rawBody) || rawBody.salesforceContext == null) {
    logSafeEvent(correlationId, "missing_context", { status: 400 });
    return {
      status: 400,
      body: errorResponse(correlationId, "MISSING_CONTEXT", "Salesforce context is required")
    };
  }

  const parsed = AnalyzeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") ?? "";
    if (path.includes("requirement") && issue?.code === z.ZodIssueCode.too_small) {
      logSafeEvent(correlationId, "empty_requirement", { status: 400 });
      return {
        status: 400,
        body: errorResponse(correlationId, "EMPTY_REQUIREMENT", "Requirement cannot be empty")
      };
    }
    if (path.includes("requirement") && issue?.code === z.ZodIssueCode.too_big) {
      const requirementValue = Reflect.get(rawBody, "requirement");
      logSafeEvent(correlationId, "oversized_requirement", {
        status: 400,
        length: typeof requirementValue === "string" ? requirementValue.length : 0
      });
      return {
        status: 400,
        body: errorResponse(correlationId, "REQUIREMENT_TOO_LARGE", "Requirement is too large")
      };
    }
    logSafeEvent(correlationId, "invalid_request", { status: 400 });
    return {
      status: 400,
      body: errorResponse(correlationId, "INVALID_REQUEST", "Request failed schema validation")
    };
  }

  if (options.failAfterMs !== undefined && options.failAfterMs > timeoutMs) {
    logSafeEvent(correlationId, "timeout", { status: 504 });
    return {
      status: 504,
      body: errorResponse(correlationId, "TIMEOUT", "The analysis request timed out")
    };
  }

  const minimized = {
    ...parsed.data,
    salesforceContext: minimizeSalesforceContext(parsed.data.salesforceContext)
  };
  const blocked = detectBlockedOperations(minimized.requirement);

  logSafeEvent(correlationId, "analyze", {
    status: 200,
    requirementLength: minimized.requirement.length,
    blocked: blocked.length > 0,
    confidence: minimized.salesforceContext.confidence,
    hasRecordId: Boolean(minimized.salesforceContext.recordId)
  });

  if (blocked.length > 0) {
    return {
      status: 200,
      body: {
        ok: true,
        correlationId,
        blockedOperations: blocked,
        clarifyingQuestions: [],
        structuredRequirement: null,
        implementationPlan: [],
        metadataArtifacts: [],
        validation: { status: "not_run", issues: [] },
        deploymentStatus: "blocked",
        warning:
          "Blocked Salesforce operation. Analysis will not generate a deployment command or modify the org."
      }
    };
  }

  const body = mockPlan(
    minimized.requirement,
    minimized.salesforceContext.objectApiName,
    correlationId
  );
  return { status: 200, body };
}
