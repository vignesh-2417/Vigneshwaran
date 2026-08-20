/**
 * FixForce – content.js
 * Aggressive Salesforce error detection + immediate on-screen alert modal.
 */

(function () {
  "use strict";

  const SCAN_DEBOUNCE_MS = 80;
  const POLL_INTERVAL_MS = 350;
  const DEDUP_WINDOW_MS = 8000;

  const ERROR_ANCHORS = [
    "We hit a snag",
    "We can't save this record",
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
  let dismissedErrorKey = null;
  let debounceTimer = null;
  let alertModalEl = null;
  let pollTimer = null;

  function normalizeText(text) {
    return String(text || "")
      .replace(/[\u2018\u2019\u2032]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function errorKey(text) {
    return normalizeText(text).slice(0, 280);
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

  function extractFromAnchors(bodyText) {
    const text = normalizeText(bodyText);
    if (!text) return null;

    // Regex anchors (handles curly apostrophes after normalize)
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

  function scanForErrors() {
    const fromSelectors = scanSelectorErrors();
    const fromPage = extractFromAnchors(getPageText());
    const all = [...fromSelectors];
    if (fromPage) all.push(fromPage);
    if (!all.length) return null;
    return [...new Set(all)].sort((a, b) => b.length - a.length)[0];
  }

  function removeAlertModal() {
    if (alertModalEl) {
      alertModalEl.remove();
      alertModalEl = null;
    }
  }

  function showAlertModal(errorText, context) {
    const key = errorKey(errorText);
    if (dismissedErrorKey === key) return;

    const { object } = parseUrl(window.location.href);
    const analysis = window.FixForceIntelligence
      ? FixForceIntelligence.analyzeLocally(errorText, context, object)
      : { classification: { label: "Error" }, helpArticle: { title: "Salesforce Help", url: "https://help.salesforce.com/", summary: errorText.slice(0, 200) }, investigation: { headline: "Salesforce error detected", narrative: errorText.slice(0, 400) } };

    const { classification, helpArticle, investigation } = analysis;
    const headline = investigation?.headline || helpArticle?.title || "Salesforce Error Detected";
    const narrative = investigation?.narrative || helpArticle?.summary || errorText.slice(0, 350);
    const helpUrl = helpArticle?.url || "https://help.salesforce.com/";

    removeAlertModal();

    alertModalEl = document.createElement("div");
    alertModalEl.id = "fixforce-alert-root";
    alertModalEl.setAttribute("role", "alertdialog");
    alertModalEl.setAttribute("aria-modal", "true");
    alertModalEl.innerHTML = `
      <style>
        #fixforce-alert-root {
          position: fixed; inset: 0; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          animation: ffFadeIn 0.2s ease;
        }
        @keyframes ffFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ffPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        #fixforce-alert-root .ff-backdrop {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(2px);
        }
        #fixforce-alert-root .ff-modal {
          position: relative; z-index: 1;
          width: min(480px, calc(100vw - 32px));
          max-height: min(85vh, 640px);
          overflow: auto;
          background: #0f1117;
          border: 1px solid rgba(239,68,68,0.45);
          border-radius: 14px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
          animation: ffPopIn 0.25s ease;
        }
        #fixforce-alert-root .ff-modal-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(90deg, rgba(239,68,68,0.18), rgba(79,142,255,0.08));
          border-bottom: 1px solid #252a38;
        }
        #fixforce-alert-root .ff-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: rgba(239,68,68,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        #fixforce-alert-root .ff-brand { font-size: 13px; font-weight: 800; color: #4f8eff; }
        #fixforce-alert-root .ff-badge {
          margin-left: auto;
          font-size: 10px; padding: 3px 8px; border-radius: 4px;
          background: rgba(239,68,68,0.15); color: #fca5a5;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        #fixforce-alert-root .ff-close {
          background: none; border: none; color: #9ca3af;
          font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px;
        }
        #fixforce-alert-root .ff-body { padding: 16px; color: #e8eaf0; }
        #fixforce-alert-root .ff-headline {
          font-size: 15px; font-weight: 700; line-height: 1.45;
          margin-bottom: 10px; color: #fff;
        }
        #fixforce-alert-root .ff-narrative {
          font-size: 12px; line-height: 1.55; color: #b8bfd0;
          margin-bottom: 12px;
        }
        #fixforce-alert-root .ff-error-box {
          font-size: 11px; line-height: 1.45; color: #fca5a5;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px; padding: 10px;
          margin-bottom: 14px;
          max-height: 100px; overflow: auto;
        }
        #fixforce-alert-root .ff-actions {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        #fixforce-alert-root .ff-btn {
          font-size: 12px; padding: 8px 14px; border-radius: 8px;
          border: none; cursor: pointer; font-weight: 600;
        }
        #fixforce-alert-root .ff-btn-primary {
          background: #4f8eff; color: #fff;
        }
        #fixforce-alert-root .ff-btn-primary:hover { background: #3b7be8; }
        #fixforce-alert-root .ff-btn-secondary {
          background: #1f2330; color: #e8eaf0;
          border: 1px solid #353b4d;
        }
        #fixforce-alert-root .ff-btn-ghost {
          background: transparent; color: #9ca3af;
          border: 1px solid transparent;
        }
      </style>
      <div class="ff-backdrop" data-action="dismiss"></div>
      <div class="ff-modal">
        <div class="ff-modal-header">
          <div class="ff-icon">⚡</div>
          <div>
            <div class="ff-brand">FixForce Alert</div>
            <div style="font-size:10px;color:#9ca3af;">Error detected on this page</div>
          </div>
          <span class="ff-badge">${escapeHtml(classification.label)}</span>
          <button class="ff-close" data-action="dismiss" aria-label="Dismiss">×</button>
        </div>
        <div class="ff-body">
          <div class="ff-headline">${escapeHtml(headline)}</div>
          <div class="ff-narrative">${escapeHtml(narrative)}</div>
          <div class="ff-error-box">${escapeHtml(errorText.slice(0, 500))}</div>
          <div class="ff-actions">
            <a class="ff-btn ff-btn-primary" href="${escapeHtml(helpUrl)}" target="_blank" rel="noopener noreferrer">Open Help Article ↗</a>
            <button class="ff-btn ff-btn-secondary" data-action="analyze">Analyze in FixForce</button>
            <button class="ff-btn ff-btn-ghost" data-action="dismiss">Dismiss</button>
          </div>
        </div>
      </div>
    `;

    const dismiss = () => {
      dismissedErrorKey = key;
      removeAlertModal();
    };

    alertModalEl.querySelectorAll('[data-action="dismiss"]').forEach((el) => {
      el.addEventListener("click", dismiss);
    });

    alertModalEl.querySelector('[data-action="analyze"]')?.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "NEW_ERROR_DETECTED",
        data: buildPayload(errorText, analysis),
      });
      dismiss();
    });

    (document.documentElement || document.body).appendChild(alertModalEl);
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
      localAnalysis: analysis ? {
        category: analysis.classification?.category,
        failureLabel: analysis.classification?.label,
        failureType: analysis.classification?.failureType,
        rootCause: analysis.investigation?.narrative,
        fixSteps: analysis.investigation?.suggestedActions || analysis.helpArticle?.quickChecks || [],
        confidence: analysis.classification?.confidence || 0.7,
        investigation: analysis.investigation,
        helpArticle: analysis.helpArticle,
      } : null,
    };
  }

  function reportError(errorText) {
    const now = Date.now();
    const key = errorKey(errorText);

    if (errorText === lastReportedError && now - lastReportedAt < DEDUP_WINDOW_MS) {
      // Still show modal if not dismissed (user may have missed it)
      if (dismissedErrorKey !== key) showAlertModal(errorText, parseUrl(location.href).context);
      return;
    }

    lastReportedError = errorText;
    lastReportedAt = now;
    dismissedErrorKey = null;

    const { context } = parseUrl(window.location.href);
    const analysis = window.FixForceIntelligence
      ? FixForceIntelligence.analyzeLocally(errorText, context, parseUrl(location.href).object)
      : null;

    // Immediate on-screen alert
    showAlertModal(errorText, context);

    chrome.runtime.sendMessage(
      { type: "NEW_ERROR_DETECTED", data: buildPayload(errorText, analysis) },
      () => { if (chrome.runtime.lastError) { /* ok */ } }
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
        characterData: true,
        attributeFilter: ["class", "aria-live", "role", "style", "hidden"],
      });
    }

    pollTimer = setInterval(runScan, POLL_INTERVAL_MS);

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

  console.log("[FixForce] v1.3 watching", location.hostname);
})();
