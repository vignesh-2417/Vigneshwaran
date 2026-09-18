export function hostnameFromInstanceUrl(instanceUrl: string): string {
  try {
    return new URL(instanceUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Tooling field create is allowed only on sandbox, scratch, or Developer Edition orgs. */
export function isSandboxOrDeveloperOrg(instanceUrl: string): boolean {
  const host = hostnameFromInstanceUrl(instanceUrl);
  if (!host) {
    return false;
  }
  return (
    host.includes(".sandbox.") ||
    host.includes("scratch.") ||
    host.includes("-dev-ed.") ||
    host.includes(".develop.") ||
    /--[a-z0-9]+\.(sandbox\.)?my\.salesforce\.com$/i.test(host)
  );
}

export const PRODUCTION_ORG_CREATE_BLOCKED =
  "This org is not a sandbox, scratch org, or Developer Edition. The assistant will not create fields in production.";
