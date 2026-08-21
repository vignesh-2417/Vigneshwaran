/**
 * FixForce – investigator.js (browser)
 * Deep error investigation for composite Salesforce failures.
 */
(function (global) {
  "use strict";

  const PERMISSION_SIGNALS = [/INSUFFICIENT_ACCESS/i, /insufficient privileges/i, /insufficient access/i, /no access/i, /permission denied/i, /field-level security/i, /cannot update/i, /not authorized/i, /do not have edit access/i, /custom permission/i];
  const FLOW_SIGNALS = [/flow/i, /interview/i, /FlowRuntime/i, /flow fault/i, /FLOW_ELEMENT/i, /record-triggered flow/i, /process failed/i, /we can't save this record/i, /the flow tried to update/i];
  const VALIDATION_SIGNALS = [/FIELD_CUSTOM_VALIDATION_EXCEPTION/i, /validation rule/i, /validation failed/i, /review the errors on this page/i];
  const LICENSE_SIGNALS = [/FUNCTIONALITY_NOT_ENABLED/i, /user license/i, /license type/i, /not enabled for your user license/i, /license limit exceeded/i, /edition does not include/i, /feature is not available/i, /installed package requires/i];

  const COMPOSITE_SCENARIOS = [
    {
      id: "FLOW_MALFORMED_ID",
      category: "FLOW",
      failureType: "flow_malformed_id",
      label: "Flow Failed — Invalid ID Value",
      helpArticleKey: "FLOW_MALFORMED_ID",
      requires: (s) => s.hasFlow && s.hasMalformedId,
      headline: (d) => `Flow "${d.flowName || "Unknown"}" failed — invalid ID in "${d.fieldName || "lookup field"}"`,
      narrative: (d) => `Process/Flow "${d.flowName || "unknown"}" tried to set an invalid Salesforce ID${d.invalidValue ? ` ("${d.invalidValue}")` : ""} on ${d.fieldName || "a lookup field"}. IDs must be 15/18 characters.`,
      quickChecks: (d) => [
        d.flowName ? `Setup → Flows → "${d.flowName}" → Debug` : "Find the failing flow in Setup → Flows",
        d.fieldName ? `Check value assigned to "${d.fieldName}"` : "Inspect lookup field assignments",
        "Use a valid record ID from Get Records, not free text",
      ],
    },
    {
      id: "FLOW_PERMISSION",
      category: "FLOW",
      failureType: "flow_permission",
      label: "Flow Failed — Permission Issue",
      helpArticleKey: "FLOW_PERMISSION",
      requires: (s) => s.hasFlow && s.hasPermission,
      headline: (d) => `Flow "${d.flowName || "Unknown"}" failed — user lacks access to update ${d.fieldName ? `"${d.fieldName}"` : "a field"}`,
      narrative: (d) => `A Flow${d.flowName ? ` ("${d.flowName}")` : ""}${d.flowElement ? ` at "${d.flowElement}"` : ""} tried to update a record, but the running user does not have sufficient permissions (Field-Level Security or object Edit access).`,
      quickChecks: (d) => [
        d.flowName ? `Setup → Flows → "${d.flowName}" → Debug` : "Setup → Flows → find failed interview",
        d.flowElement ? `Inspect "${d.flowElement}" Update/Create Records fields` : "Find the failing DML element",
        d.fieldName ? `Grant Edit on "${d.fieldName}" via profile or permission set FLS` : "Review FLS for all fields in the DML step",
        "Check if the flow runs in User vs System context",
      ],
    },
    {
      id: "FLOW_VALIDATION",
      category: "FLOW",
      failureType: "flow_validation",
      label: "Flow Failed — Validation Rule",
      helpArticleKey: "FLOW_VALIDATION",
      requires: (s) => s.hasFlow && s.hasValidation,
      headline: (d) => `Flow "${d.flowName || "Unknown"}" failed — validation rule blocked the save`,
      narrative: (d) => `The Flow's DML step was rejected by a validation rule on ${d.objectName || "the target object"}.`,
      quickChecks: (d) => [
        "Debug the flow and note values at the failing Update Records step",
        d.objectName ? `Setup → Object Manager → ${d.objectName} → Validation Rules` : "Review validation rules on the saved object",
        "Adjust flow assignments or validation rule criteria",
      ],
    },
    {
      id: "FLOW_REQUIRED_FIELD",
      category: "FLOW",
      failureType: "flow_required_field",
      label: "Flow Failed — Required Field",
      helpArticleKey: "FLOW_REQUIRED_FIELD",
      requires: (s) => s.hasFlow && s.hasRequiredField,
      headline: (d) => `Flow "${d.flowName || "Unknown"}" failed — required field not set`,
      narrative: (d) => `The Flow did not populate a required field${d.fieldName ? ` ("${d.fieldName}")` : ""} before save.`,
      quickChecks: (d) => [
        "Debug flow and verify assignments before Create/Update Records",
        d.fieldName ? `Assign "${d.fieldName}" before the DML step` : "Map all required fields on the record variable",
      ],
    },
    {
      id: "APEX_PERMISSION",
      category: "APEX",
      failureType: "apex_permission",
      label: "Apex Failed — Permission",
      helpArticleKey: "APEX_PERMISSION",
      requires: (s) => s.hasApex && s.hasPermission,
      headline: (d) => `Apex${d.apexClass ? ` (${d.apexClass})` : ""} failed — insufficient access`,
      narrative: "Apex DML failed because the running user lacks object or field permissions.",
      quickChecks: (d) => [
        d.apexClass ? `Review ${d.apexClass} in debug log` : "Find failing class in stack trace",
        "Verify profile/permission set and FLS",
      ],
    },
  ];

  const HELP_ARTICLES = {
    FLOW_PERMISSION: { title: "Flow Failed Due to Insufficient Access", summary: "Flow DML failed due to missing user permissions.", url: "https://help.salesforce.com/s/articleView?id=sf.flow_distribute_context.htm&type=5", setupPath: "Setup → Flows → Run in Context" },
    FLOW_VALIDATION: { title: "Flow Blocked by Validation Rule", summary: "Flow save rejected by validation rule.", url: "https://help.salesforce.com/s/articleView?id=sf.flow_troubleshoot.htm&type=5", setupPath: "Setup → Flows → Debug" },
    FLOW_REQUIRED_FIELD: { title: "Flow — Required Field Missing", summary: "Flow did not set a required field.", url: "https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_create.htm&type=5", setupPath: "Setup → Flows" },
    APEX_PERMISSION: { title: "Apex DML Permission Denied", summary: "Apex lacked permissions for DML.", url: "https://help.salesforce.com/s/articleView?id=sf.apex_sharing.htm&type=5", setupPath: "Setup → Apex + Profiles" },
    FLOW: { title: "Troubleshoot Flow Errors", summary: "Flow runtime failure.", url: "https://help.salesforce.com/s/articleView?id=sf.flow_troubleshoot.htm&type=5", setupPath: "Setup → Flows → Debug" },
    FLOW_MALFORMED_ID: { title: "Flow Failed — Invalid Lookup ID", summary: "Flow assigned invalid text to a lookup field.", url: "https://help.salesforce.com/s/articleView?id=sf.flow_troubleshoot.htm&type=5", setupPath: "Setup → Flows → Debug" },
    PERMISSION: { title: "User Permissions", summary: "Access denied — check profile, permission sets, FLS, and sharing.", url: "https://help.salesforce.com/s/articleView?id=sf.admin_userperms.htm&type=5", setupPath: "Setup → Users → Permission Sets" },
    VALIDATION: { title: "Validation Rules", summary: "Validation blocked save — review rule formula and field values.", url: "https://help.salesforce.com/s/articleView?id=sf.customize_validations.htm&type=5", setupPath: "Setup → Validation Rules", quickChecks: ["Find the validation rule matching the on-page error message", "Review the rule formula in Setup → Object Manager", "Update field values or deactivate/adjust the rule"] },
    LICENSE: { title: "User Licenses & Feature Availability", summary: "User license or org edition does not include this feature.", url: "https://help.salesforce.com/s/articleView?id=sf.users_license_types.htm&type=5", setupPath: "Setup → Users → License" },
    INTEGRATION: { title: "HTTP Callouts", summary: "External callout failed.", url: "https://help.salesforce.com/s/articleView?id=sf.http_callouts.htm&type=5", setupPath: "Setup → Named Credentials" },
    APPROVAL: { title: "Approval Processes", summary: "Approval blocked action.", url: "https://help.salesforce.com/s/articleView?id=sf.approval_processes.htm&type=5", setupPath: "Setup → Approval Processes" },
    UNKNOWN: { title: "Debug Logs", summary: "Investigate with debug logs.", url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5", setupPath: "Setup → Debug Logs" },
  };

  function trimValidationMsg(msg) {
    if (!msg) return msg;
    let out = String(msg).replace(/^[\s*•-]+/, "").trim();
    const stop = out.match(/\b(View profile|Empty Cache|Setup|Object Manager|Named Credentials)\b/i);
    if (stop && stop.index > 2) out = out.slice(0, stop.index).trim();
    return out.slice(0, 120);
  }

  function firstMatch(text, patterns) {
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  }

  function extractDetails(text, objectHint) {
    return {
      flowName: firstMatch(text, [/['']([^'']+)['']\s+process\s+failed/i, /because the\s+['']([^'']+)['']\s+process/i, /flow\s+["']([^"']+)["']/i]),
      flowElement: firstMatch(text, [/element\s+["']([^"']+)["']/i, /at element\s+["']?([A-Za-z0-9_]+)/i]),
      fieldName: firstMatch(text, [/MALFORMED_ID:\s*([^:]+?):\s*id value/i, /field[s]?\s+["']([^"']+)["']/i, /cannot update the field\s+([A-Za-z0-9_]+)/i]),
      invalidValue: firstMatch(text, [/id value of incorrect type:\s*(\S+)/i]),
      validationRuleName: firstMatch(text, [
        /FIELD_CUSTOM_VALIDATION_EXCEPTION:\s*([^:]+):/i,
        /review the errors on this page[.\s*]*([A-Za-z0-9_\s-]{3,80})/i,
      ]),
      validationMessage: firstMatch(text, [
        /review the errors on this page[.\s*]*(.{3,120})/i,
        /FIELD_CUSTOM_VALIDATION_EXCEPTION:\s*([^:]+):/i,
      ]),
      apexClass: firstMatch(text, [/Class\.([A-Za-z0-9_]+)/, /Trigger\.([A-Za-z0-9_]+)/]),
      objectName: firstMatch(text, [/object\s+["']([^"']+)["']/i]) || objectHint || null,
    };
  }

  function detectSignals(text) {
    const has = (arr) => arr.some((p) => p.test(text));
    return {
      text,
      hasFlow: has(FLOW_SIGNALS),
      hasPermission: has(PERMISSION_SIGNALS),
      hasValidation: has(VALIDATION_SIGNALS),
      hasRequiredField: /required field|REQUIRED_FIELD_MISSING/i.test(text),
      hasApex: /apex|trigger|DMLException/i.test(text),
      hasMalformedId: /MALFORMED_ID|id value of incorrect type/i.test(text),
      hasIntegration: /\bcallout\b|http request|named credential/i.test(text) && !/review the errors on this page/i.test(text),
      hasApproval: /approval process|submit for approval/i.test(text),
      hasLicense: LICENSE_SIGNALS.some((p) => p.test(text)),
    };
  }

  function investigateError(errorText, context, objectHint) {
    const text = String(errorText || "");
    const signals = detectSignals(text);
    const details = extractDetails(text, objectHint);

    for (const scenario of COMPOSITE_SCENARIOS) {
      if (!scenario.requires(signals)) continue;
      const investigation = {
        scenarioId: scenario.id,
        headline: scenario.headline(details),
        narrative: scenario.narrative(details),
        failureLayer: "flow",
        helpArticleKey: scenario.helpArticleKey,
        suggestedActions: scenario.quickChecks(details),
        ...details,
      };
      const helpBase = HELP_ARTICLES[scenario.helpArticleKey] || HELP_ARTICLES.UNKNOWN;
      return {
        classification: {
          category: scenario.category,
          failureType: scenario.failureType,
          label: scenario.label,
          confidence: 0.88,
          isComposite: true,
        },
        investigation,
        helpArticle: { ...helpBase, ...details, quickChecks: investigation.suggestedActions },
      };
    }

    if (signals.hasLicense) {
      return makeSimple("LICENSE", "license", "License / Edition", "Feature or user license does not allow this action.", details);
    }
    if (
      signals.hasValidation ||
      (/we hit a snag/i.test(text) &&
        /review the errors on this page/i.test(text) &&
        !/process failed/i.test(text))
    ) {
      const msg = trimValidationMsg(details.validationMessage || details.validationRuleName);
      const h = msg
        ? `Validation blocked the save: ${msg}`
        : details.validationRuleName
          ? `Validation rule "${details.validationRuleName}" blocked the save`
          : "Validation rule blocked the save";
      return makeSimple("VALIDATION", "validation", "Validation Rule", h, {
        ...details,
        suggestedActions: [
          "Open Setup → Object Manager → [Object] → Validation Rules",
          "Find the active rule matching the error message on the page",
          "Update field values or adjust the rule formula / error condition",
        ],
      });
    }
    if (signals.hasFlow) {
      const h = details.flowName ? `Flow "${details.flowName}" failed` : "Flow runtime error";
      return makeSimple("FLOW", "flow", "Flow Error", h, details);
    }
    if (signals.hasPermission) {
      const h = details.fieldName
        ? `Insufficient access to field "${details.fieldName}"`
        : "Insufficient permissions to perform this action";
      return makeSimple("PERMISSION", "permission", "Permission / Access", h, details);
    }
    if (signals.hasIntegration) {
      return makeSimple("INTEGRATION", "integration", "Integration / Callout", "External callout failed.", details);
    }
    if (signals.hasApproval) {
      return makeSimple("APPROVAL", "approval", "Approval Process", "Approval process blocked the action.", details);
    }

    return makeSimple("UNKNOWN", "unknown", "Unknown Error", "Review debug logs for details.", details);
  }

  function makeSimple(category, failureType, label, narrative, details) {
    const key = category in HELP_ARTICLES ? category : "UNKNOWN";
    const helpBase = HELP_ARTICLES[key];
    const steps = details.suggestedActions?.length ? details.suggestedActions : [];
    return {
      classification: { category, failureType, label, confidence: 0.6 },
      investigation: {
        headline: narrative,
        narrative: helpBase.summary,
        ...details,
        helpArticleKey: key,
        suggestedActions: steps,
      },
      helpArticle: { ...helpBase, ...details, quickChecks: steps.length ? steps : helpBase.quickChecks },
    };
  }

  global.FixForceInvestigator = { investigateError, extractDetails, HELP_ARTICLES };
})(typeof window !== "undefined" ? window : self);
