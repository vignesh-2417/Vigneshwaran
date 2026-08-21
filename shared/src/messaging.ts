import { z } from "zod";
import { ExtensionRequestSchema, ExtensionResponseSchema } from "./schemas.js";

export class MessageValidationError extends Error {
  public override readonly name = "MessageValidationError";

  public constructor(message: string) {
    super(message);
  }
}

export function parseExtensionRequest(input: unknown) {
  const result = ExtensionRequestSchema.safeParse(input);
  if (!result.success) {
    throw new MessageValidationError("Invalid extension message");
  }
  return result.data;
}

export function parseExtensionResponse(input: unknown) {
  const result = ExtensionResponseSchema.safeParse(input);
  if (!result.success) {
    throw new MessageValidationError("Invalid extension response");
  }
  return result.data;
}

export const AnalyzePayloadSchema = z.object({
  requirement: z.string(),
  salesforceContext: z.unknown()
});
