import { describe, expect, it } from "vitest";
import { parseCustomFieldRequirement } from "@sfcopilot/shared";
import {
  createCustomFieldWithAccessToken,
  isDuplicateCustomFieldError,
  toolingCustomFieldPayload
} from "../src/salesforce/toolingField.js";
import type { StoredSalesforceAuth } from "../src/salesforce/authTypes.js";

const auth: StoredSalesforceAuth = {
  isAuthenticated: true,
  accessToken: "access-token",
  refreshToken: null,
  instanceUrl: "https://nteli56-dev-ed.my.salesforce.com",
  userId: "005xx0000000001AAA",
  username: "user@example.com",
  orgId: "00Dxx0000000001EAA",
  environment: "production"
};

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
    expect(
      isDuplicateCustomFieldError("The CustomObject named Account already has a field named COPruppes__c")
    ).toBe(true);
    const field = parseCustomFieldRequirement(
      'Field data type: Currency. Create currency field "COPruppes" on Account object',
      null
    );
    const result = await createCustomFieldWithAccessToken(auth, field, async () =>
      new Response(JSON.stringify([{ message: "duplicate value found: COPruppes__c already exists" }]), {
        status: 400
      })
    );
    expect(result).toMatchObject({
      created: false,
      alreadyExists: true
    });
  });
});
