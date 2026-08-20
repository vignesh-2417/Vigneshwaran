# Salesforce Metadata Copilot

Chrome MV3 extension that injects a floating assistant on Salesforce Lightning pages. Users describe a metadata requirement; analysis is mocked for now. The assistant must not auto-modify or deploy permission sets, profiles, sharing, credentials, production data, or destructive metadata.

## Prerequisites

- Node.js 20+
- npm 10+
- Chrome 120+
- Optional backend: `npm run start -w backend` on `http://127.0.0.1:8787`

## Build the extension

```bash
npm install
npm run build -w extension
```

That produces `extension/dist/content.js` and `extension/dist/background.js`, copies `process-shim.js` next to them, and writes `extension/dist/manifest.json`. The content bundle is verified to start with `/*SF_METADATA_COPILOT_CONTENT_V2*/var process={env:{NODE_ENV:` and not contain `react.development.js`.

## Load unpacked in Chrome

**Either folder works after a successful build:**

1. `chrome://extensions` → Developer mode → Load unpacked
2. Select **`extension`** (recommended) or **`extension/dist`**
3. On the extension card, click **Reload** after every rebuild
4. Open a Lightning page (example: `/lightning/page/home`) and hard-refresh (`Ctrl+Shift+R`)

From **`extension`**, Chrome injects `process-shim.js` then `dist/content.js`. From **`extension/dist`**, it injects `process-shim.js` then `content.js`. The shim defines `process` before React so Lightning does not crash.

### If you still see no icon

The huge “error” dump that starts with `var uN=Object.defineProperty` is the **old crashing bundle** (React production + development, leftover `process.env.NODE_ENV`). Search `content.js` for `SF_METADATA_COPILOT_CONTENT_V2`. A good build starts with:

```text
/*SF_METADATA_COPILOT_CONTENT_V2*/var process={env:{NODE_ENV:"production"}};
```

Fix:

1. Run `npm run build -w extension` in this repo
2. On `chrome://extensions`, confirm version **0.1.1** and click **Reload**
3. Hard-refresh Lightning (`Ctrl+Shift+R`)

Do not load a parent folder, zip, or a stale copy that still has `content.js` starting with `var uN=`.

## Expected UI

- Orange neon lava circle, top-right (below the Lightning header)
- Click to open the panel
- Submit needs the backend on port 8787 when using the background API
