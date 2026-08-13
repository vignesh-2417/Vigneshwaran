/**
 * Quick smoke tests for classifier + help articles (no API key needed).
 */
const { classifyError } = require("./classifier");
const { getHelpArticle } = require("./helpArticles");
const { buildFallbackResponse } = require("./ai");

const cases = [
  {
    name: "Validation rule",
    text: "FIELD_CUSTOM_VALIDATION_EXCEPTION: Amount must be greater than 0",
    context: "record_page",
    expect: "VALIDATION",
  },
  {
    name: "Flow fault",
    text: "An unhandled fault has occurred in this flow",
    context: "flow",
    expect: "FLOW",
  },
  {
    name: "Permission",
    text: "INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY",
    context: "record_page",
    expect: "PERMISSION",
  },
  {
    name: "Required field",
    text: "Required fields are missing: [Name]",
    context: "new_record",
    expect: "REQUIRED_FIELD",
  },
];

let passed = 0;
for (const c of cases) {
  const result = classifyError(c.text, c.context);
  const ok = result.category === c.expect;
  if (ok) passed++;
  console.log(`${ok ? "✓" : "✗"} ${c.name}: ${result.category} (${result.label})`);
  const article = getHelpArticle(result, c.text, c.context);
  console.log(`  → Help: ${article.title}`);
}

const fallback = buildFallbackResponse(
  "FIELD_CUSTOM_VALIDATION_EXCEPTION: Stage cannot be blank",
  "record_page"
);
console.log(`\nFallback category: ${fallback.category}, help: ${fallback.helpArticle.title}`);

if (passed !== cases.length) process.exit(1);
console.log(`\n${passed}/${cases.length} classifier tests passed`);
