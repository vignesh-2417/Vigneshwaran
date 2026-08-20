# FixForce — Hard Test Cases (18)

This guide explains **how to build**, **run**, and **verify** FixForce tests across **Flow**, **Validation**, **Permission**, and **License** errors.

## Test categories

| IDs | Category | Examples |
|-----|----------|----------|
| TC01–TC10 | **Flow** (composite + edge cases) | Flow + malformed ID, permission, validation, dedupe |
| TC11–TC12 | **Validation rule** (standalone) | Direct save blocked by validation rule |
| TC13–TC16 | **Permission / sharing** | Object CRUD, FLS, transfer, custom permission |
| TC17–TC18 | **License / edition** | User license tab, package feature not enabled |

There are **three layers**:

| Layer | What it tests | Where |
|-------|----------------|--------|
| **A. Automated (Node)** | Investigator / classification logic | `backend/test-hard-cases.js` |
| **B. DOM simulation (Browser)** | Content script scanning on Salesforce | `extension/dom-test-injectors.js` |
| **C. Full E2E (Salesforce org)** | Real save errors + notification + popup | Steps below per test case |

---

## Prerequisites

### Tools
- Chrome with FixForce loaded (`fixforce/extension/`)
- Node.js 18+ (for automated tests)
- Salesforce org (Developer, Sandbox, or Trailhead Playground)

### Extension setup
1. Load unpacked extension from `fixforce/extension/`
2. Allow **notifications** when Chrome prompts
3. Hard-refresh any open Salesforce tab

### Run automated tests (no Salesforce needed)

```bash
cd fixforce/backend
npm install
npm test
```

Expected output: `10/10 hard cases passed`

---

## Layer B — DOM simulation (quick extension test)

Use when you **don’t** want to build flows yet.

### Steps
1. Open any Salesforce Lightning tab
2. Open **DevTools → Console**
3. Paste the full contents of `fixforce/extension/dom-test-injectors.js` and press Enter
4. Run one test, e.g. `FF_test_TC01()`
5. Within ~5 seconds verify:
   - Red `!` badge on FixForce icon
   - OS notification
   - Opening popup shows analysis with correct headline
6. Run `FF_clearInjectedErrors()` before the next test

| Function | Maps to |
|----------|---------|
| `FF_test_TC01()` | Flow + MALFORMED_ID |
| `FF_test_TC02()` | Flow + Permission |
| `FF_test_TC03()` | Flow + Validation |
| `FF_test_TC04()` | Flow + Required field |
| `FF_test_TC05()` | Apex + Permission |
| `FF_test_TC06_noise()` | Should **not** alert |
| `FF_test_TC08()` | Long error text |
| `FF_test_TC09()` | Curly apostrophes |
| `FF_clearInjectedErrors()` | Cleanup |

**TC07 (dedupe)** and **TC10 (multi-tab)** cannot be fully tested via injection alone — see E2E sections.

---

## Layer C — Full Salesforce E2E (detailed per test)

### Pass criteria (all E2E tests)
- [ ] Badge `!` within ~5 seconds of error appearing
- [ ] One browser notification (not repeated every second)
- [ ] Popup shows correct **Investigation** headline
- [ ] Fix steps ≥ 2 for composite scenarios
- [ ] No on-page FixForce overlay (v1.4+)

---

## TC01 — Flow + MALFORMED_ID (`test-nex` / D&B Company)

**Automated:** `npm test` → TC01  
**DOM helper:** `FF_test_TC01()`

### Salesforce setup (detailed)

#### 1. Create lookup field (if needed)
1. **Setup → Object Manager → Account**
2. **Fields & Relationships → New**
3. Type: **Lookup Relationship** (or use existing **D&B Company** field)
4. Label: `D&B Company ID` (or map to your field from the error)
5. Save

#### 2. Create record-triggered Flow
1. **Setup → Flows → New Flow → Record-Triggered Flow**
2. Object: **Account**
3. Trigger: **A record is updated**
4. Entry conditions: optional (e.g. `Name` Is Changed = true)
5. **Run the Flow:** Optimized for **Actions and Related Records**
6. **How to Run:** **System Context** or **User Context** (either is fine for this test)

#### 3. Add Update Records element
1. Add **Update Records**
2. Use the **Triggering Account** record
3. Set **D&B Company ID** (lookup) = `{!$Record.Some_Text_Field__c}`  
   **OR** use an **Assignment** before update:
   - Variable `badId` (Text) = `hihih`
   - Update lookup field from `badId`
4. Save as **`test-nex`** (API name must match)
5. **Activate** the flow

#### 4. Reproduce error
1. Open any **Account** record
2. Click **Edit**, change any field, **Save**
3. Confirm Salesforce shows **We hit a snag** popover

#### 5. Verify FixForce
| Check | Expected |
|-------|----------|
| Scenario | `FLOW_MALFORMED_ID` |
| Flow name | `test-nex` |
| Field | `D&B Company ID` |
| Invalid value | `hihih` |

---

## TC02 — Flow + Permission (FLS on OwnerId)

**DOM helper:** `FF_test_TC02()`

### Salesforce setup

#### 1. Create test profile
1. **Setup → Profiles → Clone** Standard User → `FixForce Test User`
2. **Object Settings → Lead:** Read, Create, Edit ✓
3. **Field-Level Security → Lead → Owner:** **Read only** (uncheck Edit)

#### 2. Create user
1. **Setup → Users → New User**
2. Profile: `FixForce Test User`
3. Log in as this user (or use Login As)

#### 3. Create Flow `Lead_Assignment`
1. Record-triggered on **Lead** (create or update)
2. **Update Records** on triggering Lead
3. Set **OwnerId** = a Queue Id or another User Id from a Get Records step
4. **How to Run the Flow:** **User Context** (important)
5. Activate

#### 4. Reproduce
1. As test user, create or edit a **Lead** → Save

#### 5. Verify FixForce
| Check | Expected |
|-------|----------|
| Scenario | `FLOW_PERMISSION` |
| Flow | `Lead_Assignment` |
| Field | `OwnerId` |

---

## TC03 — Flow + Validation Rule

**DOM helper:** `FF_test_TC03()`

### Salesforce setup

#### 1. Validation rule on Opportunity
1. **Setup → Object Manager → Opportunity → Validation Rules → New**
2. Name: `Require_Primary_Contact_On_Close`
3. Formula: `AND(Amount > 500000, ISBLANK(Primary_Contact__c))`  
   (adjust field names to your org)
4. Error message: `Cannot close won without Primary Contact`
5. Active ✓

#### 2. Flow `Opportunity_Auto_Update`
1. Record-triggered on **Opportunity** update
2. **Update Records:** set `StageName` = `Closed Won` when `Amount > 500000`
3. Activate

#### 3. Reproduce
1. Open Opportunity, set **Amount** > 500000, leave contact blank → Save

#### 4. Verify FixForce
| Check | Expected |
|-------|----------|
| Scenario | `FLOW_VALIDATION` |
| Flow | `Opportunity_Auto_Update` |

---

## TC04 — Flow + Required Field

**DOM helper:** `FF_test_TC04()`

### Salesforce setup

#### 1. Flow `Account_Onboarding`
1. **Screen Flow** or **Record-Triggered** on Account
2. **Create Records** → Object: **Contact**
3. Map **LastName** only (do **not** map **AccountId**)
4. Activate

#### 2. Reproduce
1. Run flow from Account (button or automation)

#### 3. Verify FixForce
| Check | Expected |
|-------|----------|
| Scenario | `FLOW_REQUIRED_FIELD` |
| Field | `AccountId` |

---

## TC05 — Apex Trigger + Permission

**DOM helper:** `FF_test_TC05()`

### Salesforce setup

#### 1. Deploy Apex trigger (Developer Console)

```apex
trigger AccountShareHandler on Account (after update) {
    List<Opportunity> opps = [
        SELECT Id, Name FROM Opportunity
        WHERE AccountId IN :Trigger.newMap.keySet()
        LIMIT 200
    ];
    for (Opportunity o : opps) {
        o.Description = 'Updated by trigger';
    }
    update opps; // fails if user cannot edit Opportunity
}
```

#### 2. Restrict Opportunity access for test user
1. Profile: remove **Edit** on Opportunity (or FLS on Description)

#### 3. Reproduce
1. As restricted user, edit an **Account** that has related **Opportunities** → Save

#### 4. Verify FixForce
| Check | Expected |
|-------|----------|
| Scenario | `APEX_PERMISSION` |
| Class | `AccountShareHandler` |

---

## TC06 — False positive (noise on page)

**DOM helper:** `FF_test_TC06_noise()`

### Salesforce setup (no error required)

#### Option A — Chatter post
1. On an Account, post:  
   `Training: example MALFORMED_ID docs. No save failure.`
2. Wait 30 seconds

#### Option B — Custom Lightning page
1. Add a **Rich Text** component with error-like training text (no `process failed`, no `We can't save this record`)

### Verify FixForce
| Check | Expected |
|-------|----------|
| Badge | Empty |
| Notification | None |
| Popup | No Errors Detected |

---

## TC07 — Dedupe (same error stays visible)

**Requires:** TC01 error still showing on screen

### Steps
1. Trigger TC01 and leave popover open **2 minutes**
2. Watch notifications — should **not** spam every 350ms
3. Badge remains `!`
4. Open popup once — stable analysis

### Verify
| Check | Expected |
|-------|----------|
| Notifications | ≤ 1 per 8s dedupe window |
| Popup | No flicker / rebuild |

---

## TC08 — Long error (validation at end)

**DOM helper:** `FF_test_TC08()`

### Salesforce setup
1. Flow `Bulk_Sync_Contacts` that updates many Contacts in one step
2. Validation on Contact: **Industry** required when **Annual Revenue** > 500000
3. Reproduce bulk update that fails validation

### Verify FixForce
| Check | Expected |
|-------|----------|
| Scenario | `FLOW_VALIDATION` |
| Flow | `Bulk_Sync_Contacts` |

---

## TC09 — Curly apostrophe (Unicode)

**DOM helper:** `FF_test_TC09()` (uses `\u2019` / `\u2018`)

### Salesforce E2E
1. Rename flow label to use smart quotes in description (optional)
2. Or rely on DOM injector for Unicode path

### Verify
| Check | Expected |
|-------|----------|
| Flow extracted | `Customer_Renewal` |
| Detection | Error still caught after normalization |

---

## TC10 — Multi-tab + background alert

### Steps
1. **Tab A:** Salesforce — trigger TC01 error
2. **Tab B:** Gmail or any non-Salesforce site (stay focused 10s)
3. Confirm **notification** appears while on Tab B
4. Click notification → popup opens with analysis
5. Switch to Tab A → open FixForce → click **Re-scan** (↻)

### Verify
| Check | Expected |
|-------|----------|
| Background alert | Notification while Tab B active |
| Storage | Latest error available in popup |
| Re-scan | Refreshes if error still on page |

---

## File reference

```
fixforce/
├── TEST_CASES.md                 ← this guide
├── backend/
│   ├── test-classifier.js        ← original smoke tests
│   ├── test-hard-cases.js        ← 10 hard automated cases
│   └── package.json              ← npm test
├── extension/
│   └── dom-test-injectors.js     ← browser console helpers
└── scripts/
    └── run-tests.sh              ← run all Node tests
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No detection | Reload extension; hard-refresh SF tab; check `chrome://extensions` errors |
| No notification | Allow notifications for FixForce in Chrome site settings |
| Wrong scenario | Copy exact error text from popover; compare with `npm test` output |
| TC06 false alert | Remove text containing `We hit a snag`, `process failed`, `MALFORMED_ID` |
| Automated test fails after code change | Run `node test-hard-cases.js` and update expectations or fix investigator |

---

## Adding an 11th test case

1. Add entry to `HARD_CASES` in `backend/test-hard-cases.js`
2. Add `FF_test_TCxx()` in `extension/dom-test-injectors.js` (optional)
3. Document Salesforce setup in this file under a new `TCxx` section
4. Run `npm test` until green
