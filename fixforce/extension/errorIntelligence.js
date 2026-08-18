/**
 * FixForce – errorIntelligence.js
 * Delegates to investigator for deep local analysis.
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
      classification: { category: "UNKNOWN", label: "Unknown", confidence: 0.3 },
      helpArticle: { title: "Debug Logs", url: "https://help.salesforce.com/" },
      investigation: null,
    };
  }

  global.FixForceIntelligence = { analyzeLocally };
})(typeof window !== "undefined" ? window : self);
