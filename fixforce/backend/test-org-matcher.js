/**
 * Unit tests for validation rule matching (mirrors extension logic).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const extPath = path.join(__dirname, "../extension/salesforceOrgInvestigator.js");
const code = fs.readFileSync(extPath, "utf8");

const sandbox = { window: {}, self: {} };
sandbox.window = sandbox.self = sandbox;
vm.runInNewContext(`${code}`, sandbox);
const { extractValidationHints, matchValidationRule } = sandbox.FixForceOrgInvestigator;

const rules = [
  {
    Id: "04d000000000001",
    ValidationName: "VR_Opportunity_Amount_Check",
    ErrorMessage: "Amount cannot be negative when Stage is Prospecting",
    ErrorDisplayField: "Amount",
    EntityDefinition: { QualifiedApiName: "Opportunity", Label: "Opportunity" },
  },
  {
    Id: "04d000000000002",
    ValidationName: "Apex_checkbox_rule",
    ErrorMessage: "TEST Fixforce",
    ErrorDisplayField: "Apex_checkbox__c",
    EntityDefinition: { QualifiedApiName: "Account", Label: "Account" },
  },
];

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.log(`✗ ${name}`);
  }
}

const tc19 = "We hit a snag. Review the errors on this page. * TEST Fixforce";
const hints = extractValidationHints(tc19);
assert("TC19 extracts inline message", hints.some((h) => /TEST Fixforce/i.test(h)));
assert(
  "TC19 matches Account rule",
  matchValidationRule(tc19, rules)?.ValidationName === "Apex_checkbox_rule"
);

const tc12 =
  "FIELD_CUSTOM_VALIDATION_EXCEPTION: VR_Opportunity_Amount_Check: Amount cannot be negative when Stage is Prospecting";
assert(
  "TC12 matches by API name",
  matchValidationRule(tc12, rules)?.ValidationName === "VR_Opportunity_Amount_Check"
);

console.log(`\n${passed}/${passed + failed} org matcher tests passed`);
if (failed > 0) process.exit(1);
