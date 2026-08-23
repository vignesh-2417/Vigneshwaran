/**
 * FixForce – background.js
 */

import { sfSessionFetch } from "./sfSessionService.js";

const API_BASE_URL = "http://localhost:3000";
const MAX_HISTORY_ITEMS = 50;
const NOTIFICATION_ID = "fixforce-latest-error";

function truncate(str, len = 120) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

function setBadgeError() {
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#E53935" });
}

function setBadgeLoading() {
  chrome.action.setBadgeText({ text: "…" });
  chrome.action.setBadgeBackgroundColor({ color: "#FB8C00" });
}

function setBadgeClear() {
  chrome.action.setBadgeText({ text: "" });
}

async function callAnalyzeAPI(errorData) {
  const response = await fetch(`${API_BASE_URL}/analyze-error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorText: errorData.errorText,
      object: errorData.object,
      url: errorData.url,
      context: errorData.context,
      recordId: errorData.recordId,
    }),
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API error ${response.status}: ${errBody}`);
  }
  return response.json();
}

function buildItemFromLocal(errorData) {
  const la = errorData.localAnalysis || {};
  const inv = la.investigation || {};
  return {
    id: crypto.randomUUID(),
    timestamp: errorData.timestamp || new Date().toISOString(),
    errorText: errorData.errorText,
    object: errorData.object,
    context: errorData.context,
    url: errorData.url,
    category: la.category || "UNKNOWN",
    failureLabel: la.failureLabel || "Salesforce Error",
    failureType: la.failureType || "unknown",
    rootCause: la.rootCause || inv.narrative || "Error detected locally.",
    fixSteps: la.fixSteps || inv.suggestedActions || [],
    confidence: la.confidence || 0.7,
    investigation: inv,
    helpArticle: la.helpArticle,
    orgContext: errorData.orgContext || inv.orgContext || null,
    offline: true,
  };
}

function mergeEnrichment(existing, localAnalysis, orgContext) {
  const la = localAnalysis || {};
  const inv = la.investigation || existing.investigation || {};
  const merged = {
    ...existing,
    category: la.category || existing.category,
    failureLabel: la.failureLabel || existing.failureLabel,
    failureType: la.failureType || existing.failureType,
    rootCause: la.rootCause || inv.narrative || existing.rootCause,
    fixSteps: la.fixSteps || inv.suggestedActions || existing.fixSteps,
    confidence: Math.max(existing.confidence || 0, la.confidence || 0),
    investigation: { ...existing.investigation, ...inv, orgContext },
    helpArticle: la.helpArticle || existing.helpArticle,
    orgContext: orgContext || existing.orgContext,
    orgEnriched: true,
  };

  if (inv.headline) merged.investigation.headline = inv.headline;
  if (orgContext?.setupLinks?.length) {
    merged.setupLinks = orgContext.setupLinks;
  }
  return merged;
}

async function saveAnalysis(errorData, analysis) {
  const item = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    errorText: errorData.errorText,
    object: errorData.object,
    context: errorData.context,
    url: errorData.url,
    ...analysis,
  };

  const { errorHistory = [] } = await chrome.storage.local.get("errorHistory");
  const updated = [item, ...errorHistory].slice(0, MAX_HISTORY_ITEMS);

  await chrome.storage.local.set({
    errorHistory: updated,
    latestAnalysis: item,
    lastUpdated: Date.now(),
    isLoading: false,
    apiError: null,
  });

  return item;
}

function showExtensionAlert(errorData, localItem) {
  const headline =
    localItem.investigation?.headline ||
    localItem.failureLabel ||
    localItem.helpArticle?.title ||
    "Salesforce error detected";
  const body =
    localItem.rootCause ||
    localItem.investigation?.narrative ||
    truncate(errorData.errorText, 180);

  const pendingAlert = {
    headline,
    body: truncate(body, 220),
    errorText: errorData.errorText,
    timestamp: errorData.timestamp || new Date().toISOString(),
    object: errorData.object,
    context: errorData.context,
  };

  chrome.storage.local.set({ pendingAlert, hasUnreadAlert: true });

  chrome.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `FixForce: ${truncate(headline, 60)}`,
    message: truncate(body, 240),
    priority: 2,
    requireInteraction: false,
  });

  chrome.runtime
    .sendMessage({ type: "ERROR_DETECTED", data: { pendingAlert, analysis: localItem } })
    .catch(() => {});
}

async function handleNewError(errorData) {
  const { latestAnalysis } = await chrome.storage.local.get("latestAnalysis");
  const isManual = errorData.context === "manual_scan";
  const sameError =
    latestAnalysis?.errorText && latestAnalysis.errorText === errorData.errorText;

  if (!isManual && sameError) {
    return;
  }

  const localItem = buildItemFromLocal(errorData);

  // Save local analysis immediately so popup works without backend
  await chrome.storage.local.set({
    latestAnalysis: localItem,
    isLoading: true,
    apiError: null,
    latestErrorContext: {
      errorText: errorData.errorText,
      context: errorData.context,
      object: errorData.object,
    },
  });
  setBadgeError();
  showExtensionAlert(errorData, localItem);

  try {
    setBadgeLoading();
    const analysis = await callAnalyzeAPI(errorData);
    const saved = await saveAnalysis(errorData, analysis);
    chrome.runtime.sendMessage({ type: "ANALYSIS_COMPLETE", data: saved }).catch(() => {});
  } catch (err) {
    console.warn("[FixForce] API unavailable, using local analysis:", err.message);
    await saveAnalysis(errorData, localItem);
    chrome.runtime.sendMessage({ type: "ANALYSIS_COMPLETE", data: localItem }).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SF_SESSION_FETCH") {
    (async () => {
      try {
        let tabId = sender.tab?.id;
        let tabUrl = sender.tab?.url;
        if (!tabId || !tabUrl) {
          const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = active?.id;
          tabUrl = active?.url;
        }
        const data = await sfSessionFetch(tabId, tabUrl, msg.path);
        sendResponse({ ok: true, data });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "NEW_ERROR_DETECTED") {
    handleNewError(msg.data);
    sendResponse({ received: true });
    return false;
  }

  if (msg.type === "CLEAR_ERRORS") {
    chrome.storage.local.set({
      latestAnalysis: null,
      apiError: null,
      isLoading: false,
      pendingAlert: null,
      hasUnreadAlert: false,
    });
    chrome.notifications.clear(NOTIFICATION_ID);
    setBadgeClear();
    sendResponse({ cleared: true });
    return false;
  }

  if (msg.type === "DISMISS_ALERT") {
    chrome.storage.local.set({ hasUnreadAlert: false });
    chrome.notifications.clear(NOTIFICATION_ID);
    sendResponse({ dismissed: true });
    return false;
  }

  if (msg.type === "ENRICH_LATEST_ANALYSIS") {
    (async () => {
      const { latestAnalysis, isLoading } = await chrome.storage.local.get([
        "latestAnalysis",
        "isLoading",
      ]);
      if (!latestAnalysis || latestAnalysis.errorText !== msg.errorText) {
        sendResponse({ skipped: true });
        return;
      }
      const enriched = {
        ...mergeEnrichment(latestAnalysis, msg.localAnalysis, msg.orgContext),
        orgContext: msg.orgContext || latestAnalysis.orgContext,
        orgEnriched: Boolean(msg.orgContext?.sessionAvailable && msg.localAnalysis),
      };
      await chrome.storage.local.set({
        latestAnalysis: enriched,
        isLoading: isLoading === true ? isLoading : false,
      });
      chrome.runtime
        .sendMessage({ type: "ANALYSIS_COMPLETE", data: enriched })
        .catch(() => {});
      sendResponse({ enriched: true });
    })();
    return true;
  }

  if (msg.type === "GET_LATEST") {
    chrome.storage.local.get(
      ["latestAnalysis", "isLoading", "apiError"],
      (data) => sendResponse(data)
    );
    return true;
  }

  if (msg.type === "GET_HISTORY") {
    chrome.storage.local.get("errorHistory", ({ errorHistory = [] }) =>
      sendResponse(errorHistory)
    );
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("force.com")) {
    chrome.tabs.sendMessage(tabId, { type: "FORCE_SCAN" }).catch(() => {});
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId !== NOTIFICATION_ID) return;
  chrome.notifications.clear(NOTIFICATION_ID);
  chrome.action.openPopup?.().catch(() => {});
});

chrome.notifications.onClosed.addListener((notificationId) => {
  if (notificationId === NOTIFICATION_ID) {
    chrome.storage.local.set({ hasUnreadAlert: false });
  }
});

console.log("[FixForce] Background service worker started");
