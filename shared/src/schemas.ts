import { z } from "zod";
import { MAX_REQUIREMENT_LENGTH, MAX_URL_LENGTH } from "./constants.js";

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const SalesforceIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/, "Invalid Salesforce id");

export const ObjectApiNameSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/, "Invalid object API name");

export const SalesforceContextSchema = z.object({
  hostname: z.string().min(1).max(255),
  url: z.string().min(1).max(MAX_URL_LENGTH),
  route: z.string().max(MAX_URL_LENGTH).nullable(),
  objectApiName: ObjectApiNameSchema.nullable(),
  recordId: SalesforceIdSchema.nullable(),
  confidence: ConfidenceSchema
});
export type SalesforceContext = z.infer<typeof SalesforceContextSchema>;

export const BlockedOperationTypeSchema = z.enum([
  "permission_sets",
  "permission_set_groups",
  "profiles",
  "sharing_rules",
  "sharing_settings",
  "user_access",
  "login_authentication",
  "connected_apps",
  "named_credentials",
  "external_credentials",
  "production_data",
  "destructive_metadata",
  "apex_callouts"
]);
export type BlockedOperationType = z.infer<typeof BlockedOperationTypeSchema>;

export const BlockedOperationSchema = z.object({
  type: BlockedOperationTypeSchema,
  reason: z.string().min(1).max(500),
  whySensitive: z.string().min(1).max(500),
  manualAction: z.string().min(1).max(500),
  matchedPhrase: z.string().min(1).max(120)
});
export type BlockedOperation = z.infer<typeof BlockedOperationSchema>;

export const ClarifyingQuestionSchema = z.object({
  id: z.string().min(1).max(80),
  prompt: z.string().min(1).max(500)
});
export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;

export const ImplementationStepSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  detail: z.string().min(1).max(2_000),
  metadataType: z.string().min(1).max(80)
});
export type ImplementationStep = z.infer<typeof ImplementationStepSchema>;

export const StructuredRequirementSchema = z.object({
  summary: z.string().min(1).max(500),
  objectApiName: z.string().max(80).nullable(),
  requestedChanges: z.array(z.string().min(1).max(300)).max(20)
});
export type StructuredRequirement = z.infer<typeof StructuredRequirementSchema>;

export const MetadataArtifactSchema = z.object({
  filePath: z.string().min(1).max(260),
  metadataType: z.string().min(1).max(80),
  before: z.string().max(20_000).nullable(),
  after: z.string().min(1).max(20_000)
});
export type MetadataArtifact = z.infer<typeof MetadataArtifactSchema>;

export const ValidationIssueSchema = z.object({
  severity: z.enum(["info", "warning", "error"]),
  message: z.string().min(1).max(500),
  filePath: z.string().max(260).nullable()
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const ValidationResultSchema = z.object({
  status: z.enum(["passed", "failed", "not_run"]),
  issues: z.array(ValidationIssueSchema).max(50)
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const OperatingModeSchema = z.enum([
  "ANALYZE",
  "PLAN",
  "GENERATE",
  "VALIDATE",
  "REVIEW",
  "DEPLOY"
]);
export type OperatingMode = z.infer<typeof OperatingModeSchema>;

export const GeneratedComponentSchema = z.object({
  componentType: z.string().min(1).max(80),
  apiName: z.string().min(1).max(120),
  purpose: z.string().min(1).max(500),
  dependencies: z.array(z.string().min(1).max(200)).max(20),
  assumptions: z.array(z.string().min(1).max(300)).max(20),
  deploymentOrder: z.string().min(1).max(400),
  testScenarios: z.array(z.string().min(1).max(300)).max(20),
  securityImpact: z.string().min(1).max(500),
  manualSetup: z.string().min(1).max(500)
});
export type GeneratedComponent = z.infer<typeof GeneratedComponentSchema>;

export const TaskReportSchema = z.object({
  interpretation: z.string().min(1).max(2_000),
  assumptions: z.array(z.string().min(1).max(400)).max(20),
  filesCreatedOrChanged: z.array(z.string().min(1).max(260)).max(50),
  generatedComponents: z.array(GeneratedComponentSchema).max(20),
  securityAndPermissionImpact: z.string().min(1).max(2_000),
  validationAndTestResults: z.string().min(1).max(2_000),
  deploymentPreview: z.string().min(1).max(2_000),
  remainingManualSteps: z.array(z.string().min(1).max(400)).max(20),
  knownLimitations: z.array(z.string().min(1).max(400)).max(20)
});
export type TaskReport = z.infer<typeof TaskReportSchema>;

export const DeploymentStatusSchema = z.enum([
  "not_requested",
  "blocked",
  "awaiting_approval",
  "in_progress",
  "succeeded",
  "failed"
]);
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

export const AnalyzeRequestSchema = z.object({
  requirement: z
    .string()
    .trim()
    .min(1, "Requirement cannot be empty")
    .max(MAX_REQUIREMENT_LENGTH, "Requirement is too large"),
  salesforceContext: SalesforceContextSchema
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AnalyzeSuccessResponseSchema = z.object({
  ok: z.literal(true),
  correlationId: z.string().uuid(),
  blockedOperations: z.array(BlockedOperationSchema),
  clarifyingQuestions: z.array(ClarifyingQuestionSchema),
  structuredRequirement: StructuredRequirementSchema.nullable(),
  implementationPlan: z.array(ImplementationStepSchema),
  metadataArtifacts: z.array(MetadataArtifactSchema),
  validation: ValidationResultSchema,
  deploymentStatus: DeploymentStatusSchema,
  operatingMode: OperatingModeSchema,
  taskReport: TaskReportSchema.nullable(),
  warning: z.string().max(2_000).nullable()
});
export type AnalyzeSuccessResponse = z.infer<typeof AnalyzeSuccessResponseSchema>;

export const AnalyzeErrorResponseSchema = z.object({
  ok: z.literal(false),
  correlationId: z.string().uuid(),
  code: z.enum([
    "INVALID_REQUEST",
    "EMPTY_REQUIREMENT",
    "REQUIREMENT_TOO_LARGE",
    "MISSING_CONTEXT",
    "TIMEOUT",
    "UNAUTHORIZED",
    "INTERNAL_ERROR"
  ]),
  message: z.string().min(1).max(500)
});
export type AnalyzeErrorResponse = z.infer<typeof AnalyzeErrorResponseSchema>;

export const AnalyzeResponseSchema = z.discriminatedUnion("ok", [
  AnalyzeSuccessResponseSchema,
  AnalyzeErrorResponseSchema
]);
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export const MESSAGE_PROTOCOL_VERSION = 1 as const;

export const SalesforceLoginPayloadSchema = z.object({
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(255),
  securityToken: z.string().max(128).default(""),
  loginHost: z.string().trim().min(1).max(255)
});
export type SalesforceLoginPayload = z.infer<typeof SalesforceLoginPayloadSchema>;

export const ExtensionMessageTypeSchema = z.enum([
  "ANALYZE_REQUIREMENT",
  "LOGIN_SALESFORCE",
  "LOGOUT_SALESFORCE",
  "GET_AUTH_STATE",
  "PING"
]);

export const ExtensionRequestSchema = z.object({
  v: z.literal(MESSAGE_PROTOCOL_VERSION),
  type: ExtensionMessageTypeSchema,
  requestId: z.string().uuid(),
  payload: z.unknown().optional()
});
export type ExtensionRequest = z.infer<typeof ExtensionRequestSchema>;

export const ExtensionResponseSchema = z.object({
  v: z.literal(MESSAGE_PROTOCOL_VERSION),
  requestId: z.string().uuid(),
  ok: z.boolean(),
  payload: z.unknown().optional(),
  error: z
    .object({
      code: z.string().min(1).max(80),
      message: z.string().min(1).max(500)
    })
    .optional()
});
export type ExtensionResponse = z.infer<typeof ExtensionResponseSchema>;
