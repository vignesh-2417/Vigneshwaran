/**
 * FixForce – DOM injection helpers for manual extension E2E tests.
 *
 * HOW TO USE
 * 1. Open a Salesforce tab (any lightning page).
 * 2. Open DevTools → Console.
 * 3. Copy ONE function block below and paste into the console, then press Enter.
 * 4. Within ~1 second FixForce should: badge "!", OS notification, popup alert.
 * 5. Run FF_clearInjectedErrors() before the next test.
 *
 * These simulate what the content script reads from the page.
 * They do NOT replace real save-error tests (popover timing, iframe, etc.).
 */

function FF_injectError(html, role = "alert") {
  FF_clearInjectedErrors();
  const el = document.createElement("div");
  el.id = "fixforce-test-error";
  el.setAttribute("data-fixforce-test", "true");
  el.setAttribute("role", role);
  el.className = "slds-notify slds-notify--error";
  el.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px;max-width:480px;background:#fff;border:2px solid #c23934;";
  el.innerHTML = html;
  document.body.appendChild(el);
  console.log("[FixForce Test] Injected error DOM. Open FixForce popup or wait for notification.");
  return el;
}

function FF_clearInjectedErrors() {
  document.querySelectorAll("[data-fixforce-test]").forEach((n) => n.remove());
  console.log("[FixForce Test] Cleared injected errors.");
}

// ─── TC01: Flow + MALFORMED_ID ───────────────────────────────────────────────
function FF_test_TC01() {
  return FF_injectError(`
    <strong>We hit a snag.</strong><br>
    We can't save this record because the 'test-nex' process failed.<br>
    MALFORMED_ID: D&B Company ID: id value of incorrect type: hihih
  `);
}

// ─── TC02: Flow + Permission ─────────────────────────────────────────────────
function FF_test_TC02() {
  return FF_injectError(`
    We can't save this record because the 'Lead_Assignment' process failed.<br>
    An error occurred at element "Update_Lead".<br>
    INSUFFICIENT_ACCESS: insufficient privileges. Field "OwnerId"
  `);
}

// ─── TC03: Flow + Validation ─────────────────────────────────────────────────
function FF_test_TC03() {
  return FF_injectError(`
    We can't save this record because the 'Opportunity_Auto_Update' process failed.<br>
    FIELD_CUSTOM_VALIDATION_EXCEPTION: Cannot close won without Primary Contact
  `);
}

// ─── TC04: Flow + Required Field ─────────────────────────────────────────────
function FF_test_TC04() {
  return FF_injectError(`
    The flow "Account_Onboarding" failed.<br>
    REQUIRED_FIELD_MISSING: Required fields are missing: [AccountId]
  `);
}

// ─── TC05: Apex + Permission ─────────────────────────────────────────────────
function FF_test_TC05() {
  return FF_injectError(`
    System.DmlException: Update failed.<br>
    Class.AccountShareHandler.line 42<br>
    INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY
  `);
}

// ─── TC06: Noise (should NOT alert) ──────────────────────────────────────────
function FF_test_TC06_noise() {
  const el = document.createElement("div");
  el.id = "fixforce-test-noise";
  el.setAttribute("data-fixforce-test", "true");
  el.style.cssText = "padding:8px;color:#666;";
  el.textContent =
    "Training: We hit a snag during onboarding. MALFORMED_ID example in docs. No process failed.";
  document.body.appendChild(el);
  console.log("[FixForce Test] TC06 noise injected — FixForce should NOT alert within 10s.");
  return el;
}

// ─── TC08: Long error (validation at end) ────────────────────────────────────
function FF_test_TC08() {
  const ids = Array.from({ length: 12 }, (_, i) => `003xx000000000${i + 1}AAA`).join(", ");
  return FF_injectError(`
    We hit a snag. We can't save this record because the 'Bulk_Sync_Contacts' process failed.<br>
    The flow tried to update these records: ${ids}.<br>
    FIELD_CUSTOM_VALIDATION_EXCEPTION: Industry is required when Annual Revenue exceeds 500000
  `);
}

// ─── TC09: Curly apostrophes ─────────────────────────────────────────────────
function FF_test_TC09() {
  return FF_injectError(`
    We hit a snag.<br>
    We can\u2019t save this record because the \u2018Customer_Renewal\u2019 process failed.
  `);
}

console.log(
  "[FixForce] DOM test helpers loaded. Run FF_test_TC01() … FF_test_TC09(), or FF_clearInjectedErrors()."
);
