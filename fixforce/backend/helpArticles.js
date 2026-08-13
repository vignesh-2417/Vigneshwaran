/**
 * FixForce – helpArticles.js
 * Curated Salesforce Help articles mapped to error categories.
 */

const HELP_ARTICLES = {
  VALIDATION: {
    title: "Create Validation Rules",
    summary:
      "Validation rules enforce business requirements when users save records. Review the rule formula, error message, and which fields must change.",
    url: "https://help.salesforce.com/s/articleView?id=sf.customize_validations.htm&type=5",
    setupPath: "Setup → Object Manager → [Object] → Validation Rules",
    quickChecks: [
      "Identify the validation rule name in the error or debug log",
      "Open the rule and review the formula criteria",
      "Update field values on the record or adjust the rule exception logic",
    ],
  },
  REQUIRED_FIELD: {
    title: "Required Fields & Page Layouts",
    summary:
      "A required field is blank on save. This can come from page layout settings, field-level required flag, or a Flow/Apex requirement.",
    url: "https://help.salesforce.com/s/articleView?id=sf.customize_layoutcreate.htm&type=5",
    setupPath: "Setup → Object Manager → [Object] → Fields & Relationships",
    quickChecks: [
      "Find which field is missing from the error message",
      "Check page layout field properties (Required checkbox)",
      "Verify Flow or Apex isn't clearing the field before save",
    ],
  },
  PERMISSION: {
    title: "User Permissions & Access",
    summary:
      "The running user lacks object, field, or record access. Check profile, permission sets, sharing rules, and field-level security.",
    url: "https://help.salesforce.com/s/articleView?id=sf.admin_userperms.htm&type=5",
    setupPath: "Setup → Users → [User] → Permission Sets / Profile",
    quickChecks: [
      "Confirm object permissions (Read, Create, Edit, Delete)",
      "Review field-level security for fields in the error",
      "Check sharing rules or record ownership if access is record-specific",
    ],
  },
  FLOW: {
    title: "Troubleshoot Flow Errors",
    summary:
      "A Flow failed at runtime—often due to a missing record, null variable, failed DML step, or fault path not handled.",
    url: "https://help.salesforce.com/s/articleView?id=sf.flow_troubleshoot.htm&type=5",
    setupPath: "Setup → Flows → [Flow Name] → Debug",
    quickChecks: [
      "Open the flow and run Debug with the same inputs",
      "Inspect the failing element (Get/Update Records, Assignment, Decision)",
      "Add a fault connector or null-safe logic on variables",
    ],
  },
  APEX: {
    title: "Debug Apex & Triggers",
    summary:
      "Custom Apex (trigger, class, or batch) threw an exception or hit a governor limit. Use debug logs and stack traces to locate the failure.",
    url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5",
    setupPath: "Setup → Debug Logs / Developer Console",
    quickChecks: [
      "Reproduce and capture a debug log for your user",
      "Find the exception type and line number in the stack trace",
      "Check for null references, SOQL in loops, or missing bulk handling",
    ],
  },
  CPQ: {
    title: "Salesforce CPQ Troubleshooting",
    summary:
      "CPQ errors often involve product rules, pricing rules, quote calculations, or missing configuration attributes on quote lines.",
    url: "https://help.salesforce.com/s/articleView?id=sf.cpq_product_rules.htm&type=5",
    setupPath: "Setup → Custom Settings / CPQ Objects (SBQQ__*)",
    quickChecks: [
      "Review CPQ product or pricing rules tied to the quote",
      "Validate required configuration attributes on quote lines",
      "Check subscription/pricing method fields on products",
    ],
  },
  DATA: {
    title: "Data Integrity & Duplicate Rules",
    summary:
      "Duplicate rules, invalid lookups, or malformed IDs blocked the save. Verify related record IDs and matching rules.",
    url: "https://help.salesforce.com/s/articleView?id=sf.duplicate_rules_map_of_reference.htm&type=5",
    setupPath: "Setup → Duplicate Rules / Matching Rules",
    quickChecks: [
      "Check if a duplicate rule blocked the insert/update",
      "Verify lookup/master-detail fields reference valid record IDs",
      "Search for deleted or merged records referenced by the error",
    ],
  },
  LOCK: {
    title: "Record Locking & Concurrent Updates",
    summary:
      "Another process or user holds a lock on the record. Retry after workflows, flows, or batch jobs complete.",
    url: "https://help.salesforce.com/s/articleView?id=sf.overview_locking.htm&type=5",
    setupPath: "Setup → Apex Jobs / Paused Flow Interviews",
    quickChecks: [
      "Wait and retry—the lock is often transient",
      "Check Apex Jobs and paused Flow interviews",
      "Reduce parallel updates to the same parent record",
    ],
  },
  NULL_POINTER: {
    title: "Fix Null Reference Errors in Apex",
    summary:
      "Code accessed a null variable or relationship field. Add null checks before dereferencing sObject fields or query results.",
    url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5",
    setupPath: "Developer Console → Logs",
    quickChecks: [
      "Locate the null line in the Apex stack trace",
      "Guard relationship fields with optional chaining patterns in Apex",
      "Ensure SOQL queries return rows before accessing fields",
    ],
  },
  UNKNOWN: {
    title: "Salesforce Error Logs & Support",
    summary:
      "Start with debug logs and the full error message. Capture the gack ID or fault message before contacting an admin.",
    url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5",
    setupPath: "Setup → Debug Logs",
    quickChecks: [
      "Copy the exact error text and action that triggered it",
      "Enable debug logs for your user and reproduce",
      "Share logs with your Salesforce admin or developer",
    ],
  },
};

/**
 * Pick the best help article for a classified error.
 */
function getHelpArticle(classification, errorText, context) {
  const base = HELP_ARTICLES[classification.category] || HELP_ARTICLES.UNKNOWN;
  const text = String(errorText || "").toLowerCase();

  // Flow-specific sub-articles
  if (classification.category === "FLOW") {
    if (/screen/i.test(text)) {
      return {
        ...base,
        title: "Fix Screen Flow Errors",
        summary:
          "Screen Flow failed—often a required screen input, invalid choice, or record variable not populated before the screen step.",
        quickChecks: [
          "Debug the flow and note which screen element failed",
          "Verify all required screen components have values",
          "Check assignments before the screen set required variables",
        ],
      };
    }
    if (/pause/i.test(text) || context === "flow") {
      return {
        ...base,
        summary:
          "A record-triggered or autolaunched Flow failed during save. Use Flow Debug to trace the failing DML or decision element.",
      };
    }
  }

  // Validation vs workflow confusion
  if (classification.category === "VALIDATION" && /workflow/i.test(text)) {
    return {
      ...base,
      summary:
        "Although 'workflow' appears in the message, this is likely a validation rule blocking the save. Check Validation Rules first, then Process Builder/Flow if rules pass.",
    };
  }

  // Permission + field level
  if (classification.category === "PERMISSION" && /field/i.test(text)) {
    return {
      ...base,
      title: "Field-Level Security",
      summary:
        "The user cannot read or edit a specific field. Review field-level security on the profile or permission set.",
      url: "https://help.salesforce.com/s/articleView?id=sf.admin_fls.htm&type=5",
      setupPath: "Setup → Object Manager → [Object] → Fields → Set Field-Level Security",
    };
  }

  return {
    ...base,
    failureType: classification.failureType,
    category: classification.category,
    categoryLabel: classification.label,
  };
}

module.exports = { HELP_ARTICLES, getHelpArticle };
