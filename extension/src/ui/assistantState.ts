import type { AnalyzeSuccessResponse } from "@sfcopilot/shared";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

export type AssistantStatus = "idle" | "loading" | "error";

export interface AssistantState {
  open: boolean;
  minimized: boolean;
  status: AssistantStatus;
  errorMessage: string | null;
  messages: ChatMessage[];
  analysis: AnalyzeSuccessResponse | null;
  lastRequirement: string;
  contextConsent: boolean;
}

export const EMPTY_ASSISTANT_STATE: AssistantState = {
  open: false,
  minimized: false,
  status: "idle",
  errorMessage: null,
  messages: [
    {
      id: "welcome",
      role: "system",
      text: "Sign in, then enter a metadata requirement. Processing and results appear in this panel."
    }
  ],
  analysis: null,
  lastRequirement: "",
  contextConsent: false
};

export function createMessage(role: ChatRole, text: string): ChatMessage {
  return {
    id: `${role}-${crypto.randomUUID()}`,
    role,
    text
  };
}
