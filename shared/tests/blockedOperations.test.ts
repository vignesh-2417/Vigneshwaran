import { describe, expect, it } from "vitest";
import { detectBlockedOperations } from "../src/blockedOperations.js";

describe("detectBlockedOperations", () => {
  it("blocks permission set requests", () => {
    const blocked = detectBlockedOperations(
      "Create a permission set that grants Account edit access"
    );
    expect(blocked.some((item) => item.type === "permission_sets")).toBe(true);
  });

  it("does not block ordinary field creation", () => {
    const blocked = detectBlockedOperations(
      "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values."
    );
    expect(blocked).toEqual([]);
  });
});
