/**
 * FixForce – 10 hard-level investigation test cases.
 *
 * Run: npm test
 * Or:  node test-hard-cases.js
 *
 * These tests validate the investigator/classifier logic (no Salesforce org required).
 * Pair with fixforce/TEST_CASES.md for full Salesforce + extension E2E steps.
 */

const { investigateError } = require("./investigator");

/** @typedef {{
 *   id: string;
 *   name: string;
 *   text: string;
 *   context?: string;
 *   objectHint?: string;
 *   expectScenario?: string | null;
 *   expectCategory?: string;
 *   expectLabel?: string;
 *   expectFlow?: string;
 *   expectField?: string;
 *   expectInvalidValue?: string;
 *   expectApexClass?: string;
 *   expectNoScenario?: boolean;
 *   expectHeadlineIncludes?: string;
 *   minFixSteps?: number;
 * }} HardCase */

/** @type {HardCase[]} */
const HARD_CASES = [
  {
    id: "TC01",
    name: "Flow + MALFORMED_ID (popover / D&B Company)",
    text:
      "We hit a snag. We can't save this record because the 'test-nex' process failed. " +
      "The flow tried to update these records: 0015g00000Hvs8xAAB. " +
      "This error occurred: MALFORMED_ID: D&B Company ID: id value of incorrect type: hihih.",
    context: "record_page",
    objectHint: "Account",
    expectScenario: "FLOW_MALFORMED_ID",
    expectFlow: "test-nex",
    expectField: "D&B Company ID",
    expectInvalidValue: "hihih.",
    minFixSteps: 2,
  },
  {
    id: "TC02",
    name: "Flow + Permission (FLS on OwnerId)",
    text:
      "We hit a snag. We can't save this record because the 'Lead_Assignment' process failed. " +
      'An error occurred at element "Update_Lead". ' +
      "INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY: insufficient access rights on cross-reference id. " +
      'Field "OwnerId" is not editable for this user.',
    context: "record_page",
    objectHint: "Lead",
    expectScenario: "FLOW_PERMISSION",
    expectFlow: "Lead_Assignment",
    expectField: "OwnerId",
    minFixSteps: 3,
  },
  {
    id: "TC03",
    name: "Flow + Validation Rule",
    text:
      "We can't save this record because the 'Opportunity_Auto_Update' process failed. " +
      "FIELD_CUSTOM_VALIDATION_EXCEPTION: Cannot close won without Primary Contact: []",
    context: "record_page",
    objectHint: "Opportunity",
    expectScenario: "FLOW_VALIDATION",
    expectFlow: "Opportunity_Auto_Update",
    minFixSteps: 2,
  },
  {
    id: "TC04",
    name: "Flow + Required Field missing",
    text:
      "The flow \"Account_Onboarding\" failed. " +
      "REQUIRED_FIELD_MISSING: Required fields are missing: [AccountId]",
    context: "flow",
    objectHint: "Contact",
    expectScenario: "FLOW_REQUIRED_FIELD",
    expectFlow: "Account_Onboarding",
    expectField: "AccountId",
    minFixSteps: 2,
  },
  {
    id: "TC05",
    name: "Apex trigger + Permission (DmlException)",
    text:
      "Apex trigger AccountShareHandler failed on Account update. " +
      "System.DmlException: Update failed. First exception on row 0; " +
      "first error: INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY, " +
      "insufficient access rights on cross-reference id. " +
      "Class.AccountShareHandler.line 42, column 1",
    context: "record_page",
    objectHint: "Account",
    expectScenario: "APEX_PERMISSION",
    expectApexClass: "AccountShareHandler",
    minFixSteps: 2,
  },
  {
    id: "TC06",
    name: "Noise text — must NOT match composite flow failure",
    text:
      "Chatter training post: Discuss lookup fields and page layouts with your admin. " +
      "Quarterly review only — no save was attempted on this record.",
    context: "record_page",
    objectHint: "Account",
    expectNoScenario: true,
    expectCategory: "UNKNOWN",
  },
  {
    id: "TC07",
    name: "Dedupe fixture — same text as TC01 (logic regression)",
    text:
      "We hit a snag. We can't save this record because the 'test-nex' process failed. " +
      "MALFORMED_ID: D&B Company ID: id value of incorrect type: hihih.",
    context: "record_page",
    objectHint: "Account",
    expectScenario: "FLOW_MALFORMED_ID",
    expectFlow: "test-nex",
  },
  {
    id: "TC08",
    name: "Long error block — validation signal at tail",
    text:
      "We hit a snag. We can't save this record because the 'Bulk_Sync_Contacts' process failed. " +
      "The flow tried to update these records: " +
      "003xx0000000001AAA, 003xx0000000002AAA, 003xx0000000003AAA, 003xx0000000004AAA, " +
      "003xx0000000005AAA, 003xx0000000006AAA, 003xx0000000007AAA, 003xx0000000008AAA, " +
      "003xx0000000009AAA, 003xx0000000010AAA, 003xx0000000011AAA, 003xx0000000012AAA. " +
      "FIELD_CUSTOM_VALIDATION_EXCEPTION: Industry is required when Annual Revenue exceeds 500000",
    context: "record_page",
    objectHint: "Contact",
    expectScenario: "FLOW_VALIDATION",
    expectFlow: "Bulk_Sync_Contacts",
  },
  {
    id: "TC09",
    name: "Curly apostrophe normalization (Unicode) — E2E via content script",
    text:
      "We hit a snag.\n" +
      "We can't save this record because the 'Customer_Renewal' process failed.\n" +
      "Give your Salesforce admin these details.",
    context: "record_page",
    objectHint: "Account",
    expectFlow: "Customer_Renewal",
    // Classifier may stay UNKNOWN; flow headline extraction is what we verify here.
    expectHeadlineIncludes: "Customer_Renewal",
  },
  {
    id: "TC10",
    name: "Multi-signal stored error (background / popup payload shape)",
    text:
      "We can't save this record because the 'test-nex' process failed. " +
      "MALFORMED_ID: D&B Company ID: id value of incorrect type: hihih. " +
      "Error ID: 1234567890-12345 (-1234567890)",
    context: "record_page",
    objectHint: "Account",
    expectScenario: "FLOW_MALFORMED_ID",
    expectFlow: "test-nex",
    expectField: "D&B Company ID",
  },
];

function assertCase(c, result) {
  const inv = result.investigation;
  const cls = result.classification;
  const errors = [];

  if (c.expectScenario) {
    if (inv.scenarioId !== c.expectScenario) {
      errors.push(`scenarioId: expected ${c.expectScenario}, got ${inv.scenarioId}`);
    }
  }

  if (c.expectNoScenario && inv.scenarioId) {
    errors.push(`expected no composite scenario, got ${inv.scenarioId}`);
  }

  if (c.expectCategory && cls.category !== c.expectCategory) {
    errors.push(`category: expected ${c.expectCategory}, got ${cls.category}`);
  }

  if (c.expectLabel && cls.label !== c.expectLabel) {
    errors.push(`label: expected ${c.expectLabel}, got ${cls.label}`);
  }

  if (c.expectFlow && inv.flowName !== c.expectFlow) {
    errors.push(`flowName: expected ${c.expectFlow}, got ${inv.flowName}`);
  }

  if (c.expectField && inv.fieldName !== c.expectField) {
    errors.push(`fieldName: expected ${c.expectField}, got ${inv.fieldName}`);
  }

  if (c.expectInvalidValue && inv.invalidValue !== c.expectInvalidValue) {
    errors.push(`invalidValue: expected ${c.expectInvalidValue}, got ${inv.invalidValue}`);
  }

  if (c.expectApexClass && inv.apexClass !== c.expectApexClass) {
    errors.push(`apexClass: expected ${c.expectApexClass}, got ${inv.apexClass}`);
  }

  if (c.expectHeadlineIncludes && !inv.headline?.includes(c.expectHeadlineIncludes)) {
    errors.push(`headline should include "${c.expectHeadlineIncludes}", got: ${inv.headline}`);
  }

  if (c.minFixSteps) {
    const steps = inv.suggestedActions?.length || 0;
    if (steps < c.minFixSteps) {
      errors.push(`suggestedActions: expected >= ${c.minFixSteps}, got ${steps}`);
    }
  }

  if (!inv.headline || inv.headline.length < 10) {
    errors.push("headline missing or too short");
  }

  return errors;
}

function run() {
  console.log("FixForce hard test cases (investigator)\n" + "=".repeat(50));

  let passed = 0;
  const failures = [];

  for (const c of HARD_CASES) {
    const result = investigateError(c.text, c.context || "unknown", c.objectHint);
    const errors = assertCase(c, result);
    const ok = errors.length === 0;

    if (ok) passed++;
    else failures.push({ id: c.id, name: c.name, errors });

    console.log(`${ok ? "✓" : "✗"} [${c.id}] ${c.name}`);
    console.log(`    scenario: ${result.investigation.scenarioId || "—"}`);
    console.log(`    headline: ${result.investigation.headline}`);
    if (result.investigation.flowName) {
      console.log(`    flow: ${result.investigation.flowName}`);
    }
    if (errors.length) {
      errors.forEach((e) => console.log(`    ✗ ${e}`));
    }
    console.log("");
  }

  console.log("=".repeat(50));
  console.log(`${passed}/${HARD_CASES.length} hard cases passed`);

  if (failures.length) {
    console.error("\nFailed cases:");
    failures.forEach((f) => {
      console.error(`  ${f.id} ${f.name}`);
      f.errors.forEach((e) => console.error(`    - ${e}`));
    });
    process.exit(1);
  }
}

run();
