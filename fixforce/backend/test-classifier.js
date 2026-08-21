/**
 * Smoke tests for classifier + investigator (composite scenarios).
 */
const { classifyError } = require("./classifier");
const { investigateError } = require("./investigator");
const { buildFallbackResponse } = require("./ai");

const cases = [
  {
    name: "Flow + MALFORMED_ID (test-nex / D&B Company)",
    text: "We hit a snag. We can't save this record because the 'test-nex' process failed. The flow tried to update these records: 0015g00000Hvs8xAAB. This error occurred: MALFORMED_ID: D&B Company ID: id value of incorrect type: hihih.",
    context: "record_page",
    expectScenario: "FLOW_MALFORMED_ID",
    expectFlow: "test-nex",
  },
  {
    text: 'The flow "Update_Account_Status" failed. An error occurred at element "Update_Records_1". INSUFFICIENT_ACCESS: insufficient privileges on cross-reference entity. Field "Status__c"',
    context: "record_page",
    expectScenario: "FLOW_PERMISSION",
    expectLabel: "Flow Failed — Permission Issue",
  },
  {
    name: "Flow + Validation",
    text: 'Flow "Opportunity_Auto_Update" failed. FIELD_CUSTOM_VALIDATION_EXCEPTION: Amount must be positive',
    context: "flow",
    expectScenario: "FLOW_VALIDATION",
  },
  {
    name: "Plain validation",
    text: "FIELD_CUSTOM_VALIDATION_EXCEPTION: Stage cannot be blank",
    context: "record_page",
    expectCategory: "VALIDATION",
  },
  {
    name: "Integration callout",
    text: "We couldn't access the credential(s). You might not have the required permissions, or the named credential might not exist.",
    context: "unknown",
    expectCategory: "INTEGRATION",
  },
];

let passed = 0;
for (const c of cases) {
  const result = investigateError(c.text, c.context, "Account");
  const ok =
    (c.expectScenario && result.investigation.scenarioId === c.expectScenario) ||
    (c.expectCategory && result.classification.category === c.expectCategory) ||
    (c.expectLabel && result.classification.label === c.expectLabel);

  if (ok) passed++;
  console.log(`${ok ? "✓" : "✗"} ${c.name}`);
  console.log(`  Scenario: ${result.investigation.scenarioId || "—"}`);
  console.log(`  Headline: ${result.investigation.headline}`);
  if (result.investigation.flowName) {
    console.log(`  Flow: ${result.investigation.flowName}`);
  }
}

const flowPerm = buildFallbackResponse(
  'The flow "Lead_Assignment" failed at element "Update_Lead". INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY. Field "OwnerId"',
  "record_page",
  "Lead"
);
console.log(`\nAPI-style response:`);
console.log(`  failureLabel: ${flowPerm.failureLabel}`);
console.log(`  investigation.headline: ${flowPerm.investigation.headline}`);
console.log(`  helpArticle: ${flowPerm.helpArticle.title}`);
console.log(`  fixSteps: ${flowPerm.fixSteps.length} steps`);

if (passed !== cases.length) process.exit(1);
console.log(`\n${passed}/${cases.length} investigation tests passed`);
