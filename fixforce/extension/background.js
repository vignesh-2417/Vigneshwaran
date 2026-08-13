/**
 * FixForce – background.js (Service Worker, MV3)
 * Handles API calls to backend, stores results in chrome.storage,
 * and manages badge state.
 */

const API_BASE_URL = "http://localhost:3000"; // Change to your deployed backend URL
const MAX_HISTORY_ITEMS = 50;

// ─── Badge Helpers ────────────────────────────────────────────────────────────
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

// ─── API Call ─────────────────────────────────────────────────────────────────
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

// ─── Storage Helpers ──────────────────────────────────────────────────────────
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
  });

  return item;
}

async function setLoadingState(isLoading) {
  await chrome.storage.local.set({ isLoading });
}

async function setErrorState(errorMsg) {
  await chrome.storage.local.set({ isLoading: false, apiError: errorMsg });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
async function handleNewError(errorData) {
  try {
    setBadgeLoading();
    await setLoadingState(true);
    await chrome.storage.local.set({
      apiError: null,
      latestErrorContext: {
        errorText: errorData.errorText,
        context: errorData.context,
        object: errorData.object,
      },
    });

    const analysis = await callAnalyzeAPI(errorData);
    const saved = await saveAnalysis(errorData, analysis);

    setBadgeError();
    await chrome.storage.local.set({ isLoading: false, latestAnalysis: saved });

    // Notify popup if open
    chrome.runtime.sendMessage({
      type: "ANALYSIS_COMPLETE",
      data: saved,
    }).catch(() => {
      // Popup may not be open – ignore
    });
  } catch (err) {
    console.error("[FixForce] Analysis failed:", err);
    setBadgeError();
    await setErrorState(err.message || "Failed to analyze error");
  }
}

// ─── Message Listener ─────────────────────────────────────────────────────────
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
    return true; // async
  }

  if (msg.type === "GET_HISTORY") {
    chrome.storage.local.get("errorHistory", ({ errorHistory = [] }) =>
      sendResponse(errorHistory)
    );
    return true;
  }
});

// ─── Tab update: clear badge when navigating away from SF ────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    const isSalesforce =
      tab.url.includes("salesforce.com") || tab.url.includes("force.com");
    if (!isSalesforce) setBadgeClear();
  }
});

console.log("[FixForce] Background service worker started");
