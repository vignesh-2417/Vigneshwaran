import { useEffect, useMemo, useState } from "react";
import {
  detectSalesforceContext,
  type SalesforceContext
} from "@sfcopilot/shared";
import type { AssistantApi } from "../api/assistantApi.js";
import { DEFAULT_ICON_POSITION, type IconPosition } from "../config.js";
import { AssistantPanel } from "./AssistantPanel.js";
import {
  EMPTY_ASSISTANT_STATE,
  createMessage,
  type AssistantState
} from "./assistantState.js";
import { FloatingIcon } from "./FloatingIcon.js";

export interface CopilotAppProps {
  api: AssistantApi;
  getContext: () => SalesforceContext;
  initialPosition?: IconPosition;
  onPositionChange?: (position: IconPosition) => void;
}

export function CopilotApp({
  api,
  getContext,
  initialPosition = DEFAULT_ICON_POSITION,
  onPositionChange
}: CopilotAppProps) {
  const [state, setState] = useState<AssistantState>(EMPTY_ASSISTANT_STATE);
  const [requirement, setRequirement] = useState("");
  const [position, setPosition] = useState<IconPosition>(initialPosition);
  const context = useMemo(() => getContext(), [getContext, state.open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state.open) {
        setState((current) => ({ ...current, open: false }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.open]);

  const updatePosition = (top: number, right: number) => {
    const next = { top, right };
    setPosition(next);
    onPositionChange?.(next);
  };

  const close = () => setState((current) => ({ ...current, open: false }));
  const toggle = () =>
    setState((current) => ({
      ...current,
      open: !current.open,
      minimized: current.open ? current.minimized : false
    }));
  const reset = () => {
    setState(EMPTY_ASSISTANT_STATE);
    setRequirement("");
  };

  const submit = async () => {
    const text = requirement.trim();
    if (!text) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Enter a Salesforce requirement before submitting."
      }));
      return;
    }
    if (!state.contextConsent) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Confirm that page context may be sent before submitting."
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "loading",
      errorMessage: null,
      messages: [...current.messages, createMessage("user", text)],
      lastRequirement: text
    }));

    try {
      const result = await api.analyze(text, getContext());
      if (!result.ok) {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage: result.message,
          analysis: null
        }));
        return;
      }
      setState((current) => ({
        ...current,
        status: "idle",
        analysis: result,
        messages: [
          ...current.messages,
          createMessage(
            "assistant",
            result.blockedOperations.length > 0
              ? "This request is blocked by product policy."
              : result.clarifyingQuestions.length > 0
                ? "I need a little more detail before planning the change."
                : "Here is a mock implementation plan. Approval stays disabled in this phase."
          )
        ]
      }));
    } catch {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "The assistant could not complete analysis. Try again."
      }));
    }
  };

  return (
    <div className="copilot-root">
      <FloatingIcon
        pressed={state.open}
        top={position.top}
        right={position.right}
        onToggle={toggle}
        onPositionChange={updatePosition}
      />
      {state.open ? (
        <AssistantPanel
          state={state}
          targetOrg={context.hostname}
          top={position.top}
          right={position.right}
          requirement={requirement}
          onRequirementChange={setRequirement}
          onClose={close}
          onMinimize={() =>
            setState((current) => ({ ...current, minimized: !current.minimized }))
          }
          onReset={reset}
          onSubmit={() => {
            void submit();
          }}
          onConsentChange={(value) =>
            setState((current) => ({ ...current, contextConsent: value }))
          }
        />
      ) : null}
    </div>
  );
}

export function browserContext(): SalesforceContext {
  return detectSalesforceContext(window.location);
}
