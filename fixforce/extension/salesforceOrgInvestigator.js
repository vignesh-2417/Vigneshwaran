/**
 * FixForce – salesforceOrgInvestigator.js
 * Uses the logged-in user's browser session (same-origin fetch) to query the org.
 * All calls are best-effort; failures never throw to callers.
 */
(function (global) {
  "use strict";

  const CACHE_TTL_MS = 5 * 60 * 1000;
  const ENRICH_TIMEOUT_MS = 8000;

  let apiVersionCache = null;
  let apiVersionCachedAt = 0;
  const validationRulesCache = new Map();

  function normalize(text) {
    return String(text || "")
      .replace(/[\u2018\u2019\u2032]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function escapeSoql(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  function trimValidationMsg(msg) {
    if (!msg) return "";
    let out = String(msg).replace(/^[\s*•\-]+/, "").trim();
    const stop = out.match(/\b(View profile|Empty Cache|Setup|Object Manager|Named Credentials)\b/i);
    if (stop && stop.index > 2) out = out.slice(0, stop.index).trim();
    return out.slice(0, 160);
  }

  function extractValidationHints(errorText) {
    const text = String(errorText || "");
    const hints = [];

    const ex = text.match(/FIELD_CUSTOM_VALIDATION_EXCEPTION:\s*([^:\n]+):\s*([^\n\[]*)/i);
    if (ex) {
      hints.push(trimValidationMsg(ex[1]));
      if (ex[2]) hints.push(trimValidationMsg(ex[2]));
    }

    const ruleQuoted = text.match(/validation rule\s+["']([^"']+)["']/i);
    if (ruleQuoted) hints.push(trimValidationMsg(ruleQuoted[1]));

    if (/review the errors on this page/i.test(text)) {
      const bullets = text.match(/[*•]\s*([^\n*•]{2,120})/g) || [];
      bullets.forEach((b) => hints.push(trimValidationMsg(b.replace(/^[*•]\s*/, ""))));
      const afterReview = text.split(/review the errors on this page/i)[1];
      if (afterReview) {
        const line = afterReview
          .split("\n")
          .map((l) => trimValidationMsg(l))
          .find((l) => l.length > 2 && !/we hit a snag|error id/i.test(l));
        if (line) hints.push(line);
      }
    }

    return [...new Set(hints.filter((h) => h && h.length > 1))];
  }

  function extractFlowName(errorText) {
    const text = String(errorText || "");
    const patterns = [
      /['']([^'']+)['']\s+process\s+failed/i,
      /because the\s+['']([^'']+)['']\s+process/i,
      /flow\s+["']([^"']+)["']/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  }

  function extractFieldFromPermissionError(errorText) {
    return (
      errorText.match(/cannot update the field\s+([A-Za-z0-9_]+)/i)?.[1] ||
      errorText.match(/field[s]?\s+["']([^"']+)["']/i)?.[1] ||
      null
    );
  }

  function looksLikeValidation(errorText) {
    return (
      /FIELD_CUSTOM_VALIDATION_EXCEPTION/i.test(errorText) ||
      /validation rule/i.test(errorText) ||
      (/we hit a snag/i.test(errorText) && /review the errors on this page/i.test(errorText))
    );
  }

  function looksLikePermission(errorText) {
    return /INSUFFICIENT_ACCESS|insufficient privileges|field-level security|cannot update/i.test(
      errorText
    );
  }

  async function fetchJson(path) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "SF_SESSION_FETCH", path }, (resp) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!resp?.ok) {
          reject(new Error(resp?.error || "Salesforce API request failed"));
          return;
        }
        resolve(resp.data);
      });
    });
  }

  async function resolveObjectApiName(pageContext, apiVersion) {
    if (pageContext.object && pageContext.object !== "Unknown") {
      return pageContext.object;
    }
    const recordId = pageContext.recordId;
    if (!recordId || recordId.length < 15) return null;

    const prefix = recordId.substring(0, 3);
    try {
      const q = [
        "SELECT QualifiedApiName, Label, KeyPrefix",
        "FROM EntityDefinition",
        `WHERE KeyPrefix = '${escapeSoql(prefix)}'`,
        "LIMIT 1",
      ].join(" ");
      const data = await fetchJson(
        `/services/data/v${apiVersion}/tooling/query?q=${encodeURIComponent(q)}`
      );
      const row = data.records?.[0];
      if (row?.QualifiedApiName) return row.QualifiedApiName;
    } catch (_) {}

    return null;
  }

  async function getApiVersion() {
    const now = Date.now();
    if (apiVersionCache && now - apiVersionCachedAt < CACHE_TTL_MS) {
      return apiVersionCache;
    }
    const versions = await fetchJson("/services/data/");
    const list = Array.isArray(versions) ? versions : [];
    const latest = list[list.length - 1]?.version || "59.0";
    apiVersionCache = latest;
    apiVersionCachedAt = now;
    return latest;
  }

  async function getCurrentUser(apiVersion) {
    try {
      const me = await fetchJson(`/services/data/v${apiVersion}/chatter/users/me`);
      if (me?.id) {
        return {
          id: me.id,
          name: me.displayName || me.name,
          username: me.username || me.email,
        };
      }
    } catch (_) {}
    return null;
  }

  async function getValidationRules(objectApiName, apiVersion) {
    if (!objectApiName || objectApiName === "Unknown") return [];
    const cacheKey = `${objectApiName}:${apiVersion}`;
    const cached = validationRulesCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rules;

    const queries = [
      [
        "SELECT Id, ValidationName, ErrorMessage, ErrorDisplayField, Active,",
        "EntityDefinition.QualifiedApiName, EntityDefinition.Label",
        "FROM ValidationRule",
        `WHERE EntityDefinition.QualifiedApiName = '${escapeSoql(objectApiName)}'`,
        "AND Active = true",
        "ORDER BY ValidationName",
        "LIMIT 200",
      ].join(" "),
      [
        "SELECT Id, ValidationName, ErrorMessage, ErrorDisplayField, Active, TableEnumOrId",
        "FROM ValidationRule",
        `WHERE TableEnumOrId = '${escapeSoql(objectApiName)}'`,
        "AND Active = true",
        "ORDER BY ValidationName",
        "LIMIT 200",
      ].join(" "),
    ];

    let rules = [];
    for (const soql of queries) {
      try {
        const data = await fetchJson(
          `/services/data/v${apiVersion}/tooling/query?q=${encodeURIComponent(soql)}`
        );
        rules = data.records || [];
        if (rules.length) break;
      } catch (_) {}
    }

    validationRulesCache.set(cacheKey, { at: Date.now(), rules });
    return rules;
  }

  function matchValidationRule(errorText, rules) {
    if (!rules?.length) return null;
    const hints = extractValidationHints(errorText).map(normalize);
    const textNorm = normalize(errorText);

    for (const rule of rules) {
      const ruleName = normalize(rule.ValidationName);
      const ruleMsg = normalize(rule.ErrorMessage);
      if (hints.some((h) => h === ruleName || h === ruleMsg)) return rule;
      if (ruleMsg && textNorm.includes(ruleMsg)) return rule;
      if (ruleName && textNorm.includes(ruleName)) return rule;
      for (const h of hints) {
        if (h.length >= 4 && (ruleMsg.includes(h) || h.includes(ruleMsg))) return rule;
      }
    }
    return null;
  }

  async function lookupFlow(flowName, apiVersion) {
    if (!flowName) return null;
    const soql = [
      "SELECT Id, ApiName, Label, ProcessType, ActiveVersionId,",
      "LatestVersionId, IsActive, Description",
      "FROM FlowDefinitionView",
      `WHERE Label = '${escapeSoql(flowName)}' OR ApiName = '${escapeSoql(flowName)}'`,
      "LIMIT 5",
    ].join(" ");

    const data = await fetchJson(
      `/services/data/v${apiVersion}/tooling/query?q=${encodeURIComponent(soql)}`
    );
    return data.records?.[0] || null;
  }

  async function describeField(objectApiName, fieldApiName, apiVersion) {
    if (!objectApiName || !fieldApiName) return null;
    try {
      const path = `/services/data/v${apiVersion}/sobjects/${encodeURIComponent(objectApiName)}/describe`;
      const desc = await fetchJson(path);
      const field = (desc.fields || []).find(
        (f) => f.name === fieldApiName || f.label === fieldApiName
      );
      if (!field) return null;
      return {
        apiName: field.name,
        label: field.label,
        type: field.type,
        required: !field.nillable && field.createable,
        updateable: field.updateable,
      };
    } catch (_) {
      return null;
    }
  }

  function buildValidationSetupUrl(objectApiName, ruleId) {
    const origin = global.location?.origin || "";
    if (!origin || !objectApiName) return null;
    if (ruleId) {
      return `${origin}/lightning/setup/ObjectManager/${encodeURIComponent(objectApiName)}/ValidationRules/${ruleId}/view`;
    }
    return `${origin}/lightning/setup/ObjectManager/${encodeURIComponent(objectApiName)}/ValidationRules/view`;
  }

  function buildFlowSetupUrl(flowId) {
    const origin = global.location?.origin || "";
    if (!origin || !flowId) return null;
    return `${origin}/lightning/setup/Flows/${flowId}/view`;
  }

  /**
   * @param {string} errorText
   * @param {{ object?: string, recordId?: string, context?: string }} pageContext
   * @returns {Promise<object>}
   */
  async function investigateOrg(errorText, pageContext = {}) {
    const result = {
      sessionAvailable: false,
      investigatedAt: new Date().toISOString(),
      objectApiName: pageContext.object && pageContext.object !== "Unknown" ? pageContext.object : null,
      recordId: pageContext.recordId || null,
      user: null,
      validationRule: null,
      flow: null,
      field: null,
      failureExplanation: null,
      setupLinks: [],
    };

    try {
      const apiVersion = await getApiVersion();
      result.sessionAvailable = true;
      result.apiVersion = apiVersion;

      const user = await getCurrentUser(apiVersion);
      if (user) result.user = user;

      const objectName =
        (await resolveObjectApiName(pageContext, apiVersion)) || result.objectApiName;
      if (objectName) result.objectApiName = objectName;

      if (looksLikeValidation(errorText)) {
        if (objectName) {
          const rules = await getValidationRules(objectName, apiVersion);
          const matched = matchValidationRule(errorText, rules);
          if (matched) {
            result.validationRule = {
              id: matched.Id,
              apiName: matched.ValidationName,
              errorMessage: matched.ErrorMessage,
              errorDisplayField: matched.ErrorDisplayField,
              objectApiName: matched.EntityDefinition?.QualifiedApiName || objectName,
              objectLabel: matched.EntityDefinition?.Label || objectName,
            };
            result.objectApiName = result.validationRule.objectApiName;
            result.failureExplanation = `Validation rule "${matched.ValidationName}" on ${result.validationRule.objectLabel || objectName} rejected the save. Error shown to user: "${trimValidationMsg(matched.ErrorMessage)}".`;

            const setupUrl = buildValidationSetupUrl(result.objectApiName, matched.Id);
            if (setupUrl) {
              result.setupLinks.push({
                label: `Open rule: ${matched.ValidationName}`,
                url: setupUrl,
              });
            }

            if (matched.ErrorDisplayField) {
              result.field = await describeField(
                result.objectApiName,
                matched.ErrorDisplayField,
                apiVersion
              );
            }
          } else if (rules.length) {
            result.failureExplanation = `Validation failed on ${objectName}. ${rules.length} active rule(s) found in Object Manager — compare page message to each rule's Error Message.`;
            const listUrl = buildValidationSetupUrl(objectName);
            if (listUrl) {
              result.setupLinks.push({
                label: `Object Manager → ${objectName} → Validation Rules (${rules.length})`,
                url: listUrl,
              });
            }
          } else {
            result.failureExplanation = `No active validation rules returned for ${objectName}. Confirm API access and View Setup permission.`;
            const listUrl = buildValidationSetupUrl(objectName);
            if (listUrl) result.setupLinks.push({ label: `Open ${objectName} in Object Manager`, url: listUrl });
          }
        } else {
          result.failureExplanation =
            "Could not determine object from URL. Open the Account (or target object) record page, then click Analyze Now.";
        }
      }

      const flowName = extractFlowName(errorText);
      if (flowName) {
        const flow = await lookupFlow(flowName, apiVersion);
        if (flow) {
          result.flow = {
            id: flow.Id,
            apiName: flow.ApiName,
            label: flow.Label,
            processType: flow.ProcessType,
            isActive: flow.IsActive,
          };
          const flowUrl = buildFlowSetupUrl(flow.Id);
          if (flowUrl) {
            result.setupLinks.push({ label: `Open flow: ${flow.Label || flow.ApiName}`, url: flowUrl });
          }
          if (!result.failureExplanation) {
            result.failureExplanation = `Flow "${flow.Label || flow.ApiName}" (${flow.ProcessType || "Flow"}) failed in your org.`;
          }
        }
      }

      if (looksLikePermission(errorText)) {
        const fieldName = extractFieldFromPermissionError(errorText);
        const objectName = result.objectApiName;
        if (fieldName && objectName) {
          const field = await describeField(objectName, fieldName, apiVersion);
          if (field) {
            result.field = field;
            result.failureExplanation =
              `User${user?.name ? ` "${user.name}"` : ""} may lack Edit access to field "${field.label}" (${field.apiName}) on ${objectName}. Check profile/permission set FLS.`;
            result.setupLinks.push({
              label: `Object Manager → ${objectName} → Fields`,
              url: `${global.location?.origin}/lightning/setup/ObjectManager/${encodeURIComponent(objectName)}/FieldsAndRelationships/view`,
            });
          }
        }
      }

      return result;
    } catch (err) {
      result.sessionAvailable = false;
      result.sessionError = err.message || "Session lookup failed";
      return result;
    }
  }

  function mergeOrgIntoAnalysis(analysis, orgContext) {
    if (!analysis || !orgContext?.sessionAvailable) return analysis;

    const inv = { ...(analysis.investigation || {}) };
    const help = { ...(analysis.helpArticle || {}) };
    const classification = { ...(analysis.classification || {}) };
    const actions = [...(inv.suggestedActions || help.quickChecks || [])];

    if (orgContext.validationRule) {
      const vr = orgContext.validationRule;
      inv.validationRuleName = vr.apiName;
      inv.validationMessage = vr.errorMessage;
      inv.objectName = vr.objectApiName || inv.objectName;
      inv.orgEnriched = true;
      inv.headline = `Validation rule "${vr.apiName}" on ${vr.objectLabel || vr.objectApiName} blocked the save`;
      inv.narrative =
        orgContext.failureExplanation ||
        `Rule "${vr.apiName}" fired on ${vr.objectApiName}. Message: ${vr.errorMessage}`;
      classification.category = "VALIDATION";
      classification.failureType = "validation_rule";
      classification.label = "Validation Rule";
      classification.confidence = Math.max(classification.confidence || 0.6, 0.92);
      help.setupPath = `Setup → Object Manager → ${vr.objectApiName} → Validation Rules → ${vr.apiName}`;
      actions.unshift(`Open validation rule "${vr.apiName}" in Setup`);
      if (vr.errorDisplayField) {
        actions.push(`Review field: ${vr.errorDisplayField}`);
      }
    } else if (orgContext.failureExplanation) {
      inv.orgEnriched = true;
      if (!inv.narrative || inv.narrative.length < 40) {
        inv.narrative = orgContext.failureExplanation;
      }
    }

    if (orgContext.flow) {
      inv.flowName = orgContext.flow.label || orgContext.flow.apiName;
      inv.flowApiName = orgContext.flow.apiName;
      inv.flowId = orgContext.flow.id;
    }

    if (orgContext.field) {
      inv.fieldName = orgContext.field.label || orgContext.field.apiName;
      inv.fieldApiName = orgContext.field.apiName;
    }

    if (orgContext.user) {
      inv.runningUser = orgContext.user.name;
      inv.runningUserProfile = orgContext.user.profileName;
    }

    orgContext.setupLinks?.forEach((link) => {
      if (link?.label && !actions.includes(link.label)) actions.push(link.label);
    });

    inv.suggestedActions = actions;
    inv.orgContext = orgContext;
    help.quickChecks = actions;

    return {
      ...analysis,
      classification,
      investigation: inv,
      helpArticle: help,
    };
  }

  global.FixForceOrgInvestigator = {
    investigateOrg,
    mergeOrgIntoAnalysis,
    extractValidationHints,
    matchValidationRule,
    ENRICH_TIMEOUT_MS,
  };
})(typeof window !== "undefined" ? window : self);
