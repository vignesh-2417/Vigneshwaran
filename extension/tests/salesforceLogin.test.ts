import { describe, expect, it } from "vitest";
import { parseCustomFieldRequirement } from "@sfcopilot/shared";
import { buildLoginEnvelope, parseSoapLoginResponse } from "../src/salesforce/soapLogin.js";
import {
  createCustomFieldWithSession,
  isDuplicateCustomFieldError,
  toolingCustomFieldPayload
} from "../src/salesforce/toolingField.js";

describe("SOAP login helpers", () => {
  it("escapes XML and parses session plus instance", () => {
    const envelope = buildLoginEnvelope("user@example.com", "p&w");
    expect(envelope).toContain("user@example.com");
    expect(envelope).toContain("p&amp;w");
    expect(envelope).not.toContain("p&w</");
    const parsed = parseSoapLoginResponse(
      "<loginResponse><sessionId>SID123</sessionId><serverUrl>https://nteli56-dev-ed.my.salesforce.com/services/Soap/u/62.0</serverUrl></loginResponse>"
    );
    expect(parsed).toEqual({
      sessionId: "SID123",
      instanceUrl: "https://nteli56-dev-ed.my.salesforce.com"
    });
  });

  it("surfaces SOAP fault strings without echoing the password", () => {
    expect(() =>
      parseSoapLoginResponse("<faultstring>Invalid username, password, security token</faultstring>")
    ).toThrow(/Invalid username/);
  });
});

describe("Tooling custom field payload", () => {
  it("builds Account.COP_Text__c as Text(255)", () => {
    expect(
      toolingCustomFieldPayload(
        parseCustomFieldRequirement(
          'Create a custom text field "COP Text" in Account object',
          null
        )
      )
    ).toEqual({
      FullName: "Account.COP_Text__c",
      Metadata: {
        type: "Text",
        label: "COP Text",
        required: false,
        length: 255
      }
    });
  });

  it("treats an existing field as alreadyExists instead of a hard failure", async () => {
    expect(isDuplicateCustomFieldError("The CustomObject named Account already has a field named COPruppes__c")).toBe(
      true
    );
    const field = parseCustomFieldRequirement(
      'Field data type: Currency. Create currency field "COPruppes" on Account object',
      null
    );
    const result = await createCustomFieldWithSession(
      "https://nteli56-dev-ed.my.salesforce.com",
      "SID",
      field,
      async () =>
        new Response(
          JSON.stringify([{ message: "duplicate value found: COPruppes__c already exists" }]),
          { status: 400 }
        )
    );
    expect(result).toMatchObject({
      created: false,
      alreadyExists: true
    });
  });
});
