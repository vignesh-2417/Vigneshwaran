/**
 * FixForce – ai.js
 * Deep investigation + optional OpenAI enrichment for Salesforce errors.
 */

const OpenAI = require("openai");
const logger = require("./logger");
const { investigateError } = require("./investigator");
const { getHelpArticle } = require("./helpArticles");

let openai;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const VALID_CATEGORIES = [
  "VALIDATION", "PERMISSION", "FLOW", "APEX", "CPQ", "DATA", "LOCK",
  "REQUIRED_FIELD", "NULL_POINTER", "INTEGRATION", "APPROVAL", "EMAIL",
  "SHARING", "UNKNOWN",
];

function buildPrompt({ errorText, object, context, url, classification, investigation }) {
  return `You are a senior Salesforce architect. A user hit an error that was pre-investigated.

## Error Message
${errorText}

## Context
- Object: ${object || "Unknown"}
- Page: ${context || "Unknown"}
- URL: ${url || "N/A"}

## Pre-Investigation (trust this unless clearly wrong)
- Category: ${classification.label} (${classification.failureType})
- Headline: ${investigation.headline}
- Narrative: ${investigation.narrative}
${investigation.flowName ? `- Flow Name: ${investigation.flowName}` : ""}
${investigation.flowElement ? `- Failing Element: ${investigation.flowElement}` : ""}
${investigation.fieldName ? `- Field Involved: ${investigation.fieldName}` : ""}

## Task
Return JSON with:
1. rootCause — 2-3 sentences explaining WHY this failed (name the flow/field if known)
2. fixSteps — 3-6 steps with exact Setup navigation paths
3. category — confirm or correct: ${VALID_CATEGORIES.join(", ")}
4. confidence — 0.0 to 1.0

{
  "rootCause": "string",
  "fixSteps": ["string"],
  "category": "FLOW",
  "confidence": 0.9
}`;
}

function buildAnalysisPayload(investigationResult, parsed, errorText, context, objectHint) {
  const { classification, investigation } = investigationResult;

  let category = VALID_CATEGORIES.includes(parsed?.category)
    ? parsed.category
    : classification.category;

  const finalClassification = { ...classification, category };
  const helpArticle = getHelpArticle(finalClassification, errorText, context, investigation);

  const rootCause =
    parsed?.rootCause ||
    investigation.narrative ||
    helpArticle.investigationSummary ||
    helpArticle.summary;

  const fixSteps =
    Array.isArray(parsed?.fixSteps) && parsed.fixSteps.length
      ? parsed.fixSteps.map(String).slice(0, 8)
      : investigation.suggestedActions?.length
        ? investigation.suggestedActions
        : helpArticle.quickChecks;

  return {
    rootCause: String(rootCause),
    fixSteps,
    category,
    failureType: finalClassification.failureType,
    failureLabel: finalClassification.label,
    confidence: Math.max(
      finalClassification.confidence,
      Math.max(0, Math.min(1, Number(parsed?.confidence) || 0.5))
    ),
    investigation: {
      headline: investigation.headline,
      narrative: investigation.narrative,
      failureLayer: investigation.failureLayer,
      scenarioId: investigation.scenarioId,
      flowName: investigation.flowName,
      flowElement: investigation.flowElement,
      fieldName: investigation.fieldName,
      objectName: investigation.objectName || objectHint,
      apexClass: investigation.apexClass,
      secondaryCategories: investigation.secondaryCategories || [],
    },
    helpArticle: {
      title: helpArticle.title,
      summary: helpArticle.investigationSummary || helpArticle.summary,
      url: helpArticle.url,
      setupPath: helpArticle.setupPath,
      quickChecks: helpArticle.quickChecks,
      secondaryArticle: helpArticle.secondaryArticle || null,
      flowName: helpArticle.flowName,
      flowElement: helpArticle.flowElement,
      fieldName: helpArticle.fieldName,
    },
    classifier: {
      matchedPatterns: classification.matchedPatterns,
      preCategory: classification.category,
      isComposite: !!classification.isComposite,
    },
  };
}

async function analyzeWithAI(params) {
  const { errorText, object, context, url } = params;
  const investigationResult = investigateError(errorText, context, object);

  logger.debug("Investigation result", {
    scenario: investigationResult.investigation.scenarioId,
    headline: investigationResult.investigation.headline,
  });

  const prompt = buildPrompt({
    errorText,
    object,
    context,
    url,
    classification: investigationResult.classification,
    investigation: investigationResult.investigation,
  });

  const ai = getOpenAI();
  const response = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Salesforce expert. Respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 900,
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

  return buildAnalysisPayload(investigationResult, parsed, errorText, context, object);
}

function buildFallbackResponse(errorText, context, object) {
  const investigationResult = investigateError(errorText, context, object);
  return buildAnalysisPayload(investigationResult, null, errorText, context, object);
}

function preClassify(errorText, context) {
  return investigateError(errorText, context).classification.category;
}

module.exports = { analyzeWithAI, preClassify, buildFallbackResponse, investigateError };
