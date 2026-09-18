import {
  FIELD_TYPE_GROUPS,
  OPERATING_MODES,
  PRODUCT_NAME,
  parseCustomFieldRequirement,
  type AnalyzeSuccessResponse,
  type FieldCatalogId
} from "@sfcopilot/shared";
import type { FormEvent, ReactNode } from "react";
import type { SalesforceAuthState } from "../api/assistantApi.js";
import { AccountMenu } from "./AccountMenu.js";
import type { AssistantState } from "./assistantState.js";
import { MetadataPreview } from "./MetadataPreview.js";

export const QUICK_ACTIONS: Array<{
  id: string;
  label: string;
  fieldType: FieldCatalogId | "infer";
  requirement: string;
}> = [
  {
    id: "field",
    label: "Create Field",
    fieldType: "Text",
    requirement: 'Create a custom text field "New Field" on Account object'
  },
  {
    id: "picklist",
    label: "Create Picklist",
    fieldType: "Picklist",
    requirement: 'Create picklist field "Status" on Account values: New, Working, Closed'
  },
  {
    id: "formula",
    label: "Create Formula Field",
    fieldType: "Formula",
    requirement: "Create formula field \"Score\" on Account formula: 1 returns Number"
  },
  {
    id: "analyze",
    label: "Analyze Metadata",
    fieldType: "infer",
    requirement: "Analyze metadata for the current Salesforce page and suggest a CustomField"
  },
  {
    id: "object",
    label: "Create Object",
    fieldType: "infer",
    requirement: "Create a custom object"
  },
  {
    id: "validation",
    label: "Create Validation Rule",
    fieldType: "infer",
    requirement: "Create a validation rule"
  }
];

interface AssistantPanelProps {
  state: AssistantState;
  auth: SalesforceAuthState;
  targetOrg: string;
  top: number;
  right: number;
  requirement: string;
  fieldTypeId: FieldCatalogId | "infer";
  sessionExpired: boolean;
  creating: boolean;
  onRequirementChange: (value: string) => void;
  onFieldTypeChange: (value: FieldCatalogId | "infer") => void;
  onQuickAction: (requirement: string, fieldType: FieldCatalogId | "infer") => void;
  onClose: () => void;
  onMinimize: () => void;
  onReset: () => void;
  onSubmit: () => void;
  onCreateField: () => void;
  onCancelPreview: () => void;
  onCreateAnother: () => void;
  onConsentChange: (value: boolean) => void;
  onDisconnect: () => void;
  onOpenSalesforce: () => void;
  onReconnect: () => void;
}

export function AssistantPanel({
  state,
  auth,
  targetOrg,
  top,
  right,
  requirement,
  fieldTypeId,
  sessionExpired,
  creating,
  onRequirementChange,
  onFieldTypeChange,
  onQuickAction,
  onClose,
  onMinimize,
  onReset,
  onSubmit,
  onCreateField,
  onCancelPreview,
  onCreateAnother,
  onConsentChange,
  onDisconnect,
  onOpenSalesforce,
  onReconnect
}: AssistantPanelProps) {
  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const previewField =
    state.analysis &&
    state.analysis.blockedOperations.length === 0 &&
    state.analysis.clarifyingQuestions.length === 0 &&
    state.analysis.metadataArtifacts.length > 0
      ? parseCustomFieldRequirement(state.lastRequirement, state.analysis.structuredRequirement?.objectApiName ?? null)
      : null;
  const canCreate = Boolean(previewField) && !state.planApproved && !creating && state.status !== "loading";
  const analyzing = state.status === "loading" && !creating;

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
        <div>
          <p className="eyebrow">✨ {PRODUCT_NAME}</p>
          <h1 className="panel-title" id="sfcopilot-title">
            {PRODUCT_NAME}
          </h1>
          <p className="connected-status">
            <span className="status-dot" aria-hidden="true" /> Connected as {auth.username}
          </p>
        </div>
        <AccountMenu auth={auth} onDisconnect={onDisconnect} onOpenSalesforce={onOpenSalesforce} />
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
          <section className="account-card" aria-label="Salesforce account">
            <p>
              <strong>Salesforce User</strong> {auth.username}
            </p>
            <p>
              <strong>User ID</strong> {auth.userId}
            </p>
            <p>
              <strong>Org</strong> {auth.instanceUrl}
            </p>
            <p>
              <strong>Organization ID</strong> {auth.orgId || "Unavailable"}
            </p>
            <p>
              <strong>Environment</strong>{" "}
              {auth.environment === "sandbox" ? "Sandbox" : "Production"}
            </p>
            <div className="account-card-actions">
              <button type="button" className="secondary" onClick={onOpenSalesforce}>
                Open Salesforce
              </button>
              <button type="button" className="danger" onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          </section>
          {sessionExpired ? (
            <div className="status status-error" role="alert">
              Your Salesforce session has expired.
              <button type="button" className="primary" onClick={onReconnect}>
                Reconnect Salesforce
              </button>
            </div>
          ) : null}
          <form className="composer" onSubmit={onFormSubmit}>
            <h2 className="composer-heading">What would you like to build?</h2>
            <label htmlFor="sfcopilot-requirement" className="sr-only">
              Salesforce requirement
            </label>
            <textarea
              id="sfcopilot-requirement"
              value={requirement}
              onChange={(event) => onRequirementChange(event.target.value)}
              placeholder='Example: Create a checkbox field on Opportunity called Customer Approved'
            />
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
            <div className="quick-actions" aria-label="Quick actions">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="chip"
                  onClick={() => onQuickAction(action.requirement, action.fieldType)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <label className="consent">
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
                Analyze
              </button>
            </div>
          </form>
          <div className="conversation" aria-live="polite">
            {state.lastRequirement ? (
              <section className="prompt-card" aria-label="Current prompt">
                <h3>Prompt</h3>
                <p>{state.lastRequirement}</p>
              </section>
            ) : null}
            {analyzing ? (
              <div className="status status-loading" role="status">
                <span className="spinner" aria-hidden="true" />
                Processing ANALYZE → REVIEW…
              </div>
            ) : null}
            {state.status === "error" && state.errorMessage ? (
              <div className="status status-error" role="alert">
                {state.errorMessage}
              </div>
            ) : null}
            {previewField && canCreate ? (
              <MetadataPreview
                field={previewField}
                creating={false}
                created={false}
                createMessage={null}
                onCancel={onCancelPreview}
                onCreate={onCreateField}
                onCreateAnother={onCreateAnother}
              />
            ) : null}
            {previewField && creating ? (
              <MetadataPreview
                field={previewField}
                creating
                created={false}
                createMessage={null}
                onCancel={onCancelPreview}
                onCreate={onCreateField}
                onCreateAnother={onCreateAnother}
              />
            ) : null}
            {previewField && state.planApproved ? (
              <MetadataPreview
                field={previewField}
                creating={false}
                created
                createMessage={state.analysis?.warning ?? null}
                onCancel={onCancelPreview}
                onCreate={onCreateField}
                onCreateAnother={onCreateAnother}
              />
            ) : null}
            {state.analysis ? (
              <AnalysisViews analysis={state.analysis} planApproved={state.planApproved} />
            ) : null}
          </div>
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
      <ol className="mode-rail" aria-label="Operating modes">
        {OPERATING_MODES.map((mode) => (
          <li key={mode} data-active={analysis.operatingMode === mode ? "true" : "false"}>
            {mode}
          </li>
        ))}
      </ol>
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
          <details>
            <summary>Analysis details</summary>
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
                </div>
              ))}
            </ReportBlock>
            {planApproved ? (
              <p className="approval-note">
                Field create finished for this REVIEW package. Check Object Manager, then set FLS and
                layouts.
              </p>
            ) : null}
          </details>
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
