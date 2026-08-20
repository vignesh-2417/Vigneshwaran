import { PRODUCT_NAME, type AnalyzeSuccessResponse } from "@sfcopilot/shared";
import type { FormEvent } from "react";
import type { AssistantState } from "./assistantState.js";

interface AssistantPanelProps {
  state: AssistantState;
  targetOrg: string;
  top: number;
  right: number;
  requirement: string;
  onRequirementChange: (value: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  onReset: () => void;
  onSubmit: () => void;
  onConsentChange: (value: boolean) => void;
}

export function AssistantPanel({
  state,
  targetOrg,
  top,
  right,
  requirement,
  onRequirementChange,
  onClose,
  onMinimize,
  onReset,
  onSubmit,
  onConsentChange
}: AssistantPanelProps) {
  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section
      className="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sfcopilot-title"
      data-minimized={state.minimized ? "true" : "false"}
      style={{ top: `${top + 60}px`, right: `${right}px` }}
    >
      <header className="panel-header">
        <h1 className="panel-title" id="sfcopilot-title">
          {PRODUCT_NAME}
        </h1>
        <div className="header-actions">
          <button type="button" className="icon-action" aria-label="Reset conversation" onClick={onReset}>
            Reset
          </button>
          <button
            type="button"
            className="icon-action"
            aria-label={state.minimized ? "Expand panel" : "Minimize panel"}
            onClick={onMinimize}
          >
            {state.minimized ? "Open" : "Min"}
          </button>
          <button type="button" className="icon-action" aria-label="Close assistant" onClick={onClose}>
            Close
          </button>
        </div>
      </header>
      {!state.minimized ? (
        <div className="panel-body">
          <div className="privacy-banner" role="note">
            Page context (hostname, URL route, object, and record ID when present) is sent to the
            backend only after you submit. Field values are never read from the page.
          </div>
          <div className="conversation" aria-live="polite">
            {state.messages.map((message) => (
              <div key={message.id} className={`message message-${message.role}`}>
                {message.text}
              </div>
            ))}
            {state.status === "loading" ? (
              <div className="status status-loading" role="status">
                Analyzing requirement…
              </div>
            ) : null}
            {state.status === "error" && state.errorMessage ? (
              <div className="status status-error" role="alert">
                {state.errorMessage}
              </div>
            ) : null}
            {state.analysis ? <AnalysisViews analysis={state.analysis} /> : null}
          </div>
          <form className="composer" onSubmit={onFormSubmit}>
            <label htmlFor="sfcopilot-requirement">Salesforce requirement</label>
            <textarea
              id="sfcopilot-requirement"
              value={requirement}
              onChange={(event) => onRequirementChange(event.target.value)}
              placeholder="Create a Customer Tier picklist field on Account with Gold, Silver, and Bronze values."
            />
            <label>
              <input
                type="checkbox"
                checked={state.contextConsent}
                onChange={(event) => onConsentChange(event.target.checked)}
              />{" "}
              I understand Salesforce page context will be sent for analysis.
            </label>
            <p className="org-target">Target org host: {targetOrg}</p>
            <div className="composer-actions">
              <button type="submit" className="primary" disabled={state.status === "loading"}>
                Submit
              </button>
              <button type="button" className="secondary" disabled>
                Approve validation or deploy
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function AnalysisViews({ analysis }: { analysis: AnalyzeSuccessResponse }) {
  return (
    <>
      {analysis.blockedOperations.length > 0 ? (
        <section className="section" aria-label="Blocked operations">
          <h3>Blocked operations</h3>
          <ul>
            {analysis.blockedOperations.map((item) => (
              <li key={item.type}>
                {item.reason} Matched: {item.matchedPhrase}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {analysis.clarifyingQuestions.length > 0 ? (
        <section className="section" aria-label="Clarifying questions">
          <h3>Clarifying questions</h3>
          <ol>
            {analysis.clarifyingQuestions.map((item) => (
              <li key={item.id}>{item.prompt}</li>
            ))}
          </ol>
        </section>
      ) : null}
      {analysis.structuredRequirement ? (
        <section className="section" aria-label="Structured requirement">
          <h3>Structured requirement</h3>
          <p>{analysis.structuredRequirement.summary}</p>
        </section>
      ) : null}
      {analysis.implementationPlan.length > 0 ? (
        <section className="section" aria-label="Implementation plan">
          <h3>Implementation plan</h3>
          <ol>
            {analysis.implementationPlan.map((step) => (
              <li key={step.id}>
                <strong>{step.title}</strong>
                <div>{step.detail}</div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {analysis.metadataArtifacts.length > 0 ? (
        <section className="section" aria-label="Metadata diff">
          <h3>Metadata diff</h3>
          {analysis.metadataArtifacts.map((artifact) => (
            <div key={artifact.filePath}>
              <p>{artifact.filePath}</p>
              <pre className="diff">{artifact.after}</pre>
            </div>
          ))}
        </section>
      ) : null}
      {analysis.validation.status !== "not_run" ? (
        <section className="section" aria-label="Validation results">
          <h3>Validation</h3>
          <p>Status: {analysis.validation.status}</p>
          <ul>
            {analysis.validation.issues.map((issue) => (
              <li key={`${issue.severity}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {analysis.warning ? (
        <section className="section" aria-label="Warning">
          <p>{analysis.warning}</p>
        </section>
      ) : null}
    </>
  );
}
