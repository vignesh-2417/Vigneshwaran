/**
 * FixForce – popup.js
 * Controls the popup UI: reads chrome.storage, renders results,
 * handles user actions.
 */

// ─── Category Styling Map ─────────────────────────────────────────────────────
const CATEGORY_META = {
  VALIDATION:     { label: "Validation Rule",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "⚠️" },
  PERMISSION:     { label: "Permission Error", color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "🔒" },
  FLOW:           { label: "Flow Error",       color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  icon: "🔄" },
  APEX:           { label: "Apex Error",       color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   icon: "⚙️" },
  CPQ:            { label: "CPQ Issue",        color: "#f97316", bg: "rgba(249,115,22,0.12)",  icon: "💲" },
  DATA:           { label: "Data Issue",       color: "#22c55e", bg: "rgba(34,197,94,0.12)",   icon: "🗄️" },
  LOCK:           { label: "Record Lock",      color: "#ec4899", bg: "rgba(236,72,153,0.12)",  icon: "🔐" },
  REQUIRED_FIELD: { label: "Required Field",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "📝" },
  NULL_POINTER:   { label: "Null Reference",   color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   icon: "🚫" },
  UNKNOWN:        { label: "Unknown Error",    color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: "❓" },
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $empty      = document.getElementById("empty-state");
const $loading    = document.getElementById("loading-state");
const $result     = document.getElementById("result-state");
const $apiErr     = document.getElementById("api-error-state");
const $apiErrMsg  = document.getElementById("api-error-msg");
const $statusDot  = document.getElementById("status-dot");
const $statusText = document.getElementById("status-text");
const $alertBanner = document.getElementById("extension-alert-banner");
const $alertTitle = document.getElementById("extension-alert-title");
const $alertBody = document.getElementById("extension-alert-body");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showOnly(el) {
  [$empty, $loading, $result, $apiErr].forEach((e) =>
    e.classList.toggle("hidden", e !== el)
  );
  if (el !== $empty) el.classList.add("fade-in");
}

function setStatus(type, text) {
  const dotClasses = { active: "pulse", loading: "loading", error: "error" };
  $statusDot.className = "dot " + (dotClasses[type] || "");
  $statusText.textContent = text;
}

function truncate(str, len = 160) {
  return str && str.length > len ? str.slice(0, len) + "…" : str || "";
}

function formatTimestamp(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (_) {
    return "";
  }
}

function showExtensionAlert(pendingAlert) {
  if (!pendingAlert || !$alertBanner) return;
  $alertTitle.textContent = pendingAlert.headline || "Salesforce error detected";
  $alertBody.textContent =
    pendingAlert.body || truncate(pendingAlert.errorText, 160) || "Click below for analysis and fix steps.";
  $alertBanner.classList.remove("hidden");
}

function hideExtensionAlert(dismiss = true) {
  $alertBanner?.classList.add("hidden");
  if (dismiss) chrome.runtime.sendMessage({ type: "DISMISS_ALERT" });
}

function loadPendingAlert() {
  chrome.storage.local.get(["pendingAlert", "hasUnreadAlert"], ({ pendingAlert, hasUnreadAlert }) => {
    if (hasUnreadAlert && pendingAlert) showExtensionAlert(pendingAlert);
    else $alertBanner?.classList.add("hidden");
  });
}

// ─── Render Functions ─────────────────────────────────────────────────────────
function renderCategoryBadge(category) {
  const meta = CATEGORY_META[category] || CATEGORY_META.UNKNOWN;
  const badge = document.getElementById("category-badge");
  badge.textContent = `${meta.icon} ${meta.label}`;
  badge.style.color = meta.color;
  badge.style.background = meta.bg;
  badge.style.borderColor = meta.color + "44";
}

function renderConfidence(confidence) {
  const pct = Math.round((confidence || 0) * 100);
  document.getElementById("confidence-label").textContent = pct + "%";
  document.getElementById("confidence-fill").style.width = pct + "%";
  // Color the bar
  const fill = document.getElementById("confidence-fill");
  fill.style.background =
    pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
}

function renderContextPills(data) {
  const row = document.getElementById("context-row");
  row.innerHTML = "";

  const pills = [];
  if (data.object && data.object !== "Unknown") {
    pills.push({ icon: "📦", label: data.object, accent: true });
  }
  if (data.context) {
    pills.push({ icon: "📍", label: data.context.replace(/_/g, " "), accent: false });
  }
  if (data.recordId) {
    pills.push({ icon: "🔑", label: data.recordId.slice(0, 6) + "…", accent: false });
  }

  pills.forEach(({ icon, label, accent }) => {
    const pill = document.createElement("span");
    pill.className = "pill" + (accent ? " accent" : "");
    pill.textContent = `${icon} ${label}`;
    row.appendChild(pill);
  });
}

function renderFixSteps(steps) {
  const list = document.getElementById("fix-steps");
  list.innerHTML = "";
  (steps || []).forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "fix-step";
    li.innerHTML = `
      <span class="step-num">${i + 1}</span>
      <span>${step}</span>
    `;
    list.appendChild(li);
  });
}

function renderHelpArticle(data) {
  const card = document.getElementById("help-article-card");
  const article = data.helpArticle;

  if (!article) {
    card.classList.add("hidden");
    return;
  }

  card.classList.remove("hidden");
  document.getElementById("help-article-title").textContent = article.title || "Salesforce Help";
  document.getElementById("help-article-summary").textContent =
    article.summary || "Review the official Salesforce documentation for this error type.";

  const setupPath = document.getElementById("help-setup-path");
  if (article.setupPath) {
    setupPath.textContent = "📍 " + article.setupPath;
    setupPath.classList.remove("hidden");
  } else {
    setupPath.classList.add("hidden");
  }

  const link = document.getElementById("help-article-link");
  link.href = article.url || "https://help.salesforce.com/";

  const secondary = document.getElementById("secondary-help-link");
  if (secondary && article.secondaryArticle?.url) {
    secondary.href = article.secondaryArticle.url;
    secondary.textContent = `Also see: ${article.secondaryArticle.title} ↗`;
    secondary.classList.remove("hidden");
  } else if (secondary) {
    secondary.classList.add("hidden");
  }
}

function renderInvestigation(data) {
  const card = document.getElementById("investigation-card");
  const inv = data.investigation;
  if (!card || !inv?.headline) {
    card?.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  document.getElementById("investigation-headline").textContent = inv.headline;
  document.getElementById("investigation-narrative").textContent =
    inv.narrative || data.rootCause || "";

  const meta = document.getElementById("investigation-meta");
  meta.innerHTML = "";
  const items = [];
  if (inv.flowName) items.push({ icon: "🔄", label: inv.flowName, accent: true });
  if (inv.flowElement) items.push({ icon: "📍", label: inv.flowElement });
  if (inv.fieldName) items.push({ icon: "📝", label: inv.fieldName });
  if (inv.objectName) items.push({ icon: "📦", label: inv.objectName });
  if (inv.invalidValue) items.push({ icon: "⚠️", label: `"${inv.invalidValue}"` });
  if (inv.apexClass) items.push({ icon: "⚙️", label: inv.apexClass });
  items.forEach(({ icon, label, accent }) => {
    const pill = document.createElement("span");
    pill.className = "pill" + (accent ? " accent" : "");
    pill.textContent = `${icon} ${label}`;
    meta.appendChild(pill);
  });
}

function renderFailureType(data) {
  const pill = document.getElementById("failure-type-pill");
  const label = data.failureLabel || data.helpArticle?.categoryLabel;
  if (label) {
    pill.textContent = label.length > 42 ? label.slice(0, 42) + "…" : label;
    pill.classList.remove("hidden");
  } else {
    pill.classList.add("hidden");
  }
}

function renderResult(data) {
  if (!data) { showOnly($empty); return; }

  renderCategoryBadge(data.category);
  renderConfidence(data.confidence);
  renderContextPills(data);
  renderInvestigation(data);
  renderFailureType(data);
  renderHelpArticle(data);

  // Use failure-specific label on badge when composite
  if (data.failureLabel) {
    const badge = document.getElementById("category-badge");
    badge.textContent = "🔎 " + data.failureLabel;
  }

  document.getElementById("error-text-preview").textContent =
    truncate(data.errorText, 180);
  document.getElementById("root-cause").textContent =
    data.rootCause || "No root cause determined.";

  renderFixSteps(data.fixSteps);

  document.getElementById("result-timestamp").textContent =
    data.timestamp ? "Detected at " + formatTimestamp(data.timestamp) : "";

  showOnly($result);
  setStatus("error", `Error detected · ${(CATEGORY_META[data.category] || CATEGORY_META.UNKNOWN).label}`);
  hideExtensionAlert(false);
  chrome.storage.local.set({ hasUnreadAlert: false });
}

// ─── Main Load ────────────────────────────────────────────────────────────────
function loadState() {
  chrome.storage.local.get(
    ["latestAnalysis", "isLoading", "apiError"],
    ({ latestAnalysis, isLoading, apiError }) => {
      if (isLoading) {
        showOnly($loading);
        setStatus("loading", "Analyzing error with AI…");
        return;
      }

      if (apiError) {
        $apiErrMsg.textContent = apiError;
        showOnly($apiErr);
        setStatus("error", "Analysis failed");

        // Show local help article even when API fails
        chrome.storage.local.get("latestErrorContext", ({ latestErrorContext }) => {
          if (latestErrorContext?.errorText && window.FixForceIntelligence) {
            const local = FixForceIntelligence.analyzeLocally(
              latestErrorContext.errorText,
              latestErrorContext.context,
              latestErrorContext.object
            );
            const card = document.getElementById("api-help-article-card");
            card.classList.remove("hidden");
            document.getElementById("api-help-title").textContent = local.investigation?.headline || local.helpArticle.title;
            document.getElementById("api-help-summary").textContent =
              local.investigation?.narrative || `${local.classification.label}: ${local.helpArticle.summary}`;
            document.getElementById("api-help-link").href = local.helpArticle.url;
          }
        });
        return;
      }

      if (latestAnalysis) {
        renderResult(latestAnalysis);
        return;
      }

      showOnly($empty);
      setStatus("active", "Monitoring Salesforce…");
    }
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────
document.getElementById("btn-clear").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_ERRORS" });
  hideExtensionAlert();
  showOnly($empty);
  setStatus("active", "Monitoring Salesforce…");
});

document.getElementById("extension-alert-dismiss")?.addEventListener("click", hideExtensionAlert);

document.getElementById("btn-refresh").addEventListener("click", () => {
  // Ask active tab's content script to scan now
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_CURRENT_ERROR" }, (res) => {
      if (chrome.runtime.lastError || !res?.errorText) {
        loadState();
        return;
      }
      // Trigger analysis via background
      chrome.runtime.sendMessage({
        type: "NEW_ERROR_DETECTED",
        data: {
          errorText: res.errorText,
          url: res.url,
          object: "Unknown",
          context: "manual_scan",
          timestamp: new Date().toISOString(),
        },
      });
      showOnly($loading);
      setStatus("loading", "Analyzing…");
    });
  });
});

document.getElementById("btn-history").addEventListener("click", showHistory);
document.getElementById("footer-history").addEventListener("click", showHistory);

function showHistory() {
  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (history) => {
    if (!history || history.length === 0) {
      alert("No error history yet.");
      return;
    }
    const lines = history
      .slice(0, 10)
      .map(
        (h, i) =>
          `[${i + 1}] ${formatTimestamp(h.timestamp)} · ${h.category || "?"} · ${truncate(h.errorText, 60)}`
      )
      .join("\n");
    alert(`FixForce – Last ${Math.min(history.length, 10)} errors:\n\n${lines}`);
  });
}

// ─── Listen for real-time updates from background ─────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ANALYSIS_COMPLETE") {
    renderResult(msg.data);
  }
  if (msg.type === "ERROR_DETECTED") {
    if (msg.data?.pendingAlert) showExtensionAlert(msg.data.pendingAlert);
    if (msg.data?.analysis) {
      showOnly($loading);
      setStatus("loading", "Analyzing detected error…");
    }
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
function scanActiveTabOnOpen() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "REQUEST_CURRENT_ERROR", triggerAnalysis: true },
      (res) => {
        if (chrome.runtime.lastError || !res?.errorText) return;
        chrome.runtime.sendMessage({
          type: "NEW_ERROR_DETECTED",
          data: {
            errorText: res.errorText,
            url: res.url,
            object: res.object || "Unknown",
            recordId: res.recordId,
            context: res.context || "record_page",
            timestamp: new Date().toISOString(),
          },
        });
        showOnly($loading);
        setStatus("loading", "Analyzing detected error…");
      }
    );
  });
}

loadState();
loadPendingAlert();
scanActiveTabOnOpen();

// Poll every 2 s while popup is open to catch updates
const pollInterval = setInterval(loadState, 2000);
window.addEventListener("unload", () => clearInterval(pollInterval));
