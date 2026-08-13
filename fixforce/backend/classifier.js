/**
 * FixForce – classifier.js
 * Rule-based error classification with context-aware boosting.
 */

const CLASSIFICATION_RULES = [
  {
    category: "REQUIRED_FIELD",
    failureType: "required_field",
    label: "Required Field Missing",
    patterns: [
      /REQUIRED_FIELD_MISSING/i,
      /required field/i,
      /field is required/i,
      /must be filled/i,
      /complete this field/i,
    ],
    weight: 10,
  },
  {
    category: "VALIDATION",
    failureType: "validation_rule",
    label: "Validation Rule",
    patterns: [
      /FIELD_CUSTOM_VALIDATION_EXCEPTION/i,
      /validation rule/i,
      /validation failed/i,
      /violates.*validation/i,
      /failed validation/i,
    ],
    weight: 10,
  },
  {
    category: "PERMISSION",
    failureType: "permission",
    label: "Permission / Access",
    patterns: [
      /INSUFFICIENT_ACCESS/i,
      /insufficient privileges/i,
      /insufficient access/i,
      /no access/i,
      /permission denied/i,
      /you do not have access/i,
      /access denied/i,
      /unauthorized/i,
      /entity is deleted/i,
      /cannot be found/i,
    ],
    weight: 10,
  },
  {
    category: "LOCK",
    failureType: "record_lock",
    label: "Record Lock",
    patterns: [
      /unable to lock/i,
      /record is locked/i,
      /UNABLE_TO_LOCK_ROW/i,
      /cannot obtain exclusive access/i,
    ],
    weight: 10,
  },
  {
    category: "NULL_POINTER",
    failureType: "apex_null",
    label: "Null Reference (Apex)",
    patterns: [
      /null pointer/i,
      /NullPointerException/i,
      /System\.NullPointerException/i,
      /attempt to de-reference a null/i,
    ],
    weight: 10,
  },
  {
    category: "APEX",
    failureType: "apex",
    label: "Apex / Trigger",
    patterns: [
      /ApexTrigger/i,
      /System\.LimitException/i,
      /apex trigger/i,
      /Apex.*error/i,
      /trigger handler/i,
      /CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY/i,
      /DMLException/i,
      /QueryException/i,
      /governor limit/i,
    ],
    weight: 9,
  },
  {
    category: "FLOW",
    failureType: "flow",
    label: "Flow Runtime",
    patterns: [
      /flow interview/i,
      /FlowRuntime/i,
      /flow fault/i,
      /an unhandled fault has occurred/i,
      /the flow failed/i,
      /FLOW_ELEMENT/i,
      /screen flow/i,
      /record-triggered flow/i,
      /autolaunched flow/i,
      /we can't save this record because the .?flow.? failed/i,
    ],
    weight: 8,
  },
  {
    category: "CPQ",
    failureType: "cpq",
    label: "Salesforce CPQ",
    patterns: [
      /SBQQ/i,
      /\bCPQ\b/i,
      /steelbrick/i,
      /quote line/i,
      /pricing rule/i,
      /product rule/i,
    ],
    weight: 9,
  },
  {
    category: "DATA",
    failureType: "data_integrity",
    label: "Data Integrity",
    patterns: [
      /DUPLICATE_VALUE/i,
      /duplicate value/i,
      /invalid cross-reference/i,
      /INVALID_CROSS_REFERENCE_KEY/i,
      /FIELD_INTEGRITY_EXCEPTION/i,
      /data.*corrupt/i,
      /invalid id/i,
      /malformed id/i,
    ],
    weight: 9,
  },
];

const CONTEXT_BOOSTS = {
  flow: { category: "FLOW", bonus: 5 },
  cpq: { category: "CPQ", bonus: 4 },
  setup: { category: "PERMISSION", bonus: 2 },
  new_record: { category: "VALIDATION", bonus: 1 },
};

/**
 * Score and classify an error message.
 * @returns {{ category, failureType, label, confidence, matchedPatterns: string[] }}
 */
function classifyError(errorText, context) {
  const text = String(errorText || "");
  const scores = new Map();

  for (const rule of CLASSIFICATION_RULES) {
    const matched = rule.patterns.filter((p) => p.test(text)).map(String);
    if (matched.length === 0) continue;

    const current = scores.get(rule.category) || {
      category: rule.category,
      failureType: rule.failureType,
      label: rule.label,
      score: 0,
      matchedPatterns: [],
    };

    current.score += rule.weight + matched.length;
    current.matchedPatterns.push(...matched);
    scores.set(rule.category, current);
  }

  if (context && CONTEXT_BOOSTS[context]) {
    const boost = CONTEXT_BOOSTS[context];
    const existing = scores.get(boost.category) || {
      category: boost.category,
      failureType:
        CLASSIFICATION_RULES.find((r) => r.category === boost.category)?.failureType ||
        boost.category.toLowerCase(),
      label:
        CLASSIFICATION_RULES.find((r) => r.category === boost.category)?.label ||
        boost.category,
      score: 0,
      matchedPatterns: [],
    };
    existing.score += boost.bonus;
    existing.matchedPatterns.push(`context:${context}`);
    scores.set(boost.category, existing);
  }

  if (scores.size === 0) {
    return {
      category: "UNKNOWN",
      failureType: "unknown",
      label: "Unknown Error",
      confidence: 0.35,
      matchedPatterns: [],
    };
  }

  const best = [...scores.values()].sort((a, b) => b.score - a.score)[0];
  const confidence = Math.min(0.95, 0.45 + best.score * 0.04);

  return {
    category: best.category,
    failureType: best.failureType,
    label: best.label,
    confidence,
    matchedPatterns: [...new Set(best.matchedPatterns)],
  };
}

function preClassify(errorText, context) {
  return classifyError(errorText, context).category;
}

module.exports = { classifyError, preClassify, CLASSIFICATION_RULES };
