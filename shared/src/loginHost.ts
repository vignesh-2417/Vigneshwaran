export function deriveSalesforceLoginHost(pageHostname: string): string {
  const host = pageHostname.trim().toLowerCase();
  if (host.endsWith(".lightning.force.com")) {
    return `https://${host.replace(/\.lightning\.force\.com$/, ".my.salesforce.com")}`;
  }
  if (host.endsWith(".my.salesforce.com") || host.endsWith(".salesforce.com")) {
    return `https://${host}`;
  }
  return "https://login.salesforce.com";
}

export function assertAllowedSalesforceLoginHost(input: string): string {
  const normalized = input.trim();
  const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
  if (url.protocol !== "https:") {
    throw new Error("Salesforce login must use HTTPS.");
  }
  const hostname = url.hostname.toLowerCase();
  const allowed =
    hostname === "login.salesforce.com" ||
    hostname === "test.salesforce.com" ||
    (hostname.endsWith(".my.salesforce.com") && hostname !== "my.salesforce.com") ||
    (/^[a-z0-9-]+\.salesforce\.com$/.test(hostname) &&
      hostname !== "www.salesforce.com" &&
      hostname !== "help.salesforce.com" &&
      hostname !== "developer.salesforce.com");
  if (!allowed) {
    throw new Error("That Salesforce login host is not allowed.");
  }
  return `https://${hostname}`;
}
