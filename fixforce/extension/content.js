/**
 * FixForce – content.js
 * Salesforce error detection — reports to extension (no on-page UI).
 */

(function () {
  "use strict";

  const SCAN_DEBOUNCE_MS = 80;
  const POLL_INTERVAL_MS = 350;
  const DEDUP_WINDOW_MS = 8000;

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
    "FUNCTIONALITY_NOT_ENABLED",
    "user license",
    "not enabled for your user license",
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
      const path = new URL(url).pathname;
      const recordMatch = path.match(/\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})\/view/);
      if (recordMatch) {
        result.object = recordMatch[1];
        result.recordId = recordMatch[2];
        result.context = "record_page";
        return result;
      }
      const objectMatch = path.match(/\/lightning\/o\/([^/]+)/);
      if (objectMatch) {
        result.object = objectMatch[1];
        result.context = path.includes("/new") ? "new_record" : "list_view";
      }
      if (path.includes("/flow/")) result.context = "flow";
    } catch (_) {}
    return result;
  }

  function getPageText() {
    const parts = [];
    if (document.body?.innerText) parts.push(document.body.innerText);
    if (document.documentElement?.innerText) parts.push(document.documentElement.innerText);
    return normalizeText(parts.join("\n"));
  }

  function trimErrorNoise(text) {
    const stopPatterns = [
      /\bView profile\b/i,
      /\bEmpty Cache\b/i,
      /\bHard Reload\b/i,
      /\bSetup\b/i,
      /\bObject Manager\b/i,
      /\bDeveloper Console\b/i,
      /\bWork Item\b/i,
      /\bSalesforce CPQ\b/i,
      /\bApp Launcher\b/i,
      /\bNamed Credentials\b/i,
      /\bPermission Sets\b/i,
    ];
    let out = normalizeText(text);
    for (const p of stopPatterns) {
      const m = out.match(p);
      if (m && m.index > 40) {
        out = out.slice(0, m.index).trim();
      }
    }
    return out.slice(0, 600);
  }

  function extractInlineValidationMessage(text) {
    const t = normalizeText(text);
    const m = t.match(
      /(?:we hit a snag\.?\s*)?review the errors on this page[.\s*]*(.+?)(?:error id:|$)/i
    );
    if (m?.[1]) return trimErrorNoise(m[1]);
    const snag = t.match(/we hit a snag[.\s]+(.{8,220})/i);
    if (snag?.[1] && !/process failed/i.test(snag[1])) {
      return trimErrorNoise(snag[1]);
    }
    return null;
  }

  function extractFromAnchors(bodyText) {
    const text = normalizeText(bodyText);
    if (!text) return null;

    const inlineMsg = extractInlineValidationMessage(text);
    if (inlineMsg) {
      return trimErrorNoise(
        `We hit a snag. Review the errors on this page. ${inlineMsg}`
      );
    }

    const patterns = [
      /We hit a snag[\s\S]{0,400}?(?=Error ID:|View profile|Setup\b|Object Manager|$)/i,
      /We can'?t save this record[\s\S]{0,400}?(?=Error ID:|View profile|Setup\b|Object Manager|$)/i,
      /Review the errors on this page[\s\S]{0,280}?(?=Error ID:|View profile|Setup\b|Object Manager|$)/i,
      /FIELD_CUSTOM_VALIDATION_EXCEPTION[\s\S]{0,400}/i,
      /MALFORMED_ID[\s\S]{0,400}/i,
      /INSUFFICIENT_ACCESS[\s\S]{0,400}/i,
      /FUNCTIONALITY_NOT_ENABLED[\s\S]{0,400}/i,
      /not enabled for your user license[\s\S]{0,300}/i,
      /process failed[\s\S]{0,500}/i,
      /the flow tried to update[\s\S]{0,500}/i,
    ];

    for (const p of patterns) {
      const m = text.match(p);
      if (m) return trimErrorNoise(m[0]);
    }

    for (const anchor of ERROR_ANCHORS) {
      const idx = text.toLowerCase().indexOf(anchor.toLowerCase());
      if (idx === -1) continue;
      const chunk = trimErrorNoise(text.slice(idx, idx + 400));
      if (chunk.length >= 15) return chunk;
    }

    return null;
  }

  function scoreErrorCandidate(text) {
    const t = normalizeText(text);
    if (!t || t.length < 12) return -1;
    let score = 0;
    if (/we hit a snag/i.test(t)) score += 30;
    if (/review the errors on this page/i.test(t)) score += 35;
    if (/FIELD_CUSTOM_VALIDATION_EXCEPTION/i.test(t)) score += 40;
    if (/process failed/i.test(t)) score += 20;
    if (/MALFORMED_ID/i.test(t)) score += 25;
    if (t.length > 900) score -= 40;
    if (t.length > 500) score -= 20;
    if (/\bView profile\b|\bObject Manager\b|\bNamed Credentials\b/i.test(t)) score -= 50;
    if (/^[\s*•-]+[\w]/i.test(t) && t.length < 200) score += 15;
    return score;
  }

  function pickBestError(candidates) {
    const unique = [...new Set(candidates.map((c) => trimErrorNoise(c)).filter(Boolean))];
    if (!unique.length) return null;
    return unique.sort((a, b) => scoreErrorCandidate(b) - scoreErrorCandidate(a))[0];
  }

  function scanSelectorErrors() {
    const found = [];
    const prioritySelectors = [
      "records-form-error-message",
      "records-record-edit-errors",
      "force-record-edit-errors",
      "runtime_platform_actions-popover-error-panel",
      "runtime_platform_actions-error-message",
      "force-error-panel",
      "lightning-messages",
      "lightning-message",
    ];
    const allSelectors = [...new Set([...prioritySelectors, ...ERROR_SELECTORS])];

    for (const selector of allSelectors) {
      try {
        document.querySelectorAll(selector).forEach((node) => {
          if (node.closest?.("[data-fixforce-test]")) return;
          const t = trimErrorNoise(node.innerText || node.textContent);
          if (t.length > 10 && /snag|error|validation|failed|required|access|malformed/i.test(t)) {
            found.push(t);
          }
        });
      } catch (_) {}
    }
    return found;
  }

  function scanForErrors() {
    const fromSelectors = scanSelectorErrors();
    const fromPage = extractFromAnchors(getPageText());
    const all = [...fromSelectors];
    if (fromPage) all.push(fromPage);
    if (!all.length) return null;
    return pickBestError(all);
  }

  function buildPayload(errorText, analysis) {
    const url = window.location.href;
    const { object, recordId, context } = parseUrl(url);
    return {
      errorText,
      object: object || "Unknown",
      recordId,
      context,
      url,
      timestamp: new Date().toISOString(),
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

  function reportError(errorText) {
    const now = Date.now();
    if (errorText === lastReportedError && now - lastReportedAt < DEDUP_WINDOW_MS) {
      return;
    }

    lastReportedError = errorText;
    lastReportedAt = now;

    const parsed = parseUrl(window.location.href);
    const analysis = window.FixForceIntelligence
      ? FixForceIntelligence.analyzeLocally(errorText, parsed.context, parsed.object)
      : null;

    chrome.runtime.sendMessage(
      { type: "NEW_ERROR_DETECTED", data: buildPayload(errorText, analysis) },
      () => {
        if (chrome.runtime.lastError) {
          /* extension context may be unavailable */
        }
      }
    );
  }

  function runScan() {
    const errorText = scanForErrors();
    if (errorText) reportError(errorText);
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
      const parsed = parseUrl(window.location.href);
      sendResponse({ errorText, url: location.href, ...parsed });
      if (msg.triggerAnalysis && errorText) reportError(errorText);
      return true;
    }
    if (msg.type === "FORCE_SCAN") {
      runScan();
      sendResponse({ ok: true });
      return true;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWatching);
  } else {
    startWatching();
  }

  console.log("[FixForce] v1.4.1 watching (extension alerts only)", location.hostname);
})();
