/**
 * FixForce – content.js
 * Salesforce error detection — reports to extension (no on-page UI).
 */

(function () {
  "use strict";

  const SCAN_DEBOUNCE_MS = 80;
  const POLL_INTERVAL_MS = 350;

  const ERROR_ANCHORS = [
    "We hit a snag",
    "We can't save this record",
    "Review the errors on this page",
    "This error occurred:",
    "Give your Salesforce admin these details",
    "process failed",
    "MALFORMED_ID",
    "FIELD_CUSTOM_VALIDATION_EXCEPTION",
    "INSUFFICIENT_ACCESS",
  ];

  const ERROR_SELECTORS = [
    "records-form-error-message",
    "records-record-edit-errors",
    "force-record-edit-errors",
    "runtime_platform_actions-popover-error-panel",
    "runtime_platform_actions-error-message",
    "lightning-messages",
    "lightning-message",
    ".slds-popover__body",
    ".slds-popover",
    ".slds-notify--error",
    ".slds-notify__content",
    "[role='alert']",
    "[role='alertdialog']",
    ".slds-text-color_error",
    ".toastMessage",
    ".flowRuntimeError",
    "force-error-panel",
  ];

  let lastReportedError = null;
  let lastReportedAt = 0;
  let debounceTimer = null;

  function normalizeText(text) {
    return String(text || "")
      .replace(/[\u2018\u2019\u2032]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseUrl(url) {
    const result = { object: null, recordId: null, context: "unknown" };
    try {
      const full = String(url || "");
      const path = new URL(full).pathname;

      const recordMatch =
        path.match(/\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})(?:\/|$)/) ||
        full.match(/\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})(?:\/|$)/);
      if (recordMatch) {
        result.object = recordMatch[1];
        result.recordId = recordMatch[2];
        result.context = path.includes("/edit") ? "record_edit" : "record_page";
        return result;
      }

      const objectMatch =
        path.match(/\/lightning\/o\/([^/]+)/) || full.match(/\/lightning\/o\/([^/]+)/);
      if (objectMatch) {
        result.object = objectMatch[1];
        result.context = path.includes("/new") ? "new_record" : "list_view";
      }
      if (path.includes("/flow/") || full.includes("/flow/")) result.context = "flow";
    } catch (_) {}

    if (!result.object) {
      result.object = detectObjectFromPage();
    }
    if (!result.recordId) {
      result.recordId = detectRecordIdFromPage();
    }
    return result;
  }

  function detectObjectFromPage() {
    const attrEl = document.querySelector("[data-object-api-name]");
    if (attrEl?.getAttribute("data-object-api-name")) {
      return attrEl.getAttribute("data-object-api-name");
    }
    const href = window.location.href;
    const m = href.match(/\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})/);
    return m?.[1] || null;
  }

  function detectRecordIdFromPage() {
    const href = window.location.href;
    const m = href.match(/\/lightning\/r\/[^/]+\/([a-zA-Z0-9]{15,18})/);
    if (m) return m[1];
    const recEl = document.querySelector("[record-id]");
    const rid = recEl?.getAttribute("record-id");
    if (rid && /^[a-zA-Z0-9]{15,18}$/.test(rid)) return rid;
    return null;
  }

  function getPageText() {
    const parts = [];
    if (document.body?.innerText) parts.push(document.body.innerText);
    if (document.documentElement?.innerText) parts.push(document.documentElement.innerText);
    return normalizeText(parts.join("\n"));
  }

  function extractFromAnchors(bodyText) {
    const text = normalizeText(bodyText);
    if (!text) return null;

    const patterns = [
      /We hit a snag[\s\S]{0,2200}?(?=Error ID:|$)/i,
      /We can'?t save this record[\s\S]{0,2200}?(?=Error ID:|$)/i,
      /Review the errors on this page[\s\S]{0,1500}/i,
      /MALFORMED_ID[\s\S]{0,600}/i,
      /FIELD_CUSTOM_VALIDATION_EXCEPTION[\s\S]{0,600}/i,
      /INSUFFICIENT_ACCESS[\s\S]{0,600}/i,
      /process failed[\s\S]{0,1200}/i,
      /the flow tried to update[\s\S]{0,1200}/i,
    ];

    for (const p of patterns) {
      const m = text.match(p);
      if (m) return normalizeText(m[0]);
    }

    for (const anchor of ERROR_ANCHORS) {
      const idx = text.toLowerCase().indexOf(anchor.toLowerCase());
      if (idx === -1) continue;
      const chunk = text.slice(idx, idx + 2200);
      if (chunk.length >= 15) return chunk;
    }

    return null;
  }

  function scanSelectorErrors() {
    const found = [];
    for (const selector of ERROR_SELECTORS) {
      try {
        document.querySelectorAll(selector).forEach((node) => {
          const t = normalizeText(node.innerText || node.textContent);
          if (t.length > 10) found.push(t);
        });
      } catch (_) {}
    }
    return found;
  }

  function pageShowsValidationUI() {
    const text = getPageText();
    return /we hit a snag/i.test(text) && /review the errors on this page/i.test(text);
  }

  function extractInlineValidationError() {
    const candidates = [];

    const popoverSelectors = [
      "runtime_platform_actions-popover-error-panel",
      "runtime_platform_actions-error-message",
      "records-record-edit-errors",
      "force-record-edit-errors",
      "records-form-error-message",
      ".slds-popover__body",
      "[role='alertdialog']",
      "[role='alert']",
    ];

    for (const selector of popoverSelectors) {
      try {
        document.querySelectorAll(selector).forEach((node) => {
          const t = normalizeText(node.innerText || node.textContent);
          if (
            t.length > 10 &&
            /we hit a snag|review the errors on this page/i.test(t)
          ) {
            candidates.push(t);
          }
        });
      } catch (_) {}
    }

    const fromAnchors = extractFromAnchors(getPageText());
    if (
      fromAnchors &&
      /we hit a snag|review the errors on this page/i.test(fromAnchors)
    ) {
      candidates.push(fromAnchors);
    }

    if (!candidates.length) return null;
    return candidates.sort((a, b) => b.length - a.length)[0];
  }

  function scoreErrorCandidate(text) {
    const t = normalizeText(text);
    let score = 0;
    if (/we hit a snag/i.test(t) && /review the errors on this page/i.test(t)) score += 1000;
    if (/FIELD_CUSTOM_VALIDATION_EXCEPTION/i.test(t)) score += 900;
    if (/INSUFFICIENT_ACCESS/i.test(t)) score += 700;
    if (pageShowsValidationUI() && /MALFORMED_ID/i.test(t)) score -= 800;
    if (pageShowsValidationUI() && /process failed/i.test(t)) score -= 400;
    score += Math.min(t.length, 300);
    return score;
  }

  function scanForErrors() {
    const inlineValidation = extractInlineValidationError();
    if (inlineValidation) return inlineValidation;

    const fromSelectors = scanSelectorErrors();
    const fromPage = extractFromAnchors(getPageText());
    const all = [...fromSelectors];
    if (fromPage) all.push(fromPage);
    if (!all.length) return null;
    return [...new Set(all)].sort((a, b) => scoreErrorCandidate(b) - scoreErrorCandidate(a))[0];
  }

  function buildPageContext() {
    const parsed = parseUrl(window.location.href);
    parsed.hasValidationUI = pageShowsValidationUI();
    return parsed;
  }

  function buildPayload(errorText, analysis, orgContext) {
    const url = window.location.href;
    const { object, recordId, context } = buildPageContext();
    return {
      errorText,
      object: object || "Unknown",
      recordId,
      context,
      url,
      timestamp: new Date().toISOString(),
      orgContext: orgContext || null,
      localAnalysis: analysis
        ? {
            category: analysis.classification?.category,
            failureLabel: analysis.classification?.label,
            failureType: analysis.classification?.failureType,
            rootCause: analysis.investigation?.narrative,
            fixSteps:
              analysis.investigation?.suggestedActions || analysis.helpArticle?.quickChecks || [],
            confidence: analysis.classification?.confidence || 0.7,
            investigation: analysis.investigation,
            helpArticle: analysis.helpArticle,
          }
        : null,
    };
  }

  function enrichAnalysisLocally(errorText, parsed) {
    let analysis = window.FixForceIntelligence
      ? FixForceIntelligence.analyzeLocally(errorText, parsed.context, parsed.object)
      : null;
    if (analysis && window.FixForceOrgInvestigator?.mergeOrgIntoAnalysis) {
      // no-op until org context arrives
    }
    return analysis;
  }

  async function fetchOrgContext(errorText, parsed) {
    if (!window.FixForceOrgInvestigator?.investigateOrg) return null;
    const timeout = FixForceOrgInvestigator.ENRICH_TIMEOUT_MS || 4000;
    try {
      return await Promise.race([
        FixForceOrgInvestigator.investigateOrg(errorText, parsed),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout)),
      ]);
    } catch (_) {
      return null;
    }
  }

  function sendOrgEnrichment(errorText, orgContext) {
    if (!orgContext) return;

    let mergedAnalysis = null;
    if (
      orgContext.sessionAvailable &&
      window.FixForceOrgInvestigator?.mergeOrgIntoAnalysis &&
      window.FixForceIntelligence
    ) {
      const parsed = buildPageContext();
      const base = FixForceIntelligence.analyzeLocally(errorText, parsed.context, parsed.object);
      mergedAnalysis = FixForceOrgInvestigator.mergeOrgIntoAnalysis(base, orgContext);
    }

    chrome.runtime.sendMessage(
      {
        type: "ENRICH_LATEST_ANALYSIS",
        errorText,
        orgContext,
        localAnalysis: mergedAnalysis,
      },
      () => {
        if (chrome.runtime.lastError) {
          /* extension context may be unavailable */
        }
      }
    );
  }

  function reportError(errorText, force = false) {
    if (!force && errorText === lastReportedError) {
      return;
    }

    lastReportedError = errorText;
    lastReportedAt = Date.now();

    const parsed = buildPageContext();
    const analysis = enrichAnalysisLocally(errorText, parsed);

    chrome.runtime.sendMessage(
      { type: "NEW_ERROR_DETECTED", data: buildPayload(errorText, analysis, null) },
      () => {
        if (chrome.runtime.lastError) {
          /* extension context may be unavailable */
        }
      }
    );

    fetchOrgContext(errorText, parsed).then((orgContext) => {
      if (orgContext) sendOrgEnrichment(errorText, orgContext);
      else {
        sendOrgEnrichment(errorText, {
          sessionAvailable: false,
          sessionError: "Org lookup timed out. Stay on the Salesforce tab and try Analyze Now.",
        });
      }
    });
  }

  function runScan() {
    const errorText = scanForErrors();
    if (!errorText) {
      lastReportedError = null;
      lastReportedAt = 0;
      return;
    }
    reportError(errorText);
  }

  function debouncedScan() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runScan, SCAN_DEBOUNCE_MS);
  }

  function startWatching() {
    runScan();

    const observer = new MutationObserver(() => debouncedScan());
    const root = document.documentElement || document.body;
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "aria-live", "role", "hidden"],
      });
    }

    setInterval(runScan, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) runScan();
    });
    window.addEventListener("focus", runScan);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "REQUEST_CURRENT_ERROR") {
      const errorText = scanForErrors();
      const parsed = buildPageContext();
      sendResponse({ errorText, url: location.href, ...parsed });
      if (msg.triggerAnalysis && errorText) reportError(errorText, true);
      return true;
    }
    if (msg.type === "FORCE_SCAN") {
      const errorText = scanForErrors();
      if (errorText) reportError(errorText, true);
      sendResponse({ ok: true, errorText });
      return true;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWatching);
  } else {
    startWatching();
  }

  console.log("[FixForce] v1.5.1 watching (org session via background)", location.hostname);
})();
