import { useEffect, useMemo, useState } from "react";
import {
  applyFieldTypeHint,
  detectSalesforceContext,
  type FieldCatalogId,
  type SalesforceContext
} from "@sfcopilot/shared";
import type { AssistantApi, SalesforceAuthState, SalesforceEnvironment } from "../api/assistantApi.js";
import { DEFAULT_ICON_POSITION, type IconPosition } from "../config.js";
import { AssistantPanel } from "./AssistantPanel.js";
import { AuthScreens } from "./AuthScreens.js";
import {
  EMPTY_ASSISTANT_STATE,
  createMessage,
  type AssistantState
} from "./assistantState.js";
import { FloatingIcon } from "./FloatingIcon.js";
import { ANONYMOUS_AUTH } from "../salesforce/authTypes.js";

export interface CopilotAppProps {
  api: AssistantApi;
  getContext: () => SalesforceContext;
  initialPosition?: IconPosition;
  initialOpen?: boolean;
  onPositionChange?: (position: IconPosition) => void;
}

export function CopilotApp({
  api,
  getContext,
  initialPosition = DEFAULT_ICON_POSITION,
  initialOpen = false,
  onPositionChange
}: CopilotAppProps) {
  const [state, setState] = useState<AssistantState>({
    ...EMPTY_ASSISTANT_STATE,
    open: initialOpen
  });
  const [requirement, setRequirement] = useState("");
  const [fieldTypeId, setFieldTypeId] = useState<FieldCatalogId | "infer">("infer");
  const [position, setPosition] = useState<IconPosition>(initialPosition);
  const [auth, setAuth] = useState<SalesforceAuthState>(ANONYMOUS_AUTH);
  const [environment, setEnvironment] = useState<SalesforceEnvironment>("production");
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const context = useMemo(() => getContext(), [getContext, state.open]);

  useEffect(() => {
    void api.getAuthState().then((next) => {
      setAuth(next);
    });
  }, [api]);

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
    setState((current) => ({
      ...EMPTY_ASSISTANT_STATE,
      open: current.open,
      contextConsent: current.contextConsent
    }));
    setRequirement("");
    setFieldTypeId("infer");
    setCreating(false);
  };

  const connect = () => {
    setLoginStatus("loading");
    setLoginError(null);
    setSessionExpired(false);
    void api
      .connect(environment)
      .then((next) => {
        setAuth(next);
        setLoginStatus("idle");
        setState((current) => ({
          ...current,
          open: true,
          messages: [
            ...current.messages,
            createMessage("system", "Connected with Salesforce OAuth. Enter a requirement to analyze.")
          ]
        }));
      })
      .catch((error: unknown) => {
        setLoginStatus("error");
        setLoginError(
          error instanceof Error ? error.message : "Unable to connect to Salesforce."
        );
      });
  };

  const disconnect = () => {
    void api.logout().then(() => {
      setAuth(ANONYMOUS_AUTH);
      setSessionExpired(false);
      setLoginStatus("idle");
      setLoginError(null);
      reset();
    });
  };

  const submit = async () => {
    const text = applyFieldTypeHint(requirement.trim(), fieldTypeId);
    if (!requirement.trim()) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Enter a Salesforce requirement before submitting."
      }));
      return;
    }
    if (!auth.authenticated) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Connect Salesforce before running Analyze."
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
      analysis: null,
      planApproved: false,
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
      const assistantText =
        result.blockedOperations.length > 0
          ? "Stopped. This request is security-sensitive. See the blocked-change report."
          : result.clarifyingQuestions.length > 0
            ? "ANALYZE needs more detail before PLAN."
            : "ANALYZE through REVIEW completed. Review the metadata preview, then Create Metadata.";
      setState((current) => ({
        ...current,
        status: "idle",
        analysis: result,
        messages: [...current.messages, createMessage("assistant", assistantText)]
      }));
    } catch {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "The assistant could not complete analysis. Try again."
      }));
    }
  };

  const createField = async () => {
    const text = state.lastRequirement.trim();
    if (!text || !state.analysis) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Run Analyze and review the field preview before creating it in the org."
      }));
      return;
    }
    if (!auth.authenticated) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Connect Salesforce before creating a field."
      }));
      return;
    }
    setCreating(true);
    setState((current) => ({
      ...current,
      status: "loading",
      errorMessage: null
    }));
    try {
      const result = await api.createCustomField(text, getContext().objectApiName);
      setCreating(false);
      setState((current) => ({
        ...current,
        status: "idle",
        planApproved: true,
        analysis: current.analysis
          ? {
              ...current.analysis,
              operatingMode: "DEPLOY",
              deploymentStatus: result.created || result.alreadyExists ? "succeeded" : "failed",
              warning: result.message
            }
          : current.analysis,
        messages: [...current.messages, createMessage("assistant", result.message)]
      }));
    } catch (error) {
      setCreating(false);
      const message =
        error instanceof Error ? error.message : "Salesforce rejected the field create.";
      const expired = /session has expired/i.test(message);
      if (expired) {
        setAuth(ANONYMOUS_AUTH);
        setSessionExpired(true);
      }
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: message
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
      {state.open && auth.authenticated ? (
        <AssistantPanel
          state={state}
          auth={auth}
          targetOrg={context.hostname}
          top={position.top + 64}
          right={position.right}
          requirement={requirement}
          fieldTypeId={fieldTypeId}
          sessionExpired={sessionExpired}
          creating={creating}
          onRequirementChange={setRequirement}
          onFieldTypeChange={setFieldTypeId}
          onQuickAction={(text, type) => {
            setRequirement(text);
            setFieldTypeId(type);
          }}
          onClose={close}
          onMinimize={() =>
            setState((current) => ({ ...current, minimized: !current.minimized }))
          }
          onReset={reset}
          onSubmit={() => {
            void submit();
          }}
          onCreateField={() => {
            void createField();
          }}
          onCancelPreview={reset}
          onCreateAnother={reset}
          onConsentChange={(value) =>
            setState((current) => ({ ...current, contextConsent: value }))
          }
          onDisconnect={disconnect}
          onOpenSalesforce={() => {
            if (auth.instanceUrl) {
              window.open(auth.instanceUrl, "_blank", "noopener,noreferrer");
            }
          }}
          onReconnect={connect}
        />
      ) : state.open ? (
        <section
          className="panel panel-wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sfcopilot-title"
          style={{ top: `${position.top + 64}px`, right: `${position.right}px` }}
        >
          <header className="panel-header">
            <h1 className="panel-title" id="sfcopilot-title">
              Salesforce Metadata Copilot
            </h1>
            <button type="button" className="icon-action" aria-label="Close assistant" onClick={close}>
              Close
            </button>
          </header>
          <AuthScreens
            environment={environment}
            status={loginStatus}
            errorMessage={loginError}
            onEnvironmentChange={setEnvironment}
            onConnect={connect}
          />
        </section>
      ) : null}
    </div>
  );
}

export function browserContext(): SalesforceContext {
  return detectSalesforceContext(window.location);
}
