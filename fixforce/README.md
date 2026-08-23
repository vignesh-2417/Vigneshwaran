# ⚡ FixForce — Salesforce Error Analyzer

> Chrome Extension + AI Backend that detects Salesforce errors in real-time, analyzes them with GPT, and delivers root cause + step-by-step fixes instantly.

---

## Architecture

```
Salesforce Lightning UI
        │
        │ DOM error detected
        ▼
  [content.js] ──MutationObserver──► detects error text, object, context
        │
        │ chrome.runtime.sendMessage
        ▼
  [background.js] ──fetch──► POST /analyze-error
        │                          │
        │                    [server.js]
        │                          │
        │                    Rule classifier
        │                          │
        │                    OpenAI GPT-4o-mini
        │                          │
        │                    MongoDB (persist)
        │                          │
        │◄──────── JSON response ──┘
        │
  chrome.storage.local
        │
        ▼
  [popup.html/js] ─── Displays root cause + fix steps
```

---

## Project Structure

```
fixforce/
├── extension/
│   ├── manifest.json       # MV3 Chrome extension config
│   ├── content.js          # DOM error scanner + MutationObserver
│   ├── background.js       # Service worker: API calls + storage
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup controller
│   └── icons/              # Extension icons (add your own PNGs)
│
└── backend/
    ├── server.js           # Express app entry point
    ├── ai.js               # OpenAI integration + pre-classifier
    ├── db.js               # MongoDB connection
    ├── logger.js           # Winston logger
    ├── package.json
    ├── .env.example        # Environment variable template
    └── routes/
        ├── analyze.js      # POST /analyze-error
        └── history.js      # GET/DELETE /history
```

---

## Quick Start

### 1. Backend Setup

```bash
cd fixforce/backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
```

Edit `.env`:
```env
OPENAI_API_KEY=sk-your-real-openai-key
MONGODB_URI=mongodb://localhost:27017/fixforce
PORT=3000
NODE_ENV=development
```

Start MongoDB (if running locally):
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name fixforce-mongo mongo:7
```

Start the backend:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Verify it's working:
```bash
curl http://localhost:3000/health
# → {"status":"ok","service":"FixForce Backend",...}
```

---

### 2. Chrome Extension Setup

**Add icons** (required for Chrome to accept the extension):

Create a `fixforce/extension/icons/` directory and add:
- `icon16.png`  (16×16)
- `icon48.png`  (48×48)
- `icon128.png` (128×128)

You can use any Salesforce/lightning themed icon, or generate simple placeholder PNGs:

```bash
# Quick placeholder icons using ImageMagick (optional)
mkdir -p extension/icons
convert -size 128x128 xc:#4f8eff extension/icons/icon128.png
convert -size 48x48  xc:#4f8eff extension/icons/icon48.png
convert -size 16x16  xc:#4f8eff extension/icons/icon16.png
```

**Load in Chrome:**

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `fixforce/extension/` folder
5. The FixForce extension will appear in your toolbar

**Connect to your backend:**

In `extension/background.js`, update line 1:
```js
const API_BASE_URL = "http://localhost:3000"; // ← your backend URL
```

---

### 3. Test the Flow

1. Open any Salesforce org (`*.salesforce.com`)
2. Trigger an error (e.g., save a record that violates a validation rule)
3. Click the FixForce icon in your Chrome toolbar
4. See the root cause + fix steps appear in seconds ✅

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ Yes | — | OpenAI API key (get one at platform.openai.com) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model to use |
| `MONGODB_URI` | No | `mongodb://localhost:27017/fixforce` | MongoDB connection string |
| `MONGODB_DB_NAME` | No | `fixforce` | Database name |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment (`development`/`production`) |
| `API_SECRET_KEY` | No | disabled | Optional shared secret for API auth |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `30` | Max requests per window |

---

## API Reference

### `POST /analyze-error`

**Request:**
```json
{
  "errorText": "FIELD_CUSTOM_VALIDATION_EXCEPTION: Opportunity amount must be greater than 0",
  "object": "Opportunity",
  "context": "record_page",
  "url": "https://yourorg.lightning.force.com/lightning/r/Opportunity/006.../view",
  "recordId": "0065g00000AbcDef"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "rootCause": "A validation rule on the Opportunity object requires the Amount field to be greater than zero. The record was saved with a zero or negative amount value, triggering this rule.",
  "fixSteps": [
    "Navigate to the Opportunity record that triggered this error.",
    "Update the Amount field to a value greater than 0.",
    "If this is a legitimate use case, go to Setup → Object Manager → Opportunity → Validation Rules.",
    "Find the validation rule related to amount and review its criteria.",
    "Adjust the rule or add an exception condition (e.g., for $0 quotes), then save and re-test."
  ],
  "category": "VALIDATION",
  "failureType": "validation_rule",
  "failureLabel": "Validation Rule",
  "confidence": 0.92,
  "helpArticle": {
    "title": "Create Validation Rules",
    "summary": "Validation rules enforce business requirements when users save records.",
    "url": "https://help.salesforce.com/s/articleView?id=sf.customize_validations.htm&type=5",
    "setupPath": "Setup → Object Manager → Opportunity → Validation Rules",
    "quickChecks": ["Identify the validation rule", "Review formula criteria", "Update field values"]
  },
  "responseTimeMs": 1240
}
```

### `GET /history`

Query params: `?page=1&limit=20&category=VALIDATION`

### `DELETE /history`

Clears all stored analyses.

### `GET /health`

Returns service status.

---

## Error Categories

| Category | Description | Common Causes |
|---|---|---|
| `VALIDATION` | Validation rule violation | Business rule not met |
| `PERMISSION` | Access/privilege error | Profile missing permission |
| `FLOW` | Flow runtime error | Invalid variable, missing record |
| `APEX` | Apex trigger/class error | Code bug, governor limit |
| `CPQ` | Salesforce CPQ issue | Pricing rule, quote config |
| `DATA` | Data integrity issue | Duplicate, invalid reference |
| `LOCK` | Record lock conflict | Concurrent updates |
| `REQUIRED_FIELD` | Missing required field | Blank required field on save |
| `NULL_POINTER` | Null reference in code | Apex bug accessing null |
| `UNKNOWN` | Unclassified error | Needs investigation |

---

## Deployment

### Deploy Backend to Railway/Render/Fly.io

```bash
# Railway
railway login && railway new && railway up

# Render: connect GitHub repo, set env vars in dashboard

# Fly.io
fly launch && fly secrets set OPENAI_API_KEY=sk-...
```

After deploying, update `API_BASE_URL` in `background.js`:
```js
const API_BASE_URL = "https://your-app.railway.app";
```

### MongoDB Atlas (Production)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fixforce?retryWrites=true&w=majority
```

---

## Without OpenAI (Offline Mode)

If `OPENAI_API_KEY` is not configured, FixForce uses its built-in rule-based classifier to:
1. Detect the error category from patterns in the message
2. Return pre-written, curated fix steps for each category

This mode works without any API calls and covers the most common Salesforce error types.

---

## What's New in v1.1

- **Smart error classification** — detects whether the failure is Validation, Flow, Permission, Apex, CPQ, Data, Lock, or Required Field
- **Context-aware routing** — boosts Flow/CPQ categories when you're on a Flow or CPQ page
- **Help article recommendations** — shows the matching Salesforce Help article with setup path and direct link
- **In-page help banner** — instant classification banner on Salesforce when an error appears (even before AI analysis)
- **Offline fallback** — if the backend is down, local classification still shows the right help article

---

## Future Roadmap (Architecture Ready)

- 📸 **Screenshot + OCR** — upload screenshot, extract error via vision API
- 📹 **Screen recording analysis** — analyze error flows from video
- 👥 **Team dashboard** — shared error history across Salesforce team
- 🔗 **Salesforce API integration** — query metadata directly to give precise fix paths
- 🔔 **Slack/Email notifications** — alert team when critical errors occur

---

## Security Notes

- Record IDs are masked before storage (only first 4 + last 3 chars stored)
- URL query parameters are stripped before storage (no session data)
- The backend does not store Salesforce credentials or session tokens
- Use `HTTPS` for all production deployments
- Set `API_SECRET_KEY` in production to secure your endpoint

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push and open a PR

---

## License

MIT — use freely, build great things.
