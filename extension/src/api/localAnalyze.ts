import {
  AnalyzeRequestSchema,
  buildMockCustomFieldPlan,
  detectBlockedOperations,
  minimizeSalesforceContext,
  type AnalyzeResponse,
  type SalesforceContext
} from "@sfcopilot/shared";

function correlationId(): string {
  return crypto.randomUUID();
}

export async function analyzeRequirementLocally(
  requirement: string,
  salesforceContext: SalesforceContext
): Promise<AnalyzeResponse> {
  const parsed = AnalyzeRequestSchema.safeParse({
    requirement,
    salesforceContext: minimizeSalesforceContext(salesforceContext)
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue?.message ?? "Invalid request";
    const code = message.includes("empty")
      ? "EMPTY_REQUIREMENT"
      : message.includes("too large")
        ? "REQUIREMENT_TOO_LARGE"
        : "INVALID_REQUEST";
    return {
      ok: false,
      correlationId: correlationId(),
      code,
      message
    };
  }

  const blocked = detectBlockedOperations(parsed.data.requirement);
  if (blocked.length > 0) {
    return {
      ok: true,
      correlationId: correlationId(),
      blockedOperations: blocked,
      clarifyingQuestions: [],
      structuredRequirement: null,
      implementationPlan: [],
      metadataArtifacts: [],
      validation: { status: "not_run", issues: [] },
      deploymentStatus: "blocked",
      warning:
        "This request includes blocked Salesforce operations. The assistant will not generate deployment commands or modify the org."
    };
  }

  const needsClarification = parsed.data.requirement.trim().split(/\s+/).length < 6;
  if (needsClarification) {
    return {
      ok: true,
      correlationId: correlationId(),
      blockedOperations: [],
      clarifyingQuestions: [
        {
          id: "object",
          prompt: "Which Salesforce object should receive this change?"
        },
        {
          id: "values",
          prompt: "What field label, type, or picklist values are required?"
        }
      ],
      structuredRequirement: null,
      implementationPlan: [],
      metadataArtifacts: [],
      validation: { status: "not_run", issues: [] },
      deploymentStatus: "not_requested",
      warning: null
    };
  }

  return buildMockCustomFieldPlan(
    parsed.data.requirement,
    parsed.data.salesforceContext.objectApiName,
    correlationId()
  );
}
