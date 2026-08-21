import { describe, expect, it } from "vitest";
import { FIELD_TYPE_CATALOG } from "../src/fieldTypes.js";
import {
  applyFieldTypeHint,
  buildCustomFieldXml,
  parseCustomFieldRequirement
} from "../src/fieldParse.js";
import { buildMockCustomFieldPlan } from "../src/mockPlan.js";

describe("parseCustomFieldRequirement", () => {
  it("parses a quoted text field on Account", () => {
    const parsed = parseCustomFieldRequirement(
      'Create a custom text field "COP Text" in Account object',
      null
    );
    expect(parsed).toMatchObject({
      label: "COP Text",
      apiName: "COP_Text__c",
      catalogId: "Text",
      fieldType: "Text",
      objectApiName: "Account"
    });
    expect(parsed.clarifyingQuestions).toEqual([]);
  });

  it("honors an explicit Field data type hint over prompt wording", () => {
    const parsed = parseCustomFieldRequirement(
      applyFieldTypeHint('Create field "Notes" on Account', "Html"),
      null
    );
    expect(parsed.catalogId).toBe("Html");
    expect(parsed.fieldType).toBe("Html");
  });
});

describe("Salesforce field data types", () => {
  const samples: Record<string, { prompt: string; xmlType: string; extra: string }> = {
    Text: {
      prompt: 'Create text field "Title" on Account',
      xmlType: "Text",
      extra: "<length>255</length>"
    },
    TextArea: {
      prompt: 'Create text area field "Short Notes" on Account',
      xmlType: "TextArea",
      extra: "<length>255</length>"
    },
    LongTextArea: {
      prompt: 'Create long text area field "Description" on Account',
      xmlType: "LongTextArea",
      extra: "<visibleLines>5</visibleLines>"
    },
    Html: {
      prompt: 'Create rich text area field "Bio" on Account',
      xmlType: "Html",
      extra: "<type>Html</type>"
    },
    EncryptedText: {
      prompt: 'Create encrypted text field "National Id" on Account',
      xmlType: "EncryptedText",
      extra: "<maskType>all</maskType>"
    },
    Number: {
      prompt: 'Create number field "Headcount" on Account',
      xmlType: "Number",
      extra: "<precision>18</precision>"
    },
    Percent: {
      prompt: 'Create percent field "Discount" on Account',
      xmlType: "Percent",
      extra: "<scale>2</scale>"
    },
    Currency: {
      prompt: 'Create currency field "Annual Fee" on Account',
      xmlType: "Currency",
      extra: "<type>Currency</type>"
    },
    Picklist: {
      prompt: 'Create picklist field "Tier" on Account values: Gold, Silver, Bronze',
      xmlType: "Picklist",
      extra: "<fullName>Gold</fullName>"
    },
    MultiselectPicklist: {
      prompt: 'Create multi-select picklist "Interests" on Account values: A, B',
      xmlType: "MultiselectPicklist",
      extra: "<fullName>A</fullName>"
    },
    Checkbox: {
      prompt: 'Create checkbox field "Active" on Account',
      xmlType: "Checkbox",
      extra: "<defaultValue>false</defaultValue>"
    },
    Email: {
      prompt: 'Create email field "Work Email" on Contact',
      xmlType: "Email",
      extra: "<type>Email</type>"
    },
    Phone: {
      prompt: 'Create phone field "Work Phone" on Contact',
      xmlType: "Phone",
      extra: "<type>Phone</type>"
    },
    Url: {
      prompt: 'Create URL field "Website" on Account',
      xmlType: "Url",
      extra: "<type>Url</type>"
    },
    Date: {
      prompt: 'Create date field "Start Date" on Account',
      xmlType: "Date",
      extra: "<type>Date</type>"
    },
    DateTime: {
      prompt: 'Create date/time field "Last Seen" on Account',
      xmlType: "DateTime",
      extra: "<type>DateTime</type>"
    },
    AutoNumber: {
      prompt: 'Create auto number field "Case Seq" on Account format: C-{0000}',
      xmlType: "AutoNumber",
      extra: "<displayFormat>C-{0000}</displayFormat>"
    },
    Formula: {
      prompt: 'Create formula field "One" on Account formula: 1 returns Number',
      xmlType: "Number",
      extra: "<formula>1</formula>"
    },
    Summary: {
      prompt: 'Create roll-up summary "Opp Count" on Account count from Opportunity',
      xmlType: "Summary",
      extra: "<summaryOperation>Count</summaryOperation>"
    },
    Lookup: {
      prompt: 'Create lookup field "Related Contact" on Account lookup to Contact',
      xmlType: "Lookup",
      extra: "<referenceTo>Contact</referenceTo>"
    },
    MasterDetail: {
      prompt: 'Create master-detail field "Parent Account" on Child__c lookup to Account',
      xmlType: "MasterDetail",
      extra: "<type>MasterDetail</type>"
    },
    ExternalLookup: {
      prompt: 'Create external lookup field "Ext Key" on Account to Order__x',
      xmlType: "ExternalLookup",
      extra: "<type>ExternalLookup</type>"
    }
  };

  it("covers every catalog field data type", () => {
    expect(Object.keys(samples).sort()).toEqual(
      FIELD_TYPE_CATALOG.map((entry) => entry.id).sort()
    );
  });

  it.each(Object.entries(samples))("generates DX XML for %s", (id, sample) => {
    const parsed = parseCustomFieldRequirement(sample.prompt, null);
    expect(parsed.catalogId).toBe(id);
    expect(parsed.clarifyingQuestions).toEqual([]);
    const xml = buildCustomFieldXml(parsed);
    expect(xml).toContain(`<type>${sample.xmlType}</type>`);
    expect(xml).toContain(sample.extra);
    expect(xml).not.toMatch(/ssn|password/i);
  });

  it("asks for missing relationship, formula, and picklist extras in ANALYZE", () => {
    expect(
      parseCustomFieldRequirement('Create lookup field "Related" on Account', null)
        .clarifyingQuestions[0]?.id
    ).toBe("relationship-target");
    expect(
      parseCustomFieldRequirement('Create formula field "Score" on Account', null)
        .clarifyingQuestions[0]?.id
    ).toBe("formula-expression");
    expect(
      parseCustomFieldRequirement('Create picklist field "Status" on Account', null)
        .clarifyingQuestions[0]?.id
    ).toBe("picklist-values");
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

  it("stays in ANALYZE when a lookup target is missing", () => {
    const plan = buildMockCustomFieldPlan(
      'Create lookup field "Related Contact" on Account',
      null,
      "11111111-1111-4111-8111-111111111111"
    );
    expect(plan.operatingMode).toBe("ANALYZE");
    expect(plan.metadataArtifacts).toEqual([]);
    expect(plan.clarifyingQuestions.length).toBeGreaterThan(0);
  });
});
