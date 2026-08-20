import { describe, expect, it } from "vitest";
import { detectBlockedOperations } from "../src/blockedOperations.js";

describe("detectBlockedOperations", () => {
  it("blocks permission set requests", () => {
    const blocked = detectBlockedOperations(
      "Create a permission set that grants Account edit access"
    );
    expect(blocked.some((item) => item.type === "permission_sets")).toBe(true);
    expect(blocked[0]?.whySensitive).toMatch(/privileges|capabilities|access/i);
    expect(blocked[0]?.manualAction).toMatch(/administrator|Setup/i);
  });

  it("blocks unreviewed Apex callouts", () => {
    const blocked = detectBlockedOperations(
      "Write Apex HttpRequest callout to an external billing API"
    );
    expect(blocked.some((item) => item.type === "apex_callouts")).toBe(true);
  });

  it("does not block ordinary field creation", () => {
    const blocked = detectBlockedOperations(
      "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values."
    );
    expect(blocked).toEqual([]);
  });
});
