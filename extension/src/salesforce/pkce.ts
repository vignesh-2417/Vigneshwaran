/** PKCE S256 helpers for Salesforce Authorization Code flow. */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const codeVerifier = base64UrlEncode(random);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return {
    codeVerifier,
    codeChallenge: base64UrlEncode(new Uint8Array(digest)),
    codeChallengeMethod: "S256"
  };
}

export function generateOAuthState(): string {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  return base64UrlEncode(random);
}
