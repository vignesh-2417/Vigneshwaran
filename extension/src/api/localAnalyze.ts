import {
  AnalyzeRequestSchema,
  buildAnalyzeModeResponse,
  buildBlockedAnalyzeResponse,
  buildGovernedMetadataTask,
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
    return buildBlockedAnalyzeResponse(correlationId(), blocked);
  }

  const needsClarification = parsed.data.requirement.trim().split(/\s+/).length < 6;
  if (needsClarification) {
    return buildAnalyzeModeResponse(correlationId(), [
      {
        id: "object",
        prompt: "Which Salesforce object should receive this change?"
      },
      {
        id: "values",
        prompt: "What field label, type, or picklist values are required?"
      }
    ]);
  }

  return buildGovernedMetadataTask(
    parsed.data.requirement,
    parsed.data.salesforceContext.objectApiName,
    correlationId()
  );
}
