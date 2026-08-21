import { describe, expect, it } from "vitest";
import { MAX_REQUIREMENT_LENGTH } from "@sfcopilot/shared";
import { handleAnalyze } from "../src/analyze.js";

const context = {
  hostname: "acme.lightning.force.com",
  url: "https://acme.lightning.force.com/lightning/r/Account/001xx000003DGbYAAW/view",
  route: "/lightning/r/Account/001xx000003DGbYAAW/view",
  objectApiName: "Account",
  recordId: "001xx000003DGbYAAW",
  confidence: "high" as const
};

const auth = "Bearer mock-session-token";

describe("POST /api/requirements/analyze handler", () => {
  it("accepts a valid request and does not return a deployment command", async () => {
    const result = await handleAnalyze(
      {
        requirement:
          "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values.",
        salesforceContext: context
      },
      auth
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    if (result.body.ok) {
      expect(result.body.deploymentStatus).toBe("awaiting_approval");
      expect(result.body.operatingMode).toBe("REVIEW");
      expect(JSON.stringify(result.body)).not.toMatch(/sfdx force:source:deploy/i);
      expect(result.body.taskReport?.deploymentPreview).toMatch(/never automatic/i);
      expect(JSON.stringify(result.body)).not.toMatch(/\b(secret|password)\b/i);
      expect(result.body.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    }
  });

  it("plans a named text field on Account", async () => {
    const result = await handleAnalyze(
      {
        requirement: 'Create a custom text field "COP Text" in Account object',
        salesforceContext: context
      },
      auth
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    if (result.body.ok) {
      expect(result.body.structuredRequirement?.objectApiName).toBe("Account");
      expect(result.body.metadataArtifacts[0]?.after).toContain("COP_Text__c");
      expect(result.body.metadataArtifacts[0]?.after).toContain("<type>Text</type>");
    }
  });

  it("rejects an empty requirement", async () => {
    const result = await handleAnalyze(
      { requirement: "   ", salesforceContext: context },
      auth
    );
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.code).toBe("EMPTY_REQUIREMENT");
    }
  });

  it("rejects an oversized requirement", async () => {
    const result = await handleAnalyze(
      {
        requirement: "a".repeat(MAX_REQUIREMENT_LENGTH + 1),
        salesforceContext: context
      },
      auth
    );
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.code).toBe("REQUIREMENT_TOO_LARGE");
    }
  });

  it("detects a blocked permission-set request", async () => {
    const result = await handleAnalyze(
      {
        requirement: "Create a permission set for Account edit access",
        salesforceContext: context
      },
      auth
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    if (result.body.ok) {
      expect(result.body.deploymentStatus).toBe("blocked");
      expect(result.body.blockedOperations[0]?.type).toBe("permission_sets");
    }
  });

  it("rejects missing context", async () => {
    const result = await handleAnalyze({ requirement: "Create a field" }, auth);
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.code).toBe("MISSING_CONTEXT");
    }
  });

  it("rejects a malformed request body", async () => {
    const result = await handleAnalyze("not-json-object", auth);
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.code).toBe("INVALID_REQUEST");
    }
  });

  it("returns a timeout error when the backend budget is exceeded", async () => {
    const result = await handleAnalyze(
      {
        requirement:
          "Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values.",
        salesforceContext: context
      },
      auth,
      { timeoutMs: 10, failAfterMs: 50 }
    );
    expect(result.status).toBe(504);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.code).toBe("TIMEOUT");
    }
  });
});
