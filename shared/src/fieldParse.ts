import type { ClarifyingQuestion } from "./schemas.js";
import {
  FIELD_TYPE_CATALOG,
  findFieldTypeDefinition,
  type FieldCatalogId,
  type FieldTypeDefinition
} from "./fieldTypes.js";

export type FormulaReturnType =
  | "Checkbox"
  | "Currency"
  | "Date"
  | "DateTime"
  | "Number"
  | "Percent"
  | "Text";

export type SummaryOperation = "Count" | "Min" | "Max" | "Sum";

export interface ParsedCustomFieldRequest {
  label: string;
  apiName: string;
  catalogId: FieldCatalogId;
  /** Value for CustomField <type>. Formula fields use formulaReturnType here. */
  fieldType: string;
  objectApiName: string;
  displayName: string;
  length?: number;
  visibleLines?: number;
  precision?: number;
  scale?: number;
  picklistValues: string[];
  referenceTo?: string;
  relationshipName?: string;
  relationshipLabel?: string;
  formula?: string;
  formulaReturnType?: FormulaReturnType;
  summaryOperation?: SummaryOperation;
  summarizedField?: string;
  summaryForeignKey?: string;
  displayFormat?: string;
  startingNumber?: number;
  maskType?: string;
  maskChar?: string;
  defaultValue?: string;
  clarifyingQuestions: ClarifyingQuestion[];
}

const TYPE_PATTERNS: Array<{ id: FieldCatalogId; pattern: RegExp }> = [
  { id: "ExternalLookup", pattern: /\bexternal[\s-]*lookup\b/i },
  { id: "MasterDetail", pattern: /\bmaster[\s-]*detail\b/i },
  { id: "Summary", pattern: /\broll[\s-]*up(?:\s+summary)?\b|\bsummary\s+field\b/i },
  { id: "Formula", pattern: /\bformula\b/i },
  { id: "EncryptedText", pattern: /\bencrypted(?:\s+text)?\b|\btext\s*\(\s*encrypted\s*\)/i },
  { id: "Html", pattern: /\brich(?:\s+text)?(?:\s+area)?\b|\bhtml\b|\btext\s*area\s*\(\s*rich\s*\)/i },
  { id: "LongTextArea", pattern: /\blong[\s-]*text(?:\s*area)?\b|\btext\s*area\s*\(\s*long\s*\)/i },
  { id: "MultiselectPicklist", pattern: /\bmulti[\s-]*select(?:\s+picklist)?\b|\bpicklist\s*\(\s*multi/i },
  { id: "AutoNumber", pattern: /\bauto[\s-]*number\b/i },
  { id: "DateTime", pattern: /\bdate[\s/:-]*time\b|\bdatetime\b/i },
  { id: "Lookup", pattern: /\blookup(?:\s+relationship)?\b/i },
  { id: "TextArea", pattern: /\btext[\s-]*area\b|\btextarea\b/i },
  { id: "Picklist", pattern: /\bpicklist\b|\bdrop[\s-]*down\b/i },
  { id: "Checkbox", pattern: /\bcheckbox\b|\bboolean\b/i },
  { id: "Currency", pattern: /\bcurrency\b|\bmoney\b/i },
  { id: "Percent", pattern: /\bpercent(?:age)?\b/i },
  { id: "Email", pattern: /\be-?mail\b/i },
  { id: "Phone", pattern: /\bphone\b|\btelephone\b/i },
  { id: "Url", pattern: /\burl\b|\bhyperlink\b|\bwebsite\b/i },
  { id: "Number", pattern: /\bnumber\b|\binteger\b|\bnumeric\b/i },
  { id: "Date", pattern: /\bdate\b/i },
  { id: "Text", pattern: /\btext\b|\bstring\b/i }
];

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function toRelationshipName(label: string): string {
  const base = label
    .replace(/__c$/i, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const safe = base.length > 0 ? base : "Related";
  return /^[A-Za-z]/.test(safe) ? safe : `X_${safe}`;
}

function matchCatalogFromHint(requirement: string): FieldTypeDefinition | undefined {
  const hinted = requirement.match(/Field data type:\s*([^\n.]+)/i);
  if (!hinted?.[1]) {
    return undefined;
  }
  return findFieldTypeDefinition(hinted[1]);
}

function detectCatalogId(requirement: string): FieldCatalogId {
  const hinted = matchCatalogFromHint(requirement);
  if (hinted) {
    return hinted.id;
  }
  const matched = TYPE_PATTERNS.find((entry) => entry.pattern.test(requirement));
  return matched?.id ?? "Text";
}

function parsePicklistValues(requirement: string): string[] {
  const line =
    requirement.match(/\b(?:values?|options?)\s*[:\-]\s*([^\n]+)/i)?.[1] ??
    requirement.match(/\bwith\s+(.+?)\s+values?\b/i)?.[1];
  if (!line) {
    return [];
  }
  return line
    .split(/[;,]|\band\b/i)
    .map((item) => item.replace(/[.]+$/, "").trim())
    .filter((item) => item.length > 0 && item.length <= 255)
    .slice(0, 40);
}

function parseReferenceTo(requirement: string, catalogId: FieldCatalogId): string | undefined {
  const targeted = requirement.match(
    /\b(?:lookup\s+to|related\s+to|parent(?:\s+object)?|reference(?:\s*to)?|external\s+object)\s*:?\s*([A-Za-z][A-Za-z0-9_]{0,79})\b/i
  );
  if (targeted?.[1]) {
    return targeted[1];
  }
  if (
    catalogId === "Lookup" ||
    catalogId === "MasterDetail" ||
    catalogId === "ExternalLookup"
  ) {
    const toMatch = requirement.match(
      /\bto\s+(?:the\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s+object)?\b/i
    );
    if (toMatch?.[1] && !/^(?:the|a|an|this)$/i.test(toMatch[1])) {
      return toMatch[1];
    }
  }
  return undefined;
}

function parseFormula(requirement: string): string | undefined {
  const explicit = requirement.match(/\bformula\s*[:\-]\s*([^\n]+)/i);
  if (!explicit?.[1]) {
    return undefined;
  }
  const text = explicit[1]
    .replace(
      /\s+returns?\s+(text|number|currency|percent|checkbox|date(?:\s*\/\s*time)?|datetime)\s*$/i,
      ""
    )
    .trim();
  if (text && !/^field data type/i.test(text)) {
    return text.slice(0, 1_300);
  }
  return undefined;
}

function parseFormulaReturnType(requirement: string): FormulaReturnType {
  const match = requirement.match(
    /\breturns?\s+(text|number|currency|percent|checkbox|date(?:\s*\/\s*time)?|datetime)\b/i
  );
  const raw = match?.[1]?.toLowerCase().replace(/\s+/g, "") ?? "";
  if (raw === "number") return "Number";
  if (raw === "currency") return "Currency";
  if (raw === "percent") return "Percent";
  if (raw === "checkbox") return "Checkbox";
  if (raw === "date") return "Date";
  if (raw === "datetime" || raw === "date/time") return "DateTime";
  return "Text";
}

function parseSummaryOperation(requirement: string): SummaryOperation | undefined {
  if (/\bcount\b/i.test(requirement)) return "Count";
  if (/\bsum\b/i.test(requirement)) return "Sum";
  if (/\bmin(?:imum)?\b/i.test(requirement)) return "Min";
  if (/\bmax(?:imum)?\b/i.test(requirement)) return "Max";
  return undefined;
}

function parseSummarizedField(requirement: string): string | undefined {
  const match = requirement.match(
    /\b(?:sum|min(?:imum)?|max(?:imum)?)\s+(?:of\s+)?([A-Za-z][A-Za-z0-9_.]{0,79})\b/i
  );
  return match?.[1];
}

function parseSummaryForeignKey(requirement: string): string | undefined {
  const child = requirement.match(
    /\b(?:from|child)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s+object)?\b/i
  );
  return child?.[1];
}

function parseDisplayFormat(requirement: string): string | undefined {
  const match = requirement.match(/\bformat\s*[:\-]\s*([^\n]+)/i);
  return match?.[1]?.trim().slice(0, 30);
}

function definitionFor(id: FieldCatalogId): FieldTypeDefinition {
  for (const entry of FIELD_TYPE_CATALOG) {
    if (entry.id === id) {
      return entry;
    }
  }
  return FIELD_TYPE_CATALOG.filter((entry) => entry.id === "Text")[0] ?? {
    id: "Text",
    metadataType: "Text",
    label: "Text",
    category: "Text and numeric",
    summary: "Letters, numbers, or symbols up to 255 characters.",
    aliases: []
  };
}

function xmlType(field: ParsedCustomFieldRequest): string {
  if (field.catalogId === "Formula") {
    return field.formulaReturnType ?? "Text";
  }
  return field.fieldType;
}

function buildClarifyingQuestions(field: Omit<ParsedCustomFieldRequest, "clarifyingQuestions">): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];
  if (
    (field.catalogId === "Picklist" || field.catalogId === "MultiselectPicklist") &&
    field.picklistValues.length === 0
  ) {
    questions.push({
      id: "picklist-values",
      prompt:
        "List the picklist values (comma or semicolon separated). Example: values: New, Working, Closed."
    });
  }
  if (
    (field.catalogId === "Lookup" ||
      field.catalogId === "MasterDetail" ||
      field.catalogId === "ExternalLookup") &&
    !field.referenceTo
  ) {
    questions.push({
      id: "relationship-target",
      prompt: `Which object should ${field.displayName} ${field.label} point to? Example: lookup to Contact.`
    });
  }
  if (field.catalogId === "Formula" && !field.formula) {
    questions.push({
      id: "formula-expression",
      prompt:
        "Provide the formula expression and return type. Example: formula: 1 + 1 returns Number."
    });
  }
  if (field.catalogId === "Summary") {
    if (!field.summaryOperation) {
      questions.push({
        id: "summary-operation",
        prompt: "Which roll-up operation: COUNT, SUM, MIN, or MAX?"
      });
    }
    if (!field.summaryForeignKey) {
      questions.push({
        id: "summary-child",
        prompt:
          "Which child object in the master-detail relationship should roll up? Example: from Opportunity."
      });
    }
    if (field.summaryOperation && field.summaryOperation !== "Count" && !field.summarizedField) {
      questions.push({
        id: "summary-field",
        prompt: "Which child field should be aggregated? Example: of Amount."
      });
    }
  }
  return questions;
}

export function parseCustomFieldRequirement(
  requirement: string,
  fallbackObject: string | null
): ParsedCustomFieldRequest {
  const quoted = requirement.match(/["“”']([^"“”']{1,80})["“”']/);
  const objectMatch = requirement.match(
    /\b(?:on|in|for)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s+object)?\b/i
  );
  const catalogId = detectCatalogId(requirement);
  const def = definitionFor(catalogId);
  const label = quoted?.[1]?.trim() || "Custom Field";
  const objectApiName = objectMatch?.[1] ?? fallbackObject ?? "Account";
  const formulaReturnType =
    catalogId === "Formula" ? parseFormulaReturnType(requirement) : undefined;
  const fieldType =
    catalogId === "Formula" ? (formulaReturnType ?? "Text") : (def.metadataType ?? "Text");

  const referenceTo = parseReferenceTo(requirement, catalogId);
  const formula = catalogId === "Formula" ? parseFormula(requirement) : undefined;
  const summaryOperation = catalogId === "Summary" ? parseSummaryOperation(requirement) : undefined;
  const summarizedField = catalogId === "Summary" ? parseSummarizedField(requirement) : undefined;
  const summaryForeignKey = catalogId === "Summary" ? parseSummaryForeignKey(requirement) : undefined;

  const draft: Omit<ParsedCustomFieldRequest, "clarifyingQuestions"> = {
    label,
    apiName: toCustomFieldApiName(label),
    catalogId,
    fieldType,
    objectApiName,
    displayName: def.label,
    picklistValues: parsePicklistValues(requirement),
    relationshipName: toRelationshipName(label),
    relationshipLabel: label,
    ...(referenceTo ? { referenceTo } : {}),
    ...(formula ? { formula } : {}),
    ...(formulaReturnType ? { formulaReturnType } : {}),
    ...(summaryOperation ? { summaryOperation } : {}),
    ...(summarizedField ? { summarizedField } : {}),
    ...(summaryForeignKey ? { summaryForeignKey } : {}),
    ...(catalogId === "AutoNumber"
      ? { displayFormat: parseDisplayFormat(requirement) ?? "A-{0000}", startingNumber: 1 }
      : {}),
    ...(catalogId === "EncryptedText" ? { maskType: "all", maskChar: "asterisk" } : {}),
    ...(catalogId === "Checkbox" ? { defaultValue: "false" } : {})
  };

  if (catalogId === "Text") {
    draft.length = 255;
  }
  if (catalogId === "TextArea") {
    draft.length = 255;
  }
  if (catalogId === "LongTextArea") {
    draft.length = 32768;
    draft.visibleLines = 5;
  }
  if (catalogId === "Html") {
    draft.length = 32768;
    draft.visibleLines = 10;
  }
  if (catalogId === "EncryptedText") {
    draft.length = 175;
  }
  if (catalogId === "Number") {
    draft.precision = 18;
    draft.scale = 0;
  }
  if (catalogId === "Currency" || catalogId === "Percent") {
    draft.precision = 18;
    draft.scale = 2;
  }
  if (catalogId === "Formula" && (formulaReturnType === "Number" || formulaReturnType === "Currency" || formulaReturnType === "Percent")) {
    draft.precision = 18;
    draft.scale = 2;
  }
  if (catalogId === "MultiselectPicklist") {
    draft.visibleLines = 4;
  }

  return {
    ...draft,
    clarifyingQuestions: buildClarifyingQuestions(draft)
  };
}

export function customFieldMetadataRecord(field: ParsedCustomFieldRequest): Record<string, unknown> {
  const type = xmlType(field);
  const metadata: Record<string, unknown> = {
    type,
    label: field.label
  };

  const skipRequired =
    field.catalogId === "Checkbox" ||
    field.catalogId === "AutoNumber" ||
    field.catalogId === "Formula" ||
    field.catalogId === "Summary";
  if (!skipRequired) {
    metadata.required = false;
  }

  if (field.length !== undefined) metadata.length = field.length;
  if (field.visibleLines !== undefined) metadata.visibleLines = field.visibleLines;
  if (field.precision !== undefined) metadata.precision = field.precision;
  if (field.scale !== undefined) metadata.scale = field.scale;
  if (field.defaultValue !== undefined) metadata.defaultValue = field.defaultValue === "true";
  if (field.displayFormat) metadata.displayFormat = field.displayFormat;
  if (field.startingNumber !== undefined) metadata.startingNumber = field.startingNumber;
  if (field.maskType) metadata.maskType = field.maskType;
  if (field.maskChar) metadata.maskChar = field.maskChar;
  if (field.formula) {
    metadata.formula = field.formula;
    const numericReturn =
      field.formulaReturnType === "Number" ||
      field.formulaReturnType === "Currency" ||
      field.formulaReturnType === "Percent";
    metadata.formulaTreatBlanksAs = numericReturn ? "BlankAsZero" : "BlankAsBlank";
  }
  if (field.catalogId === "Picklist" || field.catalogId === "MultiselectPicklist") {
    metadata.valueSet = {
      restricted: true,
      valueSetDefinition: {
        sorted: false,
        value: field.picklistValues.map((item, index) => ({
          fullName: item,
          default: index === 0,
          label: item
        }))
      }
    };
  }
  if (field.referenceTo) {
    metadata.referenceTo = field.referenceTo;
    metadata.relationshipName = field.relationshipName;
    metadata.relationshipLabel = field.relationshipLabel;
  }
  if (field.catalogId === "Lookup") {
    metadata.deleteConstraint = "SetNull";
  }
  if (field.catalogId === "MasterDetail") {
    metadata.reparentableMasterDetail = false;
    metadata.writeRequiresMasterRead = false;
  }
  if (field.catalogId === "Summary") {
    metadata.summaryOperation = field.summaryOperation;
    if (field.summaryForeignKey) {
      const child = field.summaryForeignKey.includes(".")
        ? field.summaryForeignKey
        : `${field.summaryForeignKey}.${field.objectApiName}Id`;
      metadata.summaryForeignKey = child;
    }
    if (field.summarizedField && field.summaryOperation !== "Count") {
      metadata.summarizedField = field.summarizedField.includes(".")
        ? field.summarizedField
        : `${field.summaryForeignKey ?? "Child"}.${field.summarizedField}`;
    }
  }
  return metadata;
}

function xmlLinesFromMetadata(metadata: Record<string, unknown>, indent = "  "): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") {
          lines.push(`${indent}<${key}>`);
          lines.push(...xmlLinesFromMetadata(item as Record<string, unknown>, `${indent}  `));
          lines.push(`${indent}</${key}>`);
        } else {
          lines.push(`${indent}<${key}>${xmlEscape(String(item))}</${key}>`);
        }
      }
      continue;
    }
    if (typeof value === "object") {
      lines.push(`${indent}<${key}>`);
      lines.push(...xmlLinesFromMetadata(value as Record<string, unknown>, `${indent}  `));
      lines.push(`${indent}</${key}>`);
      continue;
    }
    lines.push(`${indent}<${key}>${xmlEscape(String(value))}</${key}>`);
  }
  return lines;
}

export function buildCustomFieldXml(field: ParsedCustomFieldRequest): string {
  const metadata = customFieldMetadataRecord(field);
  const { type, label, ...rest } = metadata;
  const ordered: Record<string, unknown> = {
    fullName: field.apiName,
    label,
    type,
    ...rest
  };
  const body = xmlLinesFromMetadata(ordered).join("\n");
  return `<CustomField>\n${body}\n</CustomField>`;
}

export function applyFieldTypeHint(requirement: string, catalogId: FieldCatalogId | "infer"): string {
  if (catalogId === "infer") {
    return requirement;
  }
  const def = definitionFor(catalogId);
  if (/Field data type:/i.test(requirement)) {
    return requirement;
  }
  return `Field data type: ${def.label}. ${requirement}`;
}
