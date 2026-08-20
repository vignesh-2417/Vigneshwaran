export interface ParsedCustomFieldRequest {
  label: string;
  apiName: string;
  fieldType: string;
  objectApiName: string;
}

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
