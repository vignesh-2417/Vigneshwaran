import { describe, expect, it } from "vitest";
import { isApprovedSalesforceHost } from "../src/hosts.js";

describe("isApprovedSalesforceHost", () => {
  it("allows Lightning Experience hosts", () => {
    expect(isApprovedSalesforceHost("acme.lightning.force.com")).toBe(true);
    expect(isApprovedSalesforceHost("acme--sb.sandbox.lightning.force.com")).toBe(true);
  });

  it("allows My Domain Salesforce hosts", () => {
    expect(isApprovedSalesforceHost("acme.my.salesforce.com")).toBe(true);
  });

  it("rejects login and marketing hosts", () => {
    expect(isApprovedSalesforceHost("login.salesforce.com")).toBe(false);
    expect(isApprovedSalesforceHost("www.salesforce.com")).toBe(false);
    expect(isApprovedSalesforceHost("help.salesforce.com")).toBe(false);
    expect(isApprovedSalesforceHost("example.com")).toBe(false);
  });
});
