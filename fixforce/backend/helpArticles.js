/**
 * FixForce – helpArticles.js
 * Curated Salesforce Help articles mapped to error categories and composite scenarios.
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
  FLOW_PERMISSION: {
    title: "Flow Failed Due to Insufficient Access",
    summary:
      "A Flow tried to create or update a record, but the running user lacks object or field-level permissions. Flows running in user context inherit the user's FLS and CRUD access.",
    url: "https://help.salesforce.com/s/articleView?id=sf.flow_distribute_context.htm&type=5",
    setupPath: "Setup → Flows → [Flow] → Run in Context + Field-Level Security",
    quickChecks: [
      "Identify the failing Flow and its Update/Create Records element",
      "Check which fields the flow writes and verify FLS for the running user",
      "Consider running in System Context only if business rules allow, or grant field access via permission set",
      "Review whether a record-triggered flow runs as the user who saved the record",
    ],
    secondaryArticle: {
      title: "Field-Level Security",
      url: "https://help.salesforce.com/s/articleView?id=sf.admin_fls.htm&type=5",
    },
  },
  FLOW_VALIDATION: {
    title: "Flow Blocked by Validation Rule",
    summary:
      "A Flow's DML step was rejected by an active validation rule on the target object. The flow may assign values that violate business rules.",
    url: "https://help.salesforce.com/s/articleView?id=sf.flow_troubleshoot.htm&type=5",
    setupPath: "Setup → Flows → Debug + Object Manager → Validation Rules",
    quickChecks: [
      "Debug the flow and capture field values at the failing DML step",
      "Review validation rules on the object being saved",
      "Adjust flow logic or add decision criteria before the update",
    ],
    secondaryArticle: {
      title: "Create Validation Rules",
      url: "https://help.salesforce.com/s/articleView?id=sf.customize_validations.htm&type=5",
    },
  },
  FLOW_REQUIRED_FIELD: {
    title: "Flow Failed — Required Field Not Set",
    summary:
      "A Flow Create/Update Records element did not populate a required field before save.",
    url: "https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_create.htm&type=5",
    setupPath: "Setup → Flows → [Flow] → Create/Update Records element",
    quickChecks: [
      "Debug the flow and verify all required fields are assigned",
      "Check Get Records returns values for required lookup fields",
      "Map required fields explicitly on the record variable",
    ],
  },
  FLOW_NULL_RECORD: {
    title: "Flow Failed — No Records Found",
    summary:
      "A Get Records element returned zero rows and a downstream step failed on the empty result.",
    url: "https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_get.htm&type=5",
    setupPath: "Setup → Flows → Get Records element",
    quickChecks: [
      "Verify Get Records filters match existing data",
      "Add a Decision branch for when no records are returned",
      "Use 'When no records are returned' output handling",
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
  APEX_PERMISSION: {
    title: "Apex DML Failed — Permission Denied",
    summary:
      "An Apex trigger or class attempted DML but the running user lacks access. Review sharing mode, FLS, and profile permissions.",
    url: "https://help.salesforce.com/s/articleView?id=sf.apex_sharing.htm&type=5",
    setupPath: "Setup → Apex Classes + Profiles / Permission Sets",
    quickChecks: [
      "Check if the class uses 'with sharing' vs 'without sharing'",
      "Verify object and field permissions for the running user",
      "Review whether the trigger updates fields restricted by FLS",
    ],
    secondaryArticle: {
      title: "User Permissions",
      url: "https://help.salesforce.com/s/articleView?id=sf.admin_userperms.htm&type=5",
    },
  },
  GOVERNOR_LIMIT: {
    title: "Apex Governor Limits",
    summary:
      "A transaction exceeded Salesforce limits (SOQL, DML, CPU, heap). Optimize bulk queries and reduce operations in loops.",
    url: "https://help.salesforce.com/s/articleView?id=sf.apex_gov_limits.htm&type=5",
    setupPath: "Developer Console → Logs → Governor Limits tab",
    quickChecks: [
      "Identify SOQL/DML inside loops in the stack trace",
      "Bulkify triggers and flow-invoked Apex",
      "Use collections and single DML operations where possible",
    ],
  },
  INTEGRATION: {
    title: "HTTP Callouts & Named Credentials",
    summary:
      "An external callout failed—authentication, timeout, or invalid response from a connected system.",
    url: "https://help.salesforce.com/s/articleView?id=sf.http_callouts.htm&type=5",
    setupPath: "Setup → Named Credentials / External Services",
    quickChecks: [
      "Verify Named Credential auth and endpoint URL",
      "Check remote site settings allow the external host",
      "Review timeout and retry settings on the callout action",
    ],
  },
  APPROVAL: {
    title: "Approval Processes",
    summary:
      "An approval process prevented the record action—pending approval, recall, or submit criteria not met.",
    url: "https://help.salesforce.com/s/articleView?id=sf.approval_processes.htm&type=5",
    setupPath: "Setup → Approval Processes",
    quickChecks: [
      "Check if the record is locked pending approval",
      "Review entry criteria and approval steps",
      "Verify the user can submit or approve per their role",
    ],
  },
  EMAIL: {
    title: "Email Alerts & Deliverability",
    summary:
      "An email alert or automated email action failed—template, deliverability, or recipient issues.",
    url: "https://help.salesforce.com/s/articleView?id=sf.admin_emailalerts.htm&type=5",
    setupPath: "Setup → Email Alerts / Deliverability",
    quickChecks: [
      "Verify the email template exists and is active",
      "Check org-wide email address and deliverability settings",
      "Confirm recipient fields are populated on the record",
    ],
  },
  SHARING: {
    title: "Sharing Rules & OWD",
    summary:
      "Record visibility blocked access—organization-wide defaults, sharing rules, or manual sharing.",
    url: "https://help.salesforce.com/s/articleView?id=sf.security_sharing_rules.htm&type=5",
    setupPath: "Setup → Sharing Settings",
    quickChecks: [
      "Review OWD for the object (Private vs Public Read/Write)",
      "Check sharing rules and role hierarchy",
      "Verify record owner and team membership",
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
      "Guard relationship fields with null checks in Apex",
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

function getHelpArticle(classification, errorText, context, investigation) {
  const articleKey =
    investigation?.helpArticleKey ||
    classification.failureType?.toUpperCase?.() ||
    classification.category;

  const base =
    HELP_ARTICLES[articleKey] ||
    HELP_ARTICLES[classification.category] ||
    HELP_ARTICLES.UNKNOWN;

  const text = String(errorText || "").toLowerCase();
  const result = {
    ...base,
    failureType: classification.failureType,
    category: classification.category,
    categoryLabel: classification.label,
  };

  // Enrich with investigation-specific headline
  if (investigation?.headline) {
    result.investigationHeadline = investigation.headline;
  }
  if (investigation?.narrative) {
    result.investigationSummary = investigation.narrative;
  }
  if (investigation?.flowName) {
    result.flowName = investigation.flowName;
    result.setupPath = `Setup → Flows → "${investigation.flowName}" → Debug`;
  }
  if (investigation?.flowElement) {
    result.flowElement = investigation.flowElement;
  }
  if (investigation?.fieldName) {
    result.fieldName = investigation.fieldName;
  }
  if (investigation?.suggestedActions?.length) {
    result.quickChecks = investigation.suggestedActions;
  }

  if (classification.category === "FLOW" && /screen/i.test(text)) {
    result.title = "Fix Screen Flow Errors";
    result.summary =
      "Screen Flow failed—often a required screen input, invalid choice, or record variable not populated before the screen step.";
  }

  if (classification.category === "PERMISSION" && /field/i.test(text) && !investigation?.scenarioId) {
    result.title = "Field-Level Security";
    result.url = "https://help.salesforce.com/s/articleView?id=sf.admin_fls.htm&type=5";
    result.setupPath = "Setup → Object Manager → [Object] → Fields → Set Field-Level Security";
  }

  return result;
}

module.exports = { HELP_ARTICLES, getHelpArticle };
