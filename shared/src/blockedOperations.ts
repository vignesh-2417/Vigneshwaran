import type { BlockedOperation, BlockedOperationType } from "./schemas.js";

interface BlockRule {
  type: BlockedOperationType;
  reason: string;
  pattern: RegExp;
}

const RULES: readonly BlockRule[] = [
  {
    type: "permission_set_groups",
    reason: "Permission set groups cannot be modified or deployed by this assistant.",
    pattern: /\bpermission[\s_-]*set[\s_-]*groups?\b/i
  },
  {
    type: "permission_sets",
    reason: "Permission sets cannot be modified or deployed by this assistant.",
    pattern: /\bpermission[\s_-]*sets?\b/i
  },
  {
    type: "profiles",
    reason: "Profiles cannot be modified or deployed by this assistant.",
    pattern: /\b(clone|update|edit|deploy|change|modify|create|assign)\b.{0,40}\bprofiles?\b|\bprofiles?\b.{0,40}\b(metadata|permissions?|object settings?)\b/i
  },
  {
    type: "sharing_rules",
    reason: "Sharing rules and organization-wide defaults cannot be modified by this assistant.",
    pattern: /\bsharing[\s_-]*rules?\b|\borg[\s-]*wide[\s-]*defaults?\b|\bowd\b/i
  },
  {
    type: "user_access",
    reason: "User access changes are blocked.",
    pattern: /\b(user access|assign users?|reset password|login access)\b/i
  },
  {
    type: "connected_apps",
    reason: "Connected apps cannot be created or modified by this assistant.",
    pattern: /\bconnected[\s_-]*apps?\b/i
  },
  {
    type: "named_credentials",
    reason: "Named credentials cannot be created or modified by this assistant.",
    pattern: /\bnamed[\s_-]*credentials?\b/i
  },
  {
    type: "external_credentials",
    reason: "External credentials cannot be created or modified by this assistant.",
    pattern: /\bexternal[\s_-]*credentials?\b/i
  },
  {
    type: "production_data",
    reason: "Production data changes are blocked.",
    pattern: /\b(production data|delete records?|insert \d+ records?|anonymize data)\b/i
  },
  {
    type: "destructive_metadata",
    reason: "Destructive metadata operations are blocked.",
    pattern: /\b(destructive(?:changes)?|delete (?:the )?field|remove custom object|purge metadata)\b/i
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
