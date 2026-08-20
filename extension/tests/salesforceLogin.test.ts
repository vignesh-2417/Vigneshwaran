import { describe, expect, it } from "vitest";
import { buildLoginEnvelope, parseSoapLoginResponse } from "../src/salesforce/soapLogin.js";
import { toolingCustomFieldPayload } from "../src/salesforce/toolingField.js";

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
      toolingCustomFieldPayload({
        label: "COP Text",
        apiName: "COP_Text__c",
        fieldType: "Text",
        objectApiName: "Account"
      })
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
});
