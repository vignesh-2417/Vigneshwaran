/**
 * FixForce – sfSessionService.js (background module)
 * Fetches Salesforce REST/Tooling API using the logged-in user's session.
 */

const SESSION_COOKIE_NAMES = ["sid", "sid_Client", "clientSrc"];

export async function getTabSession(tabUrl) {
  if (!tabUrl) return null;
  const origins = new Set();
  try {
    const u = new URL(tabUrl);
    origins.add(`${u.protocol}//${u.host}`);
    origins.add(`${u.protocol}//${u.hostname}`);
    if (u.hostname.endsWith(".lightning.force.com")) {
      const myDomain = u.hostname.replace(".lightning.force.com", ".my.salesforce.com");
      origins.add(`https://${myDomain}`);
    }
  } catch (_) {
    return null;
  }

  for (const origin of origins) {
    try {
      const cookies = await chrome.cookies.getAll({ url: origin });
      const sid = cookies.find((c) => SESSION_COOKIE_NAMES.includes(c.name));
      if (sid?.value) {
        return { sessionId: sid.value, origin, cookieName: sid.name };
      }
    } catch (_) {}
  }
  return null;
}

async function fetchViaPageContext(tabId, path) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (apiPath) => {
      try {
        const res = await fetch(apiPath, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
      } catch (e) {
        return { ok: false, status: 0, text: "", error: e?.message || String(e) };
      }
    },
    args: [path],
  });
  return results?.[0]?.result;
}

async function fetchViaBearer(tabUrl, path, session) {
  let baseOrigin = session.origin;
  try {
    baseOrigin = new URL(tabUrl).origin;
  } catch (_) {}
  const url = path.startsWith("http") ? path : `${baseOrigin}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.sessionId}`,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export async function sfSessionFetch(tabId, tabUrl, path) {
  if (
    !tabId ||
    (!tabUrl?.includes("force.com") && !tabUrl?.includes("salesforce.com"))
  ) {
    throw new Error("Not on a Salesforce tab");
  }

  let pageResult = null;
  try {
    pageResult = await fetchViaPageContext(tabId, path);
  } catch (_) {
    pageResult = null;
  }

  if (pageResult?.ok) {
    try {
      return JSON.parse(pageResult.text);
    } catch (_) {
      throw new Error("Invalid JSON from Salesforce API");
    }
  }

  const session = await getTabSession(tabUrl);
  if (!session) {
    const detail = pageResult?.error || pageResult?.text?.slice(0, 80) || "no session cookie";
    throw new Error(`Salesforce session not found (${detail}). Stay logged in on this tab.`);
  }

  const bearerResult = await fetchViaBearer(tabUrl, path, session);
  if (!bearerResult.ok) {
    throw new Error(
      `Salesforce API ${bearerResult.status}: ${bearerResult.text?.slice(0, 120) || "request failed"}`
    );
  }
  try {
    return JSON.parse(bearerResult.text);
  } catch (_) {
    throw new Error("Invalid JSON from Salesforce API (Bearer)");
  }
}
