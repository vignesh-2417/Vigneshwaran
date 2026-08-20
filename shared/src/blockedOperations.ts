import type { BlockedOperation, BlockedOperationType } from "./schemas.js";

interface BlockRule {
  type: BlockedOperationType;
  reason: string;
  whySensitive: string;
  manualAction: string;
  pattern: RegExp;
}

const RULES: readonly BlockRule[] = [
  {
    type: "permission_set_groups",
    reason: "Permission set groups were requested.",
    whySensitive: "They grant bundled access across objects and can escalate privileges.",
    manualAction: "A Salesforce administrator must review and change permission set groups in Setup.",
    pattern: /\bpermission[\s_-]*set[\s_-]*groups?\b/i
  },
  {
    type: "permission_sets",
    reason: "Permission sets were requested.",
    whySensitive: "They change object, field, and user capabilities.",
    manualAction: "Create or assign permission sets manually in Setup after security review.",
    pattern: /\bpermission[\s_-]*sets?\b/i
  },
  {
    type: "profiles",
    reason: "Profile changes were requested.",
    whySensitive: "Profiles control baseline user access and are high-risk to automate.",
    manualAction: "An administrator must clone or edit the profile in Setup.",
    pattern:
      /\b(clone|update|edit|deploy|change|modify|create|assign)\b.{0,40}\bprofiles?\b|\bprofiles?\b.{0,40}\b(metadata|permissions?|object settings?)\b/i
  },
  {
    type: "sharing_rules",
    reason: "Sharing rules were requested.",
    whySensitive: "Sharing rules expand record visibility across the org.",
    manualAction: "Configure sharing rules manually in Setup → Sharing Settings.",
    pattern: /\bsharing[\s_-]*rules?\b/i
  },
  {
    type: "sharing_settings",
    reason: "Sharing settings or organization-wide defaults were requested.",
    whySensitive: "OWD and sharing settings change who can see records org-wide.",
    manualAction: "An administrator must change sharing settings in Setup.",
    pattern: /\bsharing settings\b|\borg[\s-]*wide[\s-]*defaults?\b|\bowd\b|\bmanual sharing\b/i
  },
  {
    type: "user_access",
    reason: "User access changes were requested.",
    whySensitive: "Assigning users or resetting access can grant unintended privileges.",
    manualAction: "Perform user assignment and access changes in Setup as an administrator.",
    pattern: /\b(user access|assign users?|reset password|login access)\b/i
  },
  {
    type: "login_authentication",
    reason: "Login or authentication settings were requested.",
    whySensitive: "SSO, MFA, password, and session settings affect how every user authenticates.",
    manualAction: "Change authentication in Setup → Identity / Session Settings after security review.",
    pattern:
      /\b(sso|saml|oauth provider|mfa|multi-factor|login hours|password policy|session settings|authentication provider)\b/i
  },
  {
    type: "connected_apps",
    reason: "Connected apps were requested.",
    whySensitive: "Connected apps can expose org APIs to external clients.",
    manualAction: "Create or modify connected apps in Setup after an integration review.",
    pattern: /\bconnected[\s_-]*apps?\b/i
  },
  {
    type: "named_credentials",
    reason: "Named credentials were requested.",
    whySensitive: "They store endpoints and secrets used for callouts.",
    manualAction: "Configure named credentials in Setup. Never paste secrets into this assistant.",
    pattern: /\bnamed[\s_-]*credentials?\b/i
  },
  {
    type: "external_credentials",
    reason: "External credentials were requested.",
    whySensitive: "They hold authentication material for outbound integrations.",
    manualAction: "Configure external credentials in Setup. Do not store secrets in source or prompts.",
    pattern: /\bexternal[\s_-]*credentials?\b/i
  },
  {
    type: "production_data",
    reason: "Production data changes were requested.",
    whySensitive: "Inserting, deleting, or anonymizing production records can cause data loss.",
    manualAction: "Use a sandbox and an approved data job. This assistant will not change production data.",
    pattern: /\b(production data|delete records?|insert \d+ records?|anonymize data)\b/i
  },
  {
    type: "destructive_metadata",
    reason: "A destructive metadata change was requested.",
    whySensitive: "Deleting fields or objects can permanently drop data and break dependents.",
    manualAction: "Use a destructiveChanges manifest reviewed by an administrator. Never auto-delete.",
    pattern: /\b(destructive(?:changes)?|delete (?:the )?field|remove custom object|purge metadata)\b/i
  },
  {
    type: "apex_callouts",
    reason: "Apex that performs external callouts was requested.",
    whySensitive: "Callouts can send org data to external systems without review.",
    manualAction: "Design the callout, remote site or named credential, and tests for explicit human review.",
    pattern: /\b(http callout|httprequest|external callout|callout=)\b/i
  }
];

export function detectBlockedOperations(requirement: string): BlockedOperation[] {
  const blocked: BlockedOperation[] = [];
  const seen = new Set<BlockedOperationType>();

  for (const rule of RULES) {
    const match = rule.pattern.exec(requirement);
    if (match && !seen.has(rule.type)) {
      seen.add(rule.type);
      blocked.push({
        type: rule.type,
        reason: rule.reason,
        whySensitive: rule.whySensitive,
        manualAction: rule.manualAction,
        matchedPhrase: match[0].slice(0, 120)
      });
    }
  }

  return blocked;
}

export function minimizeSalesforceContext<T extends { url: string; recordId: string | null }>(
  context: T
): T {
  return {
    ...context,
    url: context.url.split("?")[0] ?? context.url
  };
}
