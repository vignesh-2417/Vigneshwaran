import { describe, expect, it } from "vitest";
import { assertAllowedSalesforceLoginHost, deriveSalesforceLoginHost } from "../src/loginHost.js";

describe("Salesforce login host", () => {
  it("maps Lightning My Domain to the SOAP my.salesforce.com host", () => {
    expect(deriveSalesforceLoginHost("nteli56-dev-ed.lightning.force.com")).toBe(
      "https://nteli56-dev-ed.my.salesforce.com"
    );
  });

  it("rejects marketing hosts", () => {
    expect(() => assertAllowedSalesforceLoginHost("https://www.salesforce.com")).toThrow(
      /not allowed/
    );
  });
});
