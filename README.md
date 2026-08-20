# Salesforce Metadata Copilot

Chrome Manifest V3 assistant for Salesforce Lightning pages. The extension injects a floating icon, collects a natural-language metadata requirement, and sends it to a backend for analysis. It does not deploy permission sets, profiles, sharing rules, credentials, production data, or destructive metadata.

## Packages

- `extension` — MV3 content script, Shadow DOM UI, and service worker
- `backend` — request validation, blocked-operation checks, mock AI analysis
- `shared` — typed contracts, Salesforce URL context parsing, message schemas

## Load the extension

1. `npm install`
2. `npm test`
3. `npm run build -w extension`
4. In Chrome, open `chrome://extensions`, enable Developer mode, and load `extension/dist`

The mock backend listens on `http://127.0.0.1:8787`. Start it with `npm run start -w backend` when exercising the service-worker path.
