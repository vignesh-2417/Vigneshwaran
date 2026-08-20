import { describe, expect, it } from "vitest";
import { buildMockCustomFieldPlan, parseCustomFieldRequirement } from "../src/mockPlan.js";

describe("parseCustomFieldRequirement", () => {
  it("parses a quoted text field on Account", () => {
    const parsed = parseCustomFieldRequirement(
      'Create a custom text field "COP Text" in Account object',
      null
    );
    expect(parsed).toEqual({
      label: "COP Text",
      apiName: "COP_Text__c",
      fieldType: "Text",
      objectApiName: "Account"
    });
  });
});

describe("buildMockCustomFieldPlan", () => {
  it("returns mock XML and never a deploy command", () => {
    const plan = buildMockCustomFieldPlan(
      'Create a custom text field "COP Text" in Account object',
      "Opportunity",
      "11111111-1111-4111-8111-111111111111"
    );
    expect(plan.ok).toBe(true);
    expect(plan.deploymentStatus).toBe("awaiting_approval");
    expect(plan.operatingMode).toBe("REVIEW");
    expect(plan.taskReport?.filesCreatedOrChanged[0]).toContain("COP_Text__c");
    expect(plan.structuredRequirement?.objectApiName).toBe("Account");
    expect(plan.metadataArtifacts[0]?.after).toContain("COP_Text__c");
    expect(plan.metadataArtifacts[0]?.after).toContain("<type>Text</type>");
    expect(JSON.stringify(plan)).not.toMatch(/sfdx force:source:deploy/i);
    expect(plan.warning).toMatch(/never automatic/i);
  });
});
