/**
 * FixForce – errorIntelligence.js
 */
(function (global) {
  "use strict";

  function analyzeLocally(errorText, context, objectHint) {
    if (global.FixForceInvestigator) {
      const result = FixForceInvestigator.investigateError(errorText, context, objectHint);
      return {
        classification: result.classification,
        helpArticle: result.helpArticle,
        investigation: result.investigation,
      };
    }
    return {
      classification: { category: "UNKNOWN", label: "Salesforce Error", confidence: 0.5 },
      helpArticle: {
        title: "Troubleshoot Salesforce Errors",
        summary: "Review the error message and check Setup → Debug Logs.",
        url: "https://help.salesforce.com/s/articleView?id=sf.code_debug_log.htm&type=5",
      },
      investigation: { headline: "Salesforce error detected", narrative: errorText?.slice(0, 300) },
    };
  }

  global.FixForceIntelligence = { analyzeLocally };
})(typeof window !== "undefined" ? window : self);
