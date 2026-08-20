/**
 * FixForce – background.js
 */

const API_BASE_URL = "http://localhost:3000";
const MAX_HISTORY_ITEMS = 50;

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
    });
    setBadgeClear();
    sendResponse({ cleared: true });
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

console.log("[FixForce] Background service worker started");
