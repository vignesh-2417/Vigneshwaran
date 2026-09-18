import type { SalesforceEnvironment } from "../salesforce/authTypes.js";

interface AuthScreensProps {
  environment: SalesforceEnvironment;
  status: "idle" | "loading" | "error";
  errorMessage: string | null;
  onEnvironmentChange: (value: SalesforceEnvironment) => void;
  onConnect: () => void;
}

export function AuthScreens({
  environment,
  status,
  errorMessage,
  onEnvironmentChange,
  onConnect
}: AuthScreensProps) {
  const connecting = status === "loading";
  return (
    <div className="auth-screen" data-auth-mode="oauth-pkce">
      <p className="eyebrow">✨ Salesforce Metadata Copilot</p>
      <p className="build-stamp">OAuth PKCE · v0.2.0</p>
      <h2>Build Salesforce metadata faster.</h2>
      <p className="connected-status not-connected">
        <span className="status-dot status-dot-off" aria-hidden="true" /> Not connected
      </p>
      <p className="auth-lead">Connect your Salesforce account to continue.</p>
      {connecting ? (
        <div className="status status-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Connecting to Salesforce...
        </div>
      ) : null}
      {errorMessage ? (
        <div className="status status-error" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <button
        type="button"
        className="primary primary-large"
        onClick={onConnect}
        disabled={connecting}
      >
        {connecting ? "Connecting…" : errorMessage ? "Try Again" : "Connect Salesforce"}
      </button>
      <p className="secure-note">
        🔒 Secure OAuth
        <span>Your Salesforce password is handled by Salesforce.</span>
        <span>The extension does not ask for or store your password.</span>
      </p>
      <label htmlFor="sfcopilot-environment">Environment</label>
      <select
        id="sfcopilot-environment"
        className="field-type-select"
        value={environment}
        disabled={connecting}
        onChange={(event) =>
          onEnvironmentChange(event.target.value as SalesforceEnvironment)
        }
      >
        <option value="production">Production</option>
        <option value="sandbox">Sandbox</option>
      </select>
    </div>
  );
}
