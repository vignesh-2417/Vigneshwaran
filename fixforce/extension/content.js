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

  const PRIORITY_SELECTORS = [
    "records-form-error-message",
    "records-record-edit-errors",
    "force-record-edit-errors",
    "runtime_platform_actions-popover-error-panel",
    "runtime_platform_actions-error-message",
    "force-error-panel",
    "lightning-messages",
    "lightning-message",
    ".slds-form-element__help",
    ".slds-text-color--error",
    ".slds-text-color_error",
    ".slds-popover_error .slds-popover__body",
    ".slds-popover--error .slds-popover__body",
  ];

  const ERROR_SELECTORS = [
    ...PRIORITY_SELECTORS,
    ".slds-popover__body",
    ".slds-popover",
    ".slds-notify--error",
    ".slds-notify__content",
    "[role='alert']",
    "[role='alertdialog']",
    ".toastMessage",
    ".flowRuntimeError",
  ];

  const UI_NOISE_STOP = [
    /\bView profile\b/i,
    /\bEmpty Cache\b/i,
    /\bHard Reload\b/i,
    /\bObject Manager\b/i,
    /\bDeveloper Console\b/i,
    /\bWork Item\b/i,
    /\bSalesforce CPQ\b/i,
    /\bApp Launcher\b/i,
    /\bNamed Credentials\b/i,
    /\bPermission Sets\b/i,
    /\bError ID:\b/i,
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

  function trimErrorNoise(text) {
    let out = normalizeText(text);
    if (!out) return "";

    for (const p of UI_NOISE_STOP) {
      const m = out.match(p);
      if (m && m.index > 20) {
        out = out.slice(0, m.index).trim();
      }
    }

    // Only trim "Setup" when it looks like nav chrome, not mid-sentence
    const setup = out.match(/\bSetup\b/i);
    if (setup && setup.index > 50) {
      out = out.slice(0, setup.index).trim();
    }

    return out.slice(0, 600);
  }

  function isLikelyErrorText(text, fromPriority = false) {
    const t = normalizeText(text);
    if (!t || t.length < 8) return false;
    if (fromPriority && t.length <= 400) return true;
    return /snag|review the errors|field_custom|validation|failed|required|insufficient|malformed|process failed|can'?t save|license|functionality_not_enabled/i.test(
      t
    );
  }

  /** Walk light DOM + open shadow roots (Salesforce LWC). */
  function queryAllDeep(selector, root = document, limit = 40) {
    const results = [];
    const visited = new Set();

    function walk(node) {
      if (!node || results.length >= limit) return;

      if (node.nodeType === Node.ELEMENT_NODE) {
        try {
          node.querySelectorAll(selector).forEach((el) => {
            if (!visited.has(el)) {
              visited.add(el);
              results.push(el);
            }
          });
        } catch (_) {}

        if (node.shadowRoot) walk(node.shadowRoot);

        for (const child of node.children || []) {
          walk(child);
          if (results.length >= limit) return;
        }
      } else if (node instanceof Document || node instanceof DocumentFragment) {
        for (const child of node.children || []) {
          walk(child);
          if (results.length >= limit) return;
        }
      }
    }

    walk(root);
    return results;
  }

  function getVisibleText(node) {
    if (!node) return "";
    const t = node.innerText || node.textContent || "";
    if (!t.trim() && node.shadowRoot) {
      return node.shadowRoot.innerText || node.shadowRoot.textContent || "";
    }
    return t;
  }

  function scanVisibleSnagPopovers() {
    const found = [];
    const popovers = queryAllDeep(
      ".slds-popover, .slds-popover_error, .slds-popover--error, [class*='popover-error']",
      document,
      15
    );
    for (const pop of popovers) {
      const style = window.getComputedStyle(pop);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const t = trimErrorNoise(getVisibleText(pop));
      if (/we hit a snag|review the errors on this page/i.test(t)) {
        found.push(t);
      }
    }
    return found;
  }

  function extractInlineValidationMessage(text) {
    const t = normalizeText(text);
    const review = t.match(
      /(?:we hit a snag\.?\s*)?review the errors on this page[.\s*]*(.{1,220})/i
    );
    if (review?.[1]) {
      const msg = trimErrorNoise(review[1]);
      if (msg) {
        return trimErrorNoise(`We hit a snag. Review the errors on this page. ${msg}`);
      }
    }

    const snagOnly = t.match(/we hit a snag[.\s]+(.{8,220})/i);
    if (snagOnly?.[1] && !/process failed/i.test(snagOnly[1])) {
      const msg = trimErrorNoise(snagOnly[1]);
      if (msg && !/review the errors on this page/i.test(msg)) {
        return trimErrorNoise(`We hit a snag. ${msg}`);
      }
    }

    return null;
  }

  function extractFromAnchors(bodyText) {
    const text = normalizeText(bodyText);
    if (!text) return null;

    const inline = extractInlineValidationMessage(text);
    if (inline) return inline;

    const patterns = [
      /We hit a snag[\s\S]{0,350}?(?=Error ID:|View profile|Object Manager|$)/i,
      /We can'?t save this record[\s\S]{0,350}?(?=Error ID:|View profile|Object Manager|$)/i,
      /Review the errors on this page[\s\S]{0,220}?(?=Error ID:|View profile|Object Manager|$)/i,
      /FIELD_CUSTOM_VALIDATION_EXCEPTION[\s\S]{0,350}/i,
      /MALFORMED_ID[\s\S]{0,350}/i,
      /INSUFFICIENT_ACCESS[\s\S]{0,350}/i,
      /FUNCTIONALITY_NOT_ENABLED[\s\S]{0,350}/i,
      /process failed[\s\S]{0,450}/i,
    ];

    for (const p of patterns) {
      const m = text.match(p);
      if (m) return trimErrorNoise(m[0]);
    }

    for (const anchor of ERROR_ANCHORS) {
      const idx = text.toLowerCase().indexOf(anchor.toLowerCase());
      if (idx === -1) continue;
      const chunk = trimErrorNoise(text.slice(idx, idx + 350));
      if (chunk.length >= 15) return chunk;
    }

    return null;
  }

  function scoreErrorCandidate(text) {
    const t = normalizeText(text);
    if (!t || t.length < 8) return -1;
    let score = 0;
    if (/we hit a snag/i.test(t)) score += 40;
    if (/review the errors on this page/i.test(t)) score += 45;
    if (/FIELD_CUSTOM_VALIDATION_EXCEPTION/i.test(t)) score += 40;
    if (/process failed/i.test(t)) score += 20;
    if (/MALFORMED_ID/i.test(t)) score += 25;
    if (t.length <= 220) score += 15;
    if (t.length > 900) score -= 50;
    if (t.length > 500) score -= 25;
    if (/\bView profile\b|\bObject Manager\b|\bNamed Credentials\b/i.test(t)) score -= 60;
    return score;
  }

  function pickBestError(candidates) {
    const unique = [...new Set(candidates.map((c) => trimErrorNoise(c)).filter(Boolean))];
    if (!unique.length) return null;
    return unique.sort((a, b) => scoreErrorCandidate(b) - scoreErrorCandidate(a))[0];
  }

  function scanSelectorErrors() {
    const found = [];
    const seen = new Set();

    for (const selector of ERROR_SELECTORS) {
      const isPriority = PRIORITY_SELECTORS.includes(selector);
      const nodes = isPriority ? queryAllDeep(selector, document, 25) : [];
      const list = nodes.length
        ? nodes
        : Array.from(document.querySelectorAll(selector));

      for (const node of list) {
        if (node.closest?.("[data-fixforce-test]")) continue;
        const t = trimErrorNoise(getVisibleText(node));
        if (!isLikelyErrorText(t, isPriority)) continue;
        if (seen.has(t)) continue;
        seen.add(t);
        found.push(t);
      }
    }

    return found;
  }

  function scanForErrors() {
    const fromPopovers = scanVisibleSnagPopovers();
    const fromSelectors = scanSelectorErrors();
    const fromPage = extractFromAnchors(document.body?.innerText || "");
    const all = [...fromPopovers, ...fromSelectors];
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

  function reportError(errorText, force = false) {
    const now = Date.now();
    if (!force && errorText === lastReportedError && now - lastReportedAt < DEDUP_WINDOW_MS) {
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
    if (!errorText) {
      lastReportedError = null;
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
        attributeFilter: ["class", "aria-live", "role", "hidden", "aria-hidden"],
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

  console.log("[FixForce] v1.4.2 watching", location.hostname);
})();
