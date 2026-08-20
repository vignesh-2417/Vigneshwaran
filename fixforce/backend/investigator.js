/**
 * FixForce – investigator.js
 * Deep error investigation: extracts flow/field/object context and
 * diagnoses composite failures (e.g. Flow failed due to missing field access).
 */

const { classifyError } = require("./classifier");
const { HELP_ARTICLES } = require("./helpArticles");

const PERMISSION_SIGNALS = [
  /INSUFFICIENT_ACCESS/i,
  /insufficient privileges/i,
  /insufficient access/i,
  /no access/i,
  /permission denied/i,
  /you do not have access/i,
  /you do not have the level of access/i,
  /custom permission/i,
  /access denied/i,
  /unauthorized/i,
  /field-level security/i,
  /\bFLS\b/,
  /cannot update/i,
  /cannot edit/i,
  /not authorized to/i,
  /entity is not updatable/i,
];

const FLOW_SIGNALS = [
  /flow/i,
  /interview/i,
  /FlowRuntime/i,
  /flow fault/i,
  /FLOW_ELEMENT/i,
  /record-triggered flow/i,
  /autolaunched flow/i,
  /screen flow/i,
  /we can't save this record because the .?flow.? failed/i,
  /we can't save this record because the/i,
  /process failed/i,
  /the flow tried to update/i,
];

const VALIDATION_SIGNALS = [
  /FIELD_CUSTOM_VALIDATION_EXCEPTION/i,
  /validation rule/i,
  /validation failed/i,
  /violates.*validation/i,
];

const COMPOSITE_SCENARIOS = [
  {
    id: "FLOW_MALFORMED_ID",
    category: "FLOW",
    failureType: "flow_malformed_id",
    label: "Flow Failed — Invalid ID Value",
    failureLayer: "flow",
    rootCauseHint: "malformed_id_in_flow",
    requires: (s) => s.hasFlow && s.hasMalformedId,
    headline: (d) =>
      `Flow "${d.flowName || "Unknown"}" failed — invalid ID in ${d.fieldName ? `"${d.fieldName}"` : "a lookup field"}`,
    narrative: (d) =>
      `The Flow${d.flowName ? ` ("${d.flowName}")` : ""} tried to update a record but assigned an invalid Salesforce ID${d.fieldName ? ` to "${d.fieldName}"` : ""}${d.invalidValue ? ` (value: "${d.invalidValue}" — must be a 15/18-character ID)` : ""}. Lookup and master-detail fields require valid record IDs, not free text.`,
    quickChecks: (d) => [
      d.flowName ? `Setup → Flows → "${d.flowName}" → Debug and inspect the Update Records element` : "Identify the failing flow/process from Setup → Flows",
      d.fieldName ? `Check what value is assigned to "${d.fieldName}" before the DML step` : "Find which lookup field received a non-ID value",
      "Ensure Assignment/Get Records outputs a valid 15 or 18-character Salesforce ID",
      d.invalidValue ? `Replace "${d.invalidValue}" with a valid record ID or clear the field if optional` : "Validate ID format: starts with key prefix (e.g. 001 for Account)",
      "Add a Decision to verify the ID is valid before Update Records",
    ],
    helpArticleKey: "FLOW_MALFORMED_ID",
  },
  {
    id: "FLOW_PERMISSION",
    category: "FLOW",
    failureType: "flow_permission",
    label: "Flow Failed — Permission Issue",
    failureLayer: "flow",
    rootCauseHint: "permission_in_flow",
    requires: (s) => s.hasFlow && s.hasPermission,
    headline: (d) =>
      `Flow "${d.flowName || "Unknown"}" failed — the running user lacks access to update ${d.fieldName ? `field "${d.fieldName}"` : "a field"}`,
    narrative: (d) =>
      `A Salesforce Flow${d.flowName ? ` ("${d.flowName}")` : ""}${d.flowElement ? ` at the "${d.flowElement}" element` : ""} tried to create or update a record, but the user executing the flow does not have sufficient permissions. This is commonly caused by Field-Level Security (FLS), missing Edit permission on the object, or the flow running in user context without the required field access.`,
    quickChecks: (d) => [
      d.flowName
        ? `Open Setup → Flows → "${d.flowName}" → Debug and reproduce with the same record`
        : "Open Setup → Flows and identify the failing flow from Paused/Failed Flow Interviews",
      d.flowElement
        ? `Inspect the "${d.flowElement}" element (Update Records / Create Records) for fields being written`
        : "Find the Update Records or Create Records element that failed",
      d.fieldName
        ? `Grant Edit access to "${d.fieldName}" via Field-Level Security on the user's profile or permission set`
        : "Review Field-Level Security for all fields referenced in the failing DML element",
      "Confirm the flow's 'Run in' context (User vs System) — user-context flows inherit the running user's permissions",
      "If using System context, verify the integration user or automated process has the required object and field permissions",
    ],
    helpArticleKey: "FLOW_PERMISSION",
  },
  {
    id: "FLOW_VALIDATION",
    category: "FLOW",
    failureType: "flow_validation",
    label: "Flow Failed — Validation Rule",
    failureLayer: "flow",
    rootCauseHint: "validation_in_flow",
    requires: (s) => s.hasFlow && s.hasValidation,
    headline: (d) =>
      `Flow "${d.flowName || "Unknown"}" failed — a validation rule blocked the save`,
    narrative: (d) =>
      `The Flow${d.flowName ? ` "${d.flowName}"` : ""} executed a DML step (create/update), but a validation rule on ${d.objectName || "the target object"} rejected the record. The flow logic may be setting values that violate an active validation rule.`,
    quickChecks: (d) => [
      d.flowName ? `Debug flow "${d.flowName}" and note field values at the failing Update Records step` : "Debug the flow to capture values passed to the DML element",
      d.objectName
        ? `Setup → Object Manager → ${d.objectName} → Validation Rules — review active rules`
        : "Identify the object being saved and review its Validation Rules",
      "Compare values the flow assigns vs. validation rule criteria",
      "Add a Decision element before DML to skip updates when validation would fail, or adjust the rule exception",
    ],
    helpArticleKey: "FLOW_VALIDATION",
  },
  {
    id: "FLOW_REQUIRED_FIELD",
    category: "FLOW",
    failureType: "flow_required_field",
    label: "Flow Failed — Required Field Missing",
    failureLayer: "flow",
    rootCauseHint: "required_field_in_flow",
    requires: (s) => s.hasFlow && s.hasRequiredField,
    headline: (d) =>
      `Flow "${d.flowName || "Unknown"}" failed — a required field was not populated`,
    narrative: (d) =>
      `The Flow attempted to save a record without populating a required field${d.fieldName ? ` ("${d.fieldName}")` : ""}. Check Assignments and Record Create/Update elements before the failing step.`,
    quickChecks: (d) => [
      "Debug the flow and inspect variables feeding the Create/Update Records element",
      d.fieldName ? `Ensure "${d.fieldName}" is assigned before the DML step` : "Map all required fields in the flow's record variable",
      "Verify Get Records returns data for required lookup fields",
    ],
    helpArticleKey: "FLOW_REQUIRED_FIELD",
  },
  {
    id: "APEX_PERMISSION",
    category: "APEX",
    failureType: "apex_permission",
    label: "Apex Failed — Permission Issue",
    failureLayer: "apex",
    rootCauseHint: "permission_in_apex",
    requires: (s) => s.hasApex && s.hasPermission,
    headline: (d) =>
      `Apex trigger${d.apexClass ? ` (${d.apexClass})` : ""} failed — insufficient access during DML`,
    narrative: (d) =>
      "An Apex trigger or class attempted a DML operation but the running user lacks the required object or field permissions. Check sharing, FLS, and whether the code uses 'with sharing'.",
    quickChecks: (d) => [
      d.apexClass ? `Review class/trigger: ${d.apexClass}` : "Find the failing class in the debug log stack trace",
      "Verify object and field permissions for the running user",
      "Check if the trigger updates fields hidden by Field-Level Security",
    ],
    helpArticleKey: "APEX_PERMISSION",
  },
  {
    id: "FLOW_NULL_RECORD",
    category: "FLOW",
    failureType: "flow_null_record",
    label: "Flow Failed — Record Not Found",
    failureLayer: "flow",
    rootCauseHint: "null_record_in_flow",
    requires: (s) => s.hasFlow && (s.hasNullPointer || /no records matched/i.test(s.text) || /record not found/i.test(s.text)),
    headline: (d) =>
      `Flow "${d.flowName || "Unknown"}" failed — Get Records returned no rows`,
    narrative: (d) =>
      "A Get Records element returned zero rows, and a downstream element tried to use the empty result. Add a Decision to handle the no-records path.",
    quickChecks: (d) => [
      "Debug the flow and verify Get Records filters match existing data",
      "Add a Decision: 'Get Records found rows?' before Update Records",
      "Store Get Records with 'When no records are returned' → null-safe handling",
    ],
    helpArticleKey: "FLOW_NULL_RECORD",
  },
];

const EXTRACTION_PATTERNS = {
  flowName: [
    /['']([^'']+)['']\s+process\s+failed/i,
    /because the\s+['']([^'']+)['']\s+process/i,
    /(?:the flow|flow)\s+["']([^"']+)["']/i,
    /flow\s+["']([^"']+)["']\s+failed/i,
    /interview\s+(?:for|of)\s+["']?([A-Za-z0-9_-]+)/i,
    /Flow:\s*([A-Za-z0-9_]+)/i,
    /process\s+["']([^"']+)["']/i,
    /fault occurred in\s+["']?([A-Za-z0-9_]+)/i,
  ],
  flowElement: [
    /(?:element|step)\s+["']([^"']+)["']/i,
    /at\s+element\s+["']?([A-Za-z0-9_]+)/i,
    /(?:Update Records|Create Records|Get Records|Assignment|Decision|Screen):\s*([A-Za-z0-9_]+)/i,
    /FLOW_ELEMENT[_\s]+([A-Za-z0-9_]+)/i,
  ],
  fieldName: [
    /MALFORMED_ID:\s*([^:]+?):\s*id value/i,
    /field[s]?\s+["']([^"']+)["']/i,
    /cannot update the field\s+([A-Za-z0-9_]+)/i,
    /fields?:\s*([A-Za-z0-9_,\s__]+?)(?:\.|$|\s+are|\s+is)/i,
    /\[([A-Za-z0-9_]+)\]/,
    /column\s+["']?([A-Za-z0-9_]+)/i,
  ],
  invalidValue: [
    /id value of incorrect type:\s*(\S+)/i,
    /incorrect type:\s*([^\s.]+)/i,
  ],
  validationRuleName: [
    /FIELD_CUSTOM_VALIDATION_EXCEPTION:\s*([^:]+):/i,
    /validation rule\s+["']([^"']+)["']/i,
  ],
  apexClass: [
    /Class\.([A-Za-z0-9_]+)/,
    /Trigger\.([A-Za-z0-9_]+)/,
    /([A-Za-z0-9_]+)\.trigger/i,
    /apex trigger\s+([A-Za-z0-9_]+)/i,
  ],
  objectName: [
    /object\s+["']([^"']+)["']/i,
    /entity type:\s*([A-Za-z0-9_]+)/i,
    /on\s+([A-Za-z0-9_]+)\s+object/i,
  ],
};

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function detectSignals(text) {
  const has = (patterns) => patterns.some((p) => p.test(text));
  return {
    text,
    hasFlow: has(FLOW_SIGNALS),
    hasPermission: has(PERMISSION_SIGNALS),
    hasValidation: has(VALIDATION_SIGNALS),
    hasRequiredField: /required field|REQUIRED_FIELD_MISSING|must be filled/i.test(text),
    hasApex: /apex|trigger|DMLException|CANNOT_INSERT_UPDATE/i.test(text),
    hasNullPointer: /null pointer|de-reference a null|no records matched/i.test(text),
    hasIntegration: /callout|http request|external service|named credential|timeout/i.test(text),
    hasApproval: /approval process|submit for approval|approval request/i.test(text),
    hasEmail: /email alert|single email|messaging/i.test(text),
    hasSharing: /sharing|row cause|insufficient access on cross-reference/i.test(text),
    hasDuplicate: /DUPLICATE_VALUE|duplicate/i.test(text),
    hasGovernor: /governor limit|too many SOQL|CPU time limit/i.test(text),
    hasCpq: /SBQQ|CPQ|steelbrick/i.test(text),
    hasLock: /unable to lock|record is locked/i.test(text),
    hasMalformedId: /MALFORMED_ID|malformed_id|id value of incorrect type|incorrect type/i.test(text),
    hasLicense: /FUNCTIONALITY_NOT_ENABLED|user license|license type|not enabled for your user license|license limit exceeded|requires an additional license|edition does not include|feature is not available|not available in your salesforce edition|installed package requires/i.test(
      text
    ),
  };
}

function extractDetails(errorText, objectHint) {
  const text = String(errorText || "");
  return {
    flowName: firstMatch(text, EXTRACTION_PATTERNS.flowName),
    flowElement: firstMatch(text, EXTRACTION_PATTERNS.flowElement),
    fieldName: firstMatch(text, EXTRACTION_PATTERNS.fieldName)?.trim(),
    invalidValue: firstMatch(text, EXTRACTION_PATTERNS.invalidValue),
    validationRuleName: firstMatch(text, EXTRACTION_PATTERNS.validationRuleName),
    apexClass: firstMatch(text, EXTRACTION_PATTERNS.apexClass),
    objectName: firstMatch(text, EXTRACTION_PATTERNS.objectName) || objectHint || null,
  };
}

function matchCompositeScenario(signals) {
  for (const scenario of COMPOSITE_SCENARIOS) {
    if (scenario.requires(signals)) return scenario;
  }
  return null;
}

/**
 * Full investigation of an error message.
 */
function investigateError(errorText, context, objectHint) {
  const text = String(errorText || "");
  const signals = detectSignals(text);
  const details = extractDetails(text, objectHint);
  const composite = matchCompositeScenario(signals);

  let investigation;

  if (composite) {
    investigation = {
      scenarioId: composite.id,
      headline: composite.headline(details),
      narrative: composite.narrative(details),
      failureLayer: composite.failureLayer,
      rootCauseHint: composite.rootCauseHint,
      suggestedActions: composite.quickChecks(details),
      helpArticleKey: composite.helpArticleKey,
      ...details,
      secondaryCategories: getSecondaryCategories(signals, composite.category),
    };

    return {
      classification: {
        category: composite.category,
        failureType: composite.failureType,
        label: composite.label,
        confidence: 0.88,
        matchedPatterns: [composite.id],
        isComposite: true,
        secondaryCategories: investigation.secondaryCategories,
      },
      investigation,
      signals,
      details,
    };
  }

  // Single-category fallbacks with richer narrative
  const single = buildSingleCategoryInvestigation(signals, details, context);
  return single;
}

function getSecondaryCategories(signals, primary) {
  const secondary = [];
  if (signals.hasPermission && primary !== "PERMISSION") secondary.push("PERMISSION");
  if (signals.hasFlow && primary !== "FLOW") secondary.push("FLOW");
  if (signals.hasValidation && primary !== "VALIDATION") secondary.push("VALIDATION");
  if (signals.hasApex && primary !== "APEX") secondary.push("APEX");
  return secondary;
}

function buildSingleCategoryInvestigation(signals, details, context) {
  const classification = classifyError(signals.text, context);

  let headline = `${classification.label} detected`;
  let narrative = `Salesforce returned an error classified as ${classification.label}. Review the message and debug logs for specifics.`;
  let suggestedActions = [];
  let helpArticleKey = classification.category;
  let failureLayer = classification.failureType;

  if (signals.hasIntegration) {
    classification.category = "INTEGRATION";
    classification.failureType = "integration";
    classification.label = "Integration / Callout";
    headline = "External integration or HTTP callout failed";
    narrative = "A callout to an external system failed—timeout, auth, or invalid endpoint response.";
    helpArticleKey = "INTEGRATION";
    failureLayer = "integration";
  } else if (signals.hasApproval) {
    classification.category = "APPROVAL";
    classification.failureType = "approval";
    classification.label = "Approval Process";
    headline = "Approval process blocked the action";
    narrative = "The record could not be submitted or updated due to an approval process rule or pending approval.";
    helpArticleKey = "APPROVAL";
    failureLayer = "approval";
  } else if (signals.hasGovernor) {
    classification.category = "APEX";
    classification.failureType = "governor_limit";
    classification.label = "Governor Limit Exceeded";
    headline = "Apex governor limit exceeded";
    narrative = "Custom Apex or a Flow with too many SOQL/DML/CPU operations hit a platform limit.";
    helpArticleKey = "GOVERNOR_LIMIT";
    failureLayer = "apex";
  } else if (signals.hasEmail) {
    classification.category = "EMAIL";
    classification.failureType = "email";
    classification.label = "Email Alert Failure";
    helpArticleKey = "EMAIL";
    failureLayer = "automation";
  } else if (signals.hasSharing) {
    classification.category = "SHARING";
    classification.failureType = "sharing";
    classification.label = "Sharing / OWD Issue";
    headline = "Sharing or organization-wide defaults blocked access";
    narrative =
      "The user cannot access or transfer this record due to sharing rules, OWD, or record ownership.";
    helpArticleKey = "SHARING";
    failureLayer = "security";
    suggestedActions = HELP_ARTICLES.SHARING?.quickChecks || [];
  } else if (signals.hasLicense) {
    classification.category = "LICENSE";
    classification.failureType = "license";
    classification.label = "License / Edition";
    headline = "Feature or user license does not allow this action";
    narrative =
      "The org edition, user license type, or installed package license does not include this feature. An admin must assign the correct license or enable the capability.";
    helpArticleKey = "LICENSE";
    failureLayer = "licensing";
    suggestedActions = HELP_ARTICLES.LICENSE?.quickChecks || [];
  } else if (signals.hasValidation && !signals.hasFlow) {
    classification.category = "VALIDATION";
    classification.failureType = "validation_rule";
    classification.label = "Validation Rule";
    headline = details.validationRuleName
      ? `Validation rule "${details.validationRuleName}" blocked the save`
      : "Validation rule blocked the save";
    narrative =
      "A validation rule on the object rejected the field values. Review the rule formula and update the record or adjust the rule.";
    helpArticleKey = "VALIDATION";
    failureLayer = "validation";
    suggestedActions = HELP_ARTICLES.VALIDATION?.quickChecks || [];
  } else if (signals.hasPermission && !signals.hasFlow && !signals.hasApex) {
    classification.category = "PERMISSION";
    classification.failureType = "permission";
    classification.label = "Permission / Access";
    headline = details.fieldName
      ? `Insufficient access to field "${details.fieldName}"`
      : "Insufficient permissions to perform this action";
    narrative =
      "The running user lacks object permissions, field-level security, sharing access, or a required custom permission.";
    helpArticleKey = "PERMISSION";
    failureLayer = "security";
    suggestedActions = HELP_ARTICLES.PERMISSION?.quickChecks || [];
  } else if (signals.hasFlow && details.flowName) {
    headline = `Flow "${details.flowName}" failed`;
    narrative = `The flow "${details.flowName}"${details.flowElement ? ` failed at element "${details.flowElement}"` : ""}. Use Flow Debug to trace the exact step.`;
    helpArticleKey = "FLOW";
    failureLayer = "flow";
  } else if (signals.hasFlow && signals.hasMalformedId) {
    headline = `Flow failed — invalid ID value${details.fieldName ? ` on "${details.fieldName}"` : ""}`;
    narrative = `A Flow/process tried to save an invalid Salesforce ID${details.invalidValue ? ` ("${details.invalidValue}")` : ""} into a lookup field.`;
    helpArticleKey = "FLOW_MALFORMED_ID";
    failureLayer = "flow";
  } else if (signals.hasMalformedId) {
    classification.category = "DATA";
    classification.failureType = "malformed_id";
    classification.label = "Invalid ID Value";
    headline = `Invalid Salesforce ID${details.fieldName ? ` on field "${details.fieldName}"` : ""}`;
    narrative = `A lookup or ID field received a value that is not a valid 15/18-character Salesforce record ID.`;
    helpArticleKey = "MALFORMED_ID";
    failureLayer = "data";
  }

  const investigation = {
    scenarioId: null,
    headline,
    narrative,
    failureLayer,
    rootCauseHint: classification.failureType,
    suggestedActions,
    helpArticleKey,
    ...details,
    secondaryCategories: getSecondaryCategories(signals, classification.category),
  };

  return { classification, investigation, signals, details };
}

module.exports = {
  investigateError,
  extractDetails,
  detectSignals,
  matchCompositeScenario,
  COMPOSITE_SCENARIOS,
};
