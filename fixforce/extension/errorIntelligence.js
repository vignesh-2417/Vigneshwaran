/**
 * FixForce – errorIntelligence.js
 * Client-side classification + help articles (works offline / before API responds).
 */
(function (global) {
  "use strict";

  const CLASSIFICATION_RULES = [
    { category: "REQUIRED_FIELD", failureType: "required_field", label: "Required Field Missing", patterns: [/REQUIRED_FIELD_MISSING/i, /required field/i, /field is required/i, /must be filled/i], weight: 10 },
    { category: "VALIDATION", failureType: "validation_rule", label: "Validation Rule", patterns: [/FIELD_CUSTOM_VALIDATION_EXCEPTION/i, /validation rule/i, /validation failed/i, /violates.*validation/i], weight: 10 },
    { category: "PERMISSION", failureType: "permission", label: "Permission / Access", patterns: [/INSUFFICIENT_ACCESS/i, /insufficient privileges/i, /insufficient access/i, /no access/i, /permission denied/i, /unauthorized/i], weight: 10 },
    { category: "LOCK", failureType: "record_lock", label: "Record Lock", patterns: [/unable to lock/i, /record is locked/i, /UNABLE_TO_LOCK_ROW/i], weight: 10 },
    { category: "NULL_POINTER", failureType: "apex_null", label: "Null Reference (Apex)", patterns: [/null pointer/i, /NullPointerException/i, /attempt to de-reference a null/i], weight: 10 },
    { category: "APEX", failureType: "apex", label: "Apex / Trigger", patterns: [/ApexTrigger/i, /System\.LimitException/i, /apex trigger/i, /DMLException/i, /governor limit/i], weight: 9 },
    { category: "FLOW", failureType: "flow", label: "Flow Runtime", patterns: [/flow interview/i, /FlowRuntime/i, /flow fault/i, /the flow failed/i, /record-triggered flow/i, /autolaunched flow/i], weight: 8 },
    { category: "CPQ", failureType: "cpq", label: "Salesforce CPQ", patterns: [/SBQQ/i, /\bCPQ\b/i, /steelbrick/i, /quote line/i, /pricing rule/i], weight: 9 },
    { category: "DATA", failureType: "data_integrity", label: "Data Integrity", patterns: [/DUPLICATE_VALUE/i, /duplicate value/i, /INVALID_CROSS_REFERENCE_KEY/i, /FIELD_INTEGRITY_EXCEPTION/i], weight: 9 },
  ];

  const CONTEXT_BOOSTS = {
    flow: { category: "FLOW", bonus: 5 },
    cpq: { category: "CPQ", bonus: 4 },
    setup: { category: "PERMISSION", bonus: 2 },
  };

  const HELP_ARTICLES = {
    VALIDATION: { title: "Create Validation Rules", summary: "Validation rules enforce business requirements when users save records.", url: "https://help.salesforce.com/s/articleView?id=sf.customize_validations.htm&type=5", setupPath: "Setup → Object Manager → [Object] → Validation Rules" },
    REQUIRED_FIELD: { title: "Required Fields & Page Layouts", summary: "A required field is blank on save.", url: "https://help.salesforce.com/s/articleView?id=sf.customize_layoutcreate.htm&type=5", setupPath: "Setup → Object Manager → [Object] → Fields" },
    PERMISSION: { title: "User Permissions & Access", summary: "The user lacks object, field, or record access.", url: "https://help.salesforce.com/s/articleView?id=sf.admin_userperms.htm&type=5", setupPath: "Setup → Users → Permission Sets" },
    FLOW: { title: "Troubleshoot Flow Errors", summary: "A Flow failed at runtime—use Debug to find the failing element.", url: "https://help.salesforce.com/s/articleView?id=sf.flow_troubleshoot.htm&type=5", setupPath: "Setup → Flows → Debug" },
    APEX: { title: "Debug Apex & Triggers", summary: "Custom Apex threw an exception or hit a governor limit.", url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5", setupPath: "Setup → Debug Logs" },
    CPQ: { title: "Salesforce CPQ Troubleshooting", summary: "CPQ errors involve product/pricing rules or quote configuration.", url: "https://help.salesforce.com/s/articleView?id=sf.cpq_product_rules.htm&type=5", setupPath: "Setup → CPQ Settings" },
    DATA: { title: "Data Integrity & Duplicates", summary: "Duplicate rules or invalid lookups blocked the save.", url: "https://help.salesforce.com/s/articleView?id=sf.duplicate_rules_map_of_reference.htm&type=5", setupPath: "Setup → Duplicate Rules" },
    LOCK: { title: "Record Locking", summary: "Another process holds a lock on this record.", url: "https://help.salesforce.com/s/articleView?id=sf.overview_locking.htm&type=5", setupPath: "Setup → Apex Jobs" },
    NULL_POINTER: { title: "Fix Null Reference in Apex", summary: "Code accessed a null variable or relationship field.", url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5", setupPath: "Developer Console → Logs" },
    UNKNOWN: { title: "Salesforce Debug Logs", summary: "Capture debug logs and the full error message for investigation.", url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5", setupPath: "Setup → Debug Logs" },
  };

  function classifyError(errorText, context) {
    const text = String(errorText || "");
    const scores = new Map();

    for (const rule of CLASSIFICATION_RULES) {
      const matched = rule.patterns.filter((p) => p.test(text));
      if (!matched.length) continue;
      const current = scores.get(rule.category) || { ...rule, score: 0, matchedPatterns: [] };
      current.score += rule.weight + matched.length;
      scores.set(rule.category, current);
    }

    if (context && CONTEXT_BOOSTS[context]) {
      const boost = CONTEXT_BOOSTS[context];
      const existing = scores.get(boost.category) || { category: boost.category, failureType: boost.category.toLowerCase(), label: boost.category, score: 0 };
      existing.score += boost.bonus;
      scores.set(boost.category, existing);
    }

    if (!scores.size) {
      return { category: "UNKNOWN", failureType: "unknown", label: "Unknown Error", confidence: 0.35 };
    }

    const best = [...scores.values()].sort((a, b) => b.score - a.score)[0];
    return {
      category: best.category,
      failureType: best.failureType,
      label: best.label,
      confidence: Math.min(0.95, 0.45 + best.score * 0.04),
    };
  }

  function getHelpArticle(classification) {
    const base = HELP_ARTICLES[classification.category] || HELP_ARTICLES.UNKNOWN;
    return {
      ...base,
      category: classification.category,
      categoryLabel: classification.label,
      failureType: classification.failureType,
    };
  }

  function analyzeLocally(errorText, context) {
    const classification = classifyError(errorText, context);
    const helpArticle = getHelpArticle(classification);
    return { classification, helpArticle };
  }

  global.FixForceIntelligence = { classifyError, getHelpArticle, analyzeLocally, HELP_ARTICLES };
})(typeof window !== "undefined" ? window : self);
