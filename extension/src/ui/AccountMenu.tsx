import { useState } from "react";
import type { SalesforceAuthState } from "../api/assistantApi.js";

interface AccountMenuProps {
  auth: SalesforceAuthState;
  onDisconnect: () => void;
  onOpenSalesforce: () => void;
}

export function AccountMenu({ auth, onDisconnect, onOpenSalesforce }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  if (!auth.authenticated) {
    return null;
  }
  return (
    <div className="account-menu">
      <button
        type="button"
        className="account-chip"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="status-dot" aria-hidden="true" />
        {auth.username}
      </button>
      {open ? (
        <div className="account-dropdown" role="menu">
          <p className="account-dropdown-title">Connected Salesforce User</p>
          <p>
            <strong>Username</strong> {auth.username}
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
          <div className="account-dropdown-actions">
            <button type="button" className="secondary" onClick={onOpenSalesforce}>
              Open Salesforce
            </button>
            <button type="button" className="danger" onClick={onDisconnect}>
              Disconnect
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
