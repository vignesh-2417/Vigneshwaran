import { describe, expect, it } from "vitest";
import { parseExtensionRequest } from "../src/messaging.js";
import { MESSAGE_PROTOCOL_VERSION } from "../src/schemas.js";

describe("extension message protocol", () => {
  it("accepts a versioned request", () => {
    const parsed = parseExtensionRequest({
      v: MESSAGE_PROTOCOL_VERSION,
      type: "PING",
      requestId: "11111111-1111-4111-8111-111111111111"
    });
    expect(parsed.type).toBe("PING");
  });

  it("rejects an unversioned message", () => {
    expect(() =>
      parseExtensionRequest({
        type: "ANALYZE_REQUIREMENT",
        requestId: "11111111-1111-4111-8111-111111111111"
      })
    ).toThrow(/Invalid extension message/);
  });
});
