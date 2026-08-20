import {
  FIELD_TYPE_GROUPS,
  OPERATING_MODES,
  PRODUCT_NAME,
  type AnalyzeSuccessResponse,
  type FieldCatalogId
} from "@sfcopilot/shared";
import type { FormEvent, ReactNode } from "react";
import type { AssistantState } from "./assistantState.js";

interface AssistantPanelProps {
  state: AssistantState;
  targetOrg: string;
  top: number;
  right: number;
  requirement: string;
  fieldTypeId: FieldCatalogId | "infer";
  authenticated: boolean;
  signedInAs?: string | null;
  loginSlot?: ReactNode;
  onRequirementChange: (value: string) => void;
  onFieldTypeChange: (value: FieldCatalogId | "infer") => void;
  onClose: () => void;
  onMinimize: () => void;
  onReset: () => void;
  onSubmit: () => void;
  onApprovePlan: () => void;
  onConsentChange: (value: boolean) => void;
}

export function AssistantPanel({
  state,
  targetOrg,
  top,
  right,
  requirement,
  fieldTypeId,
  authenticated,
  signedInAs,
  loginSlot,
  onRequirementChange,
  onFieldTypeChange,
  onClose,
  onMinimize,
  onReset,
  onSubmit,
  onApprovePlan,
  onConsentChange
}: AssistantPanelProps) {
  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const canApprove =
    Boolean(state.analysis) &&
    state.analysis?.blockedOperations.length === 0 &&
    state.analysis?.clarifyingQuestions.length === 0 &&
    state.analysis?.operatingMode === "REVIEW" &&
    !state.planApproved;

  return (
    <section
      className="panel panel-wide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sfcopilot-title"
      data-minimized={state.minimized ? "true" : "false"}
      style={{ top: `${top}px`, right: `${right}px` }}
    >
      <header className="panel-header">
        <h1 className="panel-title" id="sfcopilot-title">
          {PRODUCT_NAME}
        </h1>
        {signedInAs ? <span className="signed-in-as">{signedInAs}</span> : null}
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
            Correctness, security, explainability, and reviewability come before speed. Permission
            sets, profiles, sharing, login settings, credentials, production data, destructive
            changes, and unreviewed Apex callouts are never applied automatically. DEPLOY never
            runs to production.
          </div>
          <ol className="mode-rail" aria-label="Operating modes">
            {OPERATING_MODES.map((mode) => (
              <li
                key={mode}
                data-active={state.analysis?.operatingMode === mode ? "true" : "false"}
              >
                {mode}
              </li>
            ))}
          </ol>
          {loginSlot}
          <div className="conversation" aria-live="polite">
            {state.lastRequirement ? (
              <section className="prompt-card" aria-label="Current prompt">
                <h3>Prompt</h3>
                <p>{state.lastRequirement}</p>
              </section>
            ) : null}
            {state.messages.map((message) => (
              <div key={message.id} className={`message message-${message.role}`}>
                {message.text}
              </div>
            ))}
            {state.status === "loading" ? (
              <div className="status status-loading" role="status">
                <span className="processing-dot" aria-hidden="true" />
                Processing ANALYZE → REVIEW…
                {state.lastRequirement ? (
                  <p className="processing-prompt">{state.lastRequirement}</p>
                ) : null}
              </div>
            ) : null}
            {state.status === "error" && state.errorMessage ? (
              <div className="status status-error" role="alert">
                {state.errorMessage}
              </div>
            ) : null}
            {state.analysis ? (
              <AnalysisViews
                analysis={state.analysis}
                planApproved={state.planApproved}
              />
            ) : null}
          </div>
          <form className="composer" onSubmit={onFormSubmit}>
            <label htmlFor="sfcopilot-field-type">Field data type</label>
            <select
              id="sfcopilot-field-type"
              className="field-type-select"
              value={fieldTypeId}
              onChange={(event) =>
                onFieldTypeChange(event.target.value as FieldCatalogId | "infer")
              }
            >
              <option value="infer">Infer from requirement</option>
              {FIELD_TYPE_GROUPS.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.types.map((entry) => (
                    <option key={entry.id} value={entry.id} title={entry.summary}>
                      {entry.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label htmlFor="sfcopilot-requirement">Salesforce requirement</label>
            <textarea
              id="sfcopilot-requirement"
              value={requirement}
              onChange={(event) => onRequirementChange(event.target.value)}
              placeholder='Create a custom text field "COP Text" in Account object'
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
                {authenticated ? "Run ANALYZE" : "Submit"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!canApprove}
                onClick={onApprovePlan}
              >
                Approve plan
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function AnalysisViews({
  analysis,
  planApproved
}: {
  analysis: AnalyzeSuccessResponse;
  planApproved: boolean;
}) {
  const report = analysis.taskReport;
  return (
    <>
      {analysis.blockedOperations.length > 0 ? (
        <section className="section" aria-label="Blocked operations">
          <h3>Security stop</h3>
          {analysis.blockedOperations.map((item) => (
            <ol key={item.type} className="blocked-report">
              <li>
                <strong>What was requested:</strong> {item.reason} Matched “{item.matchedPhrase}”.
              </li>
              <li>
                <strong>Why it is sensitive:</strong> {item.whySensitive}
              </li>
              <li>
                <strong>Manual administrator action:</strong> {item.manualAction}
              </li>
            </ol>
          ))}
        </section>
      ) : null}
      {analysis.clarifyingQuestions.length > 0 ? (
        <section className="section" aria-label="Clarifying questions">
          <h3>ANALYZE — clarifying questions</h3>
          <ol>
            {analysis.clarifyingQuestions.map((item) => (
              <li key={item.id}>{item.prompt}</li>
            ))}
          </ol>
        </section>
      ) : null}
      {report ? (
        <section className="section task-report" aria-label="Required output">
          <h3>Required output</h3>
          <ReportBlock title="1. Requirement interpretation">{report.interpretation}</ReportBlock>
          <ReportBlock title="2. Assumptions">
            <ul>
              {report.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportBlock>
          <ReportBlock title="3. Files created or changed">
            <ul>
              {report.filesCreatedOrChanged.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportBlock>
          <ReportBlock title="4. Generated Salesforce components">
            {report.generatedComponents.map((component) => (
              <div key={component.apiName} className="component-card">
                <p>
                  <strong>{component.componentType}</strong> {component.apiName}
                </p>
                <p>{component.purpose}</p>
                <p>Dependencies: {component.dependencies.join(", ") || "None"}</p>
                <p>Deployment order: {component.deploymentOrder}</p>
                <p>Security impact: {component.securityImpact}</p>
                <p>Manual setup: {component.manualSetup}</p>
                <p>Test scenarios:</p>
                <ul>
                  {component.testScenarios.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </ReportBlock>
          <ReportBlock title="5. Security and permission impact">
            {report.securityAndPermissionImpact}
          </ReportBlock>
          <ReportBlock title="6. Validation and test results">
            {report.validationAndTestResults}
          </ReportBlock>
          <ReportBlock title="7. Deployment preview">{report.deploymentPreview}</ReportBlock>
          <ReportBlock title="8. Remaining manual steps">
            <ul>
              {report.remainingManualSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportBlock>
          <ReportBlock title="9. Known limitations">
            <ul>
              {report.knownLimitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportBlock>
          {planApproved ? (
            <p className="approval-note">Plan approved. DEPLOY is still a separate sandbox check-only step.</p>
          ) : null}
        </section>
      ) : null}
      {analysis.implementationPlan.length > 0 ? (
        <section className="section" aria-label="Implementation plan">
          <h3>Mode plan</h3>
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
          <h3>GENERATE — source format</h3>
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
          <h3>VALIDATE</h3>
          <p>Status: {analysis.validation.status}</p>
          <ul>
            {analysis.validation.issues.map((issue) => (
              <li key={`${issue.severity}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function ReportBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="report-block">
      <h4>{title}</h4>
      {typeof children === "string" ? <p>{children}</p> : children}
    </div>
  );
}
