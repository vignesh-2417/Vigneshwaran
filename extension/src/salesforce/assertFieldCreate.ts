import {
  detectBlockedOperations,
  isSandboxOrDeveloperOrg,
  parseCustomFieldRequirement,
  PRODUCTION_ORG_CREATE_BLOCKED,
  type ParsedCustomFieldRequest
} from "@sfcopilot/shared";

export function assertFieldReadyToCreate(
  requirement: string,
  fallbackObject: string | null,
  instanceUrl: string
): ParsedCustomFieldRequest {
  if (!isSandboxOrDeveloperOrg(instanceUrl)) {
    throw new Error(PRODUCTION_ORG_CREATE_BLOCKED);
  }
  const blocked = detectBlockedOperations(requirement);
  const first = blocked[0];
  if (first) {
    throw new Error(first.reason);
  }
  const field = parseCustomFieldRequirement(requirement, fallbackObject);
  const missing = field.clarifyingQuestions[0];
  if (missing) {
    throw new Error(missing.prompt);
  }
  return field;
}
