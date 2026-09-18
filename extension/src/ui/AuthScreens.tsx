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
    <div className="auth-screen">
      <p className="eyebrow">Salesforce Metadata Copilot</p>
      <h2>Build Salesforce metadata faster with AI.</h2>
      <p className="auth-lead">
        Connect your own Salesforce user. Passwords and security tokens are never requested or stored.
      </p>
      <fieldset className="env-fieldset" disabled={connecting}>
        <legend>Environment</legend>
        <label className="env-option">
          <input
            type="radio"
            name="sfcopilot-environment"
            checked={environment === "production"}
            onChange={() => onEnvironmentChange("production")}
          />
          Production
        </label>
        <label className="env-option">
          <input
            type="radio"
            name="sfcopilot-environment"
            checked={environment === "sandbox"}
            onChange={() => onEnvironmentChange("sandbox")}
          />
          Sandbox
        </label>
      </fieldset>
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
        🔒 Secure Salesforce OAuth
        <span>Your Salesforce password is never stored by this extension.</span>
      </p>
    </div>
  );
}
