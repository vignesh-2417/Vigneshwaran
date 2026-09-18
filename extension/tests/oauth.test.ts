import { describe, expect, it } from "vitest";
import { generatePKCE } from "../src/salesforce/pkce.js";
import {
  buildSalesforceAuthorizationUrl,
  extractAuthorizationCode,
  exchangeAuthorizationCode
} from "../src/salesforce/oauth.js";

describe("PKCE", () => {
  it("creates an S256 verifier and challenge", async () => {
    const pkce = await generatePKCE();
    expect(pkce.codeChallengeMethod).toBe("S256");
    expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(pkce.codeChallenge).not.toBe(pkce.codeVerifier);
    expect(pkce.codeVerifier).not.toMatch(/[+/=]/);
  });
});

describe("Salesforce OAuth helpers", () => {
  it("builds an authorize URL with PKCE and no client secret", () => {
    const url = buildSalesforceAuthorizationUrl({
      loginUrl: "https://login.salesforce.com",
      clientId: "abc",
      redirectUri: "https://ext.chromiumapp.org/oauth2",
      codeChallenge: "challenge",
      state: "state-1"
    });
    expect(url).toContain("response_type=code");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("client_id=abc");
    expect(url).not.toContain("client_secret");
  });

  it("extracts the authorization code when state matches", () => {
    expect(
      extractAuthorizationCode(
        "https://ext.chromiumapp.org/oauth2?code=AUTHCODE&state=state-1",
        "state-1"
      )
    ).toBe("AUTHCODE");
  });

  it("treats access_denied as cancellation", () => {
    expect(() =>
      extractAuthorizationCode(
        "https://ext.chromiumapp.org/oauth2?error=access_denied&state=state-1",
        "state-1"
      )
    ).toThrow(/cancelled/i);
  });

  it("exchanges a code without a client secret", async () => {
    const result = await exchangeAuthorizationCode({
      loginUrl: "https://login.salesforce.com",
      clientId: "abc",
      redirectUri: "https://ext.chromiumapp.org/oauth2",
      code: "AUTHCODE",
      codeVerifier: "verifier",
      fetchImpl: async (_url, init) => {
        const body = String(init?.body);
        expect(body).toContain("grant_type=authorization_code");
        expect(body).toContain("code_verifier=verifier");
        expect(body).not.toContain("client_secret");
        return new Response(
          JSON.stringify({
            access_token: "token",
            instance_url: "https://nteli56-dev-ed.my.salesforce.com",
            id: "https://login.salesforce.com/id/00Dxx/005xx"
          }),
          { status: 200 }
        );
      }
    });
    expect(result.instanceUrl).toBe("https://nteli56-dev-ed.my.salesforce.com");
    expect(result.accessToken).toBe("token");
  });
});
