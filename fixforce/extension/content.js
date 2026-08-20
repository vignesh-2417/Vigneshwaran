/**
 * FixForce – content.js
 * Detects Salesforce Lightning UI errors in real-time using DOM scanning
 * and MutationObserver. Sends structured error data to background.js.
 */

(function () {
  "use strict";

  // ─── Config ────────────────────────────────────────────────────────────────
  const SCAN_DEBOUNCE_MS = 600;
  const DEDUP_WINDOW_MS = 10_000; // don't re-report same error within 10 s

  // Selectors that Lightning / Aura / LWC uses for error messages
  const ERROR_SELECTORS = [
    // "We hit a snag" / record save errors (Lightning Experience)
    "records-form-error-message",
    "records-record-edit-errors",
    "force-record-edit-errors",
    "runtime_platform_actions-popover-error-panel",
    "runtime_platform_actions-error-message",
    "lightning-messages",
    "lightning-message",
    ".slds-popover__body",
    ".slds-popover .slds-text-color_error",
    ".slds-popover [role='alert']",
    // Aura / generic toast
    "[data-aura-class='forceActionsText']",
    ".forceActionsText",
    // LWC toast
    "lightning-base-toast .slds-notify__content",
    ".slds-notify--toast .slds-notify__content",
    ".slds-notify--error .slds-notify__content",
    // Inline field errors
    ".slds-has-error .slds-form-element__help",
    // Page-level errors
    ".slds-page-header .slds-text-color_error",
    // Generic error containers
    "[role='alert']",
    "[role='alertdialog']",
    ".errorMessage",
    ".slds-text-color_error",
    ".toastMessage",
    // Flow errors
    ".flowRuntimeError",
    // Apex / VF
    ".apex-pages-message-error",
    ".message.errorM3",
    // Modal errors
    ".modal-error",
    "force-error-panel",
    ".uiPanel .errorsList li",
  ];

  // Visible error anchors — used for full-page text fallback (catches LWC popovers)
  const ERROR_ANCHORS = [
    "We hit a snag",
    "We can't save this record",
    "Review the errors on this page",
    "This error occurred:",
    "Give your Salesforce admin these details",
  ];

  // Keywords that signal an actionable error (case-insensitive)
  const ERROR_KEYWORDS = [
    "error",
    "exception",
    "failed",
    "failure",
    "we hit a snag",
    "process failed",
    "malformed_id",
    "incorrect type",
    "insufficient access",
    "insufficient privileges",
    "validation",
    "unable to",
    "cannot",
    "can't save",
    "required field",
    "field_custom_validation",
    "null pointer",
    "unable to lock",
    "duplicate value",
    "invalid cross reference",
    "apex trigger",
    "flow interview",
    "the flow tried",
    "no access",
    "permission denied",
    "unauthorized",
    "exceptioncode",
  ];

  // ─── State ─────────────────────────────────────────────────────────────────
  let lastReportedError = null;
  let lastReportedAt = 0;
  let debounceTimer = null;
  let helpBannerEl = null;

  // ─── URL Parsing ───────────────────────────────────────────────────────────
  function parseUrl(url) {
    const result = { object: null, recordId: null, context: "unknown" };

    try {
      const u = new URL(url);
      const path = u.pathname;

      // /lightning/r/ObjectName/RecordId/view
      const recordMatch = path.match(
        /\/lightning\/r\/([^/]+)\/([a-zA-Z0-9]{15,18})\/view/
      );
      if (recordMatch) {
        result.object = recordMatch[1];
        result.recordId = recordMatch[2];
        result.context = "record_page";
        return result;
      }

      // /lightning/o/ObjectName/...
      const objectMatch = path.match(/\/lightning\/o\/([^/]+)/);
      if (objectMatch) {
        result.object = objectMatch[1];
        result.context = "list_view";
        return result;
      }

      // Flow runtime
      if (path.includes("/flow/")) {
        result.context = "flow";
        const flowMatch = path.match(/\/flow\/([^/?]+)/);
        if (flowMatch) result.object = flowMatch[1];
        return result;
      }

      // Setup
      if (path.includes("/lightning/setup/")) {
        result.context = "setup";
        return result;
      }

      // CPQ
      if (u.hostname.includes("cpq") || path.includes("SBQQ")) {
        result.context = "cpq";
        return result;
      }

      // New record
      const newMatch = path.match(/\/lightning\/o\/([^/]+)\/new/);
      if (newMatch) {
        result.object = newMatch[1];
        result.context = "new_record";
        return result;
      }
    } catch (_) {
      // Ignore URL parse errors
    }

    return result;
  }

  // ─── Error Text Extraction ─────────────────────────────────────────────────
  function extractErrorText(el) {
    // Try aria-label, title, then innerText
    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.innerText ||
      el.textContent ||
      ""
    )
      .trim()
      .replace(/\s+/g, " ");
  }

  function isErrorText(text) {
    if (!text || text.length < 5) return false;
    const lower = text.toLowerCase();
    return (
      ERROR_KEYWORDS.some((kw) => lower.includes(kw)) ||
      ERROR_ANCHORS.some((anchor) => text.includes(anchor))
    );
  }

  /**
   * Fallback: scan visible page text for Salesforce error anchors.
   * Catches "We hit a snag" popovers that don't match element selectors.
   */
  function scanPageTextFallback() {
    const bodyText = document.body?.innerText || "";
    if (!bodyText) return null;

    for (const anchor of ERROR_ANCHORS) {
      const idx = bodyText.indexOf(anchor);
      if (idx === -1) continue;

      // Grab error block from anchor through admin details / error id
      let end = bodyText.length;
      const endMarkers = ["Error ID:", "Click here", "OK", "Close"];
      for (const marker of endMarkers) {
        const mIdx = bodyText.indexOf(marker, idx + anchor.length);
        if (mIdx !== -1 && mIdx < end) end = mIdx + marker.length + 80;
      }

      const chunk = bodyText.slice(idx, Math.min(end, idx + 2500));
      const normalized = chunk.replace(/\s+/g, " ").trim();
      if (normalized.length >= 20) return normalized;
    }

    // MALFORMED_ID without anchor (rare)
    if (/MALFORMED_ID/i.test(bodyText)) {
      const m = bodyText.match(/(.{0,120}MALFORMED_ID.{0,400})/i);
      if (m) return m[1].replace(/\s+/g, " ").trim();
    }

    return null;
  }

  // ─── DOM Scan ─────────────────────────────────────────────────────────────
  function scanForErrors() {
    const found = [];

    for (const selector of ERROR_SELECTORS) {
      try {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((node) => {
          const text = extractErrorText(node);
          if (isErrorText(text)) {
            found.push(text);
          }
        });
      } catch (_) {
        // Bad selector – skip
      }
    }

    const fallback = scanPageTextFallback();
    if (fallback) found.push(fallback);

    // Deduplicate — keep longest message (most detail)
    const unique = [...new Set(found)].sort((a, b) => b.length - a.length);
    return unique[0] || null;
  }

  // ─── In-page Help Banner ───────────────────────────────────────────────────
  function removeHelpBanner() {
    if (helpBannerEl) {
      helpBannerEl.remove();
      helpBannerEl = null;
    }
  }

  function showHelpBanner(errorText, context) {
    if (!window.FixForceIntelligence) return;

    const { object } = parseUrl(window.location.href);
    const { classification, helpArticle, investigation } = FixForceIntelligence.analyzeLocally(
      errorText,
      context,
      object
    );
    removeHelpBanner();

    const title = investigation?.headline || helpArticle.title;
    const summary = investigation?.narrative || helpArticle.summary;

    helpBannerEl = document.createElement("div");
    helpBannerEl.id = "fixforce-help-banner";
    helpBannerEl.setAttribute("role", "alert");
    helpBannerEl.innerHTML = `
      <style>
        #fixforce-help-banner {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2147483646;
          width: min(360px, calc(100vw - 40px));
          background: #111318;
          border: 1px solid rgba(79,142,255,0.35);
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.45);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #e8eaf0;
          overflow: hidden;
          animation: ffSlideIn 0.25s ease;
        }
        @keyframes ffSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #fixforce-help-banner .ff-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: linear-gradient(90deg, rgba(79,142,255,0.15), transparent);
          border-bottom: 1px solid #1f2330;
        }
        #fixforce-help-banner .ff-brand {
          font-size: 12px;
          font-weight: 700;
          color: #4f8eff;
        }
        #fixforce-help-banner .ff-badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(79,142,255,0.12);
          color: #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        #fixforce-help-banner .ff-body { padding: 12px; }
        #fixforce-help-banner .ff-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          line-height: 1.4;
        }
        #fixforce-help-banner .ff-summary {
          font-size: 11px;
          color: #9ca3af;
          line-height: 1.5;
          margin-bottom: 10px;
        }
        #fixforce-help-banner .ff-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        #fixforce-help-banner .ff-btn {
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid rgba(79,142,255,0.35);
          background: rgba(79,142,255,0.12);
          color: #4f8eff;
          cursor: pointer;
          text-decoration: none;
        }
        #fixforce-help-banner .ff-btn:hover { background: rgba(79,142,255,0.22); }
        #fixforce-help-banner .ff-close {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0 4px;
        }
      </style>
      <div class="ff-header">
        <span class="ff-brand">⚡ FixForce</span>
        <span class="ff-badge">${classification.label}</span>
        <button class="ff-close" aria-label="Dismiss">×</button>
      </div>
      <div class="ff-body">
        <div class="ff-title">${title}</div>
        <div class="ff-summary">${summary}</div>
        <div class="ff-actions">
          <a class="ff-btn" href="${helpArticle.url}" target="_blank" rel="noopener noreferrer">Open Help Article ↗</a>
          <button class="ff-btn" data-action="analyze">Analyze with AI</button>
        </div>
      </div>
    `;

    helpBannerEl.querySelector(".ff-close").addEventListener("click", removeHelpBanner);
    helpBannerEl.querySelector('[data-action="analyze"]').addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "NEW_ERROR_DETECTED",
        data: {
          errorText,
          object: parseUrl(window.location.href).object || "Unknown",
          recordId: parseUrl(window.location.href).recordId,
          context,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });
    });

    document.body.appendChild(helpBannerEl);
  }

  // ─── Report Error ──────────────────────────────────────────────────────────
  function reportError(errorText) {
    const now = Date.now();

    // Deduplicate within window
    if (
      errorText === lastReportedError &&
      now - lastReportedAt < DEDUP_WINDOW_MS
    ) {
      return;
    }

    lastReportedError = errorText;
    lastReportedAt = now;

    const url = window.location.href;
    const { object, recordId, context } = parseUrl(url);

    const payload = {
      type: "NEW_ERROR_DETECTED",
      data: {
        errorText,
        object: object || "Unknown",
        recordId: recordId || null,
        context,
        url,
        timestamp: new Date().toISOString(),
        pageTitle: document.title,
      },
    };

    showHelpBanner(errorText, context);

    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        // Extension context may be invalidated on update – silently ignore
      }
    });
  }

  // ─── Debounced Scan ────────────────────────────────────────────────────────
  function debouncedScan() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const errorText = scanForErrors();
      if (errorText) {
        reportError(errorText);
      }
    }, SCAN_DEBOUNCE_MS);
  }

  // ─── MutationObserver ─────────────────────────────────────────────────────
  const observer = new MutationObserver((mutations) => {
    // Only react if something meaningful changed
    const relevant = mutations.some(
      (m) =>
        m.addedNodes.length > 0 ||
        (m.type === "attributes" &&
          (m.attributeName === "class" || m.attributeName === "aria-live"))
    );
    if (relevant) debouncedScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-live", "role"],
  });

  // Initial scan once DOM is ready
  debouncedScan();

  // Listen for popup requesting current error state
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "REQUEST_CURRENT_ERROR") {
      const errorText = scanForErrors();
      const { object, recordId, context } = parseUrl(window.location.href);
      sendResponse({
        errorText,
        url: window.location.href,
        object,
        recordId,
        context,
      });
      // If popup triggered scan and we found an error, report it
      if (msg.triggerAnalysis && errorText) {
        reportError(errorText);
      }
      return true;
    }
  });

  console.log("[FixForce] Content script active on", window.location.hostname);
})();
