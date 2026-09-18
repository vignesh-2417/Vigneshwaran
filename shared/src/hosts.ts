import {
  APPROVED_SALESFORCE_HOST_PATTERNS,
  BLOCKED_SALESFORCE_HOSTS
} from "./constants.js";

export function isApprovedSalesforceHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized || BLOCKED_SALESFORCE_HOSTS.has(normalized)) {
    return false;
  }
  return APPROVED_SALESFORCE_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}
