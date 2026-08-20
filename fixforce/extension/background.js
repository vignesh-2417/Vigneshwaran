/**
 * FixForce – background.js
 */

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
    rootCause: la.rootCause || la.investigation?.narrative || "Error detected locally.",
    fixSteps: la.fixSteps || [],
    confidence: la.confidence || 0.7,
    investigation: la.investigation,
    helpArticle: la.helpArticle,
    offline: true,
  };
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
