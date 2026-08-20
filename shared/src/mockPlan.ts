import type {
  AnalyzeSuccessResponse,
  BlockedOperation,
  OperatingMode,
  TaskReport
} from "./schemas.js";
import { parseCustomFieldRequirement } from "./fieldParse.js";

export {
  parseCustomFieldRequirement,
  toCustomFieldApiName,
  type ParsedCustomFieldRequest
} from "./fieldParse.js";

export function buildAnalyzeModeResponse(
  correlationId: string,
  clarifyingQuestions: AnalyzeSuccessResponse["clarifyingQuestions"]
): AnalyzeSuccessResponse {
  return {
    ok: true,
    correlationId,
    blockedOperations: [],
    clarifyingQuestions,
    structuredRequirement: null,
    implementationPlan: [],
    metadataArtifacts: [],
    validation: { status: "not_run", issues: [] },
    deploymentStatus: "not_requested",
    operatingMode: "ANALYZE",
    taskReport: null,
    warning: "ANALYZE mode only. No files were created or modified."
  };
}

export function buildBlockedAnalyzeResponse(
  correlationId: string,
  blocked: BlockedOperation[]
): AnalyzeSuccessResponse {
  const first = blocked[0];
  return {
    ok: true,
    correlationId,
    blockedOperations: blocked,
    clarifyingQuestions: [],
    structuredRequirement: null,
    implementationPlan: [],
    metadataArtifacts: [],
    validation: { status: "not_run", issues: [] },
    deploymentStatus: "blocked",
    operatingMode: "ANALYZE",
    taskReport: first
      ? {
          interpretation: first.reason,
          assumptions: [],
          filesCreatedOrChanged: [],
          generatedComponents: [],
          securityAndPermissionImpact: `1. ${first.reason} 2. ${first.whySensitive} 3. ${first.manualAction}`,
          validationAndTestResults: "Not run. Security-sensitive work is stopped in ANALYZE.",
          deploymentPreview: "No deployment. The request is blocked.",
          remainingManualSteps: [first.manualAction],
          knownLimitations: ["The assistant will not generate or deploy this change."]
        }
      : null,
    warning:
      "Stopped for a security-sensitive change. See what was requested, why it is sensitive, and the manual administrator action."
  };
}

export const OPERATING_MODES: readonly OperatingMode[] = [
  "ANALYZE",
  "PLAN",
  "GENERATE",
  "VALIDATE",
  "REVIEW",
  "DEPLOY"
];

export const GOVERNED_NO_DEPLOY_WARNING =
  "Correctness and reviewability come first. Source-format metadata was generated in ANALYZE→REVIEW. DEPLOY is never automatic, never production, and requires a sandbox or scratch org with a check-only pass plus explicit human approval.";

function fieldXml(label: string, apiName: string, fieldType: string): string {
  const extra =
    fieldType === "Text"
      ? "\n  <length>255</length>"
      : fieldType === "LongTextArea"
        ? "\n  <length>32768</length>\n  <visibleLines>5</visibleLines>"
        : fieldType === "Number"
          ? "\n  <precision>18</precision>\n  <scale>0</scale>"
          : "";
  return `<CustomField>
  <fullName>${apiName}</fullName>
  <label>${label}</label>
  <type>${fieldType}</type>${extra}
  <required>false</required>
</CustomField>`;
}

function buildTaskReport(
  requirement: string,
  objectApiName: string,
  apiName: string,
  fieldType: string,
  filePath: string,
  wantsFlow: boolean,
  wantsApex: boolean
): TaskReport {
  const flowNotes = wantsFlow
    ? [
        "State Flow type, object, trigger, entry criteria, data updates, recursion and bulk risks, failure path, and before-save vs after-save before generating a Flow."
      ]
    : [];
  const apexNotes = wantsApex
    ? [
        "Explain why Apex is required instead of Flow. Use bulk-safe Apex, no SOQL/DML in loops, CRUD/FLS, sharing, tests (positive/negative/null/bulk/permission), and never SeeAllData=true unless unavoidable."
      ]
    : [];

  return {
    interpretation: `The request is to add ${fieldType} field ${apiName} on ${objectApiName} from: ${requirement.slice(0, 400)}`,
    assumptions: [
      "Salesforce DX source format is the delivery format.",
      "No Salesforce IDs are hard-coded.",
      "Profiles, permission sets, sharing, credentials, and production data are out of scope.",
      "No secrets are stored in source, prompts, or logs.",
      ...flowNotes,
      ...apexNotes
    ],
    filesCreatedOrChanged: [filePath],
    generatedComponents: [
      {
        componentType: "CustomField",
        apiName: `${objectApiName}.${apiName}`,
        purpose: `Hold the "${parseCustomFieldRequirement(requirement, objectApiName).label}" value on ${objectApiName}.`,
        dependencies: [`${objectApiName} object`],
        assumptions: ["Field-level security is left unchanged and must be set by an administrator."],
        deploymentOrder: `1) Deploy ${filePath} to a sandbox or scratch org after check-only validation. Never production automatically.`,
        testScenarios: [
          "Positive: field exists with the planned type and label.",
          "Negative: required-field rules are not assumed.",
          "Null: field may be empty.",
          "Bulk: Data Loader load of 200 records does not depend on this field.",
          "Permission: users without FLS cannot see the field until an admin grants it."
        ],
        securityImpact:
          "No profile, permission set, sharing, or credential change is included. FLS remains a manual Setup step.",
        manualSetup:
          "Set FLS, page layouts, and Lightning record pages in Setup after sandbox validation."
      }
    ],
    securityAndPermissionImpact:
      "No permission sets, profiles, sharing rules, sharing settings, user access, login settings, connected apps, or credentials are changed. CRUD/FLS for the new field is not auto-granted.",
    validationAndTestResults:
      "Static checks: DX source XML well-formed, no hard-coded IDs, no secrets, no destructiveChanges, no deploy commands. Salesforce CLI validation was not executed in this browser session.",
    deploymentPreview:
      "Check-only deploy to a sandbox or scratch org only after REVIEW approval. Actual deploy is a separate, explicit user action. Production deploy is never automatic.",
    remainingManualSteps: [
      "Approve this REVIEW package.",
      "Run `sf project deploy start --dry-run` against a sandbox or scratch org.",
      "Set FLS, layouts, and list views.",
      "Only then consider a non-production deploy."
    ],
    knownLimitations: [
      "This assistant does not modify org files until PLAN is approved; GENERATE emits source text only.",
      "Broad refactors and unrelated files are out of scope.",
      "Apex tests, Flow XML, and CLI runs require a project workspace outside this popup.",
      ...flowNotes,
      ...apexNotes
    ]
  };
}

export function buildGovernedMetadataTask(
  requirement: string,
  fallbackObject: string | null,
  correlationId: string
): AnalyzeSuccessResponse {
  const field = parseCustomFieldRequirement(requirement, fallbackObject);
  const filePath = `force-app/main/default/objects/${field.objectApiName}/fields/${field.apiName}.field-meta.xml`;
  const wantsFlow = /\bflow\b/i.test(requirement);
  const wantsApex = /\bapex\b|\btrigger\b/i.test(requirement);
  const report = buildTaskReport(
    requirement,
    field.objectApiName,
    field.apiName,
    field.fieldType,
    filePath,
    wantsFlow,
    wantsApex
  );

  return {
    ok: true,
    correlationId,
    blockedOperations: [],
    clarifyingQuestions: [],
    structuredRequirement: {
      summary: requirement.slice(0, 500),
      objectApiName: field.objectApiName,
      requestedChanges: [`Generate ${field.apiName} (${field.fieldType}) on ${field.objectApiName} in source format`]
    },
    implementationPlan: [
      {
        id: "analyze",
        title: "ANALYZE",
        detail: report.interpretation,
        metadataType: "CustomField"
      },
      {
        id: "plan",
        title: "PLAN",
        detail: `Metadata type CustomField. Dependency: ${field.objectApiName}. Risk: FLS/layouts are manual. Tests: field presence and type. No files are modified in the org yet.`,
        metadataType: "CustomField"
      },
      {
        id: "generate",
        title: "GENERATE",
        detail: `Source-format XML for ${field.objectApiName}.${field.apiName} only. Small, traceable, no deploy.`,
        metadataType: "CustomField"
      },
      {
        id: "validate",
        title: "VALIDATE",
        detail: report.validationAndTestResults,
        metadataType: "CustomField"
      },
      {
        id: "review",
        title: "REVIEW",
        detail: "Changed file listed below. Security: FLS unchanged. Side effects: page layouts will not show the field until updated. Explicit approval is required before any deploy.",
        metadataType: "CustomField"
      },
      {
        id: "deploy",
        title: "DEPLOY",
        detail: "Not executed. Sandbox/scratch check-only only after approval. Never production automatically.",
        metadataType: "CustomField"
      }
    ],
    metadataArtifacts: [
      {
        filePath,
        metadataType: "CustomField",
        before: null,
        after: fieldXml(field.label, field.apiName, field.fieldType)
      }
    ],
    validation: {
      status: "passed",
      issues: [
        {
          severity: "info",
          message: GOVERNED_NO_DEPLOY_WARNING,
          filePath
        }
      ]
    },
    deploymentStatus: "awaiting_approval",
    operatingMode: "REVIEW",
    taskReport: report,
    warning: GOVERNED_NO_DEPLOY_WARNING
  };
}

/** @deprecated Use buildGovernedMetadataTask */
export const buildMockCustomFieldPlan = buildGovernedMetadataTask;
export const MOCK_NO_ORG_CHANGE_WARNING = GOVERNED_NO_DEPLOY_WARNING;
