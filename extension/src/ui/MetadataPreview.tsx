import type { ParsedCustomFieldRequest } from "@sfcopilot/shared";

interface MetadataPreviewProps {
  field: ParsedCustomFieldRequest;
  creating: boolean;
  created: boolean;
  createMessage: string | null;
  onCancel: () => void;
  onCreate: () => void;
  onCreateAnother: () => void;
}

export function MetadataPreview({
  field,
  creating,
  created,
  createMessage,
  onCancel,
  onCreate,
  onCreateAnother
}: MetadataPreviewProps) {
  if (creating) {
    return (
      <section className="preview-card" aria-label="Creating metadata">
        <div className="status status-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Creating Salesforce metadata...
        </div>
      </section>
    );
  }
  if (created) {
    return (
      <section className="preview-card success-card" aria-label="Metadata created">
        <p className="success-title">✓ Metadata created successfully</p>
        <dl className="preview-grid">
          <dt>Object</dt>
          <dd>{field.objectApiName}</dd>
          <dt>Field</dt>
          <dd>{field.label}</dd>
          <dt>API Name</dt>
          <dd>{field.apiName}</dd>
        </dl>
        {createMessage ? <p className="preview-note">{createMessage}</p> : null}
        <button type="button" className="primary" onClick={onCreateAnother}>
          Create Another
        </button>
      </section>
    );
  }
  return (
    <section className="preview-card" aria-label="Metadata preview">
      <p className="preview-kicker">METADATA PREVIEW</p>
      <dl className="preview-grid">
        <dt>Object</dt>
        <dd>{field.objectApiName}</dd>
        <dt>Field Label</dt>
        <dd>{field.label}</dd>
        <dt>API Name</dt>
        <dd>{field.apiName}</dd>
        <dt>Type</dt>
        <dd>{field.displayName}</dd>
        {field.defaultValue !== undefined ? (
          <>
            <dt>Default Value</dt>
            <dd>{field.defaultValue === "true" ? "True" : "False"}</dd>
          </>
        ) : null}
        {field.referenceTo ? (
          <>
            <dt>Related To</dt>
            <dd>{field.referenceTo}</dd>
          </>
        ) : null}
        {field.formula ? (
          <>
            <dt>Formula</dt>
            <dd>{field.formula}</dd>
          </>
        ) : null}
      </dl>
      <div className="preview-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={onCreate}>
          Create Metadata
        </button>
      </div>
    </section>
  );
}
