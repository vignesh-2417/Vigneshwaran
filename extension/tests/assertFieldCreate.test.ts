import { describe, expect, it } from "vitest";
import { PRODUCTION_ORG_CREATE_BLOCKED } from "@sfcopilot/shared";
import { assertFieldReadyToCreate } from "../src/salesforce/assertFieldCreate.js";

describe("assertFieldReadyToCreate", () => {
  it("accepts a currency field on a Developer Edition org", () => {
    const field = assertFieldReadyToCreate(
      'Field data type: Currency. Create currency field "COPruppes" on Account object',
      "Account",
      "https://nteli56-dev-ed.my.salesforce.com"
    );
    expect(field).toMatchObject({
      apiName: "COPruppes__c",
      catalogId: "Currency",
      objectApiName: "Account"
    });
  });

  it("blocks production orgs", () => {
    expect(() =>
      assertFieldReadyToCreate(
        'Create currency field "COPruppes" on Account object',
        "Account",
        "https://acme.my.salesforce.com"
      )
    ).toThrow(PRODUCTION_ORG_CREATE_BLOCKED);
  });
});
