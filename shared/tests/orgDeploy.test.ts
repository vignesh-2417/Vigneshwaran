import { describe, expect, it } from "vitest";
import { isSandboxOrDeveloperOrg } from "../src/orgDeploy.js";

describe("isSandboxOrDeveloperOrg", () => {
  it("allows Developer Edition, sandbox, and scratch hosts", () => {
    expect(isSandboxOrDeveloperOrg("https://nteli56-dev-ed.my.salesforce.com")).toBe(true);
    expect(isSandboxOrDeveloperOrg("https://acme--full.sandbox.my.salesforce.com")).toBe(true);
    expect(isSandboxOrDeveloperOrg("https://foo.scratch.my.salesforce.com")).toBe(true);
  });

  it("blocks production my-domain hosts", () => {
    expect(isSandboxOrDeveloperOrg("https://acme.my.salesforce.com")).toBe(false);
    expect(isSandboxOrDeveloperOrg("https://na123.salesforce.com")).toBe(false);
  });
});
