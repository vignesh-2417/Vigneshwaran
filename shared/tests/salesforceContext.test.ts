import { describe, expect, it } from "vitest";
import {
  detectSalesforceContext,
  explainMissingContext
} from "../src/salesforceContext.js";

function loc(partial: {
  hostname?: string;
  pathname: string;
  href?: string;
  hash?: string;
  search?: string;
}) {
  const hostname = partial.hostname ?? "acme.lightning.force.com";
  const search = partial.search ?? "";
  const hash = partial.hash ?? "";
  const href =
    partial.href ?? `https://${hostname}${partial.pathname}${search}${hash}`;
  return {
    hostname,
    pathname: partial.pathname,
    href,
    hash,
    search
  };
}

describe("detectSalesforceContext", () => {
  it("detects a standard record page with high confidence", () => {
    const context = detectSalesforceContext(
      loc({
        pathname: "/lightning/r/Account/001xx000003DGbYAAW/view"
      })
    );
    expect(context.objectApiName).toBe("Account");
    expect(context.recordId).toBe("001xx000003DGbYAAW");
    expect(context.route).toBe("/lightning/r/Account/001xx000003DGbYAAW/view");
    expect(context.confidence).toBe("high");
    expect(explainMissingContext(context).explanation).toBeNull();
  });

  it("detects a list page without a record ID", () => {
    const context = detectSalesforceContext(
      loc({
        pathname: "/lightning/o/Account/list",
        search: "?filterName=Recent"
      })
    );
    expect(context.objectApiName).toBe("Account");
    expect(context.recordId).toBeNull();
    expect(context.confidence).toBe("medium");
    expect(explainMissingContext(context).explanation).toMatch(/Record ID is unavailable/);
  });

  it("detects a setup page without object or record", () => {
    const context = detectSalesforceContext(
      loc({ pathname: "/lightning/setup/ObjectManager/home" })
    );
    expect(context.route).toBe("/lightning/setup/ObjectManager/home");
    expect(context.objectApiName).toBeNull();
    expect(context.recordId).toBeNull();
    expect(context.confidence).toBe("medium");
  });

  it("returns low confidence on a non-Salesforce page", () => {
    const context = detectSalesforceContext(
      loc({
        hostname: "example.com",
        pathname: "/lightning/r/Account/001xx000003DGbYAAW/view",
        href: "https://example.com/lightning/r/Account/001xx000003DGbYAAW/view"
      })
    );
    expect(context.objectApiName).toBeNull();
    expect(context.recordId).toBeNull();
    expect(context.route).toBeNull();
    expect(context.confidence).toBe("low");
  });

  it("returns null record ID when the URL has no ID", () => {
    const context = detectSalesforceContext(
      loc({ pathname: "/lightning/page/home" })
    );
    expect(context.recordId).toBeNull();
    expect(context.objectApiName).toBeNull();
    expect(context.confidence).toBe("low");
  });

  it("handles Lightning navigation without a full reload via URL change", () => {
    const list = detectSalesforceContext(
      loc({ pathname: "/lightning/o/Contact/list" })
    );
    const record = detectSalesforceContext(
      loc({ pathname: "/lightning/r/Contact/003xx000004ABCD/view" })
    );
    expect(list.objectApiName).toBe("Contact");
    expect(list.recordId).toBeNull();
    expect(record.recordId).toBe("003xx000004ABCD");
    expect(record.confidence).toBe("high");
  });
});
