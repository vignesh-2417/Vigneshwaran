# Salesforce Metadata Copilot

Chrome Manifest V3 extension plus Node backend that analyzes Salesforce metadata requirements and returns a structured plan, clarifying questions, and metadata diffs. It never auto-modifies permission sets, profiles, sharing, credentials, or production data.

## Packages

- `shared`: schemas, blocked operations, Salesforce context helpers
- `extension`: content script, service worker, React panel
- `backend`: mock analysis API (`POST /api/requirements/analyze`)

## Load the extension

1. `npm install`
2. `npm test`
3. `npm run build -w extension`
4. In Chrome, open `chrome://extensions`, enable Developer mode, then load unpacked from **either**:
   - `extension` — source `manifest.json` points at `dist/content.js` and `dist/background.js`
   - `extension/dist` — copied `manifest.json` is rewritten to `content.js` and `background.js` next to those files

Use `extension/dist` if you already loaded that folder; use `extension` if you loaded the package folder. After a rebuild, click Reload on the extension card.

## Run the backend

```bash
npm run start -w backend
```

The mock API listens on `127.0.0.1:8787`.
