/**
 * FixForce – ai.js
 * Pre-classification (rule-based) + OpenAI analysis for Salesforce errors.
 */

const OpenAI = require("openai");
const logger = require("./logger");
const { classifyError, preClassify } = require("./classifier");
const { getHelpArticle } = require("./helpArticles");

// ─── OpenAI Client ────────────────────────────────────────────────────────────
let openai;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// ─── AI Prompt Builder ────────────────────────────────────────────────────────
function buildPrompt({ errorText, object, context, url, classification }) {
  return `You are a senior Salesforce architect and support engineer with deep expertise in Salesforce Lightning, Apex, Flows, CPQ, and security models.

A Salesforce user encountered the following error. Analyze it and return a structured JSON response.

## Error Details
- **Error Message**: ${errorText}
- **Salesforce Object**: ${object || "Unknown"}
- **Page Context**: ${context || "Unknown"}
- **URL**: ${url || "Not provided"}
- **Pre-classified Category**: ${classification.category} (${classification.label})
- **Failure Type**: ${classification.failureType}
- **Classifier Confidence**: ${classification.confidence}

## Task
1. Identify the root cause of this error in plain English (2-3 sentences max).
2. Provide 3-6 actionable, step-by-step fix instructions. Each step should say exactly WHERE in Salesforce to make the change (e.g., Setup > Object Manager > Opportunity > Validation Rules).
3. Confirm or correct the error category: VALIDATION, PERMISSION, FLOW, APEX, CPQ, DATA, LOCK, REQUIRED_FIELD, NULL_POINTER, UNKNOWN.
4. Estimate your confidence (0.0 to 1.0) based on how specific the error message is.

## Output Format (STRICT JSON, no markdown, no preamble)
{
  "rootCause": "string",
  "fixSteps": ["string", "string", "string"],
  "category": "VALIDATION|PERMISSION|FLOW|APEX|CPQ|DATA|LOCK|REQUIRED_FIELD|NULL_POINTER|UNKNOWN",
  "confidence": 0.0
}`;
}

function buildAnalysisPayload(classification, parsed, errorText, context) {
  const validCategories = [
    "VALIDATION", "PERMISSION", "FLOW", "APEX", "CPQ",
    "DATA", "LOCK", "REQUIRED_FIELD", "NULL_POINTER", "UNKNOWN",
  ];

  let category = validCategories.includes(parsed.category) ? parsed.category : classification.category;
  if (category === "UNKNOWN" && classification.category !== "UNKNOWN") {
    category = classification.category;
  }

  const finalClassification = {
    ...classification,
    category,
    label:
      classification.category === category
        ? classification.label
        : category.replace(/_/g, " "),
  };

  const helpArticle = getHelpArticle(finalClassification, errorText, context);

  return {
    rootCause: String(parsed.rootCause || helpArticle.summary),
    fixSteps: Array.isArray(parsed.fixSteps)
      ? parsed.fixSteps.map(String).slice(0, 8)
      : helpArticle.quickChecks,
    category,
    failureType: finalClassification.failureType || category.toLowerCase(),
    failureLabel: helpArticle.categoryLabel || finalClassification.label,
    confidence: Math.max(
      classification.confidence,
      Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5))
    ),
    helpArticle: {
      title: helpArticle.title,
      summary: helpArticle.summary,
      url: helpArticle.url,
      setupPath: helpArticle.setupPath,
      quickChecks: helpArticle.quickChecks,
    },
    classifier: {
      matchedPatterns: classification.matchedPatterns,
      preCategory: classification.category,
    },
  };
}

// ─── AI Call ──────────────────────────────────────────────────────────────────
async function analyzeWithAI(params) {
  const { errorText, object, context, url } = params;

  const classification = classifyError(errorText, context);
  logger.debug("Pre-classification result", {
    classification,
    errorText: errorText.slice(0, 100),
  });

  const prompt = buildPrompt({ errorText, object, context, url, classification });

  const ai = getOpenAI();
  const response = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a Salesforce expert assistant. Always respond with valid JSON only. No markdown, no explanation outside JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from OpenAI");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    logger.error("Failed to parse AI response", { raw });
    throw new Error("AI returned invalid JSON");
  }

  return buildAnalysisPayload(classification, parsed, errorText, context);
}

// ─── Fallback (offline / no API key) ─────────────────────────────────────────
function buildFallbackResponse(errorText, context) {
  const classification = classifyError(errorText, context);
  const helpArticle = getHelpArticle(classification, errorText, context);

  const FALLBACK_ADVICE = {
    VALIDATION: {
      rootCause:
        "A Salesforce validation rule is preventing this record from being saved. The rule enforces a business requirement that the current field values do not satisfy.",
      fixSteps: helpArticle.quickChecks,
    },
    REQUIRED_FIELD: {
      rootCause:
        "A required field is missing on save. Check page layout requirements, field definitions, or automation that clears values.",
      fixSteps: helpArticle.quickChecks,
    },
    PERMISSION: {
      rootCause:
        "The current user does not have the required permissions to perform this action. This could be due to profile settings, permission sets, field-level security, or object-level access.",
      fixSteps: helpArticle.quickChecks,
    },
    FLOW: {
      rootCause:
        "A Salesforce Flow encountered an error during execution. This is often caused by missing required fields, invalid record IDs, or logic errors within the flow.",
      fixSteps: helpArticle.quickChecks,
    },
    APEX: {
      rootCause:
        "An Apex trigger or class threw an exception during execution. This may be due to governor limits, null references, or business logic errors in custom code.",
      fixSteps: helpArticle.quickChecks,
    },
    CPQ: {
      rootCause:
        "A Salesforce CPQ rule or calculation failed. Review product rules, pricing rules, and quote line configuration.",
      fixSteps: helpArticle.quickChecks,
    },
    DATA: {
      rootCause:
        "A data integrity rule blocked the save—duplicate detection, invalid lookup, or malformed record reference.",
      fixSteps: helpArticle.quickChecks,
    },
    LOCK: {
      rootCause:
        "The record is currently locked by another operation (usually a workflow, trigger, or another user), preventing simultaneous updates.",
      fixSteps: helpArticle.quickChecks,
    },
    NULL_POINTER: {
      rootCause:
        "Apex code dereferenced a null object or field. Add null checks before accessing relationship fields or query results.",
      fixSteps: helpArticle.quickChecks,
    },
    UNKNOWN: {
      rootCause: helpArticle.summary,
      fixSteps: helpArticle.quickChecks,
    },
  };

  const advice = FALLBACK_ADVICE[classification.category] || FALLBACK_ADVICE.UNKNOWN;

  return {
    rootCause: advice.rootCause,
    fixSteps: advice.fixSteps,
    category: classification.category,
    failureType: classification.failureType,
    failureLabel: classification.label,
    confidence: classification.confidence,
    helpArticle: {
      title: helpArticle.title,
      summary: helpArticle.summary,
      url: helpArticle.url,
      setupPath: helpArticle.setupPath,
      quickChecks: helpArticle.quickChecks,
    },
    classifier: {
      matchedPatterns: classification.matchedPatterns,
      preCategory: classification.category,
    },
  };
}

module.exports = { analyzeWithAI, preClassify, classifyError, buildFallbackResponse };
