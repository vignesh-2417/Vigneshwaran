import {
  AnalyzeRequestSchema,
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
          prompt: "What picklist values or field attributes are required?"
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

  const objectApiName = salesforceContext.objectApiName ?? "Account";
  return {
    ok: true,
    correlationId: correlationId(),
    blockedOperations: [],
    clarifyingQuestions: [],
    structuredRequirement: {
      summary: parsed.data.requirement.slice(0, 500),
      objectApiName,
      requestedChanges: ["Add custom picklist field Customer_Tier__c"]
    },
    implementationPlan: [
      {
        id: "field",
        title: "Create Customer_Tier__c picklist",
        detail: `Add a custom picklist field on ${objectApiName} with Gold, Silver, and Bronze values.`,
        metadataType: "CustomField"
      },
      {
        id: "fls",
        title: "Leave field-level security unchanged",
        detail: "Profiles and permission sets are out of scope and will not be modified.",
        metadataType: "CustomField"
      }
    ],
    metadataArtifacts: [
      {
        filePath: `force-app/main/default/objects/${objectApiName}/fields/Customer_Tier__c.field-meta.xml`,
        metadataType: "CustomField",
        before: null,
        after: `<CustomField>\n  <fullName>Customer_Tier__c</fullName>\n  <label>Customer Tier</label>\n  <type>Picklist</type>\n  <valueSet>\n    <valueSetDefinition>\n      <value><fullName>Gold</fullName><default>false</default></value>\n      <value><fullName>Silver</fullName><default>false</default></value>\n      <value><fullName>Bronze</fullName><default>false</default></value>\n    </valueSetDefinition>\n  </valueSet>\n</CustomField>`
      }
    ],
    validation: {
      status: "passed",
      issues: [
        {
          severity: "info",
          message: "Mock validation only. No org was contacted.",
          filePath: `force-app/main/default/objects/${objectApiName}/fields/Customer_Tier__c.field-meta.xml`
        }
      ]
    },
    deploymentStatus: "not_requested",
    warning: null
  };
}
