# Salesforce Metadata Copilot

Chrome MV3 extension that injects a floating assistant on Salesforce Lightning pages. Each user connects with **Salesforce OAuth 2.0 (Authorization Code + PKCE)**. ANALYZE → PLAN → GENERATE → VALIDATE → REVIEW still run in the panel. CustomField create uses the Tooling API with the OAuth access token. The assistant never asks for a Salesforce password or security token.

## Prerequisites

- Node.js 20+
- npm 10+
- Chrome 120+
- A Salesforce Connected App (public client, PKCE, no client secret in the extension)
- Optional backend: `npm run start -w backend` on `http://127.0.0.1:8787`

## Put your Client ID here

Edit `extension/src/salesforce/oauthConfig.ts`:

```ts
export const SALESFORCE_CONFIG = {
  clientId: "YOUR_CONNECTED_APP_CLIENT_ID",
  productionLoginUrl: "https://login.salesforce.com",
  sandboxLoginUrl: "https://test.salesforce.com"
};
```

Replace `YOUR_CONNECTED_APP_CLIENT_ID` with the Connected App **Consumer Key**. Do not add a Consumer Secret to this repo.

Then rebuild: `npm run build -w extension`.

## Salesforce Connected App setup

1. In Setup, search **App Manager** → **New Connected App**.
2. Enable OAuth Settings.
3. Callback URL must match Chrome Identity **exactly**:

```text
https://<EXTENSION_ID>.chromiumapp.org/oauth2
```

That is `chrome.identity.getRedirectURL("oauth2")`. Do not use login.salesforce.com as the extension callback.

4. Create an **External Client App** (or Connected App) with OAuth enabled, Authorization Code + PKCE, and no client secret in this extension.
5. OAuth scopes: **api**, **id**, **refresh_token / offline_access** (needed for Tooling API).
6. Save, then rebuild this extension.

## How to obtain the Chrome Extension ID

1. `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select the `extension` folder
4. Copy the ID shown on the card

The ID is stable for that unpacked path. If you pack the extension, use the packed ID in the Connected App callback list (you can add both).

## Build and load

```bash
npm install
npm run build -w extension
```

1. `chrome://extensions` → Developer mode → Load unpacked
2. Select **`extension`** (or `extension/dist` after copy-manifest)
3. Confirm version **0.2.0**. If you still see “Salesforce login / username / password / security token”, you are on a stale unpacked folder — Remove the old extension, rebuild, Load unpacked again.
4. Open Lightning and hard-refresh (`Ctrl+Shift+R`)

## How to test

**Production:** Environment = Production → Connect Salesforce → login.salesforce.com (SSO/MFA) → Authorize.

**Sandbox:** Environment = Sandbox → Connect Salesforce → test.salesforce.com.

**Two users:** Disconnect, then Connect Salesforce with a second username. The panel must show the new username and user id.

**Disconnect:** Disconnect clears `chrome.storage.session` auth (access token, instance URL, user info) and returns to Connect Salesforce.

**Expired session:** After connect, if Salesforce returns 401 on Create Metadata, the panel shows “Your Salesforce session has expired.” and **Reconnect Salesforce**.

**Permission errors:** A user without Customize Application / Modify All Data (as required for CustomField Tooling create) should see “You don't have permission to perform this operation.”

Field create still runs only on sandbox, scratch, or Developer Edition orgs after you click **Create Metadata**. Production orgs are blocked for Tooling create.

## Security

- OAuth tokens stay in the service worker and `chrome.storage.session`.
- Content scripts receive username, user id, org id, instance URL, and environment only — not access tokens.
- No SOAP `/services/Soap/u/62.0` login.
- No passwords or security tokens.
- No Connected App client secret in the extension.
