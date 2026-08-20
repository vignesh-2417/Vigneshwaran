import type { AnalyzeSuccessResponse } from "./schemas.js";

const FIELD_TYPE_ALIASES: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\blong[\s-]*text(?:area)?\b/i, type: "LongTextArea" },
  { pattern: /\btext[\s-]*area\b|\btextarea\b/i, type: "TextArea" },
  { pattern: /\bpicklist\b/i, type: "Picklist" },
  { pattern: /\bcheckbox\b|\bboolean\b/i, type: "Checkbox" },
  { pattern: /\bcurrency\b/i, type: "Currency" },
  { pattern: /\bpercent\b/i, type: "Percent" },
  { pattern: /\bdate[\s-]*time\b|\bdatetime\b/i, type: "DateTime" },
  { pattern: /\bdate\b/i, type: "Date" },
  { pattern: /\bemail\b/i, type: "Email" },
  { pattern: /\bphone\b/i, type: "Phone" },
  { pattern: /\burl\b/i, type: "Url" },
  { pattern: /\bnumber\b|\binteger\b/i, type: "Number" },
  { pattern: /\btext\b|\bstring\b/i, type: "Text" }
];

export interface ParsedCustomFieldRequest {
  label: string;
  apiName: string;
  fieldType: string;
  objectApiName: string;
}

export function toCustomFieldApiName(label: string): string {
  const base = label
    .replace(/__c$/i, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  const safe = base.length > 0 ? base : "Custom_Field";
  const startsWithLetter = /^[A-Za-z]/.test(safe) ? safe : `X_${safe}`;
  return `${startsWithLetter}__c`;
}

export function parseCustomFieldRequirement(
  requirement: string,
  fallbackObject: string | null
): ParsedCustomFieldRequest {
  const quoted = requirement.match(/["“”']([^"“”']{1,80})["“”']/);
  const objectMatch = requirement.match(
    /\b(?:on|in|for)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s+object)?\b/i
  );
  const typeRule = FIELD_TYPE_ALIASES.find((entry) => entry.pattern.test(requirement));
  const label = quoted?.[1]?.trim() || "Custom Field";
  const objectApiName = objectMatch?.[1] ?? fallbackObject ?? "Account";

  return {
    label,
    apiName: toCustomFieldApiName(label),
    fieldType: typeRule?.type ?? "Text",
    objectApiName
  };
}

function fieldXml(field: ParsedCustomFieldRequest): string {
  const extra =
    field.fieldType === "Text"
      ? "\n  <length>255</length>"
      : field.fieldType === "LongTextArea"
        ? "\n  <length>32768</length>\n  <visibleLines>5</visibleLines>"
        : field.fieldType === "Number"
          ? "\n  <precision>18</precision>\n  <scale>0</scale>"
          : "";
  return `<CustomField>
  <fullName>${field.apiName}</fullName>
  <label>${field.label}</label>
  <type>${field.fieldType}</type>${extra}
  <required>false</required>
</CustomField>`;
}

export const MOCK_NO_ORG_CHANGE_WARNING =
  "Mock analysis only. The Salesforce org was not modified and no custom field was created or deployed.";

export function buildMockCustomFieldPlan(
  requirement: string,
  fallbackObject: string | null,
  correlationId: string
): AnalyzeSuccessResponse {
  const field = parseCustomFieldRequirement(requirement, fallbackObject);
  const filePath = `force-app/main/default/objects/${field.objectApiName}/fields/${field.apiName}.field-meta.xml`;

  return {
    ok: true,
    correlationId,
    blockedOperations: [],
    clarifyingQuestions: [],
    structuredRequirement: {
      summary: requirement.slice(0, 500),
      objectApiName: field.objectApiName,
      requestedChanges: [`Create ${field.apiName} (${field.fieldType}) on ${field.objectApiName}`]
    },
    implementationPlan: [
      {
        id: "create-field",
        title: `Plan ${field.apiName} on ${field.objectApiName}`,
        detail: `Draft a ${field.fieldType} custom field labeled "${field.label}" on ${field.objectApiName}. This assistant does not call Salesforce Metadata API or create the field in the org.`,
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
        filePath,
        metadataType: "CustomField",
        before: null,
        after: fieldXml(field)
      }
    ],
    validation: {
      status: "passed",
      issues: [
        {
          severity: "info",
          message: MOCK_NO_ORG_CHANGE_WARNING,
          filePath
        }
      ]
    },
    deploymentStatus: "not_requested",
    warning: MOCK_NO_ORG_CHANGE_WARNING
  };
}
