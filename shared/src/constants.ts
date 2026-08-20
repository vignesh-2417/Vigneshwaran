export const HOST_ELEMENT_ID = "sf-metadata-copilot-host";
export const PRODUCT_NAME = "Salesforce Metadata Copilot";

export const MAX_REQUIREMENT_LENGTH = 8_000;
export const MAX_URL_LENGTH = 2_048;

export const APPROVED_SALESFORCE_HOST_PATTERNS = [
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.lightning\.force\.com$/i,
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.my\.salesforce\.com$/i,
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.salesforce-setup\.com$/i
] as const;

export const BLOCKED_SALESFORCE_HOSTS = new Set([
  "login.salesforce.com",
  "test.salesforce.com",
  "help.salesforce.com",
  "developer.salesforce.com",
  "www.salesforce.com"
]);
