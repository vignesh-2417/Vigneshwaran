const SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/";

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildLoginEnvelope(username: string, passwordWithToken: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<env:Envelope xmlns:env="${SOAP_NS}" xmlns:urn="urn:partner.soap.sforce.com">
  <env:Body>
    <urn:login>
      <urn:username>${escapeXml(username)}</urn:username>
      <urn:password>${escapeXml(passwordWithToken)}</urn:password>
    </urn:login>
  </env:Body>
</env:Envelope>`;
}

export function parseSoapLoginResponse(xml: string): { sessionId: string; instanceUrl: string } {
  const fault = xml.match(/<faultstring>([^<]+)<\/faultstring>/i)?.[1];
  if (fault) {
    throw new Error(fault.slice(0, 300));
  }
  const sessionId = xml.match(/<sessionId>([^<]+)<\/sessionId>/i)?.[1];
  const serverUrl = xml.match(/<serverUrl>([^<]+)<\/serverUrl>/i)?.[1];
  if (!sessionId || !serverUrl) {
    throw new Error("Salesforce login did not return a session.");
  }
  return {
    sessionId,
    instanceUrl: new URL(serverUrl).origin
  };
}

export async function soapLogin(
  loginHost: string,
  username: string,
  password: string,
  securityToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ sessionId: string; instanceUrl: string; username: string }> {
  const response = await fetchImpl(`${loginHost}/services/Soap/u/62.0`, {
    method: "POST",
    headers: {
      "content-type": "text/xml; charset=UTF-8",
      SOAPAction: "login"
    },
    body: buildLoginEnvelope(username, `${password}${securityToken}`)
  });
  const xml = await response.text();
  const parsed = parseSoapLoginResponse(xml);
  return { ...parsed, username };
}
