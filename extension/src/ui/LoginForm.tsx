import type { FormEvent } from "react";
import type { SalesforceAuthState, SalesforceLoginInput } from "../api/assistantApi.js";

interface LoginFormProps {
  auth: SalesforceAuthState;
  loginHost: string;
  status: "idle" | "loading" | "error";
  errorMessage: string | null;
  onLoginHostChange: (value: string) => void;
  onLogin: (input: SalesforceLoginInput) => void;
  onLogout: () => void;
}

export function LoginForm({
  auth,
  loginHost,
  status,
  errorMessage,
  onLoginHostChange,
  onLogin,
  onLogout
}: LoginFormProps) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onLogin({
      username: String(data.get("username") ?? ""),
      password: String(data.get("password") ?? ""),
      securityToken: String(data.get("securityToken") ?? ""),
      loginHost
    });
  };

  if (auth.authenticated) {
    return (
      <div className="login-card login-card-ok">
        <p>
          Logged in as <strong>{auth.username}</strong>
        </p>
        <p className="org-target">{auth.instanceUrl}</p>
        <button type="button" className="secondary" onClick={onLogout}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <h3>Salesforce login</h3>
      <p>
        Sign in with the org user that should create metadata. Password and token are kept in this
        browser session only and are never stored in the extension source.
      </p>
      <label htmlFor="sfcopilot-login-host">Login host</label>
      <input
        id="sfcopilot-login-host"
        value={loginHost}
        onChange={(event) => onLoginHostChange(event.target.value)}
        autoComplete="url"
      />
      <label htmlFor="sfcopilot-username">Salesforce username</label>
      <input
        id="sfcopilot-username"
        name="username"
        type="text"
        autoComplete="username"
        required
      />
      <label htmlFor="sfcopilot-password">Password</label>
      <input
        id="sfcopilot-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <label htmlFor="sfcopilot-token">Security token (if required)</label>
      <input id="sfcopilot-token" name="securityToken" type="password" autoComplete="off" />
      {errorMessage ? (
        <div className="status status-error" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <button type="submit" className="primary" disabled={status === "loading"}>
        {status === "loading" ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
