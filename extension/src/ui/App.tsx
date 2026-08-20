import { useEffect, useMemo, useState } from "react";
import {
  deriveSalesforceLoginHost,
  detectSalesforceContext,
  type SalesforceContext
} from "@sfcopilot/shared";
import type { AssistantApi, SalesforceAuthState } from "../api/assistantApi.js";
import { DEFAULT_ICON_POSITION, type IconPosition } from "../config.js";
import { AssistantPanel } from "./AssistantPanel.js";
import {
  EMPTY_ASSISTANT_STATE,
  createMessage,
  type AssistantState
} from "./assistantState.js";
import { FloatingIcon } from "./FloatingIcon.js";
import { LoginForm } from "./LoginForm.js";

const ANONYMOUS: SalesforceAuthState = {
  authenticated: false,
  username: null,
  instanceUrl: null,
  mode: "anonymous"
};

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
  const [position, setPosition] = useState<IconPosition>(initialPosition);
  const [auth, setAuth] = useState<SalesforceAuthState>(ANONYMOUS);
  const [loginHost, setLoginHost] = useState(() =>
    deriveSalesforceLoginHost(getContext().hostname)
  );
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loginError, setLoginError] = useState<string | null>(null);
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
      open: current.open
    }));
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
    if (!auth.authenticated) {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Sign in with Salesforce credentials before creating metadata in the org."
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
      const assistantText =
        result.blockedOperations.length > 0
          ? "This request is blocked by product policy."
          : result.clarifyingQuestions.length > 0
            ? "I need a little more detail before planning the change."
            : result.deploymentStatus === "succeeded"
              ? "Created the custom field in the org as the signed-in user."
              : result.deploymentStatus === "failed"
                ? "Signed in, but Salesforce rejected the field create. See the error below."
                : "Here is a mock implementation plan. Sign-in was not used to change the org.";
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

  const loginForm = (
    <LoginForm
      auth={auth}
      loginHost={loginHost}
      status={loginStatus}
      errorMessage={loginError}
      onLoginHostChange={setLoginHost}
      onLogin={(input) => {
        setLoginStatus("loading");
        setLoginError(null);
        void api
          .login(input)
          .then((next) => {
            setAuth(next);
            setLoginStatus("idle");
            setState((current) => ({
              ...current,
              open: true,
              messages: [
                ...current.messages,
                createMessage("system", `Signed in as ${next.username}. Submit a requirement to run it as this user.`)
              ]
            }));
          })
          .catch((error: unknown) => {
            setLoginStatus("error");
            setLoginError(error instanceof Error ? error.message : "Salesforce login failed.");
          });
      }}
      onLogout={() => {
        void api.logout().then(() => {
          setAuth(ANONYMOUS);
          setLoginError(null);
        });
      }}
    />
  );

  return (
    <div className="copilot-root">
      <FloatingIcon
        pressed={state.open}
        top={position.top}
        right={position.right}
        onToggle={toggle}
        onPositionChange={updatePosition}
      />
      <div
        className="login-float"
        style={{ top: `${position.top + 64}px`, right: `${position.right}px` }}
      >
        {loginForm}
      </div>
      {state.open ? (
        <AssistantPanel
          state={state}
          targetOrg={context.hostname}
          top={position.top + (auth.authenticated ? 168 : 312)}
          right={position.right}
          requirement={requirement}
          authenticated={auth.authenticated}
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
